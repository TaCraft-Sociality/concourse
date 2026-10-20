<?php

/*
 * This file is part of ernestdefoe/concourse.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace ErnestDefoe\Concourse\Contributors;

use Carbon\Carbon;
use Flarum\Discussion\Discussion;
use Flarum\Extension\ExtensionManager;
use Flarum\Http\SlugManager;
use Flarum\User\Guest;
use Flarum\User\User;
use Illuminate\Contracts\Cache\Repository as Cache;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Database\Query\Builder;

/**
 * Top Contributors: who received the most likes in a period, or, on a forum
 * without flarum/likes, who wrote the most comments.
 *
 * 🚨 Two halves, split on purpose (the same shape as Lobby's Online list):
 *
 * - The RANKING is the same for every viewer, so it is one grouped query per
 *   period, cached for the whole forum. It only counts activity a GUEST could
 *   see — public discussions, visible comments — so a shared number never
 *   includes what happened behind a restricted tag. It holds ids and counts.
 * - Who a viewer may SEE of it is decided per request, through
 *   `whereVisibleTo`, in one query by primary key.
 */
class TopContributors
{
    public const PERIODS = ['day' => 1, 'week' => 7, 'month' => 30, 'year' => 365];

    /** How many of the ranking the shared list keeps. */
    public const KEEP = 20;

    /** Today's ranking moves quickly; a year's barely does. */
    private const TTL = ['day' => 300, 'week' => 600, 'month' => 1800, 'year' => 3600];

    public function __construct(
        protected Cache $cache,
        protected ConnectionInterface $db,
        protected ExtensionManager $extensions,
        protected SlugManager $slugs,
    ) {
    }

    public function metric(): string
    {
        return $this->extensions->isEnabled('flarum-likes') ? 'likes' : 'posts';
    }

    /**
     * @return list<array{id: int, displayName: string, slug: string, avatarUrl: string|null, count: int}>
     */
    public function forActor(User $actor, string $period, int $limit): array
    {
        $ranking = $this->ranking($period);

        if ($ranking === []) {
            return [];
        }

        $users = User::whereVisibleTo($actor)
            ->whereIn('users.id', array_keys($ranking))
            ->get()
            ->keyBy('id');

        $out = [];

        foreach ($ranking as $id => $count) {
            $user = $users->get($id);

            if (! $user instanceof User) {
                continue;
            }

            $out[] = [
                'id' => (int) $user->id,
                'displayName' => $user->display_name,
                'slug' => $this->slugs->forResource(User::class)->toSlug($user),
                'avatarUrl' => $user->avatar_url,
                'count' => $count,
            ];

            if (count($out) >= $limit) {
                break;
            }
        }

        return $out;
    }

    /**
     * @return array<int, int> user id => count, best first
     */
    public function ranking(string $period): array
    {
        $days = self::PERIODS[$period] ?? self::PERIODS['week'];
        $metric = $this->metric();

        return $this->cache->remember(
            "ernestdefoe-concourse.top.$metric.$period",
            self::TTL[$period] ?? 600,
            function () use ($days, $metric) {
                $since = Carbon::now()->subDays($days);

                $query = $metric === 'likes'
                    ? $this->db->table('post_likes')
                        ->join('posts', 'posts.id', '=', 'post_likes.post_id')
                        ->where('post_likes.created_at', '>=', $since)
                        // Liking your own post is not a contribution.
                        ->whereColumn('post_likes.user_id', '!=', 'posts.user_id')
                    : $this->db->table('posts')
                        ->where('posts.created_at', '>=', $since);

                $this->publicComments($query);

                return $query
                    ->groupBy('posts.user_id')
                    ->select('posts.user_id')
                    ->selectRaw('COUNT(*) as score')
                    ->orderByDesc('score')
                    ->orderBy('posts.user_id')
                    ->limit(self::KEEP)
                    ->pluck('score', 'user_id')
                    ->mapWithKeys(fn ($score, $id) => [(int) $id => (int) $score])
                    ->all();
            }
        );
    }

    /**
     * Comments a guest could read: visible, approved, not private, in a
     * discussion a guest can open.
     */
    protected function publicComments(Builder $query): void
    {
        $query->where('posts.type', 'comment')
            ->whereNull('posts.hidden_at')
            ->where('posts.is_private', false)
            ->whereNotNull('posts.user_id')
            ->whereIn('posts.discussion_id', Discussion::whereVisibleTo(new Guest())->select('discussions.id')->getQuery());

        if ($this->extensions->isEnabled('flarum-approval')) {
            $query->where('posts.is_approved', true);
        }
    }
}
