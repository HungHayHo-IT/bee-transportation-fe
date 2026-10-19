/**
 * The single owner of `document.title`.
 *
 * Two writers cannot share it: the page name changes on every navigation while the
 * unread badge changes on its own schedule, so whichever writes last wipes the
 * other. Both feed this module instead, and it renders the one string.
 */

const MAX_SHOWN = 99;

let pageTitle = '';
let unreadCount = 0;

function render(): void {
  if (typeof document === 'undefined') return;
  const badge = unreadCount <= 0 ? '' : `(${unreadCount > MAX_SHOWN ? `${MAX_SHOWN}+` : unreadCount}) `;
  document.title = `${badge}${pageTitle}`;
}

/** Called by PageContainer; already includes the app name. */
export function setPageTitle(title: string): void {
  pageTitle = title;
  render();
}

/** Called by the notification provider. Zero removes the prefix entirely. */
export function setUnreadBadge(count: number): void {
  unreadCount = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
  render();
}
