import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import Icon from 'flarum/common/components/Icon';
import abbreviateNumber from 'flarum/common/utils/abbreviateNumber';
import DiscussionListItem from 'flarum/forum/components/DiscussionListItem';

import ParticipantStack from './components/ParticipantStack';
import { ts } from './util';

/**
 * Discussion rows as Central drew them: core's own row, with the opening
 * post's like count beside the reply count, and the people taking part
 * under the title.
 *
 * Added to core's item lists rather than replacing the view, so the avatar,
 * badges, the controls dropdown, swipe-to-read and anything other extensions
 * add to a row still work.
 */
export default function installRows() {
  extend(DiscussionListItem.prototype, 'statsItems', function (this: any, items) {
    const likes = this.attrs.discussion.attribute('concourseLikes');

    // Not sent at all without flarum/likes; a row with none says nothing.
    if (typeof likes !== 'number' || likes < 1) return;

    // Core's own stats-item markup, drawn here: its component is not a
    // module export the registry hands out, only the row's default is.
    items.add(
      'concourseLikes',
      <span className="DiscussionListItem-stats-item ConcourseLikes">
        <span className="DiscussionListItem-stats-item-icon">
          <Icon name="far fa-heart" />
        </span>
        <span className="DiscussionListItem-stats-item-label">
          <span aria-hidden="true">{abbreviateNumber(likes)}</span>
          <span className="visually-hidden">{ts('row.likes', { count: likes })}</span>
        </span>
      </span>,
      75
    );
  });

  extend(DiscussionListItem.prototype, 'mainView', function (this: any, vdom: any) {
    if (app.forum.attribute('concourseShowParticipants') === false || !vdom || !Array.isArray(vdom.children)) return;

    vdom.children.push(<ParticipantStack discussion={this.attrs.discussion} />);
  });
}
