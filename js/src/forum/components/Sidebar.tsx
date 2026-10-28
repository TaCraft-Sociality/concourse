import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Link from 'flarum/common/components/Link';
import Icon from 'flarum/common/components/Icon';
import listItems from 'flarum/common/helpers/listItems';
import classList from 'flarum/common/utils/classList';
import IndexSidebar from 'flarum/forum/components/IndexSidebar';
import IndexPage from 'flarum/forum/components/IndexPage';
import type Mithril from 'mithril';

import { tagTree } from '../tags';
import { markTagSeen, tagUnread } from '../visits';
import { closeDrawer } from '../drawer';
import { canStart, currentTag, extensionEnabled, startDiscussion, t, ts } from '../util';

/**
 * Core's sidebar navigation, minus what Concourse draws itself.
 *
 * 🚨 Built from `IndexSidebar.navItems()` rather than drawn from scratch, so
 * everything other extensions add there — private discussions, a page link,
 * a leaderboard — still appears. Dropped: "All discussions" (our Home),
 * Following (ours, with the others at the top), and flarum/tags' own tag
 * links (the tree below).
 */
const OURS = /^(allDiscussions|following|tags|separator|moreTags|tag\d+)$/;

function extraNavItems(): Mithril.Children[] {
  let items;

  try {
    items = IndexSidebar.prototype.navItems.call(Object.create(IndexSidebar.prototype));
  } catch (e) {
    return [];
  }

  for (const key of Object.keys(items.toObject())) {
    if (OURS.test(key)) items.remove(key);
  }

  return items.toArray();
}

const COLLAPSED = 'concourse.tagsCollapsed';
const MORE_COLLAPSED = 'concourse.moreCollapsed';

function readCollapsed(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === '1';
  } catch (e) {
    return false;
  }
}

/**
 * The left sidebar: Home, Following, Admin, New Discussion, whatever other
 * extensions add, the tag tree, and the admin's footer links.
 *
 * Mounted once, outside the router (see shell.tsx), so it is the same element
 * on every page — the discussion page and profiles included.
 */
export default class Sidebar extends Component {
  collapsed = readCollapsed(COLLAPSED);
  moreCollapsed = readCollapsed(MORE_COLLAPSED);

  view() {
    const user = app.session.user;
    const route = m.route.get() || '/';
    const onIndex = app.current.matches(IndexPage);
    const active = onIndex ? currentTag() : null;
    const following = route.startsWith('/following');
    const home = onIndex && !active && !following && !app.search.state.params().q;
    const tree = tagTree();
    const footer = (app.forum.attribute<{ label: string; url: string }[]>('concourseFooterLinks') || []).filter((l) => l && l.url);

    return (
      <nav className="ConcourseSidebar" aria-label={ts('sidebar.label')}>
        <ul className="ConcourseNav">
          <li>
            <Link
              href={app.route('index')}
              className={classList('ConcourseNav-item', { active: home })}
              aria-current={home ? 'page' : undefined}
              onclick={closeDrawer}
            >
              <Icon name="fas fa-house" className="ConcourseNav-icon" />
              <span className="ConcourseNav-label">{t('sidebar.home')}</span>
            </Link>
          </li>
          {user && extensionEnabled('flarum-subscriptions') ? (
            <li>
              <Link
                href={app.route('following')}
                className={classList('ConcourseNav-item', { active: following })}
                aria-current={following ? 'page' : undefined}
                onclick={closeDrawer}
              >
                <Icon name="far fa-file-lines" className="ConcourseNav-icon" />
                <span className="ConcourseNav-label">{t('sidebar.following')}</span>
              </Link>
            </li>
          ) : null}
          {user && user.isAdmin() ? (
            <li>
              <a href={app.forum.attribute('adminUrl')} className="ConcourseNav-item">
                <Icon name="fas fa-wrench" className="ConcourseNav-icon" />
                <span className="ConcourseNav-label">{t('sidebar.admin')}</span>
              </a>
            </li>
          ) : null}
          {canStart() ? (
            <li>
              <button
                type="button"
                className="ConcourseNav-item"
                onclick={() => {
                  closeDrawer();
                  startDiscussion();
                }}
              >
                <Icon name="far fa-square-plus" className="ConcourseNav-icon" />
                <span className="ConcourseNav-label">{app.translator.trans('core.forum.index.start_discussion_button')}</span>
              </button>
            </li>
          ) : null}
        </ul>

        {tree.primary.length || tree.secondary.length ? (
          <section className={classList('ConcourseTags', { collapsed: this.collapsed })}>
            <h2 className="ConcourseTags-heading">
              <button type="button" className="ConcourseTags-toggle" aria-expanded={this.collapsed ? 'false' : 'true'} onclick={() => this.toggle()}>
                <Icon name="fas fa-chevron-down" className="ConcourseTags-chevron" />
                <span className="ConcourseNav-label">{t('sidebar.tags')}</span>
              </button>
            </h2>
            {this.collapsed ? null : (
              <ul className="ConcourseTags-list">
                {tree.primary.map(({ tag, children }) => [
                  this.tagLink(tag, active, false),
                  children.length ? (
                    <li className="ConcourseTags-children">
                      <ul>{children.map((child) => this.tagLink(child, active, true))}</ul>
                    </li>
                  ) : null,
                ])}
                {tree.secondary.map((tag) => this.tagLink(tag, active, false))}
                <li>
                  <Link href={app.route('tags')} className="ConcourseTag ConcourseTag--all" onclick={closeDrawer}>
                    <Icon name="fas fa-list" className="ConcourseTag-icon" />
                    <span className="ConcourseTag-name">{t('sidebar.all_tags')}</span>
                  </Link>
                </li>
              </ul>
            )}
          </section>
        ) : null}

        {this.extras()}

        {footer.length ? (
          <footer className="ConcourseSidebar-footer">
            {footer.map((link, i) => [
              i ? <span aria-hidden="true"> · </span> : null,
              /^\//.test(link.url) ? (
                <Link href={link.url}>{link.label}</Link>
              ) : (
                <a href={link.url} rel="noopener">
                  {link.label}
                </a>
              ),
            ])}
          </footer>
        ) : null}
      </nav>
    );
  }

  /**
   * Whatever other extensions add to the sidebar, in a section of its own
   * AFTER the tag tree: a forum with fifteen extensions must not push its
   * tags off the screen.
   */
  extras() {
    const nav = extraNavItems();
    if (!nav.length) return null;

    return (
      <section className={classList('ConcourseTags ConcourseMore', { collapsed: this.moreCollapsed })}>
        <h2 className="ConcourseTags-heading">
          <button
            type="button"
            className="ConcourseTags-toggle"
            aria-expanded={this.moreCollapsed ? 'false' : 'true'}
            onclick={() => this.toggle('more')}
          >
            <Icon name="fas fa-chevron-down" className="ConcourseTags-chevron" />
            <span className="ConcourseNav-label">{t('sidebar.more')}</span>
          </button>
        </h2>
        {this.moreCollapsed ? null : (
          <ul className="ConcourseNav ConcourseNav--extra" onclick={closeDrawer}>
            {listItems(nav)}
          </ul>
        )}
      </section>
    );
  }

  toggle(which: 'tags' | 'more' = 'tags') {
    const key = which === 'tags' ? COLLAPSED : MORE_COLLAPSED;
    const next = which === 'tags' ? (this.collapsed = !this.collapsed) : (this.moreCollapsed = !this.moreCollapsed);

    try {
      window.localStorage.setItem(key, next ? '1' : '0');
    } catch (e) {
      // Not remembered; it still toggles for this visit.
    }
  }

  tagLink(tag: any, active: any, child: boolean) {
    const isActive = active === tag;
    const unread = !isActive && tagUnread(tag);

    // Unkeyed on purpose: the list mixes fragments (a tag with its children)
    // and single rows, and Mithril refuses keyed and unkeyed siblings.
    return (
      <li>
        <Link
          href={app.route('tag', { tags: tag.slug() })}
          className={classList('ConcourseTag', { active: isActive, 'ConcourseTag--child': child })}
          aria-current={isActive ? 'page' : undefined}
          onclick={() => {
            markTagSeen(tag.id());
            closeDrawer();
          }}
        >
          {child ? null : <span className="ConcourseTag-swatch" style={{ '--tag-color': tag.color() || 'var(--cc-faint)' }} aria-hidden="true" />}
          <span className="ConcourseTag-name">
            {tag.name()} <span className="ConcourseTag-count">({tag.discussionCount()})</span>
          </span>
          {unread ? <span className="ConcourseTag-dot" role="img" aria-label={ts('sidebar.unread')} /> : null}
        </Link>
      </li>
    );
  }
}
