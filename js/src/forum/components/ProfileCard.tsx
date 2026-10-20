import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Link from 'flarum/common/components/Link';
import Avatar from 'flarum/common/components/Avatar';
import Button from 'flarum/common/components/Button';
import username from 'flarum/common/helpers/username';
import type Mithril from 'mithril';

import { claim, release } from '../blocks';
import { t, ts } from '../util';

export function profileEnabled(): boolean {
  return app.forum.attribute('concourseShowProfile') !== false;
}

interface Attrs {
  host: string;
}

/**
 * The reader's own card: cover, avatar, name, handle, bio and Edit Profile.
 * A guest gets the forum's welcome and the sign-up and log-in buttons
 * instead.
 *
 * Everything comes from the session user already in the payload: no request.
 * The cover is sycho/flarum-profile-cover's when the member has set one,
 * otherwise a band in their own colour; the bio is fof/user-bio's.
 */
export default class ProfileCard extends Component<Attrs> {
  oninit(vnode: Mithril.Vnode<Attrs, this>) {
    super.oninit(vnode);
    claim('profile', this.attrs.host);
  }

  onremove() {
    release('profile', this.attrs.host);
  }

  view() {
    const user = app.session.user;
    return user ? this.member(user) : this.guest();
  }

  member(user: any) {
    const cover = user.attribute('cover') as string | null | undefined;
    const bioHtml = user.attribute('bioHtml') as string | null | undefined;
    const bio = user.attribute('bio') as string | null | undefined;
    const color = user.color() || 'var(--cc-faint)';

    return (
      <section className="ConcourseBlock ConcourseProfile" aria-label={ts('profile.label')}>
        <div className={'ConcourseProfile-cover' + (cover ? ' ConcourseProfile-cover--image' : '')} style={{ '--cover-color': color }}>
          {cover ? <img src={cover} alt="" loading="lazy" /> : null}
        </div>
        <div className="ConcourseProfile-body">
          <Link href={app.route.user(user)} className="ConcourseProfile-avatar">
            <Avatar user={user} />
          </Link>
          <Link href={app.route.user(user)} className="ConcourseProfile-name">
            {username(user)}
          </Link>
          <span className="ConcourseProfile-handle">@{user.username()}</span>
          {bioHtml ? <div className="ConcourseProfile-bio">{m.trust(bioHtml)}</div> : bio ? <p className="ConcourseProfile-bio">{bio}</p> : null}
          <Link href={app.route.user(user)} className="Button ConcourseProfile-edit">
            {t('profile.edit')}
          </Link>
        </div>
      </section>
    );
  }

  guest() {
    const forum = app.forum;
    const description = forum.attribute<string>('description');

    return (
      <section className="ConcourseBlock ConcourseProfile ConcourseProfile--guest" aria-label={ts('profile.label')}>
        <div className="ConcourseProfile-body">
          <h2 className="ConcourseProfile-name">{t('profile.welcome', { forum: forum.attribute('title') })}</h2>
          {description ? <p className="ConcourseProfile-bio">{description}</p> : null}
          {forum.attribute('allowSignUp') ? (
            <Button
              className="Button Button--primary ConcourseProfile-edit"
              onclick={() => app.modal.show(() => import('flarum/forum/components/SignUpModal'))}
            >
              {app.translator.trans('core.forum.header.sign_up_link')}
            </Button>
          ) : null}
          <Button className="Button ConcourseProfile-edit" onclick={() => app.modal.show(() => import('flarum/forum/components/LogInModal'))}>
            {app.translator.trans('core.forum.header.log_in_link')}
          </Button>
        </div>
      </section>
    );
  }
}
