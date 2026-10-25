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