import type { ReactNode } from 'react';
import { Chip, IconButton, Stack, TableCell, TableRow, Tooltip, Typography } from '@mui/material';
import {
  IconChartBar, IconKey, IconLock, IconLockOpen, IconPencil,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ROLE_LABEL_KEY } from '@/constants/roles';
import type { OrganisationUser } from '@/types/organisation';

export interface UserRowProps {
  user: OrganisationUser;
  onEdit: (user: OrganisationUser) => void;
  onResetPassword: (user: OrganisationUser) => void;
  onToggleStatus: (user: OrganisationUser) => void;
  /** Sửa, khoá và cấp lại mật khẩu là việc của Admin; trưởng phòng chỉ xem. */
  canManage?: boolean;
  /**
   * Mở được bảng đơn và tỉ lệ chuyển đổi của người này.
   *
   * Tách khỏi `canManage` vì đây là quyền KHÁC: giám đốc không sửa được tài
   * khoản nào nhưng phải xem được số của mọi người, còn trưởng phòng xem trong
   * phạm vi phòng mình — cả hai giới hạn đó do backend áp, không phải do nút.
   */
  onViewOrders?: (user: OrganisationUser) => void;
}

export function UserRow({
  user,
  onEdit,
  onResetPassword,
  onToggleStatus,
  canManage = true,
  onViewOrders,
}: UserRowProps): ReactNode {
  const { t } = useTranslation();

  return (
    <TableRow key={user.id} hover>
      <TableCell>
        <Typography variant="body2" fontWeight={600}>
          {user.fullName}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {user.email}
        </Typography>
      </TableCell>
      <TableCell>{user.departmentName ?? '—'}</TableCell>
      <TableCell>
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {user.roles.map((role) => (
            <Chip key={role} size="small" label={t(ROLE_LABEL_KEY[role])} />
          ))}
          {user.canViewCompanyReport ? (
            <Chip
              size="small"
              color="primary"
              variant="outlined"
              label={t('admin.users.companyReportShort')}
            />
          ) : null}
          {user.canViewAllOrders ? (
            <Chip
              size="small"
              color="primary"
              variant="outlined"
              label={t('admin.users.allOrdersShort')}
            />
          ) : null}
        </Stack>
      </TableCell>
      <TableCell>{user.phone ?? '—'}</TableCell>
      <TableCell>
        <Stack direction="row" spacing={0.5}>
          <Chip
            size="small"
            variant="outlined"
            color={user.isActive ? 'success' : 'default'}
            label={user.isActive ? t('common.states.active') : t('common.states.inactive')}
          />
          {user.mustChangePassword ? (
            <Chip
              size="small"
              variant="outlined"
              color="warning"
              label={t('admin.users.pendingPassword')}
            />
          ) : null}
        </Stack>
      </TableCell>
      {canManage || onViewOrders ? (
        <TableCell align="right">
          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
            {onViewOrders ? (
              <Tooltip title={t('admin.users.orders.view')}>
                <IconButton size="small" onClick={() => onViewOrders(user)}>
                  <IconChartBar size={17} stroke={1.7} />
                </IconButton>
              </Tooltip>
            ) : null}
            {canManage ? (
            <>
            <Tooltip title={t('common.actions.edit')}>
              <IconButton size="small" onClick={() => onEdit(user)}>
                <IconPencil size={17} stroke={1.7} />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('admin.users.resetPassword')}>
              <IconButton size="small" onClick={() => onResetPassword(user)}>
                <IconKey size={17} stroke={1.7} />
              </IconButton>
            </Tooltip>
            <Tooltip title={user.isActive ? t('admin.users.lock') : t('admin.users.unlock')}>
              <IconButton size="small" onClick={() => onToggleStatus(user)}>
                {user.isActive ? (
                  <IconLock size={17} stroke={1.7} />
                ) : (
                  <IconLockOpen size={17} stroke={1.7} />
                )}
              </IconButton>
            </Tooltip>
            </>
            ) : null}
          </Stack>
        </TableCell>
      ) : null}
    </TableRow>
  );
}
