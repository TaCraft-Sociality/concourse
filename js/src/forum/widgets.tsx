import app from 'flarum/forum/app';

import ProfileCard, { profileEnabled } from './components/ProfileCard';
import TopContributors, { contributorsEnabled } from './components/TopContributors';

/**
 * The profile card and Top Contributors as widgets, for fof/forum-widgets-core
 * and for Bespoke.
 *
 * 🚨 Neither host is a build-time dependency. Each is resolved at RUNTIME
 * through its own registry, so the bundle is the same with both installed or
 * neither, and a host that is missing cannot break the forum's JS.
 *
 * 🚨 Registering is not placing: Concourse's own column keeps a block until a
 * host has actually MOUNTED it (blocks.ts).
 */
export default function registerWidgets() {
  registerFof();
  registerBespoke();
}

function flarumGlobal(): any {
  return typeof globalThis !== 'undefined' ? (globalThis as any).flarum : undefined;
}

function registerFof() {
  const flarum = flarumGlobal();
  if (!flarum?.extensions || !('fof-forum-widgets-core' in flarum.extensions)) return;

  const widgetsMod = flarum.reg?.get?.('fof-forum-widgets-core', 'common/extend/Widgets');
  const widgetMod = flarum.reg?.get?.('fof-forum-widgets-core', 'common/components/Widget');
  const Widgets = widgetsMod?.default ?? widgetsMod;
  const WidgetBase = widgetMod?.default ?? widgetMod;

  // Present but not resolvable: a version whose internals moved. Decline
  // quietly and let Concourse's own column carry the blocks.
  if (!Widgets || !WidgetBase) return;

  class ProfileWidget extends WidgetBase {
    className() {
      return 'ConcourseFofWidget ConcourseFofWidget--profile';
    }
    icon() {
      return 'fas fa-id-card';
    }
    title() {
      return null;
    }
    content() {
      return profileEnabled() ? <ProfileCard host="fof" /> : null;
    }
  }

  class ContributorsWidget extends WidgetBase {
    className() {
      return 'ConcourseFofWidget';
    }
    icon() {
      return 'fas fa-trophy';
    }
    title() {
      return app.translator.trans('ernestdefoe-concourse.forum.contributors.title');
    }
    content() {
      return contributorsEnabled() ? <TopContributors host="fof" heading={false} /> : null;
    }
  }

  new Widgets()
    .add({ key: 'concourseProfile', component: ProfileWidget, isDisabled: false, isUnique: true, placement: 'end', position: 1 })
    .add({ key: 'concourseContributors', component: ContributorsWidget, isDisabled: false, isUnique: true, placement: 'end', position: 2 })
    .extend(app, 'ernestdefoe-concourse');
}

/**
 * Bespoke, through `window.BespokeWidgetQueue`: the queue is drained on every
 * registry lookup, so it does not matter whose initializer runs first.
 *
 * Labels are translation KEYS, not translated text: Bespoke resolves them in
 * the reader's locale.
 */
function registerBespoke() {
  const flarum = flarumGlobal();
  if (!flarum?.extensions || !('ernestdefoe-bespoke' in flarum.extensions)) return;

  const g = globalThis as any;
  g.BespokeWidgetQueue = g.BespokeWidgetQueue || [];

  g.BespokeWidgetQueue.push({
    type: 'concourse-profile',
    label: 'ernestdefoe-concourse.forum.profile.label',
    icon: 'fas fa-id-card',
    zones: ['sidebar', 'above-list', 'below-list'],
    schema: [],
    component: { view: () => (profileEnabled() ? <ProfileCard host="bespoke" /> : null) },
  });

  g.BespokeWidgetQueue.push({
    type: 'concourse-contributors',
    label: 'ernestdefoe-concourse.forum.contributors.title',
    icon: 'fas fa-trophy',
    zones: ['sidebar', 'above-list', 'below-list', 'footer'],
    schema: [],
    component: { view: () => (contributorsEnabled() ? <TopContributors host="bespoke" /> : null) },
  });
}
