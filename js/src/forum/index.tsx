import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import DiscussionListItem from 'flarum/forum/components/DiscussionListItem';

import installShell from './shell';
import installIndexPage from './indexPage';
import installRows from './rows';
import installDiscussionPage from './discussionPage';
import registerWidgets from './widgets';
import { bootVisits } from './visits';

app.initializers.add(
  'ernestdefoe-concourse',
  () => {
    bootVisits();
    installShell();
    installIndexPage();
    installRows();
    installDiscussionPage();
    registerWidgets();

    document.addEventListener('click', function (e) {
      const toggle = (e.target as HTMLElement).closest('.SessionDropdown .Dropdown-toggle');
      if (!toggle) return;

      setTimeout(() => {
        const menu = document.querySelector('.SessionDropdown .Dropdown-menu');
        if (menu && !menu.querySelector('.item-bindQQ')) {
          const user = app.session.user;
          if (!user) return;

          const li = document.createElement('li');
          li.className = 'item-bindQQ';
          
          li.innerHTML = `
            <a class="LinkButton hasIcon" href="/u/${user.id()}/security">
              <i aria-hidden="true" class="icon fab fa-qq Button-icon"></i>
              <span class="Button-label"><span class="Button-labelText">绑定 QQ</span></span>
            </a>
          `;
          
          const settings = menu.querySelector('.item-settings');
          if (settings) {
            settings.after(li);
          } else {
            menu.appendChild(li);
          }
        }
      }, 50);
    });

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