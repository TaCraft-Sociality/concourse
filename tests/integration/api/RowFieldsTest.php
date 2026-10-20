<?php

/*
 * This file is part of ernestdefoe/concourse.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace ErnestDefoe\Concourse\Tests\integration\api;

use ErnestDefoe\Concourse\Tests\integration\ConcourseTestCase;
use PHPUnit\Framework\Attributes\Test;

class RowFieldsTest extends ConcourseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->extension('flarum-tags', 'flarum-likes', 'ernestdefoe-concourse');
        $this->seed();
        $this->seedLikes();
    }

    private static function ids(array $people): array
    {
        return array_map(fn ($p) => $p['id'], $people);
    }

    #[Test]
    public function a_row_carries_the_opening_posts_like_count()
    {
        $rows = $this->listing();

        // Every like on the post, whenever it was made, own like included:
        // the same number the post itself shows.
        $this->assertSame(4, $rows['1']['concourseLikes']);
        $this->assertSame(1, $rows['3']['concourseLikes']);
    }

    #[Test]
    public function participants_leave_out_hidden_and_private_comments()
    {
        $people = self::ids($this->listing()['1']['concourseParticipants']);

        sort($people);
        $this->assertSame([2, 3, 4], $people);
    }

    #[Test]
    public function participants_are_capped_at_five_most_recent_first()
    {
        $people = self::ids($this->listing()['3']['concourseParticipants']);

        // Seven commenters, 4 first and 2 last: the five most recent.
        $this->assertSame([2, 9, 8, 7, 6], $people);
    }

    #[Test]
    public function only_a_discussions_latest_posts_are_read_for_faces()
    {
        // Pretend discussion 3 runs on for another 30 posts by nobody new:
        // its seven commenters are now outside the window.
        $this->database()->table('discussions')->where('id', 3)->update(['last_post_number' => 37]);

        $this->assertSame([], $this->listing()['3']['concourseParticipants']);
    }

    #[Test]
    public function a_participant_carries_only_what_a_face_needs()
    {
        $person = $this->listing()['1']['concourseParticipants'][0];

        $this->assertSame(['id', 'displayName', 'slug', 'avatarUrl'], array_keys($person));
    }

    #[Test]
    public function the_discussion_page_gets_the_faces_but_not_the_like_count()
    {
        [$status, $body] = $this->get('/api/discussions/1');

        $this->assertSame(200, $status);
        $this->assertCount(3, $body['data']['attributes']['concourseParticipants']);
        $this->assertArrayNotHasKey('concourseLikes', $body['data']['attributes']);
    }

    #[Test]
    public function the_participants_setting_turns_their_query_off()
    {
        $this->setting('ernestdefoe-concourse.show_participants', '0');

        $row = $this->listing()['1'];

        $this->assertArrayNotHasKey('concourseParticipants', $row);
        $this->assertSame(4, $row['concourseLikes']);
    }

    #[Test]
    public function a_restricted_discussion_never_reaches_a_guest()
    {
        $this->assertArrayNotHasKey('2', $this->listing());
    }
}
