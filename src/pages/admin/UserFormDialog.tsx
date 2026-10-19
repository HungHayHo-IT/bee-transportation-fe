import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { EmailField } from '@/components/form/EmailField';
import { PasswordField } from '@/components/form/PasswordField';
import { PhoneField } from '@/components/form/PhoneField';
import { ALL_ROLES, ROLE_LABEL_KEY, findRoles } from '@/constants/roles';
import type { Role } from '@/constants/roles';
import type { Department, OrganisationUser } from '@/types/organisation';

export interface UserFormValues {
  email: string;
  fullName: string;
  phone: string;
  departmentId: number | null;
  roles: Role[];
  canViewCompanyReport: boolean;
  canViewAllOrders: boolean;
  tempPassword: string;
}

export interface UserFormDialogProps {
  isOpen: boolean;
  user: OrganisationUser | null;
  departments: Department[];
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (values: UserFormValues) => void;
  onClose: () => void;
  /** Vai trò được chọn; mặc định là cả năm. Trưởng phòng chỉ có Nhân viên và Sale. */
  grantableRoles?: readonly Role[];
  /**
   * Phòng cố định cho tài khoản mới — phòng của trưởng phòng. Ô phòng ban vẫn hiện
   * để người tạo thấy tài khoản sẽ vào đâu, nhưng không đổi được: backend trả 403
   * nếu chỉ sang phòng khác.
   */
  lockedDepartment?: { id: number; name: string };
}

const EMPTY_VALUES: UserFormValues = {
  email: '',
  fullName: '',
  phone: '',
  departmentId: null,
  roles: [],
  canViewCompanyReport: false,
  canViewAllOrders: false,
  tempPassword: '',
};

export function UserFormDialog({
  isOpen,
  user,
  departments,
  isSubmitting,
  errorMessage,
  onSubmit,
  onClose,
  grantableRoles = ALL_ROLES,
  lockedDepartment,
}: UserFormDialogProps): ReactNode {
  const { t } = useTranslation();
  const [values, setValues] = useState<UserFormValues>(EMPTY_VALUES);

  useEffect(() => {
    if (!isOpen) return;
    setValues(
      user === null
        ? { ...EMPTY_VALUES, departmentId: lockedDepartment?.id ?? null }
        : {
            email: user.email,
            fullName: user.fullName,
            phone: user.phone ?? '',
            departmentId: user.departmentId,
            roles: user.roles,
            canViewCompanyReport: user.canViewCompanyReport,
            canViewAllOrders: user.canViewAllOrders,
            tempPassword: '',
          },
    );
  }, [isOpen, user, lockedDepartment?.id]);

  const isEditing = user !== null;
  const canSubmit =
    values.fullName.trim() !== '' &&
    values.roles.length > 0 &&
    (isEditing || values.email.trim() !== '');

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {isEditing ? t('admin.users.editTitle') : t('admin.users.createTitle')}
      </DialogTitle>
      <DialogContent>
        {errorMessage ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMessage}
          </Alert>
        ) : null}

        <Stack spacing={2} sx={{ mt: 1 }}>
          <EmailField
            label={t('auth.fields.email')}
            value={values.email}
            onChange={(email) => setValues({ ...values, email })}
            isDisabled={isEditing}
            helperText={isEditing ? t('admin.users.emailLocked') : undefined}
            isRequired
          />
          <TextField
            label={t('admin.users.fullName')}
            value={values.fullName}
            onChange={(event) => setValues({ ...values, fullName: event.target.value })}
            required
            fullWidth
          />
          <PhoneField
            label={t('admin.users.phone')}
            value={values.phone}
            onChange={(phone) => setValues({ ...values, phone })}
          />
          {lockedDepartment === undefined ? (
            <TextField
              select
              label={t('admin.users.department')}
              value={values.departmentId === null ? '' : String(values.departmentId)}
              onChange={(event) =>
                setValues({
                  ...values,
                  departmentId: event.target.value === '' ? null : Number(event.target.value),
                })
              }
              fullWidth
            >
              <MenuItem value="">{t('header.noDepartment')}</MenuItem>
              {departments
                .filter((department) => department.isActive)
                .map((department) => (
                  <MenuItem key={department.id} value={String(department.id)}>
                    {department.name}
                  </MenuItem>
                ))}
            </TextField>
          ) : (
            <TextField
              label={t('admin.users.department')}
              value={lockedDepartment.name}
              helperText={t('admin.users.departmentLocked')}
              disabled
              fullWidth
            />
          )}
          <TextField
            select
            slotProps={{ select: { multiple: true } }}
            label={t('admin.users.roles')}
            value={values.roles}
            onChange={(event) => {
              const selected = event.target.value;
              const list = Array.isArray(selected) ? selected : [selected];
              setValues({ ...values, roles: findRoles(list) });
            }}
            helperText={
              grantableRoles.length < ALL_ROLES.length
                ? t('admin.users.rolesLimitedHint')
                : t('admin.users.rolesHint')
            }
            required
            fullWidth
          >
            {grantableRoles.map((role) => (
              <MenuItem key={role} value={role}>
                {t(ROLE_LABEL_KEY[role])}
              </MenuItem>
            ))}
          </TextField>

          {isEditing ? (
            <>
              <FormControlLabel
                control={
                  <Switch
                    checked={values.canViewCompanyReport}
                    onChange={(event) =>
                      setValues({ ...values, canViewCompanyReport: event.target.checked })
                    }
                  />
                }
                label={t('admin.users.companyReport')}
              />
              {/* Cho người báo giá: xem đơn của mọi phòng để báo giá cho khách,
                  nhưng KHÔNG thao tác được trên đơn phòng khác — backend chỉ
                  nới đường đọc. Đơn chờ bổ sung thông tin vẫn ẩn. */}
              <FormControlLabel
                control={
                  <Switch
                    checked={values.canViewAllOrders}
                    onChange={(event) =>
                      setValues({ ...values, canViewAllOrders: event.target.checked })
                    }
                  />
                }
                label={t('admin.users.allOrders')}
              />
            </>
          ) : (
            <PasswordField
              label={t('admin.users.tempPassword')}
              value={values.tempPassword}
              onChange={(tempPassword) => setValues({ ...values, tempPassword })}
              helperText={t('admin.users.tempPasswordHint')}
              autoComplete="new-password"
            />
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
          disabled={isSubmitting || !canSubmit}
        >
          {t('common.actions.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
