import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Role } from '@/constants/roles';
import type { Department, OrganisationUser, Service } from '@/types/organisation';
import { parentOptions } from './parentOptions';

export interface DepartmentFormValues {
  name: string;
  managerId: number | null;
  parentId: number | null;
  serviceIds: number[];
}

export interface DepartmentFormDialogProps {
  isOpen: boolean;
  department: Department | null;
  departments: Department[];
  users: OrganisationUser[];
  services: Service[];
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (values: DepartmentFormValues) => void;
  onClose: () => void;
}

const EMPTY_VALUES: DepartmentFormValues = {
  name: '',
  managerId: null,
  parentId: null,
  serviceIds: [],
};

export function DepartmentFormDialog({
  isOpen,
  department,
  departments,
  users,
  services,
  isSubmitting,
  errorMessage,
  onSubmit,
  onClose,
}: DepartmentFormDialogProps): ReactNode {
  const { t } = useTranslation();
  const [values, setValues] = useState<DepartmentFormValues>(EMPTY_VALUES);

  useEffect(() => {
    if (!isOpen) return;
    setValues(
      department === null
        ? EMPTY_VALUES
        : {
            name: department.name,
            managerId: department.managerId,
            parentId: department.parentId,
            serviceIds: department.serviceIds,
          },
    );
  }, [isOpen, department]);

  const isEditing = department !== null;
  const managerCandidates = users.filter(
    (user) => user.isActive && user.roles.includes(Role.Manager),
  );
  const parentCandidates =
    department === null ? departments : parentOptions(departments, department.id);

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {isEditing ? t('admin.departments.editTitle') : t('admin.departments.createTitle')}
      </DialogTitle>
      <DialogContent>
        {errorMessage ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMessage}
          </Alert>
        ) : null}

        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label={t('admin.departments.name')}
            value={values.name}
            onChange={(event) => setValues({ ...values, name: event.target.value })}
            required
            fullWidth
          />
          <TextField
            select
            label={t('admin.departments.manager')}
            value={values.managerId === null ? '' : String(values.managerId)}
            onChange={(event) =>
              setValues({
                ...values,
                managerId: event.target.value === '' ? null : Number(event.target.value),
              })
            }
            helperText={t('admin.departments.managerHint')}
            fullWidth
          >
            <MenuItem value="">{t('admin.departments.noManager')}</MenuItem>
            {managerCandidates.map((user) => (
              <MenuItem key={user.id} value={String(user.id)}>
                {user.fullName}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label={t('admin.departments.parent')}
            value={values.parentId === null ? '' : String(values.parentId)}
            onChange={(event) =>
              setValues({
                ...values,
                parentId: event.target.value === '' ? null : Number(event.target.value),
              })
            }
            fullWidth
          >
            <MenuItem value="">{t('admin.departments.parentNone')}</MenuItem>
            {parentCandidates.map((dept) => (
              <MenuItem key={dept.id} value={String(dept.id)}>
                {dept.name}
              </MenuItem>
            ))}
          </TextField>

          {isEditing ? null : (
            <TextField
              select
              slotProps={{ select: { multiple: true } }}
              label={t('admin.departments.services')}
              value={values.serviceIds.map(String)}
              onChange={(event) => {
                const selected = event.target.value;
                const list = Array.isArray(selected) ? selected : [selected];
                setValues({ ...values, serviceIds: list.map(Number) });
              }}
              helperText={t('admin.departments.servicesHint')}
              fullWidth
            >
              {services.map((service) => (
                <MenuItem key={service.id} value={String(service.id)}>
                  {service.code} · {service.name}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={isSubmitting}>
          {t('common.actions.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={() => onSubmit(values)}
          disabled={isSubmitting || values.name.trim() === ''}
        >
          {t('common.actions.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
