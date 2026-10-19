import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Stack,
  TableCell,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { PageContainer } from '@/components/PageContainer';
import { SectionCard } from '@/components/SectionCard';
import { DataTableShell } from '@/components/DataTableShell';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import {
  fetchDepartments,
  fetchServices,
  setDepartmentServices,
} from '@/services/organisationService';
import type { Department, Service } from '@/types/organisation';
import { describeError } from '@/services/apiClient';

interface RoutingPageData {
  departments: Department[];
  services: Service[];
}

async function loadPageData(): Promise<RoutingPageData> {
  const [departments, services] = await Promise.all([fetchDepartments(), fetchServices()]);
  return { departments, services };
}

/** Vai của phòng — mỗi phòng nhiều nhất MỘT vai. */
type VaiPhong = 'isSales' | 'isQuoting';

/** Một dòng đang sửa: dịch vụ được tick, và vai của phòng. */
type StagedRow = { serviceIds: number[]; isSales: boolean; isQuoting: boolean };
type StagedMatrix = Record<number, StagedRow>;

const DONG_TRONG: StagedRow = { serviceIds: [], isSales: false, isQuoting: false };

/** Phòng Sale tạo đơn mọi dịch vụ — ô dịch vụ khoá lại. */
const khongGiuDichVu = (row: StagedRow): boolean => row.isSales;

function areSame(left: number[], right: number[]): boolean {
  if (left.length !== right.length) return false;
  const sortedLeft = [...left].sort((a, b) => a - b);
  const sortedRight = [...right].sort((a, b) => a - b);
  return sortedLeft.every((value, index) => value === sortedRight[index]);
}

/**
 * Changes are staged per department row and saved as a whole array, because the
 * endpoint replaces the row. A per-checkbox request would drop a colleague's
 * concurrent edit on the same row.
 */
export function RoutingMatrixPage(): ReactNode {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const resource = useAsyncResource(loadPageData);

  const [staged, setStaged] = useState<StagedMatrix>({});
  const [savingDepartmentId, setSavingDepartmentId] = useState<number | null>(null);

  const departments = useMemo(
    () => (resource.data?.departments ?? []).filter((department) => department.isActive),
    [resource.data],
  );
  const services = resource.data?.services ?? [];

  useEffect(() => {
    const next: StagedMatrix = {};
    for (const department of departments)
      next[department.id] = {
        serviceIds: department.serviceIds,
        isSales: department.isSales,
        isQuoting: department.isQuoting,
      };
    setStaged(next);
  }, [departments]);

  const unroutedServices = services.filter(
    (service) =>
      !Object.values(staged).some(
        // Chỉ Phòng báo giá được chia đơn: dịch vụ chưa phòng báo giá nào tích là chưa ai báo giá.
        (row) => row.isQuoting && row.serviceIds.includes(service.id),
      ) && service.isActive,
  );

  const toggleCell = (departmentId: number, serviceId: number): void => {
    const current = staged[departmentId] ?? DONG_TRONG;
    const next = current.serviceIds.includes(serviceId)
      ? current.serviceIds.filter((id) => id !== serviceId)
      : [...current.serviceIds, serviceId];
    setStaged({ ...staged, [departmentId]: { ...current, serviceIds: next } });
  };

  /** Bật một vai thì tắt hai vai còn lại — một phòng một vai. */
  const toggleVai = (departmentId: number, vai: VaiPhong): void => {
    const current = staged[departmentId] ?? DONG_TRONG;
    const bat = !current[vai];
    setStaged({
      ...staged,
      [departmentId]: { ...current, isSales: false, isQuoting: false, [vai]: bat },
    });
  };

  const saveRow = async (department: Department): Promise<void> => {
    const row = staged[department.id] ?? DONG_TRONG;
    setSavingDepartmentId(department.id);
    try {
      await setDepartmentServices(department.id, khongGiuDichVu(row) ? [] : row.serviceIds, {
        isSales: row.isSales,
        isQuoting: row.isQuoting,
      });
      resource.reload();
      enqueueSnackbar(t('common.states.saved'), { variant: 'success' });
    } catch (error) {
      enqueueSnackbar(describeError(error), { variant: 'error' });
    } finally {
      setSavingDepartmentId(null);
    }
  };

  return (
    <PageContainer title={t('nav.routingMatrix')} description={t('admin.routing.description')}>
      {unroutedServices.length > 0 ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t('admin.routing.unroutedWarning', {
            services: unroutedServices.map((service) => service.code).join(', '),
          })}
        </Alert>
      ) : null}

      <SectionCard disableContentPadding>
        <DataTableShell
          isFirstLoad={resource.isFirstLoad}
          isRefetching={resource.isRefetching}
          errorMessage={resource.errorMessage}
          onDismissError={resource.clearError}
          isEmpty={departments.length === 0}
          minWidth={260 + 2 * 92 + services.length * 92}
          head={
            <TableRow>
              <TableCell
                sx={{ position: 'sticky', left: 0, zIndex: 2, backgroundColor: 'background.default' }}
              >
                {t('admin.routing.department')}
              </TableCell>
              {(['isSales', 'isQuoting'] as const).map((vai) => (
                <TableCell key={vai} align="center">
                  <Tooltip title={t(`admin.routing.${vai}Hint`)}>
                    <Box component="span">{t(`admin.routing.${vai}`)}</Box>
                  </Tooltip>
                </TableCell>
              ))}
              {services.map((service) => (
                <TableCell key={service.id} align="center">
                  <Tooltip title={service.name}>
                    <Box component="span">{service.code}</Box>
                  </Tooltip>
                </TableCell>
              ))}
              <TableCell
                align="right"
                sx={{ position: 'sticky', right: 0, zIndex: 2, backgroundColor: 'background.default' }}
              >
                {t('common.actions.actions')}
              </TableCell>
            </TableRow>
          }
        >
          {departments.map((department) => {
            const row = staged[department.id] ?? DONG_TRONG;
            const stagedIds = row.serviceIds;
            const isDirty =
              row.isSales !== department.isSales ||
              row.isQuoting !== department.isQuoting ||
              (!khongGiuDichVu(row) && !areSame(stagedIds, department.serviceIds));

            return (
              <TableRow key={department.id} hover>
                <TableCell
                  sx={{
                    position: 'sticky',
                    left: 0,
                    zIndex: 1,
                    backgroundColor: 'background.paper',
                    borderRight: (theme) => `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" fontWeight={600}>
                      {department.name}
                    </Typography>
                    {isDirty ? (
                      <Chip size="small" color="warning" label={t('admin.routing.unsaved')} />
                    ) : null}
                  </Stack>
                </TableCell>
                {(['isSales', 'isQuoting'] as const).map((vai) => (
                  <TableCell key={vai} align="center" padding="none">
                    <Checkbox
                      size="small"
                      color="secondary"
                      checked={row[vai]}
                      onChange={() => toggleVai(department.id, vai)}
                      inputProps={{ 'aria-label': t(`admin.routing.${vai}`) }}
                    />
                  </TableCell>
                ))}
                {services.map((service) => (
                  <TableCell key={service.id} align="center" padding="none">
                    {/* Phòng Sale tạo được đơn MỌI dịch vụ nhưng không báo giá:
                        ô dịch vụ hiện đã tick và khoá lại. Phòng báo giá: tích =
                        được chia đơn. Phòng khác: tích = Điều vận và Trưởng
                        phòng XEM đơn đã chốt của dịch vụ đó. */}
                    <Checkbox
                      size="small"
                      checked={row.isSales || stagedIds.includes(service.id)}
                      disabled={khongGiuDichVu(row)}
                      onChange={() => toggleCell(department.id, service.id)}
                    />
                  </TableCell>
                ))}
                <TableCell
                  align="right"
                  sx={{
                    position: 'sticky',
                    right: 0,
                    zIndex: 1,
                    backgroundColor: 'background.paper',
                    borderLeft: (theme) => `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Button
                    size="small"
                    variant="contained"
                    disabled={!isDirty || savingDepartmentId === department.id}
                    onClick={() => void saveRow(department)}
                  >
                    {t('common.actions.save')}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </DataTableShell>
      </SectionCard>
    </PageContainer>
  );
}
