import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Button, FormControlLabel, MenuItem, Stack, Switch, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { NumberField } from '@/components/form/NumberField';
import { SERVICE_FIELD_TYPES } from '@/types/serviceField';
import type {
  CreateServiceFieldPayload, ServiceField, ServiceFieldType,
} from '@/types/serviceField';

export interface ServiceFieldFormProps {
  /** Null puts the form in "add" mode; a field puts it in "edit" mode. */
  editing: ServiceField | null;
  isSubmitting: boolean;
  onSubmit: (payload: CreateServiceFieldPayload) => void;
  onCancelEdit: () => void;
}

interface Draft {
  fieldKey: string;
  label: string;
  fieldType: ServiceFieldType;
  unit: string;
  options: string;
  helpText: string;
  isRequired: boolean;
  sortOrder: number | null;
}

const EMPTY: Draft = {
  fieldKey: '',
  label: '',
  fieldType: 'text',
  unit: '',
  options: '',
  helpText: '',
  isRequired: false,
  sortOrder: 0,
};

/** One option per line: commas are common inside Vietnamese option labels. */
const splitOptions = (raw: string): string[] =>
  raw.split('\n').map((line) => line.trim()).filter((line) => line !== '');

export function ServiceFieldForm({
  editing,
  isSubmitting,
  onSubmit,
  onCancelEdit,
}: ServiceFieldFormProps): ReactNode {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Draft>(EMPTY);

  useEffect(() => {
    if (editing === null) {
      setDraft(EMPTY);
      return;
    }
    setDraft({
      fieldKey: editing.fieldKey,
      label: editing.label,
      fieldType: editing.fieldType,
      unit: editing.unit ?? '',
      options: editing.options.join('\n'),
      helpText: editing.helpText ?? '',
      isRequired: editing.isRequired,
      sortOrder: editing.sortOrder,
    });
  }, [editing]);

  const options = splitOptions(draft.options);
  const isKeyValid = /^[a-z][a-z0-9_]{0,49}$/.test(draft.fieldKey);
  const canSubmit =
    draft.label.trim() !== '' &&
    (editing !== null || isKeyValid) &&
    (draft.fieldType !== 'select' || options.length > 0);

  const handleSubmit = (): void => {
    onSubmit({
      fieldKey: draft.fieldKey,
      label: draft.label.trim(),
      fieldType: draft.fieldType,
      unit: draft.unit.trim() === '' ? undefined : draft.unit.trim(),
      options: draft.fieldType === 'select' ? options : [],
      isRequired: draft.isRequired,
      sortOrder: draft.sortOrder ?? 0,
      helpText: draft.helpText.trim() === '' ? undefined : draft.helpText.trim(),
    });
  };

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label={t('admin.serviceFields.key')}
          value={draft.fieldKey}
          onChange={(event) => setDraft({ ...draft, fieldKey: event.target.value })}
          // The key addresses stored values; renaming it would orphan every one.
          disabled={editing !== null}
          error={draft.fieldKey !== '' && !isKeyValid}
          helperText={t('admin.serviceFields.keyHint')}
          required
          fullWidth
        />
        <TextField
          label={t('admin.serviceFields.label')}
          value={draft.label}
          onChange={(event) => setDraft({ ...draft, label: event.target.value })}
          required
          fullWidth
        />
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          select
          label={t('admin.serviceFields.type')}
          value={draft.fieldType}
          onChange={(event) =>
            setDraft({ ...draft, fieldType: event.target.value as ServiceFieldType })
          }
          sx={{ minWidth: 180 }}
        >
          {SERVICE_FIELD_TYPES.map((type) => (
            <MenuItem key={type} value={type}>
              {t(`admin.serviceFields.types.${type}`)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label={t('admin.serviceFields.unit')}
          value={draft.unit}
          onChange={(event) => setDraft({ ...draft, unit: event.target.value })}
          sx={{ minWidth: 140 }}
        />
        <NumberField
          label={t('admin.serviceFields.sortOrder')}
          value={draft.sortOrder}
          onChange={(sortOrder) => setDraft({ ...draft, sortOrder })}
          min={0}
          max={9999}
          isFullWidth={false}
        />
        <FormControlLabel
          control={
            <Switch
              checked={draft.isRequired}
              onChange={(event) => setDraft({ ...draft, isRequired: event.target.checked })}
            />
          }
          label={t('admin.serviceFields.required')}
        />
      </Stack>

      {draft.fieldType !== 'select' ? null : (
        <TextField
          label={t('admin.serviceFields.options')}
          value={draft.options}
          onChange={(event) => setDraft({ ...draft, options: event.target.value })}
          helperText={t('admin.serviceFields.optionsHint')}
          multiline
          minRows={3}
          required
          fullWidth
        />
      )}

      <TextField
        label={t('admin.serviceFields.helpText')}
        value={draft.helpText}
        onChange={(event) => setDraft({ ...draft, helpText: event.target.value })}
        fullWidth
      />

      <Stack direction="row" spacing={1}>
        <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
          {editing === null ? t('admin.serviceFields.add') : t('common.actions.save')}
        </Button>
        {editing === null ? null : (
          <Button color="inherit" onClick={onCancelEdit} disabled={isSubmitting}>
            {t('common.actions.cancel')}
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
