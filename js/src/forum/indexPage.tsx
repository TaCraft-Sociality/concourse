import app from 'flarum/forum/app';
import { extend, override } from 'flarum/common/extend';
import Component from 'flarum/common/Component';
import Link from 'flarum/common/components/Link';
import Icon from 'flarum/common/components/Icon';
import listItems from 'flarum/common/helpers/listItems';
import IndexPage from 'flarum/forum/components/IndexPage';
import WelcomeHero from 'flarum/forum/components/WelcomeHero';
import PageStructure from 'flarum/forum/components/PageStructure';

import ProfileCard, { profileEnabled } from './components/ProfileCard';
import TopContributors, { contributorsEnabled } from './components/TopContributors';
import { placedElsewhere } from './blocks';
import { markTagSeen } from './visits';
import { currentTag, t, ts } from './util';

/** fof/forum-widgets-core's side section, as it names its own item. */
const FOF_SIDE_ITEM = 'endWidgetSection';

/**
 * The index page as Central drew it: one card holding a title row (with the
 * sort dropdown) and the list, and a column of blocks on the right.
 */
export default function installIndexPage() {
  // The title row replaces the hero; the forum's welcome message moves into
  // the card (below), so an owner who wrote one does not lose it.
  override(IndexPage.prototype, 'hero', () => null);

  // The sidebar is the shell's now, on every page.
  override(IndexPage.prototype, 'sidebar', () => null);

  extend(IndexPage.prototype, 'contentItems', function (this: any, items) {
    const tag = currentTag();
    if (tag) markTagSeen(tag.id());

    items.remove('toolbar');
    items.add('concourseHead', <PageHead page={this} current={tag} />, 100);

    if (!tag && !app.search.state.params().q) {
      items.add(
        'concourseWelcome',
        <div className="ConcourseWelcome">
          <WelcomeHero />
        </div>,
        95
      );
    }
  });

  extend(PageStructure.prototype, 'containerItems', function (items) {
    if (!app.current.matches(IndexPage)) return;

    /*
     * fof/forum-widgets-core puts its side section in this list too. Left
     * alone that is a fourth column; adopted, the operator's side widgets
     * stack under Concourse's blocks in one right-hand column.
     */
    let side = null;

    if (items.has(FOF_SIDE_ITEM)) {
      side = items.get(FOF_SIDE_ITEM);
      items.remove(FOF_SIDE_ITEM);
    }

    const profile = profileEnabled() && !placedElsewhere('profile');
    const contributors = contributorsEnabled() && !placedElsewhere('contributors');

    if (!profile && !contributors && !side) return;

    items.add(
      'concourseBlocks',
      <aside className="ConcourseBlocks" aria-label={ts('blocks.label')}>
        {profile ? <ProfileCard host="concourse" /> : null}
        {contributors ? <TopContributors host="concourse" /> : null}
        {side}
      </aside>,
      5
    );
  });
}

// 🚨 `current`, never `tag`: Flarum's Component refuses an attribute named
// `tag` (Mithril 2 reserves it) and throws on init.
interface HeadAttrs {
  page: any;
  current: any;
}

/**
 * The card's title row: what this list is, then core's own toolbar — the
 * sort dropdown and anything other extensions add — kept rather than
 * rebuilt.
 */
class PageHead extends Component<HeadAttrs> {
  view() {
    const { page, current: tag } = this.attrs;
    const following = (m.route.get() || '').startsWith('/following');
    const q = app.search.state.params().q;
    const children = tag ? app.store.all<any>('tags').filter((other) => other.parent?.() === tag && other.position() !== null) : [];

    let icon = <Icon name="fas fa-house" className="ConcourseHead-icon" />;
    let title: any = t('sidebar.home');

    if (tag) {
      icon = <span className="ConcourseHead-swatch" style={{ '--tag-color': tag.color() || 'var(--cc-faint)' }} aria-hidden="true" />;
      title = tag.name();
    } else if (following) {
      icon = <Icon name="far fa-file-lines" className="ConcourseHead-icon" />;
      title = t('sidebar.following');
    } else if (q) {
      icon = <Icon name="fas fa-magnifying-glass" className="ConcourseHead-icon" />;
      title = t('head.search', { q });
    }

    return (
      <div className="ConcourseHead">
        <div className="ConcourseHead-row">
          {icon}
          <div className="ConcourseHead-text">
            <h1 className="ConcourseHead-title">{title}</h1>
            {tag && tag.description() ? <p className="ConcourseHead-description">{tag.description()}</p> : null}
            {children.length ? (
              <ul className="ConcourseHead-children">
                {children.map((child: any) => (
                  <li>
                    <Link href={app.route('tag', { tags: child.slug() })} className="ConcourseChip">
                      {child.name()}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="ConcourseHead-tools">
            <ul className="ConcourseHead-actions">{listItems(page.actionItems().toArray())}</ul>
            <ul className="ConcourseHead-view">{listItems(page.viewItems().toArray())}</ul>
          </div>
        </div>
      </div>
    );
  }
}
