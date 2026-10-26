import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import DiscussionListItem from 'flarum/forum/components/DiscussionListItem';

import installShell from './shell';
import installIndexPage from './indexPage';
import installRows from './rows';
import installDiscussionPage from './discussionPage';
import registerWidgets from './widgets';
import { bootVisits } from './visits';

// NOTE: the admin extender is exported from js/src/admin/index.tsx and
// NOWHERE else. It imports flarum/admin/app, which does not exist on the
// forum, and re-exporting it here would take the whole forum down at boot.

/*
 * Priority -100 so this runs AFTER other extensions' initializers: Concourse
 * wraps what flarum/tags and others have already added (the tag hero, the
 * sidebar's nav items, the composer's tag pre-fill) instead of being wrapped
 * by them.
 */
app.initializers.add(
  'ernestdefoe-concourse',
  () => {
    bootVisits();
    installShell();
    installIndexPage();
    installRows();
    installDiscussionPage();
    registerWidgets();

    extend(DiscussionListItem.prototype, 'infoItems', function (this: any, items) {
      const discussion = this.attrs.discussion;
      let excerpt = discussion.attribute('concourseExcerpt');

      if (excerpt) {
        items.add('excerpt', m('div', { className: 'ConcourseExcerpt' }, excerpt + '...'), 50);
      } else {
        if (!discussion._fetchingExcerpt) {
          discussion._fetchingExcerpt = true;
          fetch(app.forum.attribute('apiUrl') + '/discussions/' + discussion.id())
            .then(res => res.json())
            .then(data => {
              const firstPostRel = data.data.relationships.firstPost.data;
              const post = data.included?.find((i: any) => i.type === 'posts' && i.id === firstPostRel.id);
              if (post && post.attributes.contentHtml) {
                let text = post.attributes.contentHtml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
                discussion.pushAttributes({ concourseExcerpt: text.substring(0, 150) });
                m.redraw();
              }
            })
            .finally(() => { discussion._fetchingExcerpt = false; });
        }
      }
    });
  },
  -100
);