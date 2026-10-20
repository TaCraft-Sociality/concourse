<?php

/*
 * This file is part of ernestdefoe/concourse.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace ErnestDefoe\Concourse\Tests\integration\api;

use Carbon\Carbon;
use Flarum\Discussion\Discussion;
use Flarum\Post\Post;
use Flarum\Tags\Tag;
use Flarum\Testing\integration\RetrievesAuthorizedUsers;
use Flarum\Testing\integration\TestCase;
use Flarum\User\User;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;

/**
 * 🚨 The N+1 gate, at a realistic size: 20 tags (five parents with three
 * children each, five loose) and 60 discussions, each with six comments by
 * different people and likes on its opening post.
 *
 * The number of queries must not grow with the number of rows, and
 * Concourse's own share is measured against the same request with the
 * extension's work switched off.
 */
class QueryCountTest extends TestCase
{
    use RetrievesAuthorizedUsers;

    private const DISCUSSIONS = 60;

    // The include the forum's discussion list asks for.
    private const LIST_INCLUDE = 'user,lastPostedUser,mostRelevantPost,mostRelevantPost.user,tags,tags.parent';

    protected function seedForum(): void
    {
        $now = Carbon::now();
        $tags = [];
        $id = 1;

        for ($p = 0; $p < 5; $p++) {
            $parent = $id++;
            $tags[] = ['id' => $parent, 'name' => "Parent $p", 'slug' => "parent-$p", 'position' => $p, 'parent_id' => null];
            for ($c = 0; $c < 3; $c++) {
                $tags[] = ['id' => $id, 'name' => "Child $p.$c", 'slug' => "child-$p-$c", 'position' => $c, 'parent_id' => $parent];
                $id++;
            }
        }

        $users = [];
        for ($u = 2; $u <= 21; $u++) {
            $users[] = ['id' => $u, 'username' => "member$u", 'email' => "member$u@machine.local", 'is_email_confirmed' => 1];
        }

        $discussions = $posts = $links = $likes = [];
        $postId = 1;

        for ($d = 1; $d <= self::DISCUSSIONS; $d++) {
            $first = $postId;
            $author = 2 + ($d % 20);

            for ($n = 1; $n <= 6; $n++) {
                $posts[] = ['id' => $postId, 'discussion_id' => $d, 'number' => $n, 'created_at' => $now->copy()->subMinutes($d * 10 - $n), 'user_id' => 2 + (($d + $n) % 20), 'type' => 'comment', 'content' => '<t><p>Post</p></t>'];
                $postId++;
            }

            for ($l = 2; $l <= 6; $l++) {
                $likes[] = ['post_id' => $first, 'user_id' => $l, 'created_at' => $now];
            }

            $discussions[] = ['id' => $d, 'title' => "Discussion $d", 'created_at' => $now->copy()->subMinutes($d * 10), 'last_posted_at' => $now->copy()->subMinutes($d * 10 - 6), 'user_id' => $author, 'first_post_id' => $first, 'comment_count' => 6, 'participant_count' => 6, 'last_post_number' => 6];
            $links[] = ['discussion_id' => $d, 'tag_id' => 1 + 4 * ($d % 5)];
        }

        $this->prepareDatabase([
            User::class => $users,
            Tag::class => $tags,
            Discussion::class => $discussions,
            Post::class => $posts,
            'discussion_tag' => $links,
            'post_likes' => $likes,
        ]);
    }

    /** @return array{0: int, 1: array<int, mixed>} [queries, rows] */
    private function measure(string $path, array $query, ?int $actor): array
    {
        $request = $this->request('GET', $path, $actor ? ['authenticatedAs' => $actor] : [])->withQueryParams($query);

        $this->send($request); // warm caches

        $queries = 0;
        $this->database()->listen(function () use (&$queries) {
            $queries++;
        });

        $response = $this->send($request);
        $this->assertSame(200, $response->getStatusCode(), (string) $response->getBody());

        $body = json_decode((string) $response->getBody(), true);

        return [$queries, $body['data'] ?? []];
    }

    public static function actors(): array
    {
        return ['guest' => [null], 'member' => [2], 'admin' => [1]];
    }

    #[Test]
    #[DataProvider('actors')]
    public function the_discussion_list_costs_the_same_for_one_row_or_fifty(?int $actor)
    {
        $this->extension('flarum-tags', 'flarum-likes', 'ernestdefoe-concourse');
        $this->seedForum();

        [$one, $rows1] = $this->measure('/api/discussions', ['include' => self::LIST_INCLUDE, 'page' => ['limit' => 1]], $actor);
        [$fifty, $rows50] = $this->measure('/api/discussions', ['include' => self::LIST_INCLUDE, 'page' => ['limit' => 50]], $actor);

        $this->assertCount(1, $rows1);
        $this->assertCount(50, $rows50);
        $this->assertCount(5, $rows50[49]['attributes']['concourseParticipants']);
        $this->assertSame(5, $rows50[49]['attributes']['concourseLikes']);
        $this->assertSame($one, $fifty);
    }

    #[Test]
    public function concourse_adds_one_query_for_likes_and_two_for_faces()
    {
        $this->extension('flarum-tags', 'flarum-likes', 'ernestdefoe-concourse');
        $this->seedForum();

        $request = $this->request('GET', '/api/discussions')->withQueryParams(['include' => self::LIST_INCLUDE, 'page' => ['limit' => 50]]);
        $this->send($request);

        $sql = [];
        $this->database()->listen(function ($query) use (&$sql) {
            $sql[] = $query->sql;
        });

        $this->send($request);

        $likes = array_filter($sql, fn ($q) => str_contains($q, 'post_likes') && str_contains($q, 'aggregate'));
        $faces = array_filter($sql, fn ($q) => str_contains($q, 'laravel_row'));

        // One grouped read of the likes, one windowed read of the posts for
        // at most five people per discussion, then their accounts in one.
        $this->assertCount(1, $likes);
        $this->assertCount(1, $faces);
    }

    #[Test]
    #[DataProvider('actors')]
    public function top_contributors_is_one_query_once_warm(?int $actor)
    {
        $this->extension('flarum-tags', 'flarum-likes', 'ernestdefoe-concourse');
        $this->seedForum();

        [$guest] = $this->measure('/api/concourse/top-contributors', ['period' => 'week'], null);
        [$signedIn] = $this->measure('/api/concourse/top-contributors', ['period' => 'week'], $actor);

        // The ranking is cached; what is left is the visibility check on the
        // people in it. A signed-in request adds the session's own lookups,
        // which every endpoint pays.
        $this->assertSame(1, $guest);
        $this->assertLessThanOrEqual(5, $signedIn);
    }
}
