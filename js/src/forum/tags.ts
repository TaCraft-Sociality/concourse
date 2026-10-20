import app from 'flarum/forum/app';

import { tagsEnabled } from './util';

/**
 * The sidebar's tag tree: each primary tag in the forum's own order, its
 * children under it, then the most active secondary tags.
 *
 * Nothing is fetched: flarum/tags puts the top-level tags in the forum
 * payload, and Concourse adds the child tags to the same request.
 */

export interface TagBranch {
  tag: any;
  children: any[];
}

const byPosition = (a: any, b: any) => (a.position() ?? 0) - (b.position() ?? 0);

/** How many secondary tags the sidebar lists before "All tags". */
const SECONDARY = 5;

export function tagTree(): { primary: TagBranch[]; secondary: any[]; more: boolean } {
  if (!tagsEnabled()) return { primary: [], secondary: [], more: false };

  const tags = app.store.all<any>('tags');
  const children: Record<string, any[]> = {};

  for (const tag of tags) {
    if (tag.position() === null || !tag.isChild()) continue;
    const parent = tag.parent();
    if (parent) (children[parent.id()] ||= []).push(tag);
  }

  const primary = tags
    .filter((tag) => tag.position() !== null && !tag.isChild())
    .sort(byPosition)
    .map((tag) => ({ tag, children: (children[tag.id()] || []).sort(byPosition) }));

  const secondary = tags.filter((tag) => tag.position() === null && !tag.isChild()).sort((a, b) => b.discussionCount() - a.discussionCount());

  return { primary, secondary: secondary.slice(0, SECONDARY), more: secondary.length > SECONDARY };
}
