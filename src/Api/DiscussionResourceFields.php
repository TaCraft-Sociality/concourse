<?php

/*
 * This file is part of ernestdefoe/concourse.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace ErnestDefoe\Concourse\Api;

use ErnestDefoe\Concourse\Model\OpLikeCount;
use ErnestDefoe\Concourse\Model\ParticipantRow;
use Flarum\Api\Schema;
use Flarum\Discussion\Discussion;
use Flarum\Http\SlugManager;
use Flarum\User\User;

/**
 * What a Concourse row draws beyond core's: the opening post's like count
 * and a few faces of the people taking part.
 *
 * 🚨 Both are read ONLY from relations the endpoint eager-loads for the whole
 * page (extend.php): one grouped query each, never one per row. A discussion
 * without the relation loaded — another endpoint, another theme, another
 * extension's request — gets neither field rather than a lazy load.
 */
class DiscussionResourceFields
{
    public function __construct(protected SlugManager $slugs)
    {
    }

    public function __invoke(): array
    {
        return [
            Schema\Integer::make('concourseLikes')
                ->visible(fn (Discussion $discussion): bool => $discussion->relationLoaded('concourseOpLikes'))
                ->get(function (Discussion $discussion): int {
                    $row = $discussion->getRelation('concourseOpLikes')->first();

                    return $row instanceof OpLikeCount ? (int) $row->aggregate : 0;
                }),

            Schema\Arr::make('concourseParticipants')
                ->visible(fn (Discussion $discussion): bool => $discussion->relationLoaded('concourseParticipants'))
                ->get(fn (Discussion $discussion): array => $this->participants($discussion)),
        ];
    }

    /**
     * @return list<array{id: int, displayName: string, slug: string, avatarUrl: string|null}>
     */
    public function participants(Discussion $discussion): array
    {
        $out = [];

        foreach ($discussion->getRelation('concourseParticipants') as $row) {
            if (! $row instanceof ParticipantRow) {
                continue;
            }

            $user = $row->relationLoaded('user') ? $row->getRelation('user') : null;

            // A deleted account leaves its posts behind with no one to show.
            if (! $user instanceof User) {
                continue;
            }

            $out[] = [
                'id' => (int) $user->id,
                'displayName' => $user->display_name,
                'slug' => $this->slugs->forResource(User::class)->toSlug($user),
                'avatarUrl' => $user->avatar_url,
            ];
        }

        return $out;
    }
}
