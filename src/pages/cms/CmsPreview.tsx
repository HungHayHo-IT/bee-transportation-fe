import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Box, CircularProgress, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { AnchorRect } from './CmsInlineEditor';
import { DEVICES } from './previewDevices';
import type { DeviceKey, FocusRequest, PreviewZoom } from './previewDevices';

/** Landing không gửi `cms-ready` sau chừng này là coi như không kết nối được. */
const READY_TIMEOUT_MS = 15_000;
const PAD = 16;

type FrameMessage =
  | { type: 'cms-ready'; locale?: string; count?: number; images?: number }
  | { type: 'cms-select'; key: string; rect: AnchorRect }
  | { type: 'cms-rect'; rect: AnchorRect | null }
  | { type: 'cms-image'; slot: string };

export interface CmsPreviewProps {
  /** Địa chỉ đầy đủ của trang cần xem. Rỗng thì không dựng khung. */
  url: string;
  /** Tăng số này là khung tải lại — dùng sau mỗi lần lưu. */
  reloadKey: number;
  device: DeviceKey;
  zoom: PreviewZoom;
  /**
   * Những ô đang sửa mà CHƯA LƯU, đã quy về chuỗi sẽ hiện (ô khôi phục mang
   * giá trị mặc định). Gửi sang trang trong khung để xem trước.
   */
  nhap: Record<string, string>;
  /** Tiền tố của những khối thuộc trang đang mở — trang giấu mọi thứ còn lại. */
  phamVi: string[];
  focus?: FocusRequest | null;
  /** null = không còn ô nào đang sửa → bỏ khung chọn trên trang. */
  editingKey?: string | null;
  onSelect?: (key: string, anchor: AnchorRect, bounds: AnchorRect) => void;
  onAnchorChange?: (anchor: AnchorRect | null) => void;
  onChonAnh?: (slot: string) => void;
}

/**
 * Khung xem trang thật, nói chuyện với `components/CmsEditor.tsx` bên landing
 * qua postMessage. Trang trong khung chỉ báo ô nào được bấm và nằm ở đâu; hộp
 * sửa nằm ở admin (CmsInlineEditor), đúng cỡ chữ dù khung bị thu nhỏ.
 *
 * `key` đổi theo url và reloadKey để React dựng lại hẳn iframe. Đổi `src` trên
 * cùng một iframe sẽ nhét thêm một mục vào lịch sử của khung, và nút back của
 * trình duyệt bắt đầu chạy lùi bên trong khung thay vì rời trang admin.
 */
export function CmsPreview({
  url, reloadKey, device, zoom, nhap, phamVi,
  focus = null, editingKey = null, onSelect, onAnchorChange, onChonAnh,
}: CmsPreviewProps): ReactNode {
  const { t } = useTranslation();
  const hop = useRef<HTMLDivElement>(null);
  const khung = useRef<HTMLIFrameElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [trangThai, setTrangThai] = useState<'loading' | 'ready' | 'timeout'>('loading');
  /** Tăng mỗi lần trang trong khung báo sẵn sàng, để gửi lại bản nháp và phạm vi. */
  const [lanSanSang, setLanSanSang] = useState(0);
  /** Toạ độ ô đang sửa trong iframe — tính lại khi khung admin cuộn / đổi cỡ. */
  const toaDoTrongKhung = useRef<AnchorRect | null>(null);

  const origin = url ? new URL(url).origin : '';
  const deviceWidth = DEVICES[device];
  const availableWidth = Math.max(0, size.width - PAD * 2);
  const fitScale = availableWidth > 0 ? Math.min(1, availableWidth / deviceWidth) : 1;
  const scale = zoom === 'fit' ? fitScale : zoom;
  const frameHeight = Math.max(0, size.height - PAD * 2) / scale;

  // Toạ độ trong iframe (px của landing) → toạ độ màn admin (đã thu nhỏ).
  const raAdmin = (rect: AnchorRect): AnchorRect | null => {
    const box = khung.current?.getBoundingClientRect();
    if (!box) return null;
    const ratio = box.width / deviceWidth;
    return {
      left: box.left + rect.left * ratio,
      top: box.top + rect.top * ratio,
      width: rect.width * ratio,
      height: rect.height * ratio,
    };
  };
  const bienKhung = (): AnchorRect => {
    const b = hop.current?.getBoundingClientRect();
    return b
      ? { left: b.left, top: b.top, width: b.width, height: b.height }
      : { left: 0, top: 0, width: 0, height: 0 };
  };

  // Handler message đọc props mới nhất qua ref — gắn lại listener mỗi lần gõ
  // là có khoảnh khắc không ai nghe và mất tin nhắn của khung.
  const latest = useRef({ onSelect, onAnchorChange, onChonAnh, raAdmin, bienKhung });
  latest.current = { onSelect, onAnchorChange, onChonAnh, raAdmin, bienKhung };

  useLayoutEffect(() => {
    const el = hop.current;
    if (!el) return;
    const ob = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    ob.observe(el);
    return () => ob.disconnect();
  }, []);

  useEffect(() => {
    setTrangThai('loading');
    toaDoTrongKhung.current = null;
    const timer = window.setTimeout(
      () => setTrangThai((s) => (s === 'loading' ? 'timeout' : s)),
      READY_TIMEOUT_MS,
    );
    return () => window.clearTimeout(timer);
  }, [url, reloadKey]);

  /**
   * Kiểm origin VÀ nguồn: khung này nhúng một trang khác origin, và bất kỳ
   * trang nào cũng gửi postMessage tới đây được. Không lọc thì một tab lạ có
   * thể bơm nội dung vào bản nháp của người đang sửa.
   */
  useEffect(() => {
    if (!origin) return;
    const nhan = (e: MessageEvent): void => {
      if (e.origin !== origin || e.source !== khung.current?.contentWindow) return;
      const d = e.data as FrameMessage;
      const cur = latest.current;
      if (d?.type === 'cms-ready') {
        setTrangThai('ready');
        setLanSanSang((n) => n + 1);
      }
      if (d?.type === 'cms-select' && typeof d.key === 'string') {
        toaDoTrongKhung.current = d.rect;
        const anchor = cur.raAdmin(d.rect);
        if (anchor) cur.onSelect?.(d.key, anchor, cur.bienKhung());
      }
      if (d?.type === 'cms-rect') {
        toaDoTrongKhung.current = d.rect;
        cur.onAnchorChange?.(d.rect ? cur.raAdmin(d.rect) : null);
      }
      if (d?.type === 'cms-image' && typeof d.slot === 'string') cur.onChonAnh?.(d.slot);
    };
    window.addEventListener('message', nhan);
    return () => window.removeEventListener('message', nhan);
  }, [origin]);

  // Khung admin cuộn (thu phóng 100%) hoặc đổi cỡ thì hộp sửa phải đi theo chữ.
  useEffect(() => {
    const el = hop.current;
    const datLai = (): void => {
      const rect = toaDoTrongKhung.current;
      if (rect) latest.current.onAnchorChange?.(latest.current.raAdmin(rect));
    };
    el?.addEventListener('scroll', datLai, { passive: true });
    window.addEventListener('resize', datLai);
    datLai();
    return () => {
      el?.removeEventListener('scroll', datLai);
      window.removeEventListener('resize', datLai);
    };
  }, [scale, device]);

  const gui = (message: unknown): void => {
    if (origin) khung.current?.contentWindow?.postMessage(message, origin);
  };

  /**
   * Bắn bản nháp sang. Chạy lại cả khi `lanSanSang` đổi: mỗi lần khung tải
   * lại là trang mất hết những gì đã đắp vào, nên phải đắp lại.
   */
  useEffect(() => {
    if (lanSanSang > 0) gui({ type: 'cms-draft', values: nhap });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- gui chỉ đọc origin
  }, [nhap, lanSanSang]);

  // `join` chứ không phải chính mảng: mảng dựng mới mỗi lần render.
  const khoaPhamVi = phamVi.join('|');
  useEffect(() => {
    if (lanSanSang > 0) {
      gui({ type: 'cms-scope', prefixes: khoaPhamVi === '' ? [] : khoaPhamVi.split('|') });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- gui chỉ đọc origin
  }, [khoaPhamVi, lanSanSang]);

  useEffect(() => {
    if (lanSanSang > 0 && focus) gui({ type: 'cms-focus', key: focus.key });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- gui chỉ đọc origin
  }, [focus, lanSanSang]);

  useEffect(() => {
    if (lanSanSang > 0 && editingKey === null) {
      toaDoTrongKhung.current = null;
      gui({ type: 'cms-clear' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- gui chỉ đọc origin
  }, [editingKey, lanSanSang]);

  if (!url) return null;

  const scaledWidth = deviceWidth * scale;
  const tran = scaledWidth > availableWidth;
  const src = `${url}${url.includes('?') ? '&' : '?'}cms-edit=1`;

  return (
    <Box
      ref={hop}
      sx={{ position: 'relative', height: '100%', width: '100%', overflow: 'auto', bgcolor: 'grey.100' }}
    >
      <Box
        sx={{
          position: 'relative',
          mx: tran ? `${PAD}px` : 'auto',
          my: `${PAD}px`,
          width: scaledWidth,
          height: frameHeight * scale,
        }}
      >
        <Box
          component="iframe"
          ref={khung}
          key={`${src}#${reloadKey}`}
          src={src}
          title={t('cms.previewTitle')}
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            transformOrigin: 'top left',
            border: 0,
            bgcolor: 'common.white',
            boxShadow: 3,
            borderRadius: device === 'desktop' ? 1 : '28px',
            outline: device === 'desktop' ? 'none' : '6px solid rgba(30,35,43,.85)',
          }}
          style={{ width: deviceWidth, height: frameHeight, transform: `scale(${scale})` }}
        />
      </Box>

      {trangThai !== 'ready' ? (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(245,245,245,.8)',
          }}
        >
          {trangThai === 'loading' ? (
            <CircularProgress size={28} />
          ) : (
            <Alert severity="error" sx={{ maxWidth: 420 }}>
              <Typography variant="subtitle2">{t('cms.previewTimeoutTitle')}</Typography>
              <Typography variant="body2">{t('cms.previewTimeoutHint', { url: origin })}</Typography>
            </Alert>
          )}
        </Box>
      ) : null}
    </Box>
  );
}
