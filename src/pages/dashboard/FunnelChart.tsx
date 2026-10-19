import type { ReactNode } from 'react';
import type { ApexOptions } from 'apexcharts';
import Chart from 'react-apexcharts';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/EmptyState';
import { brandColors } from '@/theme';
import { OrderStatus } from '@/constants/orderStatus';
import type { FunnelStage } from '@/types/dashboard';

/**
 * A funnel painted in one colour hides its own story. Work in progress stays
 * brand orange, money already earned turns green, and the two ways an order can
 * end without revenue are set apart from both.
 */
const STAGE_COLOR: Record<OrderStatus, string> = {
  [OrderStatus.AwaitingInfo]: '#8B8E97',
  [OrderStatus.New]: brandColors.slate,
  [OrderStatus.Distributed]: '#9AA0A9',
  [OrderStatus.Quoting]: brandColors.orange,
  [OrderStatus.AwaitingSelection]: brandColors.orange,
  [OrderStatus.Closed]: brandColors.success,
  [OrderStatus.Cancelled]: '#B9BDC4',
};

export interface FunnelChartProps {
  stages: FunnelStage[];
  onStageSelected: (stage: FunnelStage) => void;
}

/** Statuses with no orders are dropped: an empty bar reads as a broken chart. */
export function FunnelChart({ stages, onStageSelected }: FunnelChartProps): ReactNode {
  const { t } = useTranslation();
  const populated = stages.filter((stage) => stage.orderCount > 0);

  if (populated.length === 0) {
    return <EmptyState title={t('dashboard.funnel.empty')} />;
  }

  const options: ApexOptions = {
    chart: {
      type: 'bar',
      toolbar: { show: false },
      fontFamily: 'inherit',
      events: {
        dataPointSelection: (_event, _context, config: { dataPointIndex: number }) => {
          const stage = populated[config.dataPointIndex];
          if (stage !== undefined) onStageSelected(stage);
        },
      },
    },
    colors: populated.map((stage) => STAGE_COLOR[stage.status]),
    plotOptions: {
      bar: { horizontal: true, borderRadius: 5, barHeight: '62%', distributed: true },
    },
    dataLabels: {
      enabled: true,
      style: { fontSize: '12px', fontWeight: 700, colors: ['#FFFFFF'] },
      offsetX: 0,
    },
    legend: { show: false },
    grid: { borderColor: brandColors.lineSoft, strokeDashArray: 4, xaxis: { lines: { show: true } } },
    xaxis: {
      categories: populated.map((stage) => stage.label),
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { style: { fontSize: '13px' } } },
    tooltip: { y: { formatter: (value: number) => `${String(value)} ${t('dashboard.funnel.seriesName')}` } },
    states: { active: { filter: { type: 'none' } } },
  };

  return (
    <Chart
      type="bar"
      height={Math.max(220, populated.length * 44)}
      options={options}
      series={[{ name: t('dashboard.funnel.seriesName'), data: populated.map((stage) => stage.orderCount) }]}
    />
  );
}
