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

class TopContributorsTest extends ConcourseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->extension('flarum-tags', 'flarum-likes', 'ernestdefoe-concourse');
        $this->seed();
        $this->seedLikes();
    }

    /** @return array<int, int> */
    private function ranking(string $period, ?int $actor = null): array
    {
        [$status, $body] = $this->get('/api/concourse/top-contributors', $actor, ['period' => $period]);
        $this->assertSame(200, $status, json_encode($body));
        $this->assertSame('likes', $body['metric']);

        return array_column($body['users'], 'count', 'id');
    }

    #[Test]
    public function this_week_counts_likes_received_on_public_posts_only()
    {
        // 2: liked by 3 and 4 (their own like does not count, the 40-day-old
        // one is outside the week). 4: liked by 2. 3's like in the staff room
        // is behind a restricted tag and never counts.
        $this->assertSame([2 => 2, 4 => 1], $this->ranking('week'));
    }

    #[Test]
    public function even_an_admin_sees_the_shared_public_ranking()
    {
        $this->assertSame([2 => 2, 4 => 1], $this->ranking('week', 1));
    }

    #[Test]
    public function a_longer_period_reaches_further_back()
    {
        $this->assertSame([2 => 3, 4 => 1], $this->ranking('year'));
    }

    #[Test]
    public function today_only_counts_today()
    {
        $this->assertSame([4 => 1], $this->ranking('day'));
    }

    #[Test]
    public function an_unknown_period_falls_back_to_the_week()
    {
        [, $body] = $this->get('/api/concourse/top-contributors', null, ['period' => 'forever']);

        $this->assertSame('week', $body['period']);
    }

    #[Test]
    public function the_count_setting_limits_the_list()
    {
        $this->setting('ernestdefoe-concourse.contributors_count', '1');

        $this->assertSame([2 => 2], $this->ranking('week'));
    }

    #[Test]
    public function a_person_carries_only_what_the_list_needs()
    {
        [, $body] = $this->get('/api/concourse/top-contributors');

        $this->assertSame(['id', 'displayName', 'slug', 'avatarUrl', 'count'], array_keys($body['users'][0]));
    }

    #[Test]
    public function a_forum_guests_cannot_view_does_not_answer_them()
    {
        $this->database()->table('group_permission')->where('group_id', 2)->where('permission', 'viewForum')->delete();

        [$status] = $this->get('/api/concourse/top-contributors');

        $this->assertContains($status, [401, 403]);
    }
}
