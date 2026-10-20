import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Link from 'flarum/common/components/Link';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';
import type Mithril from 'mithril';

import Face from './Face';
import { PERIODS, answer, choose, load, period, type Period } from '../contributorsStore';
import { claim, release } from '../blocks';
import { t, ts } from '../util';
import formatCount from '../formatCount';

export function contributorsEnabled(): boolean {
  return app.forum.attribute('concourseShowContributors') !== false;
}

interface Attrs {
  host: string;
  /** Hosts with their own title bar (FoF) pass false. */
  heading?: boolean;
}

/**
 * Top Contributors, switchable between today, this week, this month and this
 * year. Ranked by likes received, or by comments on a forum without
 * flarum/likes (TopContributors.php).
 */
export default class TopContributors extends Component<Attrs> {
  oninit(vnode: Mithril.Vnode<Attrs, this>) {
    super.oninit(vnode);
    claim('contributors', this.attrs.host);
    load();
  }

  onremove() {
    release('contributors', this.attrs.host);
  }

  view() {
    const current = period();
    const data = answer(current);
    const id = 'ConcourseContributors-period-' + this.attrs.host;

    return (
      <section className="ConcourseBlock ConcourseContributors" aria-label={ts('contributors.title')}>
        <header className="ConcourseBlock-head">
          {this.attrs.heading === false ? null : <h2 className="ConcourseBlock-title">{t('contributors.title')}</h2>}
          <label className="visually-hidden" for={id}>
            {t('contributors.period_label')}
          </label>
          <select
            id={id}
            className="ConcourseContributors-period"
            value={current}
            onchange={(e: Event) => choose((e.target as HTMLSelectElement).value as Period)}
          >
            {PERIODS.map((p) => (
              <option value={p}>{t('contributors.period.' + p)}</option>
            ))}
          </select>
        </header>
        {!data ? (
          <LoadingIndicator size="small" display="block" />
        ) : data.users.length ? (
          <ol className="ConcourseContributors-list">
            {data.users.map((user, i) => (
              <li key={user.id} className={i === 0 ? 'ConcourseContributors-first' : ''}>
                <span className="ConcourseContributors-rank" aria-hidden="true">
                  {i + 1}.
                </span>
                <Face person={user} link />
                <span className="ConcourseContributors-text">
                  <Link href={app.route('user', { username: user.slug })} className="ConcourseContributors-name">
                    {user.displayName}
                  </Link>
                  <span className="ConcourseContributors-count">
                    {t('contributors.' + data.metric, { count: user.count, formatted: formatCount(user.count) })}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="ConcourseBlock-empty">{t('contributors.empty.' + current)}</p>
        )}
      </section>
    );
  }
}
