<?php

/*
 * This file is part of ernestdefoe/concourse.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

use ErnestDefoe\Concourse\ActiveTheme;
use ErnestDefoe\Concourse\Api;
use ErnestDefoe\Concourse\ConcourseServiceProvider;
use ErnestDefoe\Concourse\FooterLinks;
use ErnestDefoe\Concourse\Http\DecideTheme;
use ErnestDefoe\Concourse\Model\OpLikeCount;
use ErnestDefoe\Concourse\Model\ParticipantRow;
use Flarum\Api\Context;
use Flarum\Api\Endpoint;
use Flarum\Api\Resource;
use Flarum\Api\Schema;
use Flarum\Discussion\Discussion;
use Flarum\Extend;
use Flarum\Extension\ExtensionManager;
use Flarum\Frontend\Document;
use Flarum\Settings\SettingsRepositoryInterface;
use Flarum\Tags\Tag;
use Illuminate\Contracts\Filesystem\Factory as Filesystems;
use Psr\Http\Message\ServerRequestInterface;

/**
 * The relations a page of Concourse rows reads, for the visitor on Concourse.
 *
 * 🚨 Each is ONE query for the whole page, however many rows: the opening
 * posts' like counts grouped by post, and at most five people per discussion
 * through a per-discussion row limit (plus one query for their accounts).
 */
$rowRelations = function (Context $context, bool $listing): array {
    if (! resolve(ActiveTheme::class)->isActive($context->request)) {
        return [];
    }

    $settings = resolve(SettingsRepositoryInterface::class);
    $relations = [];

    if ($listing && resolve(ExtensionManager::class)->isEnabled('flarum-likes')) {
        $relations[] = 'concourseOpLikes';
    }

    if ((bool) $settings->get('ernestdefoe-concourse.show_participants', true)) {
        $relations[] = 'concourseParticipants.user';
    }

    return $relations;
};

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__.'/js/dist/forum.js')
        ->css(__DIR__.'/less/forum.less')
        ->content(function (Document $document, ServerRequestInterface $request) {
            // A visitor on another Wardrobe theme gets none of this.
            if (! resolve(ActiveTheme::class)->isActive($request)) {
                return;
            }

            /*
             * The latin face of Work Sans is on every page, so it starts
             * loading with the stylesheet instead of after it. latin-ext is
             * left to the browser: it is only fetched when a page needs it.
             */
            $font = resolve(Filesystems::class)->disk('flarum-assets')
                ->url('extensions/ernestdefoe-concourse/fonts/work-sans-latin-wght-normal.woff2');

            $document->head[] = '<link rel="preload" href="'.e($font).'" as="font" type="font/woff2" crossorigin>';
        }),

    (new Extend\ServiceProvider())
        ->register(ConcourseServiceProvider::class),

    (new Extend\Middleware('forum'))
        ->add(DecideTheme::class),

    (new Extend\Frontend('admin'))
        ->js(__DIR__.'/js/dist/admin.js'),

    new Extend\Locales(__DIR__.'/locale'),

    (new Extend\Routes('api'))
        ->get('/concourse/top-contributors', 'ernestdefoe-concourse.top-contributors', Api\Controller\TopContributorsController::class),

    /*
     * 🚨 Every setting has a READER, named beside it. A setting with no
     * reader is a control that lies.
     */
    (new Extend\Settings())
        // read by the profile card (ProfileCard.tsx)
        ->default('ernestdefoe-concourse.show_profile', true)
        ->serializeToForum('concourseShowProfile', 'ernestdefoe-concourse.show_profile', 'boolval')
        // read by the Top Contributors block (TopContributors.tsx)
        ->default('ernestdefoe-concourse.show_contributors', true)
        ->serializeToForum('concourseShowContributors', 'ernestdefoe-concourse.show_contributors', 'boolval')
        // read by TopContributors.tsx as the period a visitor starts on
        ->default('ernestdefoe-concourse.contributors_period', 'week')
        ->serializeToForum('concourseContributorsPeriod', 'ernestdefoe-concourse.contributors_period')
        // read by TopContributorsController
        ->default('ernestdefoe-concourse.contributors_count', 5)
        // read by $rowRelations above, and by rows.tsx / the discussion panel
        ->default('ernestdefoe-concourse.show_participants', true)
        ->serializeToForum('concourseShowParticipants', 'ernestdefoe-concourse.show_participants', 'boolval')
        // read by the sidebar's footer (Sidebar.tsx), parsed by FooterLinks
        ->default('ernestdefoe-concourse.footer_links', '')
        ->serializeToForum('concourseFooterLinks', 'ernestdefoe-concourse.footer_links', [FooterLinks::class, 'parse']),

    (new Extend\Model(Discussion::class))
        /*
         * How many likes the opening post has, as one row per post. Eager
         * loaded for a page of rows, this is ONE grouped query on
         * flarum/likes' table. Only named when flarum/likes is enabled.
         */
        ->relationship('concourseOpLikes', fn (Discussion $discussion) => $discussion
            ->hasMany(OpLikeCount::class, 'post_id', 'first_post_id')
            ->select('post_id')
            ->selectRaw('COUNT(*) as aggregate')
            ->groupBy('post_id'))
        /*
         * The people taking part, most recently active first, at most five
         * per discussion.
         *
         * 🚨 Eager loaded, `limit(5)` is a PER-DISCUSSION limit (a row number
         * over each discussion), so a thread with a thousand repliers still
         * returns five rows. Only comments anyone can read count: not hidden,
         * not private, and approved where flarum/approval is enabled.
         */
        ->relationship('concourseParticipants', function (Discussion $discussion) {
            $grammar = $discussion->getConnection()->getQueryGrammar();

            $relation = $discussion->hasMany(ParticipantRow::class, 'discussion_id')
                ->join('discussions', 'discussions.id', '=', 'posts.discussion_id')
                // 🚨 Only each discussion's latest comments are read: the
                // unique (discussion_id, number) index finds them directly,
                // where grouping every post of a 2,000-post thread cost
                // ~150 ms a page (measured on 166k posts). The faces are the
                // most recently active people, so the tail is where they are;
                // the "+N" total is core's own participant_count.
                // 🚨 last_post_number is UNSIGNED on MySQL/MariaDB: a bare
                // "- 30" on a short thread is an out-of-range error there
                // (SQLite never complains). The CASE only subtracts when it
                // can, and still leaves posts.number a range on the index.
                ->whereRaw(
                    $grammar->wrap('posts.number').' > CASE WHEN '.$grammar->wrap('discussions.last_post_number').' > ? THEN '
                    .$grammar->wrap('discussions.last_post_number').' - ? ELSE 0 END',
                    [ParticipantRow::WINDOW, ParticipantRow::WINDOW]
                )
                ->select('posts.discussion_id', 'posts.user_id')
                ->where('posts.is_private', false)
                ->whereNull('posts.hidden_at')
                ->whereNotNull('posts.user_id')
                ->groupBy('posts.discussion_id', 'posts.user_id')
                ->orderByRaw('MAX('.$grammar->wrap('posts.created_at').') desc')
                ->limit(5);

            /*
             * 🚨 SQLite plans without statistics: given `type = 'comment'` it
             * walks posts_type_created_at_index — every comment on the forum
             * (130 ms at 166k posts) — instead of the discussion index. The
             * unary `+` (SQLite only) keeps that one condition off the plan.
             */
            if ($discussion->getConnection()->getDriverName() === 'sqlite') {
                $relation->whereRaw('+'.$grammar->wrap('posts.type').' = ?', ['comment']);
            } else {
                $relation->where('posts.type', 'comment');
            }

            if (resolve(ExtensionManager::class)->isEnabled('flarum-approval')) {
                $relation->where('posts.is_approved', true);
            }

            return $relation;
        }),

    (new Extend\ApiResource(Resource\DiscussionResource::class))
        ->fields(Api\DiscussionResourceFields::class)
        ->endpoint('index', fn (Endpoint\Index $endpoint) => $endpoint->eagerLoad(
            fn (array $included, Context $context) => $rowRelations($context, true)
        ))
        // The discussion page's side panel shows the same faces.
        ->endpoint('show', fn (Endpoint\Show $endpoint) => $endpoint->eagerLoad(
            fn (array $included, Context $context) => $rowRelations($context, false)
        )),

    /*
     * The sidebar's tag tree. flarum/tags only preloads the top-level tags,
     * so every child tag would be missing from it.
     *
     * One query for all of them (their parents eager-loaded so the `parent`
     * linkage costs nothing per tag), through the tags' own visibility rules,
     * only on a forum running flarum/tags and only for a visitor on Concourse.
     */
    (new Extend\Conditional())
        ->whenExtensionEnabled('flarum-tags', fn () => [
            (new Extend\ApiResource(Resource\ForumResource::class))
                ->fields(fn () => [
                    Schema\Relationship\ToMany::make('concourseChildTags')
                        ->type('tags')
                        ->includable()
                        ->visible(fn ($forum, Context $context) => resolve(ActiveTheme::class)->isActive($context->request))
                        ->get(fn ($forum, Context $context) => Tag::whereVisibleTo($context->getActor())
                            ->whereNotNull('parent_id')
                            ->whereNotNull('position')
                            ->with('parent')
                            ->orderBy('position')
                            ->get()
                            ->all()),
                ])
                ->endpoint(Endpoint\Show::class, fn (Endpoint\Show $endpoint) => $endpoint->addDefaultInclude(['concourseChildTags'])),
        ]),
];
