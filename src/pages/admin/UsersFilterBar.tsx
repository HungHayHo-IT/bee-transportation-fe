import type { ReactNode } from 'react';
import { InputAdornment, MenuItem, Stack, TextField } from '@mui/material';
import { IconSearch } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { SectionCard } from '@/components/SectionCard';
import { ALL_ROLES, ROLE_LABEL_KEY } from '@/constants/roles';
import type { Department } from '@/types/organisation';

export const ALL_OPTION = 'all';

export interface UsersFilterValues {
  search: string;
  role: string;
  departmentId: string;
}

export interface UsersFilterBarProps {
  values: UsersFilterValues;
  departments: Department[];
  onChange: (values: UsersFilterValues) => void;
  /** Trưởng phòng chỉ thấy người phòng mình, nên lọc theo phòng là ô chết. */
  showDepartment?: boolean;
}

/** Search, role and department are all applied by the backend since 23/08/2026. */
export function UsersFilterBar({
  values,
  departments,
  onChange,
  showDepartment = true,
}: UsersFilterBarProps): ReactNode {
  const { t } = useTranslation();
  const update = (patch: Partial<UsersFilterValues>): void => onChange({ ...values, ...patch });

  return (
    <SectionCard>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField
          label={t('common.actions.search')}
          value={values.search}
          onChange={(event) => update({ search: event.target.value })}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <IconSearch size={17} stroke={1.7} />
                </InputAdornment>
              ),
            },
          }}
          sx={{ minWidth: 260 }}
        />
        <TextField
          select
          label={t('admin.users.roles')}
          value={values.role}
          onChange={(event) => update({ role: event.target.value })}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value={ALL_OPTION}>{t('common.actions.all')}</MenuItem>
          {ALL_ROLES.map((role) => (
            <MenuItem key={role} value={role}>
              {t(ROLE_LABEL_KEY[role])}
            </MenuItem>
          ))}
        </TextField>
        {showDepartment ? (
          <TextField
            select
            label={t('admin.users.department')}
            value={values.departmentId}
            onChange={(event) => update({ departmentId: event.target.value })}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value={ALL_OPTION}>{t('common.actions.all')}</MenuItem>
            {departments.map((department) => (
              <MenuItem key={department.id} value={String(department.id)}>
                {department.name}
              </MenuItem>
            ))}
          </TextField>
        ) : null}
      </Stack>
    </SectionCard>
  );
}
