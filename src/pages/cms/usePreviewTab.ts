import { useCallback, useEffect, useRef } from 'react';

/** Cùng một tab cho mọi lần bấm — bấm lại thì tab cũ chuyển trang, không mở thêm tab. */
const PREVIEW_TAB_NAME = 'bee-landing-preview';

/**
 * "Mở trang ở tab mới" mà vẫn thấy bản nháp CHƯA LƯU — như btn-admin.
 *
 * Tab mở ra là landing thật với `?cms-preview=1`. Trang đó tự hỏi lại cửa sổ
 * đã mở nó (`cms-ready`, kèm ngôn ngữ của nó), màn này trả bản nháp đúng ngôn
 * ngữ đó, và mỗi lần sửa tiếp thì đẩy bản mới sang. Người xem đi lại giữa các
 * trang trong tab đó thì mỗi trang mới lại hỏi lại, nên bản nháp đi theo.
 *
 * Không mở bằng `noopener`: thiếu `window.opener` là landing không biết hỏi ai.
 * Landing chỉ nhận lệnh từ origin admin nằm trong NEXT_PUBLIC_CMS_ADMIN_ORIGINS.
 */
export function usePreviewTab(
  landingOrigin: string,
  nhapTheoNgonNgu: Record<string, Record<string, string>>,
): (pageUrl: string) => void {
  const tab = useRef<Window | null>(null);
  /** Ngôn ngữ trang đang hiện trong tab, do chính nó khai. */
  const ngonNgu = useRef<string | null>(null);
  const latest = useRef(nhapTheoNgonNgu);
  latest.current = nhapTheoNgonNgu;

  useEffect(() => {
    const nhan = (e: MessageEvent): void => {
      if (!tab.current || e.source !== tab.current || e.origin !== landingOrigin) return;
      const d = e.data as { type?: string; locale?: string };
      if (d?.type !== 'cms-ready') return;
      ngonNgu.current = typeof d.locale === 'string' ? d.locale : null;
      const values = ngonNgu.current ? latest.current[ngonNgu.current] : undefined;
      tab.current.postMessage({ type: 'cms-draft', values: values ?? {} }, landingOrigin);
    };
    window.addEventListener('message', nhan);
    return () => window.removeEventListener('message', nhan);
  }, [landingOrigin]);

  useEffect(() => {
    const w = tab.current;
    const values = ngonNgu.current ? nhapTheoNgonNgu[ngonNgu.current] : undefined;
    if (w && !w.closed && values) w.postMessage({ type: 'cms-draft', values }, landingOrigin);
  }, [nhapTheoNgonNgu, landingOrigin]);

  return useCallback((pageUrl: string) => {
    const url = new URL(pageUrl);
    url.searchParams.set('cms-preview', '1');
    ngonNgu.current = null;
    tab.current = window.open(url.toString(), PREVIEW_TAB_NAME);
  }, []);
}
