import app from 'flarum/forum/app';

/**
 * "New since your last visit", kept in the reader's own browser, for the
 * unread dots in the sidebar's tag tree.
 *
 * 🚨 Nothing here touches the server. Core has no notion of a previous visit:
 * `last_seen_at` is rewritten every few minutes while somebody reads, so by
 * the time a page renders it says "just now". A visit is therefore tracked
 * where it happens — a gap of half an hour or more starts a new one — and
 * each tag's `lastPostedAt`, already in the forum payload, is compared with
 * it. No query, and a guest gets the same as a member.
 *
 * Storage can be missing or throw (private windows, blocked site data); every
 * access is guarded and the sidebar simply shows no dots then.
 */

const KEY = 'concourse.visits';
const GAP = 30 * 60 * 1000;

interface Visits {
  /** When this browser last saw the forum. */
  last: number;
  /** When the visit before this one ended: the "since" line. */
  prev: number;
  /** Per tag, when the reader last opened it. */
  seen: Record<string, number>;
}

let state: Visits = { last: 0, prev: 0, seen: {} };

function save() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    // Storage unavailable: the visit simply is not remembered.
  }
}

export function bootVisits() {
  const now = Date.now();

  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;

    if (parsed && typeof parsed === 'object') {
      state = {
        last: Number(parsed.last) || 0,
        prev: Number(parsed.prev) || 0,
        seen: parsed.seen && typeof parsed.seen === 'object' ? parsed.seen : {},
      };
    }
  } catch (e) {
    // Unreadable or corrupt: start over.
  }

  if (state.last && now - state.last > GAP) {
    state.prev = state.last;
  }

  // Forget tags nobody has opened for a month, so the record cannot grow
  // without bound on a forum with many tags.
  for (const id in state.seen) {
    if (now - state.seen[id] > 30 * 24 * 3600 * 1000) delete state.seen[id];
  }

  touch();

  // Keep `last` current while the tab is open, so leaving for lunch and
  // coming back counts as a new visit and a long read does not.
  window.setInterval(() => document.visibilityState === 'visible' && touch(), 60 * 1000);
}

function touch() {
  state.last = Date.now();
  save();
}

export function markTagSeen(id: string) {
  state.seen[id] = Date.now();
  save();
}

/**
 * Something was posted in this tag after the reader last looked: after the
 * previous visit, after they marked everything read, and after they last
 * opened the tag itself. A first visit shows no dots: everything would be
 * "new", which says nothing.
 */
export function tagUnread(tag: any): boolean {
  const posted = tag.lastPostedAt?.()?.getTime?.() || 0;
  if (!posted || !state.prev) return false;

  const markedAll = app.session.user?.markedAllAsReadAt()?.getTime() || 0;

  return posted > Math.max(state.prev, markedAll, state.seen[tag.id()] || 0);
}
