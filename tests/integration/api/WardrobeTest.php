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
 * Under ernestdefoe/wardrobe, a visitor on another theme pays for none of
 * Concourse's server-side work, and a visitor on Concourse gets all of it.
 *
 * Wardrobe accepts any enabled extension id as a theme, so flarum-likes
 * stands in for "another theme" here.
 */
class WardrobeTest extends ConcourseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->extension('flarum-tags', 'flarum-likes', 'ernestdefoe-wardrobe', 'ernestdefoe-concourse');
        $this->seed();
        $this->seedLikes();
        $this->setting('wardrobe.themes', json_encode(['flarum-likes', 'ernestdefoe-concourse']));
        $this->setting('wardrobe.default', 'flarum-likes');
    }

    private function page(?string $cookie): string
    {
        $request = $this->request('GET', '/');

        if ($cookie) {
            $request = $request->withCookieParams(['wardrobe_theme' => $cookie]);
        }

        return (string) $this->send($request)->getBody();
    }

    #[Test]
    public function a_guest_on_another_theme_gets_none_of_concourse()
    {
        $html = $this->page(null);

        $this->assertStringNotContainsString('concourseChildTags', $html);
        $this->assertStringNotContainsString('concourseParticipants', $html);
        $this->assertStringNotContainsString('work-sans-latin-wght-normal.woff2', $html);
    }

    #[Test]
    public function a_guest_who_chose_concourse_gets_all_of_it_including_the_boot_payload()
    {
        $html = $this->page('ernestdefoe-concourse');

        $this->assertStringContainsString('concourseChildTags', $html);
        $this->assertStringContainsString('concourseParticipants', $html);
        $this->assertStringContainsString('work-sans-latin-wght-normal.woff2', $html);
    }

    #[Test]
    public function an_api_request_follows_the_visitors_cookie()
    {
        [, $other] = $this->get('/api/discussions');
        [, $mine] = $this->get('/api/discussions', null, [], ['wardrobe_theme' => 'ernestdefoe-concourse']);

        $this->assertArrayNotHasKey('concourseLikes', $other['data'][0]['attributes']);
        $this->assertArrayHasKey('concourseLikes', $mine['data'][0]['attributes']);
    }

    #[Test]
    public function a_member_who_prefers_concourse_gets_it()
    {
        $this->database()->table('users')->where('id', 2)->update(['preferences' => json_encode(['wardrobeTheme' => 'ernestdefoe-concourse'])]);

        [, $body] = $this->get('/api', 2);

        $this->assertArrayHasKey('concourseChildTags', $body['data']['relationships']);
    }
}
