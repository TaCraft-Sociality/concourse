<?php

/*
 * This file is part of ernestdefoe/concourse.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace ErnestDefoe\Concourse\Tests\integration;

use Carbon\Carbon;
use Flarum\Discussion\Discussion;
use Flarum\Group\Group;
use Flarum\Post\Post;
use Flarum\Tags\Tag;
use Flarum\Testing\integration\RetrievesAuthorizedUsers;
use Flarum\Testing\integration\TestCase;
use Flarum\User\User;

/**
 * Users 2–9 are members.
 * Tags: 1 General, 2 Games (parent of 3 Minecraft), 4 Staff (restricted).
 *
 * Discussion 1 by 2 in General. Comments by 2 (first), 3, 4, 3 again, a
 * HIDDEN one by 6 and a PRIVATE one by 7. The first post is liked by 3 and
 * 4 this week, by 5 forty days ago, and by its own author.
 * Discussion 2 by 3 in Staff: its first post liked by 4 — never counted in
 * Top Contributors, which only counts what a guest could see.
 * Discussion 3 by 4 in Minecraft, with seven different commenters (4–9 and
 * 2): its first post liked by 2.
 */
abstract class ConcourseTestCase extends TestCase
{
    use RetrievesAuthorizedUsers;

    protected function seed(): void
    {
        $now = Carbon::now();
        $users = [];

        for ($u = 2; $u <= 9; $u++) {
            $users[] = ['id' => $u, 'username' => "member$u", 'email' => "member$u@machine.local", 'is_email_confirmed' => 1, 'last_seen_at' => $now];
        }

        $at = fn (int $minutes) => $now->copy()->subMinutes($minutes);

        $posts = [
            ['id' => 1, 'discussion_id' => 1, 'number' => 1, 'created_at' => $at(60), 'user_id' => 2, 'type' => 'comment', 'content' => '<t><p>One</p></t>'],
            ['id' => 2, 'discussion_id' => 1, 'number' => 2, 'created_at' => $at(50), 'user_id' => 3, 'type' => 'comment', 'content' => '<t><p>Two</p></t>'],
            ['id' => 3, 'discussion_id' => 1, 'number' => 3, 'created_at' => $at(40), 'user_id' => 4, 'type' => 'comment', 'content' => '<t><p>Three</p></t>'],
            ['id' => 4, 'discussion_id' => 1, 'number' => 4, 'created_at' => $at(30), 'user_id' => 3, 'type' => 'comment', 'content' => '<t><p>Four</p></t>'],
            ['id' => 5, 'discussion_id' => 1, 'number' => 5, 'created_at' => $at(20), 'user_id' => 6, 'type' => 'comment', 'content' => '<t><p>Hidden</p></t>', 'hidden_at' => $at(10), 'hidden_user_id' => 1],
            ['id' => 6, 'discussion_id' => 1, 'number' => 6, 'created_at' => $at(15), 'user_id' => 7, 'type' => 'comment', 'content' => '<t><p>Private</p></t>', 'is_private' => 1],
            ['id' => 10, 'discussion_id' => 2, 'number' => 1, 'created_at' => $at(60), 'user_id' => 3, 'type' => 'comment', 'content' => '<t><p>Staff only</p></t>'],
        ];

        $id = 20;
        foreach ([4, 5, 6, 7, 8, 9, 2] as $n => $author) {
            $posts[] = ['id' => $id, 'discussion_id' => 3, 'number' => $n + 1, 'created_at' => $at(100 - $n), 'user_id' => $author, 'type' => 'comment', 'content' => '<t><p>Reply</p></t>'];
            $id++;
        }

        $this->prepareDatabase([
            User::class => $users,
            'group_user' => array_map(fn ($u) => ['user_id' => $u['id'], 'group_id' => Group::MEMBER_ID], $users),
            Tag::class => [
                ['id' => 1, 'name' => 'General', 'slug' => 'general', 'position' => 0, 'parent_id' => null],
                ['id' => 2, 'name' => 'Games', 'slug' => 'games', 'position' => 1, 'parent_id' => null],
                ['id' => 3, 'name' => 'Minecraft', 'slug' => 'minecraft', 'position' => 0, 'parent_id' => 2],
                ['id' => 4, 'name' => 'Staff', 'slug' => 'staff', 'position' => 2, 'parent_id' => null, 'is_restricted' => 1],
            ],
            Discussion::class => [
                ['id' => 1, 'title' => 'General chat', 'created_at' => $at(60), 'last_posted_at' => $at(30), 'user_id' => 2, 'first_post_id' => 1, 'comment_count' => 4, 'participant_count' => 3, 'last_post_number' => 6],
                ['id' => 2, 'title' => 'Staff room', 'created_at' => $at(60), 'last_posted_at' => $at(60), 'user_id' => 3, 'first_post_id' => 10, 'comment_count' => 1, 'participant_count' => 1, 'last_post_number' => 1],
                ['id' => 3, 'title' => 'Minecraft season', 'created_at' => $at(100), 'last_posted_at' => $at(94), 'user_id' => 4, 'first_post_id' => 20, 'comment_count' => 7, 'participant_count' => 7, 'last_post_number' => 7],
            ],
            'discussion_tag' => [
                ['discussion_id' => 1, 'tag_id' => 1],
                ['discussion_id' => 2, 'tag_id' => 4],
                ['discussion_id' => 3, 'tag_id' => 2],
                ['discussion_id' => 3, 'tag_id' => 3],
            ],
            Post::class => $posts,
        ]);
    }

    protected function seedLikes(): void
    {
        $now = Carbon::now();

        $this->prepareDatabase([
            'post_likes' => [
                ['post_id' => 1, 'user_id' => 3, 'created_at' => $now->copy()->subDay()->subHour()],
                ['post_id' => 1, 'user_id' => 4, 'created_at' => $now->copy()->subDays(2)],
                ['post_id' => 1, 'user_id' => 5, 'created_at' => $now->copy()->subDays(40)],
                // Liking your own post is not a contribution.
                ['post_id' => 1, 'user_id' => 2, 'created_at' => $now->copy()->subDay()->subHour()],
                // Behind a restricted tag: never in the shared ranking.
                ['post_id' => 10, 'user_id' => 4, 'created_at' => $now->copy()->subHours(2)],
                ['post_id' => 20, 'user_id' => 2, 'created_at' => $now->copy()->subHours(3)],
            ],
        ]);
    }

    /** @return array{0: int, 1: mixed} */
    protected function get(string $path, ?int $actor = null, array $query = [], array $cookies = []): array
    {
        $options = $actor ? ['authenticatedAs' => $actor] : [];
        $request = $this->request('GET', $path, $options)->withQueryParams($query);

        if ($cookies) {
            $request = $request->withCookieParams($cookies);
        }

        $response = $this->send($request);

        return [$response->getStatusCode(), json_decode((string) $response->getBody(), true)];
    }

    /** @return array<string, array<string, mixed>> discussion id => attributes */
    protected function listing(?int $actor = null): array
    {
        [$status, $body] = $this->get('/api/discussions', $actor);
        $this->assertSame(200, $status, json_encode($body));

        $out = [];
        foreach ($body['data'] as $row) {
            $out[$row['id']] = $row['attributes'];
        }

        return $out;
    }
}
