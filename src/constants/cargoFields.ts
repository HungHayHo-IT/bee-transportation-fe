/**
 * The seven shared "cargo figures". They remain real columns on the order because
 * reference pricing, the filters and the dashboard all match on them — moving them
 * into the per-service JSON would mean rewriting all three.
 *
 * A service declares which of them it actually uses, so a consultancy or an
 * equipment rental no longer shows a "Volume (CBM)" box it can never fill in.
 */
export const CARGO_FIELD_KEYS = [
  'weightKg',
  'volumeCbm',
  'packageCount',
  'containerType',
  'dimLM',
  'dimWM',
  'dimHM',
] as const;

export type CargoFieldKey = (typeof CARGO_FIELD_KEYS)[number];

/** Translation key per figure, so the admin editor and the form agree on wording. */
export const CARGO_FIELD_LABEL_KEY: Record<CargoFieldKey, string> = {
  weightKg: 'orders.fields.weightKg',
  volumeCbm: 'orders.fields.volumeCbm',
  packageCount: 'orders.fields.packageCount',
  containerType: 'orders.fields.containerType',
  dimLM: 'orders.fields.dimLength',
  dimWM: 'orders.fields.dimWidth',
  dimHM: 'orders.fields.dimHeight',
};

/**
 * What a service shows before its schema has loaded, and what an order created
 * before this feature existed is displayed with: everything.
 */
export const ALL_CARGO_FIELDS: readonly string[] = CARGO_FIELD_KEYS;
