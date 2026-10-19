import { useCallback, useMemo, type ReactNode } from 'react';
import {
  Box, Chip, Dialog, DialogContent, DialogTitle, IconButton, Stack,
  TableCell, TableRow, Tooltip, Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { DataTableShell } from '@/components/DataTableShell';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { fetchStaffScorecard } from '@/services/dashboardService';
import { fetchOrders } from '@/services/orderService';
import type { OrganisationUser } from '@/types/organisation';
import type { StaffScore } from '@/types/pricing';

const TIEN = new Intl.NumberFormat('vi-VN');
/** Đơn gần nhất, đủ để nhìn ra người này đang làm gì; không phải sổ đơn đầy đủ. */
const SO_DON = 25;

export interface UserOrdersDialogProps {
  /** null = đóng. */
  user: OrganisationUser | null;
  onClose: () => void;
}

/** Một con số kèm nhãn — hàng chỉ số phía trên bảng đơn. */
function ChiSo({ nhan, giaTri, phu }: { nhan: string; giaTri: string; phu?: string }) {
  return (
    <Box sx={{ minWidth: 118 }}>
      <Typography variant="caption" color="text.secondary" display="block">
        {nhan}
      </Typography>
      <Typography variant="h6" sx={{ lineHeight: 1.25 }}>
        {giaTri}
      </Typography>
      {phu ? (
        <Typography variant="caption" color="text.secondary">
          {phu}
        </Typography>
      ) : null}
    </Box>
  );
}

/**
 * Đơn của một nhân viên, mở từ màn Nhân viên.
 *
 * Hai vai được tách riêng chứ không cộng vào nhau: người TẠO đơn và người NHẬP
 * GIÁ làm hai việc khác nhau, và một người có thể làm cả hai. Gộp lại thì "số
 * đơn" đếm hai thứ khác nhau dưới cùng một con số.
 *
 * Không dựng endpoint mới: bảng đánh giá nhân viên và danh sách đơn đều đã có,
 * và cả hai đã tự giới hạn theo quyền của người đang xem — trưởng phòng chỉ
 * thấy phạm vi phòng mình, giám đốc thấy toàn công ty.
 */
export function UserOrdersDialog({ user, onClose }: UserOrdersDialogProps): ReactNode {
  const { t } = useTranslation();
  const userId = user?.id ?? null;

  const taiDiem = useCallback(() => fetchStaffScorecard(), []);
  const diem = useAsyncResource(taiDiem, [userId]);

  const taiDon = useCallback(
    () =>
      userId === null
        ? Promise.resolve({ items: [], total: 0, page: 1, limit: SO_DON })
        : fetchOrders({ createdBy: userId, limit: SO_DON, sortBy: 'createdAt', sortOrder: 'desc' }),
    [userId],
  );
  const don = useAsyncResource(taiDon, [userId]);

  /* Tra thẳng trong useMemo chứ không gọi một hàm dựng lại ở mỗi lần render:
     hàm đó là một phụ thuộc mà danh sách không khai, nên eslint bắt đúng — và
     nếu ai đó sửa thân hàm thì hai dòng dưới không tính lại. */
  const theoTao = useMemo(
    () => diem.data?.bySale?.find((x) => x.userId === userId) ?? null,
    [diem.data, userId],
  );
  const theoGia = useMemo(
    () => diem.data?.byPricing?.find((x) => x.userId === userId) ?? null,
    [diem.data, userId],
  );

  const tiLe = (s: StaffScore | null): string =>
    s === null || s.conversionRate === null ? '—' : `${s.conversionRate}%`;

  const khoiChiSo = (nhan: string, s: StaffScore | null): ReactNode => (
    <Stack
      direction="row"
      spacing={2}
      useFlexGap
      flexWrap="wrap"
      sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
    >
      <Box sx={{ width: '100%' }}>
        <Typography variant="subtitle2">{nhan}</Typography>
      </Box>
      <ChiSo nhan={t('scorecard.orderCount')} giaTri={String(s?.orderCount ?? 0)} />
      <ChiSo
        nhan={t('scorecard.decidedCount')}
        giaTri={String(s?.decidedCount ?? 0)}
        phu={t('admin.users.orders.decidedHint')}
      />
      <ChiSo nhan={t('scorecard.closedCount')} giaTri={String(s?.closedCount ?? 0)} />
      <ChiSo
        nhan={t('scorecard.conversionRate')}
        giaTri={tiLe(s)}
        phu={s?.conversionRate === null ? t('scorecard.noRateHint') : undefined}
      />
      <ChiSo nhan={t('scorecard.quotedTotal')} giaTri={TIEN.format(s?.quotedTotal ?? 0)} />
      <ChiSo nhan={t('scorecard.revenue')} giaTri={TIEN.format(s?.revenue ?? 0)} />
    </Stack>
  );

  const rows = don.data?.items ?? [];

  return (
    <Dialog open={user !== null} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        {user?.fullName}
        <Typography variant="body2" color="text.secondary">
          {user?.departmentName ?? t('admin.users.orders.noDepartment')}
          {user?.email ? ` · ${user.email}` : ''}
        </Typography>
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {khoiChiSo(t('admin.users.orders.asSale'), theoTao)}
          {khoiChiSo(t('admin.users.orders.asPricing'), theoGia)}

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {t('admin.users.orders.listTitle', { count: SO_DON })}
            </Typography>
            <DataTableShell
              isFirstLoad={don.isFirstLoad}
              isRefetching={don.isRefetching}
              errorMessage={don.errorMessage ?? diem.errorMessage}
              onDismissError={don.clearError}
              isEmpty={rows.length === 0}
              emptyTitle={t('admin.users.orders.empty')}
              head={
                <TableRow>
                  <TableCell>{t('queue.code')}</TableCell>
                  <TableCell>{t('customers.contactName')}</TableCell>
                  <TableCell>{t('orders.fields.service')}</TableCell>
                  <TableCell>{t('common.table.status')}</TableCell>
                  <TableCell align="right">{t('orders.list.value')}</TableCell>
                  <TableCell>{t('orders.list.createdDate')}</TableCell>
                </TableRow>
              }
            >
              {rows.map((o) => (
                <TableRow key={o.id} hover>
                  <TableCell>
                    {/* Mở thẳng đơn: xem xong một con số lạ thì việc tiếp theo
                        luôn là mở đơn ra coi, đừng bắt đi tìm lại bằng mã. */}
                    <Tooltip title={t('admin.users.orders.openOrder')}>
                      <Box
                        component={RouterLink}
                        to={`/orders/${o.id}`}
                        sx={{ fontWeight: 600, color: 'primary.main', textDecoration: 'none' }}
                      >
                        {o.code}
                      </Box>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{o.customerName ?? '—'}</TableCell>
                  <TableCell>{o.serviceName}</TableCell>
                  <TableCell>
                    <Chip size="small" variant="outlined" label={o.statusLabel} />
                  </TableCell>
                  <TableCell align="right">
                    {o.finalAmount === null ? '—' : TIEN.format(o.finalAmount)}
                  </TableCell>
                  <TableCell>{new Date(o.createdAt).toLocaleDateString('vi-VN')}</TableCell>
                </TableRow>
              ))}
            </DataTableShell>
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
