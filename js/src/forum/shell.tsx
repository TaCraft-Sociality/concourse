import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import Link from 'flarum/common/components/Link';
import Icon from 'flarum/common/components/Icon';
import classList from 'flarum/common/utils/classList';
import IndexPage from 'flarum/forum/components/IndexPage';

import Sidebar from './components/Sidebar';
import { closeDrawer, isDrawerOpen, toggleDrawer } from './drawer';
import formatCount from './formatCount';
import { canStart, extensionEnabled, startDiscussion, tagsEnabled, t, ts } from './util';

/**
 * The parts of Concourse that are on every page: the left sidebar, and on
 * phones the tab bar along the bottom.
 *
 * 🚨 Mounted next to the router rather than inside a page, the same way core
 * mounts its own header. A page component only exists while its route does,
 * so a sidebar drawn by IndexPage would vanish on every discussion and
 * profile; mounted here it is one element for the whole visit, and `m.mount`
 * puts it on the same redraw as everything else.
 */
export default function installShell() {
  extend(app, 'mount', () => {
    const root = document.getElementById('app');
    if (!root) return;

    const mount = (parent: Element, className: string, component: any, first = false) => {
      const el = document.createElement('div');
      el.className = className;
      first ? parent.prepend(el) : parent.append(el);
      m.mount(el, component);
    };

    // The sidebar is the first column of .App-content's grid (layout.less),
    // so whatever a page renders — a container or a full-width section —
    // starts beside it rather than under it.
    mount(root.querySelector('.App-content') || root, 'ConcourseShell-sidebar', Sidebar, true);
    mount(root, 'ConcourseShell-tabbar', TabBar);

    // The scrim behind the open drawer; a tap on it closes the drawer.
    const scrim = document.createElement('div');
    scrim.className = 'ConcourseShell-scrim';
    scrim.addEventListener('click', closeDrawer);
    root.append(scrim);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isDrawerOpen()) closeDrawer();
    });
  });
}

/** The phone's tab bar: Home, Tags, New, Messages, More. */
const TabBar = {
  view() {
    const user = app.session.user;
    const route = m.route.get() || '/';
    const messages = !!user && extensionEnabled('flarum-messages');
    const unread = (user && user.attribute<number>('unreadDialogCount')) || 0;

    // Unkeyed on purpose: which tabs exist changes (no Messages for a guest),
    // and Mithril refuses a mix of keyed tabs and empty slots.
    const tab = (icon: string, label: any, href: string, active: boolean, badge = 0) => (
      <Link href={href} className={classList('ConcourseTab', { active })} aria-current={active ? 'page' : undefined} onclick={closeDrawer}>
        <span className="ConcourseTab-icon">
          <Icon name={icon} />
          {badge ? <span className="ConcourseTab-badge">{formatCount(badge)}</span> : null}
        </span>
        <span className="ConcourseTab-label">{label}</span>
      </Link>
    );

    return (
      <nav className="ConcourseTabBar" aria-label={ts('phone.tabs')}>
        {tab('fas fa-house', t('sidebar.home'), app.route('index'), app.current.matches(IndexPage) && !isDrawerOpen() && route === '/')}
        {tagsEnabled() ? tab('fas fa-tags', t('sidebar.tags'), app.route('tags'), route.startsWith('/tags')) : null}
        {canStart() ? (
          <button
            type="button"
            className="ConcourseTab ConcourseTab--new"
            aria-label={app.translator.trans('core.forum.index.start_discussion_button', {}, true) as any}
            onclick={() => {
              closeDrawer();
              startDiscussion();
            }}
          >
            <span className="ConcourseTab-plus">
              <Icon name="fas fa-plus" />
            </span>
          </button>
        ) : null}
        {messages ? tab('far fa-envelope', t('phone.messages'), app.route('messages'), route.startsWith('/messages'), unread) : null}
        <button
          type="button"
          className={classList('ConcourseTab', { active: isDrawerOpen() })}
          aria-expanded={isDrawerOpen() ? 'true' : 'false'}
          onclick={toggleDrawer}
        >
          <span className="ConcourseTab-icon">
            <Icon name="fas fa-bars" />
          </span>
          <span className="ConcourseTab-label">{t('phone.more')}</span>
        </button>
      </nav>
    );
  },
};
