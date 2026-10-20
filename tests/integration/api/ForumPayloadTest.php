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

class ForumPayloadTest extends ConcourseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->extension('flarum-tags', 'ernestdefoe-concourse');
        $this->seed();
    }

    #[Test]
    public function footer_links_keep_only_safe_addresses()
    {
        $this->setting('ernestdefoe-concourse.footer_links', implode("\n", [
            'About | /p/about',
            'Evil | javascript:alert(1)',
            'Elsewhere | //evil.example',
            'Sneaky | /\\evil.example',
            'Privacy | https://example.com/privacy',
            'no separator here',
            ' | /no-label',
        ]));

        [, $body] = $this->get('/api');

        $this->assertSame([
            ['label' => 'About', 'url' => '/p/about'],
            ['label' => 'Privacy', 'url' => 'https://example.com/privacy'],
        ], $body['data']['attributes']['concourseFooterLinks']);
    }

    #[Test]
    public function the_payload_carries_the_child_tags_the_viewer_may_see()
    {
        [, $body] = $this->get('/api');

        $ids = array_column($body['data']['relationships']['concourseChildTags']['data'], 'id');

        $this->assertSame(['3'], $ids);
    }
}
