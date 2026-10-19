import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { Button, Chip, IconButton, Stack, TableCell, TableRow, Tooltip } from '@mui/material';
import { IconLock, IconLockOpen, IconPencil, IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { PageContainer } from '@/components/PageContainer';
import { SectionCard } from '@/components/SectionCard';
import { DataTableShell } from '@/components/DataTableShell';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useDisclosure } from '@/hooks/useDisclosure';
import { usePageLevels } from '@/hooks/usePageLevels';
import {
  createDepartment,
  fetchDepartments,
  fetchServices,
  fetchUsers,
  updateDepartment,
} from '@/services/organisationService';
import type { Department, OrganisationUser } from '@/types/organisation';
import { describeError } from '@/services/apiClient';
import { DepartmentFormDialog } from './DepartmentFormDialog';
import type { DepartmentFormValues } from './DepartmentFormDialog';

interface DepartmentsPageData {
  departments: Department[];
  users: OrganisationUser[];
  services: Awaited<ReturnType<typeof fetchServices>>;
}

/** The manager picker offers every account, so it asks for one large page. */
const MANAGER_PICKER_LIMIT = 200;

/**
 * Bảng chỉ cần danh sách phòng ban. Người dùng và dịch vụ CHỈ để đổ vào hộp
 * thêm/sửa (ô chọn trưởng phòng, ô chọn dịch vụ) — và hai API đó khoá chặt
 * hơn: Sale, Nhân viên không đọc được /users lẫn /services.
 *
 * Trước đây ba lời gọi chung một Promise.all, nên Sale mở màn này là MỘT lời
 * gọi phụ bị 403 kéo đổ cả màn: bảng trống, kèm dòng "Forbidden resource".
 * Giờ hai lời gọi phụ hỏng thì thôi — người không sửa được cũng chẳng mở hộp
 * sửa, còn người sửa được thì vốn đọc được cả hai.
 */
async function loadPageData(): Promise<DepartmentsPageData> {
  const [departments, users, services] = await Promise.all([
    fetchDepartments(),
    fetchUsers({ limit: MANAGER_PICKER_LIMIT }).then((r) => r.items).catch(() => []),
    fetchServices().catch(() => []),
  ]);
  return { departments, users, services };
}

export function DepartmentsPage(): ReactNode {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const resource = useAsyncResource(loadPageData);
  /* Nút thêm / sửa / khoá chỉ cho người có quyền SỬA màn này. Người chỉ được
     xem (Sale, Nhân viên, Trưởng phòng) bấm vào thì backend cũng chặn — để nút
     hiện chỉ là hứa một việc không làm được. */
  const mucTrang = usePageLevels();
  const coTheSua = ['edit', 'full'].includes(mucTrang?.departments ?? 'none');
  const formDialog = useDisclosure();

  const [editing, setEditing] = useState<Department | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<Department | null>(null);

  const openCreate = useCallback((): void => {
    setEditing(null);
    setFormError(null);
    formDialog.open();
  }, [formDialog]);

  const openEdit = useCallback(
    (department: Department): void => {
      setEditing(department);
      setFormError(null);
      formDialog.open();
    },
    [formDialog],
  );

  const handleSubmit = async (values: DepartmentFormValues): Promise<void> => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editing === null) {
        await createDepartment({
          name: values.name.trim(),
          ...(values.managerId === null ? {} : { managerId: values.managerId }),
          parentId: values.parentId,
          serviceIds: values.serviceIds,
        });
      } else {
        await updateDepartment(editing.id, {
          name: values.name.trim(),
          ...(values.managerId === null ? {} : { managerId: values.managerId }),
          parentId: values.parentId,
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
      await updateDepartment(statusTarget.id, { isActive: !statusTarget.isActive });
      resource.reload();
      enqueueSnackbar(t('common.states.saved'), { variant: 'success' });
    } catch (error) {
      enqueueSnackbar(describeError(error), { variant: 'error' });
    } finally {
      setStatusTarget(null);
    }
  };

  const departments = resource.data?.departments ?? [];

  return (
    <PageContainer
      title={t('nav.departments')}
      description={t('admin.departments.description')}
      action={
        coTheSua ? (
          <Button variant="contained" startIcon={<IconPlus size={18} />} onClick={openCreate}>
            {t('admin.departments.create')}
          </Button>
        ) : undefined
      }
    >
      <SectionCard disableContentPadding>
        <DataTableShell
          isFirstLoad={resource.isFirstLoad}
          isRefetching={resource.isRefetching}
          errorMessage={resource.errorMessage}
          onDismissError={resource.clearError}
          isEmpty={departments.length === 0}
          totalRows={departments.length}
          minWidth={820}
          head={
            <TableRow>
              <TableCell>{t('admin.departments.name')}</TableCell>
              <TableCell>{t('admin.departments.manager')}</TableCell>
              <TableCell align="right">{t('admin.departments.members')}</TableCell>
              <TableCell align="right">{t('admin.departments.serviceCount')}</TableCell>
              <TableCell>{t('common.table.status')}</TableCell>
              {coTheSua ? <TableCell align="right">{t('common.actions.actions')}</TableCell> : null}
            </TableRow>
          }
        >
          {departments.map((department) => (
            <TableRow key={department.id} hover>
              <TableCell>{department.name}</TableCell>
              <TableCell>{department.managerName ?? '—'}</TableCell>
              <TableCell align="right">{department.memberCount}</TableCell>
              <TableCell align="right">{department.serviceIds.length}</TableCell>
              <TableCell>
                <Chip
                  size="small"
                  variant="outlined"
                  color={department.isActive ? 'success' : 'default'}
                  label={
                    department.isActive ? t('common.states.active') : t('common.states.inactive')
                  }
                />
              </TableCell>
              {coTheSua ? (
              <TableCell align="right">
                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                  <Tooltip title={t('common.actions.edit')}>
                    <IconButton size="small" onClick={() => openEdit(department)}>
                      <IconPencil size={17} stroke={1.7} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip
                    title={
                      department.isActive
                        ? t('admin.departments.deactivate')
                        : t('admin.departments.activate')
                    }
                  >
                    <IconButton size="small" onClick={() => setStatusTarget(department)}>
                      {department.isActive ? (
                        <IconLock size={17} stroke={1.7} />
                      ) : (
                        <IconLockOpen size={17} stroke={1.7} />
                      )}
                    </IconButton>
                  </Tooltip>
                </Stack>
              </TableCell>
              ) : null}
            </TableRow>
          ))}
        </DataTableShell>
      </SectionCard>

      <DepartmentFormDialog
        isOpen={formDialog.isOpen}
        department={editing}
        departments={departments}
        users={resource.data?.users ?? []}
        services={resource.data?.services ?? []}
        isSubmitting={isSubmitting}
        errorMessage={formError}
        onSubmit={(values) => void handleSubmit(values)}
        onClose={formDialog.close}
      />

      <ConfirmDialog
        isOpen={statusTarget !== null}
        title={
          statusTarget?.isActive === true
            ? t('admin.departments.deactivate')
            : t('admin.departments.activate')
        }
        description={
          statusTarget?.isActive === true
            ? t('admin.departments.deactivateHint')
            : t('admin.departments.activateHint')
        }
        isDestructive={statusTarget?.isActive === true}
        onConfirm={() => void handleToggleStatus()}
        onClose={() => setStatusTarget(null)}
      />
    </PageContainer>
  );
}
