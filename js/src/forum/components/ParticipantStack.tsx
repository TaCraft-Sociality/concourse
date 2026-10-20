import Component from 'flarum/common/Component';

import Face, { type FaceData } from './Face';
import { ts } from '../util';

interface StackAttrs {
  discussion: any;
  /** How many faces to draw before "+N". */
  max?: number;
  link?: boolean;
}

/**
 * The people taking part: the author first, then whoever was active most
 * recently, then "+N" for the rest.
 *
 * The faces come from `concourseParticipants` (at most five per discussion,
 * eager-loaded for the whole page) and the total from core's own
 * `participantCount`, so nothing here costs a request.
 */
export default class ParticipantStack extends Component<StackAttrs> {
  view() {
    const { discussion, link } = this.attrs;
    const max = this.attrs.max ?? 5;
    const people = participants(discussion).slice(0, max);

    // One face is only the author, who the row already shows.
    if (people.length < 2) return null;

    const total = Math.max(discussion.attribute('participantCount') || 0, people.length);
    const more = total - people.length;

    return (
      <span className="ConcourseParticipants" aria-label={ts('row.participants', { count: total })}>
        {people.map((person) => (
          <Face key={person.id} person={person} link={link} />
        ))}
        {more > 0 ? <span className="ConcourseParticipants-more">+{more}</span> : null}
      </span>
    );
  }
}

export function participants(discussion: any): FaceData[] {
  const list = discussion.attribute('concourseParticipants') as FaceData[] | undefined;
  if (!Array.isArray(list)) return [];

  const author = discussion.user?.();
  const authorId = author ? Number(author.id()) : null;
  const first = authorId === null ? [] : list.filter((p) => p.id === authorId);

  // The author leads even when they have not posted lately.
  if (author && !first.length) {
    first.push({
      id: authorId!,
      displayName: author.displayName(),
      slug: author.slug(),
      avatarUrl: author.avatarUrl() || null,
    });
  }

  return [...first, ...list.filter((p) => p.id !== authorId)];
}
