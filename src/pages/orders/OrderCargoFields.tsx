import { useEffect, useState, type ReactNode } from 'react';
import { Box, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { NumberField } from '@/components/form/NumberField';
import { FIELD_GRID } from '@/components/form/fieldGrid';
import { ALL_CARGO_FIELDS, CARGO_FIELD_LABEL_KEY } from '@/constants/cargoFields';
import type { CargoFieldKey } from '@/constants/cargoFields';
import { fetchQuantityUnits, type LabeledOption } from '@/services/referenceService';

/** `null` means the figure was left blank, which every one of them may be. */
export interface CargoFigures {
  weightKg: number | null;
  volumeCbm: number | null;
  packageCount: number | null;
  /** Mã đơn vị của `packageCount` — danh mục OF1. '' = chưa chọn, đẩy đi là PK. */
  quantityUnit: string;
  containerType: string;
  dimLM: number | null;
  dimWM: number | null;
  dimHM: number | null;
}

/** A shipment far beyond anything the company handles; catches a typo, not a size. */
const MAX_FIGURE = 1_000_000;

export interface OrderCargoFieldsProps {
  value: CargoFigures;
  onChange: (value: CargoFigures) => void;
  /**
   * Which figures the chosen service actually uses. Omitted means all of them,
   * which is how an order created before per-service fields is displayed.
   */
  visibleKeys?: readonly string[];
}

/**
 * The figures shared by every service and the only data used to match reference
 * prices — which is why they are separate numeric fields and the free-text note
 * is not. A service declares which ones it uses: a customs order has no volume to
 * state and a consultancy has no shipment at all.
 */
export function OrderCargoFields({
  value,
  onChange,
  visibleKeys = ALL_CARGO_FIELDS,
}: OrderCargoFieldsProps): ReactNode {
  const { t } = useTranslation();
  /* Tải một lần cho cả vòng đời màn: 171 dòng, và danh mục của bên kia gần
     như không đổi trong một phiên làm việc. */
  const [donVi, setDonVi] = useState<LabeledOption[]>([]);
  useEffect(() => {
    void fetchQuantityUnits().then(setDonVi).catch(() => setDonVi([]));
  }, []);
  const shows = (key: CargoFieldKey): boolean => visibleKeys.includes(key);
  const label = (key: CargoFieldKey): string => t(CARGO_FIELD_LABEL_KEY[key]);

  const figure = (
    key: Exclude<CargoFieldKey, 'containerType'>,
    decimals: number,
    unit?: string,
  ): ReactNode =>
    !shows(key) ? null : (
      <Box key={key}>
        <NumberField
          label={label(key)}
          value={value[key]}
          onChange={(next) => onChange({ ...value, [key]: next })}
          decimals={decimals}
          min={0}
          max={MAX_FIGURE}
          unit={unit}
        />
      </Box>
    );

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        {t('orders.create.cargoHint')}
      </Typography>

      <Box sx={FIELD_GRID}>
        {figure('weightKg', 2, t('quotes.unit.weight'))}
        {figure('volumeCbm', 2, t('quotes.unit.volume'))}
        {figure('packageCount', 0)}
        {/* Đơn vị đi LIỀN với ô số kiện, và chỉ hiện khi ô đó hiện: nó là đơn
            vị CỦA con số ấy, đứng một mình thì không nói về cái gì cả. */}
        {!shows('packageCount') ? null : (
          <Box>
            <TextField
              select
              label={t('orders.fields.quantityUnit')}
              value={value.quantityUnit}
              onChange={(e) => onChange({ ...value, quantityUnit: e.target.value })}
              fullWidth
            >
              {donVi.map((u) => (
                <MenuItem key={u.value} value={u.value}>
                  {u.label}
                  <Box component="span" sx={{ color: 'text.secondary', ml: 0.75 }}>
                    · {u.value}
                  </Box>
                </MenuItem>
              ))}
            </TextField>
          </Box>
        )}
        {!shows('containerType') ? null : (
          <Box>
            <TextField
              label={label('containerType')}
              value={value.containerType}
              onChange={(event) => onChange({ ...value, containerType: event.target.value })}
              fullWidth
            />
          </Box>
        )}
        {figure('dimLM', 2)}
        {figure('dimWM', 2)}
        {figure('dimHM', 2)}
      </Box>
    </Stack>
  );
}
