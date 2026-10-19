import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { Button, TableCell, TableRow } from '@mui/material';
import { IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { PageContainer } from '@/components/PageContainer';
import { SectionCard } from '@/components/SectionCard';
import { DataTableShell } from '@/components/DataTableShell';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useDisclosure } from '@/hooks/useDisclosure';
import { MANAGER_GRANTABLE_ROLES, findRole } from '@/constants/roles';
import { PermissionAction } from '@/constants/permissions';
import { usePermissions } from '@/hooks/usePermissions';
import { useCurrentUser } from '@/store/sessionContext';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '@/constants/pagination';
import {
  createUser,
  fetchDepartments,
  fetchUsers,
  resetUserPassword,
  setUserStatus,
  updateUser,
} from '@/services/organisationService';
import type { Department, OrganisationUser } from '@/types/organisation';
import type { Page } from '@/types/pagination';
import { describeError } from '@/services/apiClient';
import { UserFormDialog } from './UserFormDialog';
import { UserOrdersDialog } from './UserOrdersDialog';
import { UserRow } from './UserRow';
import type { UserFormValues } from './UserFormDialog';
import { UserActionDialogs } from './UserActionDialogs';
import { ALL_OPTION, UsersFilterBar } from './UsersFilterBar';
import type { UsersFilterValues } from './UsersFilterBar';

interface UsersPageData {
  users: Page<OrganisationUser>;
  departments: Department[];
}

const EMPTY_FILTERS: UsersFilterValues = {
  search: '',
  role: ALL_OPTION,
  departmentId: ALL_OPTION,
};

export function UsersPage(): ReactNode {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const formDialog = useDisclosure();
  const { can } = usePermissions();
  const currentUser = useCurrentUser();
  // Admin quản trị toàn bộ. Trưởng phòng vào được màn này chỉ để tạo Nhân viên/
  // Sale cho phòng mình (backend 284d342): danh sách đã được backend lọc về phòng
  // họ, còn sửa, khoá và cấp lại mật khẩu vẫn trả 403 nên không hiện.
  const canManageAll = can(PermissionAction.ManageOrganisation);
  /**
   * Ai xem được đơn và tỉ lệ chuyển đổi của một nhân viên.
   *
   * Đúng những người xem được báo cáo tổng hợp — giám đốc xem toàn công ty,
   * trưởng phòng xem phạm vi phòng mình. Nút chỉ là cánh cửa; phạm vi thật do
   * backend cắt (AggregateReportGuard và bộ lọc theo quyền trên danh sách đơn),
   * nên ẩn nút không phải là chặn và hiện nút không phải là mở quyền.
   */
  const canViewOrders =
    can(PermissionAction.ViewCompanyReport) || can(PermissionAction.ViewDepartmentReport);
  const ownDepartment =
    !canManageAll && currentUser !== null && currentUser.departmentId !== null
      ? { id: currentUser.departmentId, name: currentUser.departmentName ?? '' }
      : undefined;

  const [filters, setFilters] = useState<UsersFilterValues>(EMPTY_FILTERS);
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [editing, setEditing] = useState<OrganisationUser | null>(null);
  /** Nhân viên đang mở bảng đơn; null = chưa mở ai. */
  const [xemDon, setXemDon] = useState<OrganisationUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<OrganisationUser | null>(null);
  const [resetTarget, setResetTarget] = useState<OrganisationUser | null>(null);
  const [issuedPassword, setIssuedPassword] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(filters.search);
  const selectedRole = findRole(filters.role);
  const selectedDepartmentId =
    filters.departmentId === ALL_OPTION ? undefined : Number(filters.departmentId);

  const load = useCallback(async (): Promise<UsersPageData> => {
    const [users, departments] = await Promise.all([
      fetchUsers({
        page,
        limit: DEFAULT_PAGE_SIZE,
        ...(debouncedSearch.trim() === '' ? {} : { q: debouncedSearch.trim() }),
        ...(selectedRole === undefined ? {} : { role: selectedRole }),
        ...(selectedDepartmentId === undefined ? {} : { departmentId: selectedDepartmentId }),
      }),
      // Chỉ Admin cần danh sách phòng (bộ lọc và form). Trưởng phòng dùng phòng
      // trong phiên, nên không để một lời gọi thừa làm hỏng cả màn của họ.
      canManageAll ? fetchDepartments() : Promise.resolve<Department[]>([]),
    ]);
    return { users, departments };
  }, [page, debouncedSearch, selectedRole, selectedDepartmentId, canManageAll]);

  const resource = useAsyncResource<UsersPageData>(load, [load]);
  const users = resource.data?.users.items ?? [];
  const total = resource.data?.users.total ?? 0;

  /** Any filter change starts a new result set, so the page goes back to the first. */
  const changeFilters = (next: UsersFilterValues): void => {
    setFilters(next);
    setPage(DEFAULT_PAGE);
  };

  const openCreate = useCallback((): void => {
    setEditing(null);
    setFormError(null);
    formDialog.open();
  }, [formDialog]);

  const handleSubmit = async (values: UserFormValues): Promise<void> => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editing === null) {
        const created = await createUser({
          email: values.email.trim(),
          fullName: values.fullName.trim(),
          roles: values.roles,
          ...(values.phone.trim() === '' ? {} : { phone: values.phone.trim() }),
          ...(values.departmentId === null ? {} : { departmentId: values.departmentId }),
          ...(values.tempPassword.trim() === ''
            ? {}
            : { tempPassword: values.tempPassword.trim() }),
        });
        // Để trống ô mật khẩu thì chỉ backend biết mật khẩu vừa sinh — không hiện
        // ra ở đây là tài khoản mới không ai đăng nhập được.
        if (created.tempPassword !== null && values.tempPassword.trim() === '') {
          setIssuedPassword(created.tempPassword);
        }
      } else {
        await updateUser(editing.id, {
          fullName: values.fullName.trim(),
          phone: values.phone.trim(),
          roles: values.roles,
          canViewCompanyReport: values.canViewCompanyReport,
          canViewAllOrders: values.canViewAllOrders,
          ...(values.departmentId === null ? {} : { departmentId: values.departmentId }),
        });
      }
      formDialog.close();
      resource.reload();
      enqueueSnackbar(t('common.states.saved'), { variant: 'success' });
    } catch (error) {
      setFormError(describeError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (): Promise<void> => {
    if (statusTarget === null) return;
    try {
      await setUserStatus(statusTarget.id, !statusTarget.isActive);
      resource.reload();
      enqueueSnackbar(t('common.states.saved'), { variant: 'success' });
    } catch (error) {
      enqueueSnackbar(describeError(error), { variant: 'error' });
    } finally {
      setStatusTarget(null);
    }
  };

  const handleResetPassword = async (): Promise<void> => {
    if (resetTarget === null) return;
    try {
      const password = await resetUserPassword(resetTarget.id);
      setIssuedPassword(password);
      resource.reload();
    } catch (error) {
      enqueueSnackbar(describeError(error), { variant: 'error' });
    } finally {
      setResetTarget(null);
    }
  };

  const departments = resource.data?.departments ?? [];

  return (
    <PageContainer
      title={t('nav.users')}
      description={
        ownDepartment === undefined
          ? t('admin.users.description')
          : t('admin.users.managerDescription', { department: ownDepartment.name })
      }
      action={
        // Trưởng phòng chưa thuộc phòng nào thì backend từ chối tạo, nên không có nút.
        canManageAll || ownDepartment !== undefined ? (
          <Button variant="contained" startIcon={<IconPlus size={18} />} onClick={openCreate}>
            {t('admin.users.create')}
          </Button>
        ) : null
      }
    >
      <UsersFilterBar
        values={filters}
        departments={departments}
        onChange={changeFilters}
        showDepartment={canManageAll}
      />

      <SectionCard disableContentPadding>
        <DataTableShell
          isFirstLoad={resource.isFirstLoad}
          isRefetching={resource.isRefetching}
          errorMessage={resource.errorMessage}
          onDismissError={resource.clearError}
          isEmpty={users.length === 0}
          page={page}
          pageCount={Math.ceil(total / DEFAULT_PAGE_SIZE)}
          totalRows={total}
          onPageChange={setPage}
          minWidth={980}
          head={
            <TableRow>
              <TableCell>{t('admin.users.fullName')}</TableCell>
              <TableCell>{t('admin.users.department')}</TableCell>
              <TableCell>{t('admin.users.roles')}</TableCell>
              <TableCell>{t('admin.users.phone')}</TableCell>
              <TableCell>{t('common.table.status')}</TableCell>
              {canManageAll || canViewOrders ? (
                <TableCell align="right">{t('common.actions.actions')}</TableCell>
              ) : null}
            </TableRow>
          }
        >
          {users.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              canManage={canManageAll}
              {...(canViewOrders ? { onViewOrders: setXemDon } : {})}
              onEdit={(target) => {
                setEditing(target);
                setFormError(null);
                formDialog.open();
              }}
              onResetPassword={setResetTarget}
              onToggleStatus={setStatusTarget}
            />
          ))}
        </DataTableShell>
      </SectionCard>

      <UserOrdersDialog user={xemDon} onClose={() => setXemDon(null)} />

      <UserFormDialog
        isOpen={formDialog.isOpen}
        user={editing}
        departments={departments}
        isSubmitting={isSubmitting}
        errorMessage={formError}
        onSubmit={(values) => void handleSubmit(values)}
        onClose={formDialog.close}
        {...(canManageAll
          ? {}
          : { grantableRoles: MANAGER_GRANTABLE_ROLES, lockedDepartment: ownDepartment })}
      />

      <UserActionDialogs
        statusTarget={statusTarget}
        resetTarget={resetTarget}
        issuedPassword={issuedPassword}
        onConfirmStatus={() => void handleToggleStatus()}
        onConfirmReset={() => void handleResetPassword()}
        onCloseStatus={() => setStatusTarget(null)}
        onCloseReset={() => setResetTarget(null)}
        onClosePassword={() => setIssuedPassword(null)}
      />
    </PageContainer>
  );
}
