import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogContentText,
  DialogTitle, List, ListItem, ListItemText, Stack, Tooltip,
} from '@mui/material';
import { IconAlertTriangle, IconCheck, IconTruckDelivery } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { PermissionAction } from '@/constants/permissions';
import { usePermissions } from '@/hooks/usePermissions';
import { chuyenDonSangTms, docOThieu, kiemDonTms, updateOrder } from '@/services/orderService';
import type { OThieuTms } from '@/services/orderService';
import { describeError } from '@/services/apiClient';
import type { OrderDetail, UpdateOrderPayload } from '@/types/order';
import { OrderEditDialog } from './OrderEditDialog';

export interface TmsPushPanelProps {
  order: OrderDetail;
  onChanged: () => void;
}

/**
 * Nút "Chuyển báo giá sang TMS" và trạng thái của nó.
 *
 * Bốn trạng thái chứ không phải hai, và sự khác nhau giữa chúng là thứ quan
 * trọng nhất ở màn này:
 *
 *   nhan      OF1 đã nhận  -> hiện nhãn, không còn nút
 *   tu_choi   OF1 TỪ CHỐI  -> bên đó KHÔNG sinh bill nào, sửa rồi chuyển lại được
 *   khong_ro  không rõ     -> mạng đứt giữa chừng. VẪN gửi lại được, kèm một
 *                            dòng nói rõ vì sao an toàn.
 *   dang_gui  đang gửi     -> có lượt khác đang chạy
 *
 * `khong_ro` từng KHÔNG có nút, vì contract v1.0 nói mỗi lần gửi nhận được là
 * một bill MỚI — bấm lại là khách có hai đơn bên kia. Contract v1.3 mục 5.1
 * đổi hẳn điều đó: khoá là mã đơn, gửi lại cùng mã là CẬP NHẬT. Giữ nút xám
 * sau khi nền đã đổi là bắt người ta đi đối soát tay cho một thao tác nay đã
 * an toàn.
 */
export function TmsPushPanel({ order, onChanged }: TmsPushPanelProps): ReactNode {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const { can } = usePermissions();

  const [dangChuyen, setDangChuyen] = useState(false);
  const [thieu, setThieu] = useState<OThieuTms[] | null>(null);
  const [dangSua, setDangSua] = useState(false);
  const [dangLuu, setDangLuu] = useState(false);
  const [canhBao, setCanhBao] = useState<string[]>([]);

  const trangThai = order.tmsStatus;

  /* Cảnh báo hiện bằng POPUP chứ không phải snackbar: chúng dài, bằng tiếng
     Anh, và mỗi cái là một việc phải làm. Snackbar tắt sau vài giây.
     Khai TRƯỚC các nhánh return sớm: đẩy xong thì đơn thành `nhan` và màn
     hình rơi vào nhánh đầu tiên — popup phải sống được ở đó. */
  const hopCanhBao = (
    <Dialog open={canhBao.length > 0} onClose={() => setCanhBao([])} maxWidth="sm" fullWidth>
      <DialogTitle>{t('orders.tms.warningsTitle')}</DialogTitle>
      <DialogContent>
        <DialogContentText>{t('orders.tms.warningsHint')}</DialogContentText>
        <List dense>
          {canhBao.map((c) => (
            <ListItem key={c} disableGutters>
              <ListItemText primary={c} />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setCanhBao([])}>{t('common.actions.close')}</Button>
      </DialogActions>
    </Dialog>
  );

  if (trangThai === 'nhan') {
    return (
      <>
        <Chip
          color="success"
          variant="outlined"
          icon={<IconCheck size={16} />}
          label={t('orders.tms.done')}
        />
        {hopCanhBao}
      </>
    );
  }

  if (trangThai === 'dang_gui') {
    return <Chip color="info" variant="outlined" label={t('orders.tms.sending')} />;
  }

  const chuyen = async (): Promise<void> => {
    setDangChuyen(true);
    try {
      const kq = await chuyenDonSangTms(order.id);
      setCanhBao(kq.canhBao ?? []);
      if (kq.ketQua === 'nhan') {
        enqueueSnackbar(t('orders.tms.successMessage'), { variant: 'success' });
      } else {
        enqueueSnackbar(kq.loi ?? t('orders.tms.failedMessage'), { variant: 'warning' });
      }
    } catch (error) {
      // 422 kèm danh sách ô thiếu -> hiện popup liệt kê. Mọi lỗi khác chỉ có
      // một câu, báo bằng snackbar như các thao tác còn lại.
      const dsThieu = docOThieu(error);
      if (dsThieu.length > 0) setThieu(dsThieu);
      else enqueueSnackbar(describeError(error), { variant: 'error' });
    } finally {
      setDangChuyen(false);
      // Gọi kể cả khi hỏng: trạng thái bên máy chủ đã đổi, bản trên màn hình cũ rồi.
      onChanged();
    }
  };

  /** Lưu đơn, rồi chấm lại ngay để nói còn thiếu gì — hoặc báo đã đủ. */
  const luuRoiChamLai = async (payload: UpdateOrderPayload): Promise<void> => {
    setDangLuu(true);
    try {
      await updateOrder(order.id, payload);
      setDangSua(false);
      const conThieu = await kiemDonTms(order.id);
      setThieu(conThieu.length > 0 ? conThieu : null);
      if (conThieu.length === 0) {
        enqueueSnackbar(t('orders.tms.nowComplete'), { variant: 'success' });
      }
    } catch (error) {
      enqueueSnackbar(describeError(error), { variant: 'error' });
    } finally {
      setDangLuu(false);
      onChanged();
    }
  };

  const biTuChoi = trangThai === 'tu_choi';
  const khongRo = trangThai === 'khong_ro';

  return (
    <>
      {/* Vẫn nói rõ chuyện gì đã xảy ra: gửi lại an toàn không có nghĩa là
          không có gì đáng biết. */}
      {!khongRo ? null : (
        <Alert severity="warning" sx={{ py: 0.25, mb: 1 }}>
          {t('orders.tms.unknown', { code: order.code })}
          {order.tmsError === null ? '' : ` (${order.tmsError})`}
        </Alert>
      )}
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        {biTuChoi ? (
          <Tooltip title={order.tmsError ?? ''}>
            <Chip
              color="error"
              variant="outlined"
              icon={<IconAlertTriangle size={16} />}
              label={t('orders.tms.rejected')}
            />
          </Tooltip>
        ) : null}

        {can(PermissionAction.PushToTms) ? (
          <Button
            variant={biTuChoi || khongRo ? 'outlined' : 'contained'}
            disabled={dangChuyen}
            startIcon={<IconTruckDelivery size={17} />}
            onClick={() => void chuyen()}
          >
            {biTuChoi || khongRo ? t('orders.tms.retry') : t('orders.tms.action')}
          </Button>
        ) : null}
      </Stack>

      <Dialog
        open={thieu !== null && !dangSua}
        onClose={() => setThieu(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{t('orders.tms.missingTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('orders.tms.missingBody')}</DialogContentText>
          <List dense>
            {(thieu ?? []).map((o) => (
              <ListItem key={o.truong} disableGutters>
                <ListItemText primary={o.nhan} secondary={o.suaODau} />
              </ListItem>
            ))}
          </List>
          {/* Mã OF1 nằm trên DANH MỤC ĐỊA ĐIỂM chứ không trên đơn, nên hộp sửa
              đơn không chạm tới được. Nói thẳng ra thay vì để người dùng mở hộp
              sửa rồi đi tìm một ô không có ở đó. */}
          {/* Ma khach nam o HO SO KHACH chu khong trong don — "Sua don ngay"
              khong mo ra o nao sua duoc no. Noi ro duong di thay vi de ho bam
              vao mot hop thoai khong co cai ho can. */}
          {(thieu ?? []).some((o) => o.truong === 'customer' || o.truong === 'customerCode') ? (
            <DialogContentText sx={{ mt: 1 }}>
              {t('orders.tms.customerFix')}
            </DialogContentText>
          ) : null}
          {(thieu ?? []).some((o) => o.truong.endsWith('LocationId')) ? (
            <Alert severity="info" sx={{ mt: 1 }}>{t('orders.tms.missingLocationHint')}</Alert>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setThieu(null)}>{t('common.actions.close')}</Button>
          {/* Chi hien khi that su co o sua duoc trong don. Thieu moi ma khach
              thi nut nay dan nguoi ta vao mot hop thoai khong giup duoc gi. */}
          {(thieu ?? []).every((o) => o.truong === 'customer' || o.truong === 'customerCode')
            ? null : (
              <Button variant="contained" onClick={() => setDangSua(true)}>
                {t('orders.tms.fixNow')}
              </Button>
            )}
        </DialogActions>
      </Dialog>

      {/* Sửa ngay tại chỗ rồi chấm lại, không bắt người dùng đóng popup, đi tìm
          nút "Sửa đơn", sửa, rồi quay lại bấm chuyển để biết đã đủ chưa. */}
      <OrderEditDialog
        order={dangSua ? order : null}
        isClosed={order.closedAt !== null}
        isSubmitting={dangLuu}
        onSubmit={(payload) => void luuRoiChamLai(payload)}
        onClose={() => setDangSua(false)}
        thieuTms={thieu ?? undefined}
      />
      {hopCanhBao}
    </>
  );
}
