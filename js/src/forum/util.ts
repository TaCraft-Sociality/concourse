import app from 'flarum/forum/app';
import IndexSidebar from 'flarum/forum/components/IndexSidebar';

export const t = (key: string, params: Record<string, any> = {}) => app.translator.trans(`ernestdefoe-concourse.forum.${key}`, params);

/** The same text, as a plain string, for attributes like aria-label. */
export const ts = (key: string, params: Record<string, any> = {}): string =>
  app.translator.trans(`ernestdefoe-concourse.forum.${key}`, params, true) as unknown as string;

export function extensionEnabled(id: string): boolean {
  return id in ((flarum as any).extensions || {});
}

export function tagsEnabled(): boolean {
  return extensionEnabled('flarum-tags');
}

export function currentTag(): any {
  return tagsEnabled() && typeof (app as any).currentTag === 'function' ? (app as any).currentTag() : null;
}

export function canStart(): boolean {
  return !app.session.user || !!app.forum.attribute('canStartDiscussion');
}

/**
 * Open the composer the way core's sidebar button does — through
 * IndexSidebar's own action, so flarum/tags (and anything else extending it)
 * still pre-fills the current tag, and a guest is asked to log in first.
 */
export function startDiscussion() {
  IndexSidebar.prototype.newDiscussionAction.call(Object.create(IndexSidebar.prototype)).catch(() => {});
}
