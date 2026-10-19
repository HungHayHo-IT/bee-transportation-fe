/**
 * One grid for every data-entry form in the app.
 *
 * Order forms used to mix three layout systems at once: the route block split
 * itself in halves with a Stack, the cargo and service-specific blocks flowed
 * with `flex: 1 1 260px`, and a handful of boxes carried their own `minWidth:
 * 220` or `maxWidth: 240`. The result read as ragged — a short box beside a long
 * one, and the column count changing from block to block down the same form.
 *
 * A fixed two-column grid makes that impossible by construction: every cell is
 * the same width, wide screens always get two columns, phones always get one.
 * Fields keep `fullWidth` so each one fills its cell rather than sizing itself.
 *
 * `minmax(0, 1fr)` rather than `1fr`: a grid track's default minimum is its
 * content, so a long unbroken value (an address, a pasted reference) would push
 * its column wider and break the alignment this exists to guarantee.
 */
export const FIELD_GRID = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
  gap: 2,
} as const;

/** For a field that reads better across the whole row — a note, a paragraph. */
export const FIELD_FULL_ROW = { gridColumn: '1 / -1' } as const;
