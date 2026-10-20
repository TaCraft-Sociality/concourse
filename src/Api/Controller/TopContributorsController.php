<?php

/*
 * This file is part of ernestdefoe/concourse.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace ErnestDefoe\Concourse\Api\Controller;

use ErnestDefoe\Concourse\Contributors\TopContributors;
use Flarum\Http\RequestUtil;
use Flarum\Settings\SettingsRepositoryInterface;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

/**
 * GET /api/concourse/top-contributors?period=day|week|month|year
 *
 * A plain JSON shape rather than a JSON:API document: the widget draws a
 * face, a name and a number per person, and has no use for a full user
 * resource and everything other extensions attach to one.
 */
class TopContributorsController implements RequestHandlerInterface
{
    public function __construct(
        protected TopContributors $contributors,
        protected SettingsRepositoryInterface $settings,
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = RequestUtil::getActor($request);
        $actor->assertCan('viewForum');

        $period = $request->getQueryParams()['period'] ?? 'week';
        $period = is_string($period) && isset(TopContributors::PERIODS[$period]) ? $period : 'week';

        $limit = max(1, min(10, (int) $this->settings->get('ernestdefoe-concourse.contributors_count', 5)));

        return new JsonResponse([
            'period' => $period,
            'metric' => $this->contributors->metric(),
            'users' => $this->contributors->forActor($actor, $period, $limit),
        ]);
    }
}
