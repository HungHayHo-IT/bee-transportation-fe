/**
 * Audit and timeline entries share one action vocabulary, written by the backend's
 * activity logger. An unknown action falls back to its raw key rather than an
 * empty cell, so a new backend action is visible instead of silently blank.
 */
const ACTIVITY_ACTION_LABEL_KEY: Record<string, string> = {
  create: 'activityAction.create',
  update: 'activityAction.update',
  delete: 'activityAction.delete',
  add_department: 'activityAction.addDepartment',
  claim: 'activityAction.claim',
  assign: 'activityAction.assign',
  pass: 'activityAction.pass',
  quote: 'activityAction.quote',
  request_revision: 'activityAction.requestRevision',
  select_quote: 'activityAction.selectQuote',
  close: 'activityAction.close',
  reject: 'activityAction.reject',
  cancel: 'activityAction.cancel',
  milestone: 'activityAction.milestone',
  set_milestones: 'activityAction.setMilestones',
  set_services: 'activityAction.setServices',
  upload: 'activityAction.upload',
  login: 'activityAction.login',
  change_password: 'activityAction.changePassword',
  reset_password: 'activityAction.resetPassword',
};

export function findActivityActionLabelKey(action: string): string | null {
  return ACTIVITY_ACTION_LABEL_KEY[action] ?? null;
}
