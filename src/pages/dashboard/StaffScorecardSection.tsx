import { useCallback, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box, Button, Stack, TableCell, TableRow, Tooltip, Typography,
} from '@mui/material';
import TableRowsIcon from '@mui/icons-material/TableRows';
import { SectionCard } from '@/components/SectionCard';
import { DataTableShell } from '@/components/DataTableShell';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { fetchStaffScorecard } from '@/services/dashboardService';
import type { StaffScore } from '@/types/pricing';
import { StaffScoreChart } from './StaffScoreChart';

const TIEN = new Intl.NumberFormat('vi-VN');

export interface StaffScorecardSectionProps {
  /** Cùng bộ lọc với phần còn lại của bảng điều khiển. */
  fromDate?: string;
  toDate?: string;
}

/**
 * Bảng đánh giá nhân viên, dựng thành một khối để bảng điều khiển gắn vào.
 *
 * Hai NHÓM chứ không một: người TẠO đơn và người NHẬP GIÁ làm hai việc khác
 * nhau và không so được với nhau. Gộp lại thì cột "số đơn" của hai nhóm đếm
 * hai thứ khác nhau mà nằm chung một trục.
 *
 * Mỗi nhóm HAI biểu đồ, không phải một biểu đồ hai trục: doanh thu tính bằng
 * đồng, tỷ lệ chuyển đổi tính bằng phần trăm. Xem giải thích ở StaffScoreChart.
 */
export function StaffScorecardSection({
  fromDate, toDate,
}: StaffScorecardSectionProps): ReactNode {
  const { t } = useTranslation();
  /**
   * Biểu đồ đọc nhanh, bảng đọc chính xác — giữ cả hai.
   *
   * Không để tooltip làm đường DUY NHẤT tới con số: rê chuột thì không sao
   * chép được, không đọc trên điện thoại được, và trình đọc màn hình không
   * thấy gì cả.
   */
  const [hienBang, setHienBang] = useState(false);

  const tai = useCallback(
    () => fetchStaffScorecard({
      ...(fromDate ? { fromDate } : {}),
      ...(toDate ? { toDate } : {}),
    }),
    [fromDate, toDate],
  );
  const resource = useAsyncResource(tai, [fromDate, toDate]);

  const bang = (rows: StaffScore[]): ReactNode => (
    <DataTableShell
      isFirstLoad={resource.isFirstLoad}
      isRefetching={resource.isRefetching}
      errorMessage={resource.errorMessage}
      onDismissError={resource.clearError}
      isEmpty={rows.length === 0}
      emptyTitle={t('scorecard.empty')}
      head={
        <TableRow>
          <TableCell>{t('scorecard.person')}</TableCell>
          <TableCell align="right">{t('scorecard.orderCount')}</TableCell>
          <TableCell align="right">{t('scorecard.decidedCount')}</TableCell>
          <TableCell align="right">{t('scorecard.closedCount')}</TableCell>
          <TableCell align="right">{t('scorecard.quotedTotal')}</TableCell>
          <TableCell align="right">{t('scorecard.revenue')}</TableCell>
          <TableCell align="right">{t('scorecard.conversionRate')}</TableCell>
        </TableRow>
      }
    >
      {rows.map((r) => (
        <TableRow key={r.userId} hover>
          <TableCell>{r.fullName}</TableCell>
          <TableCell align="right">{r.orderCount}</TableCell>
          <TableCell align="right">{r.decidedCount}</TableCell>
          <TableCell align="right">{r.closedCount}</TableCell>
          <TableCell align="right">{TIEN.format(r.quotedTotal)}</TableCell>
          <TableCell align="right">{TIEN.format(r.revenue)}</TableCell>
          <TableCell align="right">
            {/* null KHÁC 0%: chưa có đơn nào ra kết quả, không phải chốt hụt hết. */}
            {r.conversionRate === null ? (
              <Tooltip title={t('scorecard.noRateHint')}>
                <Typography variant="body2" color="text.disabled" component="span">
                  {t('scorecard.noRate')}
                </Typography>
              </Tooltip>
            ) : (
              `${r.conversionRate}%`
            )}
          </TableCell>
        </TableRow>
      ))}
    </DataTableShell>
  );

  const nhom = (tieuDe: string, rows: StaffScore[]): ReactNode => (
    <SectionCard
      title={tieuDe}
      subtitle={t('scorecard.hint')}
      action={
        <Button
          size="small"
          color="inherit"
          startIcon={<TableRowsIcon />}
          onClick={() => setHienBang((v) => !v)}
        >
          {hienBang ? t('scorecard.hideTable') : t('scorecard.showTable')}
        </Button>
      }
      disableContentPadding={hienBang}
    >
      {hienBang ? (
        bang(rows)
      ) : (
        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          spacing={3}
          // Giữ bản vẽ cũ mờ đi trong lúc tải lại, không xoá đi rồi dựng lại:
          // chớp một cái khung rỗng làm cả trang nhảy.
          sx={{ opacity: resource.isRefetching ? 0.55 : 1, transition: 'opacity .15s' }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" sx={{ pl: 1 }}>
              {t('scorecard.revenue')}
            </Typography>
            <StaffScoreChart rows={rows} chiSo="revenue" emptyTitle={t('scorecard.empty')} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" sx={{ pl: 1 }}>
              {t('scorecard.conversionRate')}
            </Typography>
            <StaffScoreChart rows={rows} chiSo="conversionRate" emptyTitle={t('scorecard.empty')} />
          </Box>
        </Stack>
      )}
    </SectionCard>
  );

  return (
    <Stack spacing={3}>
      {nhom(t('scorecard.bySale'), resource.data?.bySale ?? [])}
      {nhom(t('scorecard.byPricing'), resource.data?.byPricing ?? [])}
    </Stack>
  );
}
