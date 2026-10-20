import app from 'flarum/forum/app';
import { extend, override } from 'flarum/common/extend';
import Component from 'flarum/common/Component';
import abbreviateNumber from 'flarum/common/utils/abbreviateNumber';
import humanTime from 'flarum/common/helpers/humanTime';
import DiscussionPage from 'flarum/forum/components/DiscussionPage';

import ParticipantStack from './components/ParticipantStack';
import { t, ts } from './util';

/**
 * The discussion page's side column: core's Reply button and controls, then
 * one panel holding who is taking part, three numbers and core's scrubber,
 * restyled (less/discussion.less) with a date beside each end.
 *
 * Nothing here asks the server for anything: the faces come with the
 * discussion (extend.php), the numbers are core's own attributes, and the
 * views count is fof/discussion-views' when it is installed.
 */
export default function installDiscussionPage() {
  extend(DiscussionPage.prototype, 'sidebarItems', function (this: any, items) {
    const discussion = this.discussion;
    if (!discussion) return;

    items.add('concoursePanel', <DiscussionPanel discussion={discussion} />, -90);
  });

  /*
   * 🚨 By module PATH, not an import: core loads the scrubber in its own
   * chunk, so at boot the class does not exist to be imported.
   */
  override('flarum/forum/components/PostStreamScrubber' as any, 'firstPostLabel' as any, function (this: any, original: () => any) {
    const at = this.stream?.discussion?.createdAt?.();
    return at ? [original(), <small className="ConcourseScrubber-when">{humanTime(at)}</small>] : original();
  });

  override('flarum/forum/components/PostStreamScrubber' as any, 'lastPostLabel' as any, function (this: any, original: () => any) {
    const at = this.stream?.discussion?.lastPostedAt?.();
    return at ? [original(), <small className="ConcourseScrubber-when">{humanTime(at)}</small>] : original();
  });
}

class DiscussionPanel extends Component<{ discussion: any }> {
  view() {
    const discussion = this.attrs.discussion;
    const replies = Math.max(0, discussion.replyCount() || 0);
    const people = discussion.attribute('participantCount') || 0;
    const views = discussion.attribute('views');

    const stats: [string, number][] = [
      ['replies', replies],
      ['participants', people],
    ];

    if (typeof views === 'number') stats.push(['views', views]);

    return (
      <section className="ConcoursePanel" aria-label={ts('panel.label')}>
        {app.forum.attribute('concourseShowParticipants') === false ? null : <ParticipantStack discussion={discussion} max={6} link />}
        <dl className="ConcoursePanel-stats">
          {stats.map(([key, n]) => (
            <div className="ConcoursePanel-stat">
              <dt>{t('panel.' + key, { count: n })}</dt>
              <dd>{abbreviateNumber(n)}</dd>
            </div>
          ))}
        </dl>
      </section>
    );
  }
}
