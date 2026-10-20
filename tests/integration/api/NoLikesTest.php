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

/**
 * A forum without flarum/likes: no like counts, and Top Contributors ranks
 * by comments instead.
 */
class NoLikesTest extends ConcourseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->extension('flarum-tags', 'ernestdefoe-concourse');
        $this->seed();
    }

    #[Test]
    public function rows_have_no_like_count()
    {
        $this->assertArrayNotHasKey('concourseLikes', $this->listing()['1']);
    }

    #[Test]
    public function top_contributors_counts_public_comments()
    {
        $this->setting('ernestdefoe-concourse.contributors_count', '10');

        [$status, $body] = $this->get('/api/concourse/top-contributors', null, ['period' => 'week']);

        $this->assertSame(200, $status);
        $this->assertSame('posts', $body['metric']);

        $counts = array_column($body['users'], 'count', 'id');

        // 3 wrote two visible comments in discussion 1; their staff-room post
        // does not count. 6's hidden and 7's private comments do not count.
        $this->assertSame(2, $counts[3]);
        $this->assertSame(2, $counts[2]);
        $this->assertSame(2, $counts[4]);
        $this->assertSame(1, $counts[7] ?? null);
        $this->assertSame(1, $counts[6] ?? null);
    }
}
