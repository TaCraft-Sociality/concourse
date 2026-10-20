import app from 'flarum/forum/app';

import type { FaceData } from './components/Face';

/**
 * Top Contributors' data, held OUTSIDE any component.
 *
 * 🚨 A widget is not mounted once — Bespoke rebuilds its zones on every
 * redraw — so a block that fetched in `oninit` would fetch, redraw, be
 * rebuilt and fetch again. One answer per period lives here, with one request
 * in flight per period, and every placement reads it.
 */

export type Period = 'day' | 'week' | 'month' | 'year';
export const PERIODS: Period[] = ['day', 'week', 'month', 'year'];

export interface Contributor extends FaceData {
  count: number;
}

interface Answer {
  metric: 'likes' | 'posts';
  users: Contributor[];
  at: number;
}

/** The server caches each ranking for minutes; asking again sooner is waste. */
const FRESH = 5 * 60 * 1000;

const answers: Partial<Record<Period, Answer>> = {};
const loading: Partial<Record<Period, Promise<void>>> = {};

let chosen: Period | null = null;

export function period(): Period {
  if (chosen) return chosen;

  const setting = app.forum.attribute<string>('concourseContributorsPeriod');
  return (PERIODS as string[]).includes(setting) ? (setting as Period) : 'week';
}

export function choose(next: Period) {
  chosen = next;
  load(next);
}

export function answer(p: Period = period()): Answer | null {
  return answers[p] || null;
}

export function load(p: Period = period()): void {
  const have = answers[p];
  if (loading[p] || (have && Date.now() - have.at < FRESH)) return;

  loading[p] = app
    .request<{ metric: 'likes' | 'posts'; users: Contributor[] }>({
      method: 'GET',
      url: app.forum.attribute('apiUrl') + '/concourse/top-contributors',
      params: { period: p },
    })
    .then((res) => {
      answers[p] = { metric: res.metric, users: Array.isArray(res.users) ? res.users : [], at: Date.now() };
    })
    .catch(() => {
      // Keep whatever was there; an empty list is not the same as "unknown".
      answers[p] ||= { metric: 'likes', users: [], at: Date.now() };
    })
    .finally(() => {
      delete loading[p];
      m.redraw();
    });
}
