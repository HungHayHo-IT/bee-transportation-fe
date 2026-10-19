import type { MentionableUser } from '@/types/order';

/** The `@token` being typed right before the caret, if any. */
export interface MentionQuery {
  /** Index of the `@` itself. */
  start: number;
  /** What follows the `@` up to the caret — may be empty right after typing `@`. */
  term: string;
}

/**
 * A mention only starts at a word boundary, so an email address never opens the
 * picker. The term stops at a newline; names may contain spaces, so a couple of
 * words are allowed before we give up.
 */
const MENTION_PATTERN = /(^|\s)@([^\n@]{0,40})$/u;

export function findMentionQuery(text: string, caret: number): MentionQuery | null {
  const match = MENTION_PATTERN.exec(text.slice(0, caret));
  if (match === null) return null;
  const term = match[2];
  // Three words in and still no match — the user is writing prose, not a name.
  if (term.split(' ').length > 3) return null;
  return { start: caret - term.length - 1, term };
}

export function matchesTerm(user: MentionableUser, term: string): boolean {
  const needle = term.trim().toLocaleLowerCase();
  if (needle === '') return true;
  return user.fullName.toLocaleLowerCase().includes(needle);
}

export interface MentionInsertion {
  text: string;
  caret: number;
}

/** Replaces the half-typed `@term` with the chosen name and a trailing space. */
export function insertMention(
  text: string,
  query: MentionQuery,
  user: MentionableUser,
): MentionInsertion {
  const token = `@${user.fullName} `;
  const before = text.slice(0, query.start);
  const after = text.slice(query.start + query.term.length + 1);
  return { text: `${before}${token}${after}`, caret: query.start + token.length };
}

/**
 * Ids to send with the comment. Deleting the name from the text must delete the
 * mention too — otherwise someone gets notified about a message that never names
 * them, and nothing on screen explains why.
 */
export function survivingMentions(text: string, picked: readonly MentionableUser[]): number[] {
  return picked.filter((u) => text.includes(`@${u.fullName}`)).map((u) => u.id);
}
