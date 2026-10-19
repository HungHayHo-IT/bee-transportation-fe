import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Table, TableBody,
  TableHead, Typography,
} from '@mui/material';
import type { RegionRoute } from '@/types/pricing';
import { RegionPriceHead, RegionPriceRows } from './RegionPriceTable';
import { cotDonVi } from './regionPriceColumns';

export interface RegionRouteViewDialogProps {
  route: RegionRoute | null;
  onClose: () => void;
}

/**
 * Xem một tuyến.
 *
 * Dùng CHUNG bảng rộng với màn danh sách và với file Excel, thay vì một bảng
 * riêng cho hộp thoại: ba cách hiển thị cùng một bảng giá là ba chỗ phải sửa
 * mỗi lần luật đổi, và đến lần thứ hai thì chúng đã nói khác nhau.
 */
export function RegionRouteViewDialog({ route, onClose }: RegionRouteViewDialogProps): ReactNode {
  const { t } = useTranslation();
  const units = route === null ? [] : cotDonVi([route]);

  return (
    <Dialog open={route !== null} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>{t('pricing.region.viewRoute')}</DialogTitle>
      <DialogContent>
        {route === null ? null : (
          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                {t('pricing.region.region')}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {route.regionName ?? t('pricing.region.noRegion')}
              </Typography>
            </Box>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <RegionPriceHead units={units} showActions={false} />
                </TableHead>
                <TableBody>
                  <RegionPriceRows route={route} units={units} />
                </TableBody>
              </Table>
            </Box>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.actions.close')}</Button>
      </DialogActions>
    </Dialog>
  );
}
