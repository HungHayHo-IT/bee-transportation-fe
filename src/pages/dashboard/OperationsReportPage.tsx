import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { PageContainer } from '@/components/PageContainer';
import { ScopeBadge } from './ScopeBadge';
import { SectionCard } from '@/components/SectionCard';
import { EmptyState } from '@/components/EmptyState';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { usePermissions } from '@/hooks/usePermissions';
import { useCurrentUser } from '@/store/sessionContext';
import {
  fetchAverageDepartmentsPerOrder,
  fetchCompetition,
  fetchFunnel,
  fetchResponseTime,
  fetchWorkload,
} from '@/services/dashboardService';
import type {
  CompetitionRow,
  DashboardFilters,
  FunnelStage,
  ResponseTimeRow,
  WorkloadReport,
  WorkloadRow,
} from '@/types/dashboard';
import { DashboardFiltersBar } from './DashboardFiltersBar';
import { DrillPanel } from './DrillPanel';
import type { DrillTarget } from './DrillPanel';
import { CompetitionCard } from './CompetitionCard';
import { FunnelChart } from './FunnelChart';
import { ResponseTimeCard } from './ResponseTimeCard';

function WorkloadTable({
  rows,
  headerLabel,
}: {
  rows: WorkloadRow[];
  headerLabel: string;
}): ReactNode {
  const { t } = useTranslation();

  if (rows.length === 0) return <EmptyState title={t('dashboard.workload.empty')} />;

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>{headerLabel}</TableCell>
          <TableCell align="right">{t('dashboard.workload.orderCount')}</TableCell>
          <TableCell align="right">{t('dashboard.workload.openCount')}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id} hover>
            <TableCell>{row.name}</TableCell>
            <TableCell align="right">{row.orderCount}</TableCell>
            <TableCell align="right">{row.openCount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function OperationsReportPage(): ReactNode {
  const { t } = useTranslation();
  const { reportTier } = usePermissions();
  const user = useCurrentUser();

  const [filters, setFilters] = useState<DashboardFilters>({});
  const [drillTarget, setDrillTarget] = useState<DrillTarget | null>(null);

  const funnelResource = useAsyncResource<FunnelStage[]>(
    useCallback(() => fetchFunnel(filters), [filters]),
    [filters],
  );
  const responseResource = useAsyncResource<ResponseTimeRow[]>(
    useCallback(() => fetchResponseTime(filters), [filters]),
    [filters],
  );
  const competitionResource = useAsyncResource<CompetitionRow[]>(
    useCallback(() => fetchCompetition(filters), [filters]),
    [filters],
  );
  const averageResource = useAsyncResource<number | null>(
    useCallback(() => fetchAverageDepartmentsPerOrder(filters), [filters]),
    [filters],
  );
  const workloadResource = useAsyncResource<WorkloadReport>(
    useCallback(() => fetchWorkload(filters), [filters]),
    [filters],
  );

  const scopeLabel =
    reportTier === 'department'
      ? t('dashboard.scope.department', { department: user?.departmentName ?? '—' })
      : t(reportTier === 'company' ? 'dashboard.scope.company' : 'dashboard.scope.personal');

  const responseRows = responseResource.data ?? [];
  const competitionRows = competitionResource.data ?? [];
  const workload = workloadResource.data;

  return (
    <PageContainer
      title={t('nav.operationsReport')}
      description={t('dashboard.operations.description')}
      action={<ScopeBadge scope={reportTier} label={scopeLabel} />}
    >
      <Stack spacing={2}>
        <SectionCard>
          <DashboardFiltersBar filters={filters} onChange={setFilters} />
        </SectionCard>

        {responseResource.errorMessage === null ? null : (
          <Alert severity="error" onClose={responseResource.clearError}>
            {responseResource.errorMessage}
          </Alert>
        )}

        <SectionCard title={t('dashboard.funnel.title')} subtitle={t('dashboard.funnel.subtitle')}>
          {funnelResource.isRefetching ? <LinearProgress /> : null}
          <FunnelChart
            stages={funnelResource.data ?? []}
            onStageSelected={(stage) =>
              setDrillTarget({ title: stage.label, filters: { ...filters, status: stage.status } })
            }
          />
        </SectionCard>

        <ResponseTimeCard
          rows={responseRows}
          isRefetching={responseResource.isRefetching}
          onDepartmentSelected={(row) =>
            setDrillTarget({
              title: row.departmentName,
              filters: { ...filters, departmentId: row.departmentId },
            })
          }
        />

        <CompetitionCard
          rows={competitionRows}
          averageDepartments={averageResource.data}
          onDepartmentSelected={(row) =>
            setDrillTarget({
              title: row.departmentName,
              filters: { ...filters, departmentId: row.departmentId },
            })
          }
        />

        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
          <Stack sx={{ flex: 1 }}>
            <SectionCard title={t('dashboard.workload.byDepartment')}>
              <WorkloadTable
                rows={workload?.byDepartment ?? []}
                headerLabel={t('admin.routing.department')}
              />
            </SectionCard>
          </Stack>
          <Stack sx={{ flex: 1 }}>
            <SectionCard title={t('dashboard.workload.byUser')}>
              <WorkloadTable
                rows={workload?.byUser ?? []}
                headerLabel={t('admin.users.fullName')}
              />
            </SectionCard>
          </Stack>
        </Stack>
      </Stack>

      <DrillPanel target={drillTarget} onClose={() => setDrillTarget(null)} />
    </PageContainer>
  );
}
