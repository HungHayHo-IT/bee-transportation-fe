import dayjs from 'dayjs';
import type { RevenueGrouping } from '@/types/dashboard';

/**
 * The bucket start as the backend sends it: `YYYY-MM-DD` in Vietnamese local time.
 * It used to arrive one day early (QA-21, fixed on 23/08/2026), which is why the
 * label and the drill-down range are still derived in this one place.
 */
function toBucketStart(period: string): dayjs.Dayjs {
  return dayjs(period);
}

export function formatRevenuePeriod(period: string, groupBy: RevenueGrouping): string {
  const start = toBucketStart(period);
  if (!start.isValid()) return period;
  if (groupBy === 'day') return start.format('DD/MM');
  if (groupBy === 'month') return start.format('MM/YYYY');
  return `Q${String(Math.floor(start.month() / 3) + 1)}/${start.format('YYYY')}`;
}

export interface PeriodRange {
  fromDate: string;
  toDate: string;
}

/** Clicking a bucket drills into exactly the days that bucket covers. */
export function resolvePeriodRange(period: string, groupBy: RevenueGrouping): PeriodRange {
  const start = toBucketStart(period);
  const end =
    groupBy === 'day'
      ? start
      : groupBy === 'month'
        ? start.endOf('month')
        : start.add(3, 'month').subtract(1, 'day');
  return { fromDate: start.format('YYYY-MM-DD'), toDate: end.format('YYYY-MM-DD') };
}
