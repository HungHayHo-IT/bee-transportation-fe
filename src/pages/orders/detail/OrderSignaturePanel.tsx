import { useCallback, useState, type ReactNode } from 'react';
import { Alert, Button, Chip, Stack, Tooltip, Typography } from '@mui/material';
import { IconSignature } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { SectionCard } from '@/components/SectionCard';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { usePageLevels } from '@/hooks/usePageLevels';
import { describeError } from '@/services/apiClient';
import { guiKhachKy, layTrangThaiKy } from '@/services/signatureService';
import { OrderStatus } from '@/constants/orderStatus';
import type { OrderDetail } from '@/types/order';

/** Màu và nhãn của bốn trạng thái. Trạng thái là chữ, màu chỉ là tín hiệu phụ. */
const KIEU: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  cho_ky: 'warning',
  da_ky: 'success',
  tu_choi: 'error',
  het_han: 'default',
};

/**
 * Gửi khách ký phiếu xác nhận, và trạng thái của lần gửi gần nhất.
 *
 * Đứng RIÊNG chứ không nhét vào `OrderActionsBar`: thanh đó tự ẩn khi người
 * xem không có quyền chốt đơn — một danh sách vai trò viết cứng chỉ gồm Quản
 * trị viên và Sale. Trưởng phòng được gửi ký nhưng không được chốt đơn,
 * nên nhét vào đó là giấu nút khỏi đúng người cần nó.
 *
 * Quyền ở đây đọc từ ô `orderSignature` trong ma trận, nên đổi ai được gửi là
 * bật một ô trên màn Phân quyền, không phải sửa code.
 */
export function OrderSignaturePanel({
  order,
  onChanged,
}: {
  order: OrderDetail;
  onChanged: () => void;
}): ReactNode {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const levels = usePageLevels();
  const [dangGui, setDangGui] = useState(false);

  const tai = useCallback(() => layTrangThaiKy(order.id), [order.id]);
  const resource = useAsyncResource(tai, [order.id]);
  const ky = resource.data;

  const muc = levels?.orderSignature ?? null;
  /* Chưa lấy xong mức quyền thì ẩn hẳn khối, không đoán: khác với menu, ở đây
     hiện thừa một nút gửi ký rồi bấm vào nhận 403 là làm người ta tưởng đơn
     có vấn đề. */
  if (muc === null || muc === 'none') return null;
  const guiDuoc = muc === 'edit' || muc === 'full';

  const daChot = order.status === OrderStatus.Closed || order.status === OrderStatus.Cancelled;
  /* Mốc "đã chọn báo giá thắng" là `departmentId`, KHÔNG phải trạng thái phòng
     — đúng thứ backend kiểm. Từ khi gộp "chờ sale chọn" với "chờ khách xác
     nhận" (migration 023), trạng thái không còn nói được là đã chọn hay chưa,
     và kiểm theo nó thì nút tắt trong khi API vẫn cho gửi. */
  const coPhongThang = order.departmentName !== null;
  /* Phiếu cần có số tiền thì mới có gì để ký, mà số tiền chỉ có sau khi chọn
     báo giá thắng. Backend cũng chặn, nhưng nói trước ở đây thì người dùng
     biết phải làm gì chứ không phải bấm rồi mới đọc lỗi. */
  const chuaGuiDuocVi = daChot
    ? t('orders.signature.blockedClosed')
    : !coPhongThang
      ? t('orders.signature.blockedNoQuote')
      : null;

  const gui = async (): Promise<void> => {
    setDangGui(true);
    try {
      await guiKhachKy(order.id);
      enqueueSnackbar(t('orders.signature.sent'), { variant: 'success' });
      resource.reload();
      onChanged();
    } catch (e) {
      enqueueSnackbar(describeError(e), { variant: 'error' });
      /* Đọc lại cả khi hỏng: gửi mail hỏng thì máy chủ đã rút lại dòng vừa
         tạo, nên khối trạng thái đang cầm một bản cũ không còn đúng. */
      resource.reload();
    } finally {
      setDangGui(false);
    }
  };

  const nutGui = (
    <Button
      variant="outlined"
      size="small"
      startIcon={<IconSignature size={17} />}
      disabled={!guiDuoc || dangGui || chuaGuiDuocVi !== null}
      onClick={() => void gui()}
    >
      {ky?.trangThai === 'cho_ky' ? t('orders.signature.resend') : t('orders.signature.send')}
    </Button>
  );

  return (
    <SectionCard
      title={t('orders.signature.title')}
      action={
        chuaGuiDuocVi ? (
          /* span: Tooltip cần một phần tử nhận được sự kiện, mà nút đang tắt
             thì không phát ra sự kiện nào. */
          <Tooltip title={chuaGuiDuocVi}>
            <span>{nutGui}</span>
          </Tooltip>
        ) : (
          nutGui
        )
      }
    >
      {ky === null || ky === undefined ? (
        <Typography variant="body2" color="text.secondary">
          {t('orders.signature.never')}
        </Typography>
      ) : (
        <Stack spacing={1.25}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Chip
              size="small"
              color={KIEU[ky.trangThai] ?? 'default'}
              label={t(`orders.signature.state.${ky.trangThai}`)}
            />
            <Typography variant="caption" color="text.secondary">
              {t('orders.signature.sentAt', { luc: dinhDang(ky.createdAt) })}
            </Typography>
          </Stack>

          {ky.trangThai === 'cho_ky' ? (
            <Typography variant="body2" color="text.secondary">
              {t('orders.signature.waiting', { han: dinhDang(ky.hetHanLuc) })}
            </Typography>
          ) : null}

          {ky.trangThai === 'da_ky' ? (
            <Typography variant="body2">
              {t('orders.signature.signedBy', {
                ten: ky.kyTen ?? '',
                luc: dinhDang(ky.kyLuc),
              })}
            </Typography>
          ) : null}

          {/* Lý do từ chối in NGUYÊN VĂN, không tóm tắt: đó là thứ sale cần để
              còn thương lượng tiếp, và cắt gọn đi là mất đúng phần có ích. */}
          {ky.trangThai === 'tu_choi' && ky.lyDoTuChoi ? (
            <Alert severity="warning" sx={{ py: 0.5 }}>
              {t('orders.signature.rejected', { lyDo: ky.lyDoTuChoi })}
            </Alert>
          ) : null}

          {ky.trangThai === 'het_han' ? (
            <Typography variant="body2" color="text.secondary">
              {t('orders.signature.expired')}
            </Typography>
          ) : null}
        </Stack>
      )}
    </SectionCard>
  );
}

function dinhDang(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('vi-VN', { hour12: false });
}
