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
 * The cover is the member's own from ernestdefoe/backdrop (framed exactly as
 * on their profile) or sycho/flarum-profile-cover, otherwise a band in their
 * own colour; the bio is fof/user-bio's.
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
    const bioHtml = user.attribute('bioHtml') as string | null | undefined;
    const bio = user.attribute('bio') as string | null | undefined;
    const color = user.color() || 'var(--cc-faint)';

    return (
      <section className="ConcourseBlock ConcourseProfile" aria-label={ts('profile.label')}>
        {cover(user, color)}
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

const clamp = (value: unknown, min: number, max: number, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/**
 * The card's cover.
 *
 * Backdrop sends `{url, small, x, y, zoom}`: the small copy (960 px) is plenty
 * for a 19rem card, and x/y/zoom are the focal point and zoom the member set
 * in Backdrop's editor, so the card shows the same part of the picture as
 * their profile. Zoomed out below 1×, a blurred copy fills the edges, as
 * Backdrop does.
 */
function cover(user: any, color: string) {
  const backdrop = user.attribute('backdrop') as { url?: string; small?: string; x?: number; y?: number; zoom?: number } | null | undefined;
  const src = backdrop && (backdrop.small || backdrop.url);

  if (src) {
    const x = clamp(backdrop.x, 0, 100, 50);
    const y = clamp(backdrop.y, 0, 100, 50);
    const zoom = clamp(backdrop.zoom, 0.5, 4, 1);

    return (
      <div
        className={'ConcourseProfile-cover ConcourseProfile-cover--backdrop' + (zoom < 1 ? ' ConcourseProfile-cover--out' : '')}
        style={{
          // Only ever inside url("…"), with the characters that could end it encoded.
          '--cc-cover-image': `url("${String(src).replace(/["\\\n\r]/g, (c) => encodeURIComponent(c))}")`,
          '--cc-cover-x': `${x}%`,
          '--cc-cover-y': `${y}%`,
          '--cc-cover-zoom': String(zoom),
        }}
        aria-hidden="true"
      />
    );
  }

  const image = user.attribute('cover') as string | null | undefined;

  return (
    <div className={'ConcourseProfile-cover' + (image ? ' ConcourseProfile-cover--image' : '')} style={{ '--cover-color': color }}>
      {image ? <img src={image} alt="" loading="lazy" /> : null}
    </div>
  );
}
