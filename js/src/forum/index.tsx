import app from 'flarum/forum/app';

import installShell from './shell';
import installIndexPage from './indexPage';
import installRows from './rows';
import installDiscussionPage from './discussionPage';
import registerWidgets from './widgets';
import { bootVisits } from './visits';

// NOTE: the admin extender is exported from js/src/admin/index.tsx and
// NOWHERE else. It imports flarum/admin/app, which does not exist on the
// forum, and re-exporting it here would take the whole forum down at boot.

/*
 * Priority -100 so this runs AFTER other extensions' initializers: Concourse
 * wraps what flarum/tags and others have already added (the tag hero, the
 * sidebar's nav items, the composer's tag pre-fill) instead of being wrapped
 * by them.
 */
app.initializers.add(
  'ernestdefoe-concourse',
  () => {
    bootVisits();
    installShell();
    installIndexPage();
    installRows();
    installDiscussionPage();
    registerWidgets();
  },
  -100
);
