import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  FormControlLabel, IconButton, Stack, Table, TableBody, TableCell, TableHead, TableRow,
  Tooltip, Typography,
} from '@mui/material';
import { IconEdit, IconEyeOff, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { describeError } from '@/services/apiClient';
import {
  createServiceField, deleteServiceField, fetchServiceFields, updateServiceField,
} from '@/services/serviceFieldService';
import { updateService } from '@/services/organisationService';
import { CARGO_FIELD_KEYS, CARGO_FIELD_LABEL_KEY } from '@/constants/cargoFields';
import type { Service } from '@/types/organisation';
import type { CreateServiceFieldPayload, ServiceField } from '@/types/serviceField';
import { ServiceFieldForm } from './ServiceFieldForm';

export interface ServiceFieldsDialogProps {
  service: Service | null;
  onClose: () => void;
  /** Called after a change the services table itself displays (the cargo figures). */
  onServiceChanged: () => void;
}

/**
 * Where an admin shapes the create-order form for one service: which of the shared
 * cargo figures it shows, and what input boxes of its own it adds. Nothing here
 * needs a release — that is the point of the feature.
 */
export function ServiceFieldsDialog({
  service,
  onClose,
  onServiceChanged,
}: ServiceFieldsDialogProps): ReactNode {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();

  const [fields, setFields] = useState<ServiceField[]>([]);
  const [cargoFields, setCargoFields] = useState<string[]>([]);
  const [editing, setEditing] = useState<ServiceField | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (service === null) return;
    setEditing(null);
    setErrorMessage(null);
    setCargoFields(service.cargoFields);
    fetchServiceFields(service.id).then(setFields).catch((error: unknown) => {
      setErrorMessage(describeError(error));
    });
  }, [service]);

  if (service === null) return null;

  const run = async (action: () => Promise<void>): Promise<void> => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await action();
      setFields(await fetchServiceFields(service.id));
      enqueueSnackbar(t('common.states.saved'), { variant: 'success' });
    } catch (error) {
      setErrorMessage(describeError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitField = (payload: CreateServiceFieldPayload): void => {
    void run(async () => {
      if (editing === null) await createServiceField(service.id, payload);
      else await updateServiceField(editing.id, payload);
      setEditing(null);
    });
  };

  /**
   * Delete is a request, not a promise: a field some order has already filled in is
   * retired instead, and the backend says which happened. Reporting "deleted" either
   * way would be a lie the admin then acts on.
   */
  const handleDelete = (field: ServiceField): void => {
    void run(async () => {
      const result = await deleteServiceField(field.id);
      if (!result.deleted) enqueueSnackbar(result.notice, { variant: 'info' });
    });
  };

  const handleToggleCargo = (key: string, checked: boolean): void => {
    const next = checked ? [...cargoFields, key] : cargoFields.filter((item) => item !== key);
    setCargoFields(next);
    void run(async () => {
      await updateService(service.id, { cargoFields: next });
      onServiceChanged();
    });
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>
        {t('admin.serviceFields.title', { service: `${service.code} · ${service.name}` })}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {errorMessage === null ? null : <Alert severity="error">{errorMessage}</Alert>}

          <Stack spacing={1}>
            <Typography variant="subtitle2">{t('admin.serviceFields.cargoSection')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('admin.serviceFields.cargoHint')}
            </Typography>
            <Stack direction="row" flexWrap="wrap" useFlexGap>
              {CARGO_FIELD_KEYS.map((key) => (
                <FormControlLabel
                  key={key}
                  control={
                    <Checkbox
                      checked={cargoFields.includes(key)}
                      onChange={(event) => handleToggleCargo(key, event.target.checked)}
                      disabled={isSubmitting}
                    />
                  }
                  label={t(CARGO_FIELD_LABEL_KEY[key])}
                />
              ))}
            </Stack>
          </Stack>

          <Divider />

          <Stack spacing={1}>
            <Typography variant="subtitle2">{t('admin.serviceFields.ownSection')}</Typography>
            {fields.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t('admin.serviceFields.empty')}
              </Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('admin.serviceFields.sortOrder')}</TableCell>
                    <TableCell>{t('admin.serviceFields.label')}</TableCell>
                    <TableCell>{t('admin.serviceFields.key')}</TableCell>
                    <TableCell>{t('admin.serviceFields.type')}</TableCell>
                    <TableCell>{t('admin.serviceFields.required')}</TableCell>
                    <TableCell align="right">{t('common.actions.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fields.map((field) => (
                    <TableRow key={field.id} hover selected={editing?.id === field.id}>
                      <TableCell>{field.sortOrder}</TableCell>
                      <TableCell>
                        {field.label}
                        {field.isActive ? null : (
                          <Chip
                            size="small"
                            sx={{ ml: 1 }}
                            label={t('admin.serviceFields.retired')}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {field.fieldKey}
                        </Typography>
                      </TableCell>
                      <TableCell>{t(`admin.serviceFields.types.${field.fieldType}`)}</TableCell>
                      <TableCell>
                        {field.isRequired ? t('common.states.yes') : t('common.states.no')}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title={t('common.actions.edit')}>
                          <IconButton size="small" onClick={() => setEditing(field)}>
                            <IconEdit size={17} stroke={1.7} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip
                          title={
                            field.isActive
                              ? t('admin.serviceFields.retire')
                              : t('admin.serviceFields.restore')
                          }
                        >
                          <IconButton
                            size="small"
                            disabled={isSubmitting}
                            onClick={() =>
                              void run(async () => {
                                await updateServiceField(field.id, { isActive: !field.isActive });
                              })
                            }
                          >
                            <IconEyeOff size={17} stroke={1.7} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('common.actions.delete')}>
                          <IconButton
                            size="small"
                            disabled={isSubmitting}
                            onClick={() => handleDelete(field)}
                          >
                            <IconTrash size={17} stroke={1.7} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Stack>

          <Divider />

          <Typography variant="subtitle2">
            {editing === null
              ? t('admin.serviceFields.add')
              : t('admin.serviceFields.editing', { field: editing.label })}
          </Typography>
          <ServiceFieldForm
            editing={editing}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmitField}
            onCancelEdit={() => setEditing(null)}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>{t('common.actions.close')}</Button>
      </DialogActions>
    </Dialog>
  );
}
