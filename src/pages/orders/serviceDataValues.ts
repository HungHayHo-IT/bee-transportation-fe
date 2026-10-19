import type { ServiceDataValues, ServiceField } from '@/types/serviceField';

/**
 * What the inputs hold while being edited. A number box answers `number | null`
 * and a switch answers `boolean`, so the draft is not uniformly a string — but
 * every empty box is representable, which a plain `ServiceDataValues` cannot do.
 */
export type ServiceDataDraft = Record<string, string | number | boolean | null>;

function blankFor(field: ServiceField): string | number | boolean | null {
  if (field.fieldType === 'number') return null;
  if (field.fieldType === 'boolean') return false;
  return '';
}

export function emptyServiceData(fields: ServiceField[]): ServiceDataDraft {
  return Object.fromEntries(fields.map((field) => [field.fieldKey, blankFor(field)]));
}

/**
 * Fills the draft from an order. A value stored under a key the service no longer
 * declares is dropped here on purpose: the form has no box to edit it in, and
 * sending it back would be rejected as an unknown key.
 */
export function readServiceData(
  fields: ServiceField[],
  stored: Record<string, unknown>,
): ServiceDataDraft {
  return Object.fromEntries(
    fields.map((field) => {
      const value = stored[field.fieldKey];
      if (value === undefined || value === null) return [field.fieldKey, blankFor(field)];
      if (field.fieldType === 'number')
        return [field.fieldKey, typeof value === 'number' ? value : Number(value)];
      if (field.fieldType === 'boolean') return [field.fieldKey, value === true];
      return [field.fieldKey, String(value)];
    }),
  );
}

/** Narrowing predicate: a value that survives this is safe to put on the wire. */
function isFilled(value: string | number | boolean | null | undefined): value is string | number | boolean {
  if (value === null || value === undefined) return false;
  return typeof value !== 'string' || value.trim() !== '';
}

/**
 * A blank box is absent from the payload rather than `""` or `0`. An unchecked
 * switch is `false`, not absent — "we asked and the answer was no" is information.
 */
export function toServiceDataPayload(
  fields: ServiceField[],
  draft: ServiceDataDraft,
): ServiceDataValues {
  const out: ServiceDataValues = {};
  for (const field of fields) {
    const value = draft[field.fieldKey];
    if (!isFilled(value)) continue;
    out[field.fieldKey] = typeof value === 'string' ? value.trim() : value;
  }
  return out;
}

/**
 * Labels of the required boxes still empty. The backend rejects these too; asking
 * here just spares the round trip and points at the box rather than at the form.
 */
export function missingRequiredFields(
  fields: ServiceField[],
  draft: ServiceDataDraft,
): string[] {
  return fields
    .filter((field) => field.isRequired && field.fieldType !== 'boolean')
    .filter((field) => !isFilled(draft[field.fieldKey]))
    .map((field) => field.label);
}
