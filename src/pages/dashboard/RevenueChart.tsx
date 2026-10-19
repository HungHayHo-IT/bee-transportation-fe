import type { ReactNode } from 'react';
import type { ApexOptions } from 'apexcharts';
import Chart from 'react-apexcharts';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/EmptyState';
import { brandColors } from '@/theme';
import { formatCompactCurrencyVnd, formatCurrencyVnd } from '@/utils/formatters';
import type { RevenueGrouping, RevenuePoint } from '@/types/dashboard';
import { formatRevenuePeriod } from './revenuePeriod';

export interface RevenueChartProps {
  points: RevenuePoint[];
  groupBy: RevenueGrouping;
  onPeriodSelected: (point: RevenuePoint) => void;
}

export function RevenueChart({ points, groupBy, onPeriodSelected }: RevenueChartProps): ReactNode {
  const { t } = useTranslation();

  if (points.length === 0) {
    return <EmptyState title={t('dashboard.revenue.empty')} description={t('dashboard.revenue.emptyHint')} />;
  }

  const hasComparison = points.some((point) => point.prevRevenue !== null);

  const series = [
    { name: t('dashboard.revenue.current'), data: points.map((point) => point.revenue) },
    ...(hasComparison
      ? [
          {
            name: t('dashboard.revenue.previous'),
            data: points.map((point) => point.prevRevenue ?? 0),
          },
        ]
      : []),
  ];

  const options: ApexOptions = {
    chart: {
      type: 'bar',
      toolbar: { show: false },
      fontFamily: 'inherit',
      events: {
        dataPointSelection: (_event, _context, config: { dataPointIndex: number }) => {
          const point = points[config.dataPointIndex];
          if (point !== undefined) onPeriodSelected(point);
        },
      },
    },
    colors: [brandColors.orange, '#C9CCD2'],
    plotOptions: {
      bar: {
        // A single period with a 70%-wide column reads as a wall of orange, so
        // the width tightens as the series gets shorter.
        columnWidth: points.length > 8 ? '62%' : points.length > 3 ? '38%' : '22%',
        borderRadius: 6,
        borderRadiusApplication: 'end',
      },
    },
    dataLabels: {
      enabled: points.length <= 6 && !hasComparison,
      formatter: (value: number) => formatCompactCurrencyVnd(value),
      offsetY: -22,
      style: { fontSize: '12px', fontWeight: 700, colors: [brandColors.ink] },
    },
    grid: {
      borderColor: brandColors.lineSoft,
      strokeDashArray: 4,
      padding: { left: 4, right: 4, top: 8 },
    },
    legend: {
      show: hasComparison,
      position: 'top',
      horizontalAlign: 'right',
      markers: { size: 6 },
      fontSize: '13px',
    },
    xaxis: {
      categories: points.map((point) => formatRevenuePeriod(point.period, groupBy)),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { fontSize: '13px', colors: brandColors.muted } },
    },
    yaxis: {
      labels: {
        formatter: (value: number) => formatCompactCurrencyVnd(value),
        style: { fontSize: '12px', colors: brandColors.muted },
      },
    },
    tooltip: { y: { formatter: (value: number) => formatCurrencyVnd(value) } },
    states: { active: { filter: { type: 'none' } } },
  };

  return <Chart type="bar" height={300} options={options} series={series} />;
}
