import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Link from 'flarum/common/components/Link';
import stringToColor from 'flarum/common/utils/stringToColor';

export interface FaceData {
  id: number;
  displayName: string;
  slug: string;
  avatarUrl: string | null;
}

interface FaceAttrs {
  person: FaceData;
  link?: boolean;
  className?: string;
}

/**
 * A member's avatar from the plain shape Concourse's endpoints send — a
 * picture, or their initial on the colour core would give them — without a
 * user model in the store.
 */
export default class Face extends Component<FaceAttrs> {
  view() {
    const { person, link, className } = this.attrs;
    const name = person.displayName || '?';
    const inner = person.avatarUrl ? (
      <img className="ConcourseFace-img" src={person.avatarUrl} alt="" loading="lazy" />
    ) : (
      <span className="ConcourseFace-initial" style={{ '--face-color': '#' + stringToColor(name) }}>
        {name.charAt(0).toUpperCase()}
      </span>
    );

    const cls = 'ConcourseFace ' + (className || '');

    return link ? (
      <Link className={cls} href={app.route('user', { username: person.slug })} title={name} aria-label={name}>
        {inner}
      </Link>
    ) : (
      <span className={cls} title={name}>
        {inner}
      </span>
    );
  }
}
