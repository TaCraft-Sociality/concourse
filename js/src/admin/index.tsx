import app from 'flarum/admin/app';
import Admin from 'flarum/common/extenders/Admin';

const t = (key: string, params: Record<string, any> = {}) => app.translator.trans(`ernestdefoe-concourse.admin.${key}`, params);

/*
 * 🚨 An Admin extender, not `app.extensionData` (gone in Flarum 2), and
 * exported from here ONLY: this file imports flarum/admin/app.
 *
 * 🚨 Every setting has a reader, named in extend.php beside its default.
 */
export const extend = [
  new Admin()
    .setting(() => ({
      setting: 'ernestdefoe-concourse.show_profile',
      label: t('settings.show_profile_label'),
      help: t('settings.show_profile_help'),
      type: 'boolean',
      default: true,
    }))
    .setting(() => ({
      setting: 'ernestdefoe-concourse.show_contributors',
      label: t('settings.show_contributors_label'),
      help: t('settings.show_contributors_help'),
      type: 'boolean',
      default: true,
    }))
    .setting(() => ({
      setting: 'ernestdefoe-concourse.contributors_period',
      label: t('settings.contributors_period_label'),
      help: t('settings.contributors_period_help'),
      type: 'select',
      options: {
        day: t('settings.period_day'),
        week: t('settings.period_week'),
        month: t('settings.period_month'),
        year: t('settings.period_year'),
      },
      default: 'week',
    }))
    .setting(() => ({
      setting: 'ernestdefoe-concourse.contributors_count',
      label: t('settings.contributors_count_label'),
      help: t('settings.contributors_count_help'),
      type: 'number',
      min: 1,
      max: 10,
      default: 5,
    }))
    .setting(() => ({
      setting: 'ernestdefoe-concourse.show_participants',
      label: t('settings.show_participants_label'),
      help: t('settings.show_participants_help'),
      type: 'boolean',
      default: true,
    }))
    .setting(() => ({
      setting: 'ernestdefoe-concourse.footer_links',
      label: t('settings.footer_links_label'),
      help: t('settings.footer_links_help'),
      type: 'textarea',
      placeholder: t('settings.footer_links_placeholder') as any,
    })),
];
