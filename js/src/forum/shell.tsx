import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import { closeDrawer, isDrawerOpen } from './drawer';

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

    mount(root.querySelector('.App-content') || root, 'ConcourseShell-sidebar', Sidebar, true);

    const scrim = document.createElement('div');
    scrim.className = 'ConcourseShell-scrim';
    scrim.addEventListener('click', closeDrawer);
    root.append(scrim);

    mount(root, 'ConcourseShell-footer-wrapper', Footer);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isDrawerOpen()) closeDrawer();
    });

    const observer = new MutationObserver(() => {
      const isCustomPage = document.querySelector('.PagePage') || document.querySelector('.Pages');
      const sidebar = document.querySelector('.ConcourseShell-sidebar');
      const appContent = document.querySelector('.App-content');

      if (isCustomPage) {
        if (sidebar) (sidebar as HTMLElement).style.display = 'none';
        if (appContent) {
          (appContent as HTMLElement).style.display = 'block';
          (appContent as HTMLElement).style.gridTemplateColumns = '1fr';
        }
      } else {
        if (sidebar) (sidebar as HTMLElement).style.display = '';
        if (appContent) {
          (appContent as HTMLElement).style.display = '';
          (appContent as HTMLElement).style.gridTemplateColumns = '';
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  });
}