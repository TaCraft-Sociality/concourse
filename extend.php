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
        ->relationship('concourseExcerpt', fn (Discussion $discussion) => $discussion
            ->hasOne(\Flarum\Post\Post::class, 'discussion_id', 'id')
            ->where('number', 1)
            ->select('id', 'discussion_id', 'content'))
        ->relationship('concourseOpLikes', fn (Discussion $discussion) => $discussion
            ->hasMany(OpLikeCount::class, 'post_id', 'first_post_id')
            ->select('post_id')
            ->selectRaw('COUNT(*) as aggregate')
            ->groupBy('post_id'))
        ->relationship('concourseParticipants', function (Discussion $discussion) {
            $grammar = $discussion->getConnection()->getQueryGrammar();

            $relation = $discussion->hasMany(ParticipantRow::class, 'discussion_id')
                ->join('discussions', 'discussions.id', '=', 'posts.discussion_id')
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
        ->fields(fn () => [
            Schema\Str::make('concourseExcerpt')
                ->get(function (Discussion $discussion) {
                    $post = $discussion->relationLoaded('concourseExcerpt') ? $discussion->getRelation('concourseExcerpt') : null;
                    if ($post && $post->content) {
                        $text = strip_tags($post->content);
                        $text = preg_replace('/\s+/u', ' ', $text);
                        return mb_substr($text, 0, 150);
                    }
                    return '';
                }),
        ])
        ->endpoint('index', fn (Endpoint\Index $endpoint) => $endpoint->eagerLoad(
            fn (array $included, Context $context) => array_merge(
                $rowRelations($context, true),
                ['concourseExcerpt']
            )
        ))
        ->endpoint('show', fn (Endpoint\Show $endpoint) => $endpoint->eagerLoad(
            fn (array $included, Context $context) => array_merge(
                $rowRelations($context, false),
                ['concourseExcerpt']
            )
        )),

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