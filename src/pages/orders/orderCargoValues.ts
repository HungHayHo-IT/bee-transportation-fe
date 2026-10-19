import { ALL_CARGO_FIELDS } from '@/constants/cargoFields';
import { toContainerType } from '@/constants/provinces';
import type { ContainerType } from '@/constants/provinces';
import type { CargoFigures } from './OrderCargoFields';

export const EMPTY_CARGO: CargoFigures = {
  weightKg: null,
  volumeCbm: null,
  packageCount: null,
  quantityUnit: '',
  containerType: '',
  dimLM: null,
  dimWM: null,
  dimHM: null,
};

/** The cargo half of a create or update payload. */
export interface CargoPayload {
  weightKg?: number;
  volumeCbm?: number;
  packageCount?: number;
  quantityUnit?: string;
  containerType?: ContainerType;
  dimLM?: number;
  dimWM?: number;
  dimHM?: number;
}

/**
 * Clears the figures a service does not use. Without this, filling in a weight,
 * then switching the service to one that has no weight box, would send a value the
 * backend rejects — and leave no box on screen to clear it in.
 */
export function pruneCargo(value: CargoFigures, visibleKeys: readonly string[]): CargoFigures {
  const keep = (key: string): boolean => visibleKeys.includes(key);
  return {
    weightKg: keep('weightKg') ? value.weightKg : null,
    volumeCbm: keep('volumeCbm') ? value.volumeCbm : null,
    packageCount: keep('packageCount') ? value.packageCount : null,
    // Don vi di theo o so kien: o do bi an thi don vi cung khong con nghia gi.
    quantityUnit: keep('packageCount') ? value.quantityUnit : '',
    containerType: keep('containerType') ? value.containerType : '',
    dimLM: keep('dimLM') ? value.dimLM : null,
    dimWM: keep('dimWM') ? value.dimWM : null,
    dimHM: keep('dimHM') ? value.dimHM : null,
  };
}

/** A blank figure is absent from the payload, never `0`. */
export function toCargoPayload(
  value: CargoFigures,
  visibleKeys: readonly string[] = ALL_CARGO_FIELDS,
): CargoPayload {
  const cargo = pruneCargo(value, visibleKeys);
  return {
    weightKg: cargo.weightKg ?? undefined,
    volumeCbm: cargo.volumeCbm ?? undefined,
    packageCount: cargo.packageCount ?? undefined,
    quantityUnit: cargo.quantityUnit === '' ? undefined : cargo.quantityUnit,
    containerType: toContainerType(cargo.containerType),
    dimLM: cargo.dimLM ?? undefined,
    dimWM: cargo.dimWM ?? undefined,
    dimHM: cargo.dimHM ?? undefined,
  };
}
