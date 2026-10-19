import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { BeeLoader } from '@/components/BeeLoader';
import {
  Alert, Box, Button, ButtonBase, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, InputAdornment, ListItemText, ListSubheader, MenuItem, Stack, TextField,
  Tooltip, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { IconArrowDown, IconArrowUp, IconChevronRight, IconDeviceDesktop, IconDeviceFloppy, IconDeviceMobile, IconDeviceTablet, IconExternalLink, IconLayoutSidebarRight, IconLayoutSidebarRightCollapse, IconPencil, IconPlus, IconRefresh, IconSearch, IconWorld } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { PageContainer } from '@/components/PageContainer';
import { SectionCard } from '@/components/SectionCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { describeError } from '@/services/apiClient';
import {
  fetchCmsOverrides, fetchCmsSchema, saveCmsContent,
  type CmsImageSlot, type CmsLocale, type CmsOverride, type CmsPage as CmsLandingPage,
  type CmsSchema, type CmsSection,
} from '@/services/cmsService';
import { CmsFieldRow } from './CmsFieldRow';
import { CmsFieldDialog } from './CmsFieldDialog';
import { CmsImageDialog } from './CmsImageDialog';
import { CmsMetaPreview } from './CmsMetaPreview';
import { CmsImageGrid } from './CmsImageGrid';
import { CmsListEditor } from './CmsListEditor';
import { CmsObjectListEditor } from './CmsObjectListEditor';
import { CmsAddServiceDialog } from './CmsAddServiceDialog';
import { CmsSocialEditor } from './CmsSocialEditor';
import { CmsPartnerLogos } from './CmsPartnerLogos';
import { usePageLevels } from '@/hooks/usePageLevels';
import { CmsPreview } from './CmsPreview';
import { DEVICES, ZOOM_OPTIONS } from './previewDevices';
import type { DeviceKey, FocusRequest, PreviewZoom } from './previewDevices';
import { CmsInlineEditor } from './CmsInlineEditor';
import type { AnchorRect } from './CmsInlineEditor';
import { fieldLabel } from './fieldLabels';
import { pillButtonSx, pillSelectSx, selectedSx } from './cmsStyles';
import { CmsSegmented } from './cmsUi';
import { usePreviewTab } from './usePreviewTab';

const DEVICE_ICONS: Record<DeviceKey, typeof IconDeviceMobile> = {
  mobile: IconDeviceMobile,
  tablet: IconDeviceTablet,
  desktop: IconDeviceDesktop,
};

/** Giá trị giả trong ô chọn trang: chọn nó là mở hộp Thêm dịch vụ. */
const THEM_DICH_VU = '__them-dich-vu__';
const GIOI_HAN_TIM = 60;

/** Bỏ dấu để gõ "dat xe" vẫn ra "Đặt xe". */
const boDau = (s: string): string =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/đ/gi, 'd').toLowerCase();

/** Ô lưu thứ tự chín dịch vụ. Trùng với lib/service-order.ts bên landing. */
const KHOA_THU_TU = 'services.order';

/**
 * Hai mục gộp vào thư mục "Thẻ SEO & chia sẻ".
 *
 * Chúng giống nhau ở chỗ quan trọng nhất: KHÔNG hiện ở đâu trên trang. Để rời
 * giữa các trang thật thì người sửa phải nhớ hai mục này khác loại với những
 * mục xung quanh — gộp lại thì tự nó nói ra điều đó.
 */
const KHOA_SEO = ['meta', 'og'];

/**
 * Danh sách bên trái xếp theo ĐÚNG thanh điều hướng của landing.
 *
 * Trên thanh, Kho bãi nằm trong menu Dịch vụ còn Vận chuyển nội địa đứng riêng
 * ngoài thanh (xem lib/nav-layout.ts bên landing). Danh sách này là bản đồ để
 * người sửa tìm trang — bản đồ vẽ khác nơi thật thì họ tìm nhầm chỗ.
 */
const KHO_BAI = 'warehousing';
const DICH_VU_DUNG_RIENG = 'domestic';


interface DuLieu {
  schema: CmsSchema;
  overrides: CmsOverride[];
}

async function taiTrang(locale: CmsLocale): Promise<DuLieu> {
  const [schema, overrides] = await Promise.all([
    fetchCmsSchema(locale),
    fetchCmsOverrides(locale),
  ]);
  return { schema, overrides };
}

/**
 * Trang quản lý nội dung landing.
 *
 * Ba nguồn chồng lên nhau, và thứ tự này là toàn bộ logic của màn hình:
 *
 *   mặc định trong code  <-  đã ghi đè (DB)  <-  đang gõ (chưa lưu)
 *
 * `nhap` chỉ giữ những ô ĐANG GÕ DỞ, không phải bản sao của cả 747 ô: nhờ vậy
 * "có gì chưa lưu không" là một phép đếm, và bấm Lưu chỉ gửi đúng phần đã sửa
 * thay vì bắn cả từ điển lên mỗi lần.
 */
export function CmsPage(): ReactNode {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();

  const [locale, setLocale] = useState<CmsLocale>('vi-vn');
  const tai = useCallback(() => taiTrang(locale), [locale]);
  // [locale] BẮT BUỘC: useAsyncResource đọc hàm tải qua ref, nên đổi hàm thôi
  // không làm nó chạy lại. Thiếu nó thì bấm sang tab Tiếng Anh chẳng nạp gì —
  // vẫn là chữ, đường dẫn và khung xem trước của bản tiếng Việt.
  const resource = useAsyncResource(tai, [locale]);

  /**
   * Bản nháp giữ RIÊNG cho từng ngôn ngữ, và giữ cả hai cùng lúc.
   *
   * Trước đây đổi ngôn ngữ là mất sạch bản nháp, nên phải sửa tiếng Việt, lưu,
   * rồi mới sang tiếng Anh — hai lần lưu cho một lần sửa, và quên bước hai là
   * bản tiếng Anh lệch mà không ai biết. Giờ sửa cả hai rồi lưu một lần.
   */
  const [nhapMoiNgonNgu, setNhapMoiNgonNgu] = useState<
    Record<CmsLocale, Record<string, string | null>>
  >({ 'vi-vn': {}, 'en-us': {} });
  /** Trang của landing đang mở. Khoá trang, không phải tiền tố khối. */
  const [trangDangXem, setTrangDangXem] = useState<string>('');
  const [dangLuu, setDangLuu] = useState(false);
  /** Tăng sau mỗi lần ghi để khung xem trước tải lại. */
  const [lanTaiLai, setLanTaiLai] = useState(0);
  /**
   * Danh sách ô: BẬT sẵn khi vào màn.
   *
   * Bấm thẳng vào chữ trên trang vẫn là cách sửa nhanh nhất, nhưng nó chỉ với
   * tới những gì NHÌN THẤY. Thẻ SEO, mô tả ảnh, câu báo lỗi của biểu mẫu và
   * mọi danh sách thêm/bớt đều nằm ở danh sách ô — để ẩn thì người mới vào
   * không biết là có, và kết luận rằng CMS không sửa được mấy thứ đó.
   */
  const [hienDanhSachO, setHienDanhSachO] = useState(true);
  /** Ô ảnh vừa bấm trên trang, đang mở hộp thay ảnh. */
  const [anhDangChon, setAnhDangChon] = useState<string | null>(null);
  /** Ô vừa bấm trên trang mà phải sửa qua hộp (chữ gợi ý trong ô nhập…). */
  const [oDangMo, setODangMo] = useState<string | null>(null);
  /** Hộp "Thêm dịch vụ" đang mở hay không. */
  const [moThemDichVu, setMoThemDichVu] = useState(false);
  /** Hộp xác nhận trước khi lưu. */
  const [hoiLuu, setHoiLuu] = useState(false);

  /**
   * Cửa vào bản nháp của ngôn ngữ ĐANG XEM.
   *
   * Giữ nguyên hình dạng cũ (`nhap`, `setNhap`) để mọi nơi gọi không phải biết
   * là bên dưới đã có hai bản nháp.
   */
  const nhap = nhapMoiNgonNgu[locale];

  /**
   * Dịch theo ngôn ngữ NỘI DUNG đang sửa, không theo ngôn ngữ giao diện.
   *
   * Dùng cho hai thư mục trong danh sách trang: mọi dòng quanh chúng đều do
   * landing gửi sang và đã theo ngôn ngữ nội dung, nên hai dòng này mà ở lại
   * tiếng Việt thì chỉ riêng chúng lạc lõng.
   *
   * Nút bấm và thanh bên ngoài thì KHÔNG: đó là giao diện admin, nó theo lựa
   * chọn ngôn ngữ của chính người dùng.
   */
  const tNoiDung = useCallback(
    (key: string, opts?: Record<string, unknown>): string =>
      t(key, { ...opts, lng: locale === 'en-us' ? 'en' : 'vi' }),
    [t, locale],
  );
  const setNhap = useCallback(
    (f: (cu: Record<string, string | null>) => Record<string, string | null>): void => {
      setNhapMoiNgonNgu((cu) => ({ ...cu, [locale]: f(cu[locale]) }));
    },
    [locale],
  );

  const schema = resource.data?.schema ?? null;
  // Mục và thứ tự do landing quyết định: nó là nơi biết khối nào nằm ở trang
  // nào. Admin đoán lấy từ hình dạng khoá thì ra những mục như
  // "Kho bãi — overview.0" — đúng về kỹ thuật, vô nghĩa với người biên tập.
  /* useMemo quanh `?? []`: khi chưa có schema thì mỗi lần render lại dựng một
     mảng rỗng MỚI, và mọi hook nhận nó làm phụ thuộc đều tính lại vô ích. */
  const sections = useMemo(() => schema?.sections ?? [], [schema]);
  /**
   * Danh sách bên trái là CÁC TRANG của landing, không phải các khối.
   *
   * Trước đây nó liệt kê 34 khối, và người biên tập phải tự biết "Đội xe" nằm
   * ở trang nào. Giờ họ chọn trang, và thấy đúng những gì có trên trang đó.
   */
  const pages = useMemo(() => schema?.pages ?? [], [schema]);
  /** Tiền tố khối -> mô tả khối, để dựng tiêu đề từng cụm trong danh sách ô. */
  const theoPrefix = useMemo(() => {
    const m: Record<string, CmsSection> = {};
    for (const s of sections) m[s.prefix] = s;
    return m;
  }, [sections]);
  /** Mục -> những ô ảnh thuộc mục đó. */
  const imagesBySection = useMemo(() => {
    const m: Record<string, CmsImageSlot[]> = {};
    for (const im of schema?.images ?? []) (m[im.section] ??= []).push(im);
    return m;
  }, [schema]);

  /** Tên ô -> mô tả ô ảnh, để hộp thay ảnh biết nó đang mở tấm nào. */
  const anhTheoSlot = useMemo(() => {
    const m: Record<string, CmsImageSlot> = {};
    for (const im of schema?.images ?? []) m[im.slot] = im;
    return m;
  }, [schema]);

  /** Những ô mà landing coi là số — xem CmsSchema.numberFields. */
  const oSo = useMemo(() => new Set(schema?.numberFields ?? []), [schema]);


  /** Danh sách cho thêm/bớt/đổi thứ tự — xem CmsSchema.editableLists. */
  const danhSachSuaDuoc = useMemo(
    () => new Set(schema?.editableLists ?? []),
    [schema],
  );

  /**
   * Năm ô địa chỉ mạng xã hội gộp thành MỘT màn sửa có công tắc.
   *
   * Gộp vì ở đây có một thứ mà năm ô chữ rời không diễn đạt được: bật/tắt một
   * kênh mà vẫn giữ địa chỉ. Ô `social.off` lưu việc đó, và nó là một chuỗi
   * khoá — hiện nguyên dạng ra danh sách ô thì không ai biết phải gõ gì vào.
   */
  const kenhMangXaHoi = useMemo(() => schema?.socialIcons ?? [], [schema]);
  const oMangXaHoi = useMemo(
    () => new Set([...kenhMangXaHoi.map((k) => `social.${k.key}`), 'social.off']),
    [kenhMangXaHoi],
  );

  /** Danh sách chứa đối tượng — xem CmsSchema.objectLists. */
  const danhSachDoiTuong = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const d of schema?.objectLists ?? []) m.set(d.prefix, d.fields);
    return m;
  }, [schema]);

  /** Ô nào của danh sách đó là công tắc bật/tắt chứ không phải ô gõ chữ. */
  const oCongTac = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const d of schema?.objectLists ?? []) m.set(d.prefix, d.toggles ?? []);
    return m;
  }, [schema]);

  /**
   * Khoá này có phải một ô CHỈ SỐ thuộc danh sách sửa được không.
   *
   * 'customs.scope.2' -> 'customs.scope' với danh sách chữ, và
   * 'site.offices.0.street' -> 'site.offices' với danh sách đối tượng. Những ô
   * như vậy KHÔNG hiện thành dòng riêng nữa: cả danh sách đã có một màn sửa
   * gộp, hiện cả hai là mời người dùng sửa cùng một thứ ở hai chỗ mà chỉ một
   * chỗ ăn.
   */
  const danhSachCuaO = useCallback(
    (keyPath: string): string | null => {
      const i = keyPath.lastIndexOf('.');
      if (i < 0) return null;
      const dau = keyPath.slice(0, i);
      if (/^\d+$/.test(keyPath.slice(i + 1))) {
        return danhSachSuaDuoc.has(dau) ? dau : null;
      }
      // 'site.offices.0.street': bỏ tên ô rồi bỏ chỉ số mới ra tiền tố.
      const j = dau.lastIndexOf('.');
      if (j < 0 || !/^\d+$/.test(dau.slice(j + 1))) return null;
      const goc = dau.slice(0, j);
      return danhSachDoiTuong.has(goc) ? goc : null;
    },
    [danhSachSuaDuoc, danhSachDoiTuong],
  );


  const keysBySection = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const [key, prefix] of Object.entries(schema?.fieldSection ?? {})) {
      (m[prefix] ??= []).push(key);
    }
    /* Ô MƯỢN: thêm vào mục mượn, KHÔNG bỏ khỏi mục gốc. Nhãn "Vận chuyển đường
       bộ" trên thanh điều hướng là tên dịch vụ, nên nó phải sửa được ở cả mục
       Thanh điều hướng lẫn mục của chính dịch vụ đó — cùng một giá trị, hai lối
       vào. Không có bước này thì mở Thanh điều hướng ra sẽ thấy hai nhãn cạnh
       nhau mà chỉ một cái bấm được. */
    for (const s of schema?.sections ?? []) {
      for (const k of s.khoaMuon ?? []) {
        const ds = (m[s.prefix] ??= []);
        if (!ds.includes(k)) ds.push(k);
      }
    }
    return m;
  }, [schema]);

  /** Khoá -> giá trị đã lưu trong DB. */
  const daGhiDe = useMemo(() => {
    const m: Record<string, string> = {};
    for (const o of resource.data?.overrides ?? []) m[o.keyPath] = o.value;
    return m;
  }, [resource.data]);

  /**
   * Ghi đè đang có hiệu lực: bản nháp nếu ô có trong nháp (null = đã bấm
   * Khôi phục, tức là KHÔNG ghi đè), không thì bản đã lưu.
   *
   * Phải hỏi `in` chứ không dùng `??`: null trong nháp nghĩa là "về mặc định",
   * `nhap[k] ?? daGhiDe[k]` sẽ lặng lẽ trả lại chính bản vừa bị khôi phục.
   */
  const ghiDe = useCallback(
    (keyPath: string): string | undefined =>
      keyPath in nhap ? (nhap[keyPath] ?? undefined) : daGhiDe[keyPath],
    [nhap, daGhiDe],
  );

  const giaTri = useCallback(
    (keyPath: string): string => ghiDe(keyPath) ?? schema?.fields[keyPath] ?? '',
    [ghiDe, schema],
  );

  /** Các mục của một danh sách: bản đang gõ nếu có, không thì ghép từ các ô. */
  const mucCuaDanhSach = useCallback(
    (list: string): string[] => {
      const thoDangGo = ghiDe(list);
      if (thoDangGo !== undefined) {
        try {
          const ra: unknown = JSON.parse(thoDangGo);
          if (Array.isArray(ra) && ra.every((x) => typeof x === 'string')) return ra as string[];
        } catch {
          // Giá trị hỏng thì rơi xuống dưới, dựng lại từ từng ô.
        }
      }
      // Chưa ai đụng cả danh sách: dựng từ các ô chỉ số, để những lần sửa chữ
      // trước đó không biến mất ngay khi mở màn này ra.
      const ra: string[] = [];
      for (let i = 0; ; i += 1) {
        const k = `${list}.${i}`;
        if (schema?.fields[k] === undefined) break;
        ra.push(giaTri(k));
      }
      return ra;
    },
    [ghiDe, schema, giaTri],
  );

  /** Bản mặc định trong code của một danh sách. */
  const macDinhDanhSach = useCallback(
    (list: string): string[] => {
      const ra: string[] = [];
      for (let i = 0; ; i += 1) {
        const v = schema?.fields[`${list}.${i}`];
        if (v === undefined) break;
        ra.push(v);
      }
      return ra;
    },
    [schema],
  );

  /** Các mục của một danh sách đối tượng: bản đang gõ, không thì ghép từ ô. */
  const mucDoiTuongCua = useCallback(
    (list: string): Record<string, string>[] => {
      const fields = danhSachDoiTuong.get(list) ?? [];
      const thoDangGo = ghiDe(list);
      if (thoDangGo !== undefined) {
        try {
          const ra: unknown = JSON.parse(thoDangGo);
          if (Array.isArray(ra)) return ra as Record<string, string>[];
        } catch {
          // Giá trị hỏng thì rơi xuống dưới, dựng lại từ từng ô.
        }
      }
      const ra: Record<string, string>[] = [];
      for (let i = 0; ; i += 1) {
        if (schema?.fields[`${list}.${i}.${fields[0]}`] === undefined) break;
        ra.push(
          Object.fromEntries(fields.map((f) => [f, giaTri(`${list}.${i}.${f}`)])),
        );
      }
      return ra;
    },
    [danhSachDoiTuong, ghiDe, schema, giaTri],
  );

  /** Bản mặc định trong code của một danh sách đối tượng. */
  const macDinhDoiTuong = useCallback(
    (list: string): Record<string, string>[] => {
      const fields = danhSachDoiTuong.get(list) ?? [];
      const ra: Record<string, string>[] = [];
      for (let i = 0; ; i += 1) {
        if (schema?.fields[`${list}.${i}.${fields[0]}`] === undefined) break;
        ra.push(
          Object.fromEntries(
            fields.map((f) => [f, schema?.fields[`${list}.${i}.${f}`] ?? '']),
          ),
        );
      }
      return ra;
    },
    [danhSachDoiTuong, schema],
  );

  /**
   * Thư mục Dịch vụ gồm những mục nào, theo thứ tự đang hiển thị.
   *
   * Danh sách gốc do landing tính và gửi sang (serviceFolder) — nó đã bỏ dịch
   * vụ có trang riêng và đã thêm Kho bãi. Ở đây chỉ xếp lại theo thứ tự người
   * dùng đang gõ dở, để bấm mũi tên là thấy đổi ngay chứ không phải lưu rồi
   * mới biết mình kéo đúng chưa.
   */
  const mucThuMucDichVu = useMemo(() => {
    const goc = schema?.serviceFolder ?? [];
    const dangSua = ghiDe(KHOA_THU_TU);
    if (dangSua === undefined) return goc;
    try {
      const ds: unknown = JSON.parse(dangSua);
      if (!Array.isArray(ds)) return goc;
      const theoKhoa = new Map(goc.map((x) => [x.key, x]));
      const ra = (ds as string[]).map((k) => theoKhoa.get(k)).filter((x) => x !== undefined);
      // Bổ sung mục còn thiếu, cùng luật với landing: thứ tự lưu từ trước
      // không nhắc tới mục mới thì nó vẫn phải hiện ra.
      for (const x of goc) if (!ra.includes(x)) ra.push(x);
      return ra;
    } catch {
      return goc;
    }
  }, [schema, ghiDe]);

  /**
   * Đoạn URL đã có ai dùng — để hộp "Thêm dịch vụ" chặn trùng trước khi gọi
   * backend.
   *
   * Lấy từ chính danh sách landing gửi sang: landing mới là nơi biết đủ mọi
   * đường dẫn của nó, kể cả trang không phải dịch vụ. Chép một bản danh sách
   * đó sang đây thì nó lệch ngay lần đầu landing thêm một trang mới.
   */
  const duongDanDaCo = schema?.reservedSlugs ?? [];

  /** Hai mục thẻ SEO và thẻ chia sẻ, gộp thành một thư mục riêng. */
  const trangSeo = useMemo(
    () => pages.filter((p) => KHOA_SEO.includes(p.key)),
    [pages],
  );

  /**
   * Những mục đứng thẳng ngoài danh sách — không thuộc thư mục nào.
   *
   * Kho bãi rời khỏi đây để vào thư mục Dịch vụ, và Vận chuyển nội địa thế vào
   * ĐÚNG chỗ cũ của nó — giống hệt thanh điều hướng trên landing.
   */
  const trangNgoaiThuMuc = useMemo(() => {
    const noiDia = pages.find((p) => p.key === `service.${DICH_VU_DUNG_RIENG}`);
    const ra: typeof pages = [];
    for (const p of pages) {
      if (p.key.startsWith('service.') || KHOA_SEO.includes(p.key)) continue;
      if (p.key === KHO_BAI) {
        if (noiDia) ra.push(noiDia);
        continue;
      }
      ra.push(p);
    }
    return ra;
  }, [pages]);

  const doiChoDichVu = useCallback(
    (i: number, buoc: number): void => {
      const j = i + buoc;
      if (j < 0 || j >= mucThuMucDichVu.length) return;
      const ds = mucThuMucDichVu.map((x) => x.key);
      /* Đọc ra biến rồi mới đổi chỗ: chỉ `j` được kiểm biên ở trên, `i` thì
         chưa, nên `!` ở đây là khẳng định một điều chưa ai kiểm. */
      const a = ds[i];
      const b = ds[j];
      if (a === undefined || b === undefined) return;
      ds[i] = b;
      ds[j] = a;

      /**
       * GIỮ LẠI những khoá thư mục này không hiện.
       *
       * Ô `services.order` không chỉ xếp thư mục bên trái: nó còn xếp ô chọn
       * dịch vụ trong form báo giá, và ô đó vẫn có đủ chín dịch vụ — kể cả
       * dịch vụ đã tách ra trang riêng nên không nằm trong thư mục. Ghi đè
       * bằng đúng danh sách thư mục thì khoá vắng mặt bị đẩy xuống cuối, âm
       * thầm đổi thứ tự một ô chẳng liên quan gì tới cú bấm vừa rồi.
       */
      const ra = [...ds];
      (schema?.serviceOrder ?? []).forEach((x, viTriCu) => {
        if (ra.includes(x.key)) return;
        ra.splice(Math.min(viTriCu, ra.length), 0, x.key);
      });

      setNhap((cu) => ({ ...cu, [KHOA_THU_TU]: JSON.stringify(ra) }));
    },
    [mucThuMucDichVu, schema, setNhap],
  );

  /** URL ảnh đang dùng, theo tên ô (không kèm tiền tố 'images.'). */
  const anhDangDung = useMemo(() => {
    const m: Record<string, string> = {};
    for (const k of new Set([...Object.keys(daGhiDe), ...Object.keys(nhap)])) {
      const v = k.startsWith('images.') ? ghiDe(k) : undefined;
      if (v) m[k.slice('images.'.length)] = v;
    }
    return m;
  }, [daGhiDe, nhap, ghiDe]);

  /** Ô chưa lưu của CẢ HAI ngôn ngữ — đây mới là thứ nút Lưu sẽ gửi đi. */
  const soONhapTong =
    Object.keys(nhapMoiNgonNgu['vi-vn']).length +
    Object.keys(nhapMoiNgonNgu['en-us']).length;


  /**
   * Đặt một ô vào bản nháp — MỌI đường sửa đều đi qua đây (hộp sửa nổi, danh
   * sách ô, kết quả tìm kiếm), nên nút Lưu, bộ đếm và nút khôi phục không phải
   * biết chữ đến từ đâu.
   *
   * Trùng bản đang lưu thì bỏ khỏi nháp; trùng bản mặc định mà DB đang có ghi
   * đè thì ghi null (xoá ghi đè lúc Lưu) — không để lại dòng y hệt bản gốc.
   */
  const datNhap = useCallback(
    (keyPath: string, value: string, macDinh: string | undefined): void => {
      setNhap((cu) => {
        const moi = { ...cu };
        const daLuu = daGhiDe[keyPath];
        if (value === (daLuu ?? macDinh)) delete moi[keyPath];
        else if (value === macDinh) moi[keyPath] = null;
        else moi[keyPath] = value;
        return moi;
      });
    },
    // setNhap PHẢI có mặt: nó gắn với ngôn ngữ đang xem. Thiếu nó thì sau khi
    // đổi tab, chữ gõ ở tiếng Anh rơi vào bản nháp tiếng Việt.
    [daGhiDe, setNhap],
  );

  /**
   * Sửa một ô theo khoá. Ô nằm trong một danh sách thêm/bớt được ('list.3' hay
   * 'list.3.name') thì ghi lại CẢ danh sách: từ lúc danh sách bị ghi đè cả cụm,
   * ô chỉ số của nó không còn tác dụng (xem laOChiSoCua bên landing). Chỉ số
   * bằng độ dài danh sách là mục mới vừa thêm trên trang.
   */
  const suaTaiCho = useCallback(
    (keyPath: string, value: string): void => {
      const list = danhSachCuaO(keyPath);
      if (list === null) {
        datNhap(keyPath, value, schema?.fields[keyPath]);
        return;
      }
      const duoi = keyPath.slice(list.length + 1).split('.');
      const i = Number(duoi[0]);
      const truong = duoi[1];
      let ra: unknown[];
      let macDinh: unknown[];
      if (truong === undefined) {
        const ds = [...mucCuaDanhSach(list)];
        ds[i] = value;
        // Xoá trắng một mục là bỏ mục đó — đúng như danh sách ô vẫn làm.
        ra = ds.filter((x) => x !== '');
        macDinh = macDinhDanhSach(list);
      } else {
        const fields = danhSachDoiTuong.get(list) ?? [];
        const ds = mucDoiTuongCua(list).map((x) => ({ ...x }));
        ds[i] ??= Object.fromEntries(fields.map((f) => [f, '']));
        ds[i] = { ...ds[i], [truong]: value };
        ra = ds;
        macDinh = macDinhDoiTuong(list);
      }
      datNhap(list, JSON.stringify(ra), JSON.stringify(macDinh));
    },
    [danhSachCuaO, datNhap, schema, mucCuaDanhSach, macDinhDanhSach, danhSachDoiTuong, mucDoiTuongCua, macDinhDoiTuong],
  );

  /** Giá trị đang hiện của một ô — kể cả ô nằm trong danh sách đã ghi đè cả cụm. */
  const giaTriO = useCallback(
    (keyPath: string): string => {
      const list = danhSachCuaO(keyPath);
      if (list === null) return giaTri(keyPath);
      const [i, truong] = keyPath.slice(list.length + 1).split('.');
      const idx = Number(i);
      return truong === undefined
        ? (mucCuaDanhSach(list)[idx] ?? '')
        : (mucDoiTuongCua(list)[idx]?.[truong] ?? '');
    },
    [danhSachCuaO, giaTri, mucCuaDanhSach, mucDoiTuongCua],
  );

  /**
   * Bấm vào một tấm ảnh trên trang.
   *
   * Chỉ mở hộp khi ô ảnh đó có trong danh mục. Trang có thể còn ảnh cũ từ bản
   * deploy trước mang data-cms-slot đã bị bỏ khỏi IMAGE_SLOTS; mở một hộp
   * trống cho một ô không còn tồn tại thì lưu vào cũng không ai đọc.
   */
  const bamVaoAnh = useCallback(
    (slot: string): void => {
      setAnhDangChon(anhTheoSlot[slot] ? slot : null);
      if (anhTheoSlot[slot]) setODuocChon(`images.${slot}`);
    },
    [anhTheoSlot],
  );


  /**
   * Lưu CẢ HAI ngôn ngữ trong một lần bấm.
   *
   * Gửi tuần tự chứ không song song: hai lượt lưu đều gọi landing bỏ cache, và
   * bắn cùng lúc thì lượt sau có thể làm mới trước khi lượt trước ghi xong.
   *
   * Ngôn ngữ nào lỗi thì BÁO ĐÚNG ngôn ngữ đó và GIỮ LẠI bản nháp của nó —
   * xoá sạch rồi báo lỗi là người ta mất luôn phần vừa gõ.
   */
  const luu = async (): Promise<void> => {
    setDangLuu(true);
    let daLuu = 0;
    const hong: CmsLocale[] = [];
    try {
      for (const l of ['vi-vn', 'en-us'] as CmsLocale[]) {
        const entries = Object.entries(nhapMoiNgonNgu[l]).map(([keyPath, value]) => ({
          keyPath,
          value,
        }));
        if (entries.length === 0) continue;
        try {
          await saveCmsContent(l, entries);
          daLuu += entries.length;
          setNhapMoiNgonNgu((cu) => ({ ...cu, [l]: {} }));
        } catch (error) {
          hong.push(l);
          enqueueSnackbar(describeError(error), { variant: 'error' });
        }
      }
      if (daLuu > 0) {
        resource.reload();
        // Backend đã bảo landing bỏ cache trước khi trả lời, nên tải lại là thấy.
        setLanTaiLai((n) => n + 1);
        enqueueSnackbar(t('cms.saved', { count: daLuu }), { variant: 'success' });
      }
    } finally {
      setDangLuu(false);
      if (hong.length === 0) setHoiLuu(false);
    }
  };

  /**
   * Khôi phục một ô về bản mặc định — trong BẢN NHÁP, như mọi thay đổi khác.
   * Ô có ghi đè trong DB thì ghi null (Lưu sẽ xoá dòng đó), không thì chỉ bỏ
   * phần đang gõ dở. Nhờ vậy khôi phục nhầm thì bấm Huỷ thay đổi là xong.
   */
  const khoiPhuc = useCallback(
    (keyPath: string): void => {
      setNhap((cu) => {
        const moi = { ...cu };
        if (daGhiDe[keyPath] === undefined) delete moi[keyPath];
        else moi[keyPath] = null;
        return moi;
      });
    },
    [daGhiDe, setNhap],
  );

  // Mở sẵn trang đầu khi vừa tải xong, để màn hình không trống trơn.
  useEffect(() => {
    const dau = pages[0];
    if (trangDangXem === '' && dau !== undefined) setTrangDangXem(dau.key);
  }, [pages, trangDangXem]);

  const trangHienTai = pages.find((p) => p.key === trangDangXem) ?? null;
  /** Các khối của trang đang mở, giữ nguyên thứ tự landing đã xếp. */
  const khoiCuaTrang = trangHienTai
    ? trangHienTai.sections.map((pre) => theoPrefix[pre]).filter((x): x is CmsSection => !!x)
    : [];

  /** Đếm ô chữ và ô ảnh của một trang: cộng dồn các khối của nó. */
  const demTrang = useCallback(
    (p: { sections: string[] }): { o: number; anh: number } => {
      let o = 0;
      let anh = 0;
      for (const pre of p.sections) {
        o += (keysBySection[pre] ?? []).length;
        anh += (imagesBySection[pre] ?? []).length;
      }
      return { o, anh };
    },
    [keysBySection, imagesBySection],
  );
  /**
   * Trang cần xem trước. Ở mục Hình ảnh thì không có một trang nào là "đúng" —
   * ảnh rải khắp site — nên lấy trang chủ.
   */
  const duongDanXem = trangHienTai?.path ?? pages[0]?.path ?? '';
  const kieuXem = trangHienTai?.preview ?? 'page';
  /** Mọi khoá của trang đang mở, gộp từ các khối của nó. */
  /**
   * Phạm vi gửi sang khung xem trước: tiền tố của các khối trên trang, CỘNG
   * những ô mượn của chúng.
   *
   * Thiếu phần ô mượn thì khung xem trước bỏ viền đúng những ô vừa được thêm
   * vào danh sách — sửa được ở danh sách mà bấm vào trên trang thì không ăn,
   * còn khó hiểu hơn lúc chưa sửa gì.
   *
   * Không bọc useMemo: `khoiCuaTrang` dựng lại ở mỗi lần render nên có bọc cũng
   * không ghi nhớ được gì. `CmsPreview` đã so phạm vi bằng chuỗi nối chứ không
   * theo tham chiếu, nên một mảng mới mỗi lần render không làm nó gửi lại.
   */
  const phamViXemTruoc = khoiCuaTrang.flatMap((k) => [k.prefix, ...(k.khoaMuon ?? [])]);

  const oCuaTrang = khoiCuaTrang.flatMap((k) => keysBySection[k.prefix] ?? []);
  const urlXemTruoc = schema?.landingUrl ? `${schema.landingUrl}${duongDanXem}` : '';

  /* ------------------------------------------------------------------ Khung */

  const [device, setDevice] = useState<DeviceKey>('desktop');
  const [zoom, setZoom] = useState<PreviewZoom>('fit');
  /** Ô đang mở hộp sửa nổi trên khung xem trước. */
  const [dangSua, setDangSua] = useState<{ key: string; anchor: AnchorRect; bounds: AnchorRect } | null>(null);
  /** Ô vừa chọn trên trang — cột ô bên phải cuộn tới nó. */
  const [oDuocChon, setODuocChon] = useState<string | null>(null);
  const [troToiO, setTroToiO] = useState<FocusRequest | null>(null);
  const [timKiem, setTimKiem] = useState('');
  const [hoiHuy, setHoiHuy] = useState(false);
  const cotO = useRef<HTMLDivElement>(null);
  /** Khối nào ở cột ô đang mở. Gập sẵn như btn — trừ trang chỉ có một khối. */
  const [khoiMo, setKhoiMo] = useState<Set<string>>(new Set());
  const doiKhoiMo = (prefix: string): void =>
    setKhoiMo((cu) => {
      const moi = new Set(cu);
      if (moi.has(prefix)) moi.delete(prefix);
      else moi.add(prefix);
      return moi;
    });

  // Sửa dở mà đóng tab / F5 thì trình duyệt hỏi lại — mất trắng cả buổi sửa là
  // chuyện dễ xảy ra nhất ở màn này.
  useEffect(() => {
    if (soONhapTong === 0) return;
    const canhBao = (e: BeforeUnloadEvent): void => e.preventDefault();
    window.addEventListener('beforeunload', canhBao);
    return () => window.removeEventListener('beforeunload', canhBao);
  }, [soONhapTong]);

  /** Đổi trang / ngôn ngữ / thiết bị thì toạ độ hộp sửa không còn đúng nữa. */
  const dongHopSua = useCallback(() => setDangSua(null), []);

  /**
   * Bản nháp quy về CHỮ SẼ HIỆN, để đắp lên khung:
   * - ô khôi phục (null) mang bản mặc định;
   * - danh sách ghi đè cả cụm (JSON) được bung ra từng ô chỉ số, vì trên trang
   *   chữ nằm ở 'list.0', 'list.1'… chứ không có thẻ nào mang khoá 'list'.
   */
  const nhapHien = useCallback(
    (ban: Record<string, string | null>, coSchema: boolean): Record<string, string> => {
      const ra: Record<string, string> = {};
      for (const [k, v] of Object.entries(ban)) {
        if (v === null) {
          // Mặc định chỉ biết được cho ngôn ngữ đang mở schema.
          if (!coSchema) continue;
          const macDinh = k.startsWith('images.')
            ? anhTheoSlot[k.slice('images.'.length)]?.defaultUrl
            : schema?.fields[k];
          if (macDinh !== undefined) ra[k] = macDinh;
          continue;
        }
        ra[k] = v;
      }
      if (coSchema) {
        for (const list of Object.keys(ban)) {
          if (danhSachSuaDuoc.has(list)) {
            mucCuaDanhSach(list).forEach((x, i) => (ra[`${list}.${i}`] = x));
          } else if (danhSachDoiTuong.has(list)) {
            mucDoiTuongCua(list).forEach((muc, i) => {
              for (const [f, x] of Object.entries(muc)) ra[`${list}.${i}.${f}`] = x;
            });
          }
        }
      }
      return ra;
    },
    [anhTheoSlot, schema, danhSachSuaDuoc, danhSachDoiTuong, mucCuaDanhSach, mucDoiTuongCua],
  );
  const nhapChoKhung = useMemo(() => nhapHien(nhap, true), [nhapHien, nhap]);
  const ngonNguKia: CmsLocale = locale === 'vi-vn' ? 'en-us' : 'vi-vn';
  const nhapTheoNgonNgu = useMemo(
    () => ({
      [locale]: nhapChoKhung,
      // ponytail: ô "khôi phục" của ngôn ngữ KIA bị bỏ qua (chưa có schema của
      // nó để biết mặc định) — tab hiện bản đã lưu cho ô đó tới khi Lưu.
      [ngonNguKia]: nhapHien(nhapMoiNgonNgu[ngonNguKia], false),
    }),
    [locale, ngonNguKia, nhapChoKhung, nhapHien, nhapMoiNgonNgu],
  );
  /* null = chưa biết (hoặc lỗi mạng) — để nút hiện, backend vẫn chặn thật nếu
     người này chỉ có quyền xem. */
  const mucTrang = usePageLevels();
  const coTheSuaCms = mucTrang === null || ['edit', 'full'].includes(mucTrang.cms ?? 'none');

  const moTabXemTruoc = usePreviewTab(
    schema?.landingUrl ? new URL(schema.landingUrl).origin : '',
    nhapTheoNgonNgu,
  );

  const chonO = useCallback(
    (key: string, anchor: AnchorRect, bounds: AnchorRect): void => {
      setODuocChon(key);
      setDangSua({ key, anchor, bounds });
    },
    [],
  );
  const doiToaDo = useCallback(
    (anchor: AnchorRect | null) =>
      setDangSua((cu) => (cu && anchor ? { ...cu, anchor } : null)),
    [],
  );
  /** Bấm một ô ở cột phải → trang trong khung cuộn tới chữ đó. */
  const troToi = useCallback((key: string) => setTroToiO({ key, nonce: Date.now() }), []);

  // Chọn chữ trên trang → cột ô cuộn tới đúng ô (hoặc danh sách chứa nó).
  // Cuộn riêng cột này: scrollIntoView kéo cả trang admin theo.
  useEffect(() => {
    if (!oDuocChon) return;
    setTimKiem('');
    const timer = window.setTimeout(() => {
      const cot = cotO.current;
      const khoa = danhSachCuaO(oDuocChon) ?? (oDuocChon.startsWith('social.') ? 'social' : oDuocChon);
      const el = cot?.querySelector(`[data-field-key="${CSS.escape(khoa)}"]`);
      if (!cot || !el) return;
      const lech = el.getBoundingClientRect().top - cot.getBoundingClientRect().top;
      cot.scrollBy({ top: lech - cot.clientHeight / 3, behavior: 'smooth' });
    }, 60);
    return () => window.clearTimeout(timer);
  }, [oDuocChon, danhSachCuaO]);

  // Đổi trang: gập hết, trừ khi trang chỉ có một khối (mở ra cho khỏi bấm thêm).
  const khoaKhoi = khoiCuaTrang.map((k) => k.prefix).join('|');
  useEffect(() => {
    const ds = khoaKhoi === '' ? [] : khoaKhoi.split('|');
    setKhoiMo(new Set(ds.length === 1 ? ds : []));
  }, [khoaKhoi]);

  // Chọn chữ trên trang → mở khối chứa ô đó (ô mượn có thể nằm ở khối khác
  // tiền tố của nó), để effect cuộn ở trên tìm được ô.
  useEffect(() => {
    if (!oDuocChon) return;
    const khoa = danhSachCuaO(oDuocChon) ?? oDuocChon;
    const slot = oDuocChon.startsWith('images.') ? oDuocChon.slice('images.'.length) : null;
    const khoi = khoiCuaTrang.find((k) =>
      slot
        ? (imagesBySection[k.prefix] ?? []).some((im) => im.slot === slot)
        : (keysBySection[k.prefix] ?? []).some((x) => x === khoa || x.startsWith(`${khoa}.`))
          || (khoa.startsWith('social.') && (keysBySection[k.prefix] ?? []).some((x) => x.startsWith('social.'))),
    );
    if (khoi) setKhoiMo((cu) => (cu.has(khoi.prefix) ? cu : new Set(cu).add(khoi.prefix)));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy khi đổi ô được chọn
  }, [oDuocChon]);

  /** Số ô của một khối đang khác bản gốc — chip "N đã sửa" như btn. */
  const demDaSua = (prefix: string): number => {
    const daDem = new Set<string>();
    let n = 0;
    for (const k of keysBySection[prefix] ?? []) {
      const list = danhSachCuaO(k);
      if (list !== null) {
        if (daDem.has(list)) continue;
        daDem.add(list);
        if (ghiDe(list) !== undefined) n += 1;
      } else if (giaTri(k) !== (schema?.fields[k] ?? '')) n += 1;
    }
    for (const im of imagesBySection[prefix] ?? []) if (anhDangDung[im.slot]) n += 1;
    return n;
  };

  /** Tìm ô theo nhãn, khoá hoặc nội dung — bỏ dấu, gõ "dat xe" vẫn ra "Đặt xe". */
  const ketQuaTim = useMemo(() => {
    const q = boDau(timKiem.trim());
    if (!q || !schema) return null;
    return Object.keys(schema.fields)
      .filter((k) => !oMangXaHoi.has(k))
      .filter((k) => {
        const nhan = fieldLabel(k, schema.fieldSection[k] ?? '', locale);
        return [k, nhan, giaTriO(k)].some((x) => boDau(x).includes(q));
      })
      .slice(0, GIOI_HAN_TIM);
  }, [timKiem, schema, oMangXaHoi, locale, giaTriO]);

  const huyTatCa = (): void => {
    setNhapMoiNgonNgu({ 'vi-vn': {}, 'en-us': {} });
    setDangSua(null);
    setHoiHuy(false);
  };

  /** Dịch vụ của trang đang mở, nếu là một trang dịch vụ — để hiện nút xếp thứ tự. */
  const viTriDichVu = mucThuMucDichVu.findIndex((dv) => dv.pageKey === trangDangXem);
  const dichVuDangMo = viTriDichVu >= 0 ? mucThuMucDichVu[viTriDichVu] : undefined;

  const nhanTrang = (p: CmsLandingPage): string => {
    const dv = (schema?.serviceOrder ?? []).find((x) => `service.${x.key}` === p.key);
    return dv ? giaTri(dv.nameKey) || dv.name : p.label;
  };
  const demPhu = (p: CmsLandingPage): string => {
    const { o, anh } = demTrang(p);
    return anh > 0
      ? `${tNoiDung('cms.fieldCount', { count: o })} · ${tNoiDung('cms.slotCount', { count: anh })}`
      : tNoiDung('cms.fieldCount', { count: o });
  };
  const dongTrang = (p: CmsLandingPage, thut = false, tienTo = ''): ReactNode => (
    <MenuItem key={p.key} value={p.key} sx={thut ? { pl: 4 } : undefined}>
      <ListItemText primary={`${tienTo}${nhanTrang(p)}`} secondary={demPhu(p)} />
    </MenuItem>
  );

  const dangSuaKhoa = dangSua?.key ?? null;
  const dangSuaGiaTri = dangSuaKhoa ? giaTriO(dangSuaKhoa) : '';
  const dangSuaMacDinh = dangSuaKhoa
    ? (schema?.fields[dangSuaKhoa] ?? '')
    : '';
  const dangSuaKhoi = dangSuaKhoa ? (schema?.fieldSection[dangSuaKhoa] ?? '') : '';

  return (
    <PageContainer
      title={t('nav.cms')}
      action={
        <Stack direction="row" spacing={1}>
          <Button
            disabled={soONhapTong === 0 || dangLuu}
            onClick={() => setHoiHuy(true)}
            sx={[pillButtonSx, { bgcolor: (th) => alpha(th.palette.primary.main, 0.1), '&:hover': { bgcolor: (th) => alpha(th.palette.primary.main, 0.16) } }]}
          >
            {t('cms.discard')}
          </Button>
          <Button
            variant={soONhapTong > 0 ? 'contained' : 'outlined'}
            startIcon={<IconDeviceFloppy size={16} />}
            disabled={soONhapTong === 0 || dangLuu}
            onClick={() => setHoiLuu(true)}
            sx={pillButtonSx}
          >
            {soONhapTong > 0 ? t('cms.saveCount', { count: soONhapTong }) : t('common.actions.save')}
          </Button>
        </Stack>
      }
    >
      {resource.errorMessage ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {resource.errorMessage}
        </Alert>
      ) : null}

      <SectionCard disableContentPadding>
        {/* Thanh công cụ — mọi thứ quyết định khung đang hiện cái gì. */}
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          useFlexGap
          flexWrap="wrap"
          sx={{ px: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}
          role="toolbar"
        >
          <TextField
            select
            size="small"
            aria-label={t('cms.page')}
            value={pages.some((p) => p.key === trangDangXem) ? trangDangXem : ''}
            onChange={(e) => {
              setDangSua(null);
              if (e.target.value === THEM_DICH_VU) setMoThemDichVu(true);
              else setTrangDangXem(e.target.value);
            }}
            sx={[pillSelectSx, { minWidth: 240 }]}
            slotProps={{
              select: {
                renderValue: (v) => {
                  const p = pages.find((x) => x.key === v);
                  return p ? nhanTrang(p) : '';
                },
                MenuProps: { slotProps: { paper: { sx: { maxHeight: '70vh' } } } },
              },
            }}
          >
            {trangNgoaiThuMuc.map((p) => dongTrang(p))}
            {/* Thẻ SEO và thẻ chia sẻ: không hiện ở đâu trên trang, nên gộp
                lại cho khác hẳn những mục xung quanh. */}
            {trangSeo.length > 0 ? (
              <ListSubheader>{`${tNoiDung('cms.seoFolder')} · ${tNoiDung('cms.seoFolderHint')}`}</ListSubheader>
            ) : null}
            {trangSeo.map((p) => dongTrang(p, true))}
            {/* Danh sách và thứ tự do landing gửi sang, khớp đúng thứ người
                đọc thấy trong mục Dịch vụ trên trang. */}
            {mucThuMucDichVu.length > 0 ? (
              <ListSubheader>{tNoiDung('cms.servicesFolder')}</ListSubheader>
            ) : null}
            {mucThuMucDichVu.flatMap((dv, i) => {
              const trang = pages.find((p) => p.key === dv.pageKey);
              return trang ? [dongTrang(trang, true, `${i + 1}. `)] : [];
            })}
            <MenuItem value={THEM_DICH_VU} sx={{ pl: 4, color: 'primary.main' }}>
              <IconPlus size={16} style={{ marginRight: 8 }} />
              {t('cms.addService.button')}
            </MenuItem>
          </TextField>

          <CmsSegmented
            label={t('cms.language')}
            value={locale}
            options={[
              { value: 'vi-vn' as CmsLocale, label: 'VI' },
              { value: 'en-us' as CmsLocale, label: 'EN' },
            ]}
            onChange={(v) => {
              setDangSua(null);
              setLocale(v);
            }}
          />

          <CmsSegmented
            label={t('cms.device')}
            value={device}
            disabled={kieuXem !== 'page'}
            options={(Object.keys(DEVICES) as DeviceKey[]).map((d) => {
              const Icon = DEVICE_ICONS[d];
              return {
                value: d,
                title: `${t(`cms.devices.${d}`)} · ${DEVICES[d]}px`,
                label: (
                  <>
                    <Icon size={16} />
                    <Box component="span" sx={{ display: { xs: 'none', xl: 'inline' } }}>
                      {t(`cms.devices.${d}`)}
                    </Box>
                  </>
                ),
              };
            })}
            onChange={(v) => {
              setDangSua(null);
              setDevice(v);
            }}
          />

          <TextField
            select
            size="small"
            aria-label={t('cms.zoom')}
            value={String(zoom)}
            disabled={kieuXem !== 'page'}
            onChange={(e) => {
              setDangSua(null);
              setZoom(e.target.value === 'fit' ? 'fit' : (Number(e.target.value) as PreviewZoom));
            }}
            sx={[pillSelectSx, { width: 130 }]}
          >
            {ZOOM_OPTIONS.map((z) => (
              <MenuItem key={z} value={String(z)}>
                {z === 'fit' ? t('cms.zoomFit') : `${z * 100}%`}
              </MenuItem>
            ))}
          </TextField>

          <Box sx={{ flex: 1 }} />

          <Tooltip title={t('cms.previewRefresh')}>
            <IconButton
              onClick={() => {
                setDangSua(null);
                setLanTaiLai((n) => n + 1);
              }}
            >
              <IconRefresh size={18} />
            </IconButton>
          </Tooltip>
          {/* Như btn: tab mới là landing thật, chạy đủ hiệu ứng, đi lại được
              giữa các trang — và vẫn đắp bản nháp chưa lưu. Xem usePreviewTab. */}
          <Tooltip title={t('cms.openSite')}>
            <span>
              <IconButton
                aria-label={t('cms.openSite')}
                disabled={!urlXemTruoc}
                onClick={() => moTabXemTruoc(urlXemTruoc)}
              >
                <IconExternalLink size={18} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={hienDanhSachO ? t('cms.hideFieldList') : t('cms.showFieldList')}>
            <IconButton
              aria-pressed={hienDanhSachO}
              onClick={() => {
                setDangSua(null);
                setHienDanhSachO((v) => !v);
              }}
            >
              {hienDanhSachO ? <IconLayoutSidebarRightCollapse size={18} /> : <IconLayoutSidebarRight size={18} />}
            </IconButton>
          </Tooltip>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: hienDanhSachO ? 'minmax(0, 1fr) 352px' : '1fr',
            },
            height: { md: 'calc(100vh - 230px)' },
            minHeight: 544,
          }}
        >
          <Box sx={{ minWidth: 0, minHeight: { xs: 540, md: 0 } }}>
            {!schema ? (
              <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                {resource.errorMessage ? null : <BeeLoader />}
              </Box>
            ) : kieuXem !== 'page' ? (
              /* Hai mục không hiện ở đâu trên trang thì xem trước kiểu khác —
                 nhúng trang vào chỉ ra màn đen. */
              <Box sx={{ height: '100%', overflow: 'auto', p: 2 }}>
                <CmsMetaPreview
                  kind={kieuXem}
                  giaTri={giaTri}
                  keys={oCuaTrang}
                  onChange={suaTaiCho}
                  landingUrl={schema.landingUrl}
                  locale={locale}
                  reloadKey={lanTaiLai}
                />
              </Box>
            ) : (
              <CmsPreview
                url={urlXemTruoc}
                reloadKey={lanTaiLai}
                device={device}
                zoom={zoom}
                nhap={nhapChoKhung}
                phamVi={phamViXemTruoc}
                focus={troToiO}
                editingKey={dangSuaKhoa}
                onSelect={chonO}
                onAnchorChange={doiToaDo}
                onChonAnh={bamVaoAnh}
              />
            )}
          </Box>

          {hienDanhSachO ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                borderLeft: { md: '1px solid' },
                borderTop: { xs: '1px solid', md: 'none' },
                borderColor: 'divider',
                bgcolor: 'grey.50',
              }}
            >
              <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <TextField
                  size="small"
                  fullWidth
                  value={timKiem}
                  onChange={(e) => setTimKiem(e.target.value)}
                  placeholder={t('cms.searchPlaceholder')}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <IconSearch size={16} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Box>

              <Box ref={cotO} sx={{ flex: 1, minHeight: 0, overflow: 'auto', px: 1.5, pb: 3 }}>
                {ketQuaTim ? (
                  ketQuaTim.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                      {t('cms.searchEmpty')}
                    </Typography>
                  ) : (
                    <Stack spacing={1.5} sx={{ pt: 1.5 }}>
                      {ketQuaTim.length === GIOI_HAN_TIM ? (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                          {t('cms.searchLimit', { count: GIOI_HAN_TIM })}
                        </Typography>
                      ) : null}
                      {ketQuaTim.map((k) => (
                        <CmsFieldRow
                          key={k}
                          keyPath={k}
                          prefix={theoPrefix[schema?.fieldSection[k] ?? '']?.label}
                          label={fieldLabel(k, schema?.fieldSection[k] ?? '', locale)}
                          fallback={schema?.fields[k] ?? ''}
                          value={giaTriO(k)}
                          isNumber={oSo.has(k)}
                          onChange={(v) => suaTaiCho(k, v)}
                          onReset={danhSachCuaO(k) ? undefined : () => khoiPhuc(k)}
                        />
                      ))}
                    </Stack>
                  )
                ) : trangHienTai ? (
                  <>
                    {/* Trang dịch vụ: đổi tên và xếp thứ tự ngay đầu cột, chỗ
                        người ta đang nhìn khi đứng ở trang đó. */}
                    {dichVuDangMo ? (
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={0.5}
                        sx={{ mt: 1.5, p: 1, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
                      >
                        <Typography variant="body2" sx={{ flex: 1 }}>
                          {t('cms.servicePosition', {
                            index: viTriDichVu + 1,
                            count: mucThuMucDichVu.length,
                          })}
                        </Typography>
                        <Tooltip title={t('cms.renameService')}>
                          <IconButton size="small" onClick={() => setODangMo(dichVuDangMo.nameKey)}>
                            <IconPencil size={16} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('cms.moveUp')}>
                          <span>
                            <IconButton
                              size="small"
                              aria-label={t('cms.moveUp')}
                              disabled={viTriDichVu === 0}
                              onClick={() => doiChoDichVu(viTriDichVu, -1)}
                            >
                              <IconArrowUp size={16} />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={t('cms.moveDown')}>
                          <span>
                            <IconButton
                              size="small"
                              aria-label={t('cms.moveDown')}
                              disabled={viTriDichVu === mucThuMucDichVu.length - 1}
                              onClick={() => doiChoDichVu(viTriDichVu, 1)}
                            >
                              <IconArrowDown size={16} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    ) : null}

              <Typography
                sx={{ mt: 2, mb: 0.75, px: 0.5, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary' }}
              >
                {t('cms.groupPage')}
              </Typography>
              {khoiCuaTrang.map((khoi) => {
                const anh = imagesBySection[khoi.prefix] ?? [];
                const o = keysBySection[khoi.prefix] ?? [];
                if (anh.length === 0 && o.length === 0) return null;
                const mo = khoiMo.has(khoi.prefix);
                const daSua = demDaSua(khoi.prefix);
                return (
                  <Box
                    key={khoi.prefix}
                    sx={{ mb: 0.75, overflow: 'hidden', borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
                  >
                    <ButtonBase
                      onClick={() => doiKhoiMo(khoi.prefix)}
                      aria-expanded={mo}
                      sx={{
                        width: '100%',
                        justifyContent: 'flex-start',
                        gap: 1,
                        px: 1.5,
                        py: 1.25,
                        textAlign: 'left',
                        '&:hover': { bgcolor: (th) => alpha(th.palette.primary.main, 0.04) },
                      }}
                    >
                      <Box
                        component="span"
                        sx={{ display: 'inline-flex', color: 'text.secondary', transition: 'transform .15s', transform: mo ? 'rotate(90deg)' : 'none' }}
                      >
                        <IconChevronRight size={16} />
                      </Box>
                      <Typography sx={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{khoi.label}</Typography>
                      {/* Ảnh dùng chung hai ngôn ngữ — biểu tượng địa cầu như btn. */}
                      {anh.length > 0 ? (
                        <Tooltip title={t('cms.imagesShared')}>
                          <Box component="span" sx={{ display: 'inline-flex', color: 'text.secondary' }}>
                            <IconWorld size={15} />
                          </Box>
                        </Tooltip>
                      ) : null}
                      {daSua > 0 ? (
                        <Chip
                          size="small"
                          color="primary"
                          label={t('cms.changedCount', { count: daSua })}
                          sx={{ height: 20, fontSize: 11, fontWeight: 600, bgcolor: (th) => alpha(th.palette.primary.main, 0.12), color: 'primary.main' }}
                        />
                      ) : null}
                    </ButtonBase>
                    {mo ? (
                  <Box
                    sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, px: 1.5, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}
                  >
                    {/* Khối này là cái gì trên trang — câu trả lời cho
                        "sửa ô nào thì đổi chỗ nào". */}
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{khoi.hint}</Typography>

                    {/* Logo hai dải đối tác: ghi thẳng, không qua bản nháp —
                        xem CmsPartnerLogos. */}
                    {khoi.prefix === 'partners' ? (
                      <CmsPartnerLogos
                        landingUrl={schema?.landingUrl ?? ''}
                        coTheSua={coTheSuaCms}
                        // Tải lại khung xem trước rồi cuộn tới dải logo: tải lại
                        // là nhảy về đầu trang, người sửa sẽ mất chỗ đang nhìn.
                        onDaDoi={() => {
                          setLanTaiLai((n) => n + 1);
                          troToi('partners.customers');
                        }}
                      />
                    ) : null}

                    {/* Ảnh đứng TRƯỚC chữ: mở một khối ra, cái đập vào mắt nên
                        là hình, vì nó nói ngay đang đứng ở đâu trên trang. */}
                    {anh.length > 0 ? (
                      <CmsImageGrid
                        slots={anh}
                        values={anhDangDung}
                        landingUrl={schema?.landingUrl ?? ''}
                        onOpen={bamVaoAnh}
                        onReset={(slot) => khoiPhuc(`images.${slot}`)}
                        selectedSlot={anhDangChon}
                      />
                    ) : null}

                    {(() => {
                      // Những ô chỉ số của cùng một danh sách gộp lại thành một
                      // màn sửa, đặt đúng chỗ ô đầu tiên của nó đứng.
                      const daDung = new Set<string>();
                      let daVeMangXaHoi = false;
                      return o.map((k) => {
                        if (oMangXaHoi.has(k)) {
                          if (daVeMangXaHoi) return null;
                          daVeMangXaHoi = true;
                          return (
                            <Box key="social" data-field-key="social">
                            <CmsSocialEditor
                              kenh={kenhMangXaHoi}
                              giaTri={giaTri}
                              tat={giaTri('social.off')}
                              onDoiDiaChi={(o2, v) => setNhap((cu) => ({ ...cu, [o2]: v }))}
                              onDoiTat={(v) => setNhap((cu) => ({ ...cu, 'social.off': v }))}
                              lng={locale === 'en-us' ? 'en' : 'vi'}
                            />
                            </Box>
                          );
                        }
                        const list = danhSachCuaO(k);
                        if (list !== null) {
                          if (daDung.has(list)) return null;
                          daDung.add(list);
                          const oCuaMuc = danhSachDoiTuong.get(list);
                          if (oCuaMuc) {
                            return (
                              <Box key={list} data-field-key={list} onFocusCapture={() => troToi(list)} sx={selectedSx(oDuocChon !== null && danhSachCuaO(oDuocChon) === list)}>
                              <CmsObjectListEditor
                                keyPath={list}
                                label={fieldLabel(list, khoi.prefix, locale)}
                                fields={oCuaMuc}
                                toggles={oCongTac.get(list) ?? []}
                                fieldLabel={(f) => fieldLabel(`${list}.${f}`, list, locale)}
                                items={mucDoiTuongCua(list)}
                                fallback={macDinhDoiTuong(list)}
                                onChange={(v) => setNhap((cu) => ({ ...cu, [list]: v }))}
                                onReset={() => khoiPhuc(list)}
                                lng={locale === 'en-us' ? 'en' : 'vi'}
                              />
                              </Box>
                            );
                          }
                          return (
                            <Box key={list} data-field-key={list} onFocusCapture={() => troToi(list)} sx={selectedSx(oDuocChon !== null && danhSachCuaO(oDuocChon) === list)}>
                            <CmsListEditor
                              keyPath={list}
                              label={fieldLabel(list, khoi.prefix, locale)}
                              items={mucCuaDanhSach(list)}
                              fallback={macDinhDanhSach(list)}
                              onChange={(v) => setNhap((cu) => ({ ...cu, [list]: v }))}
                              onReset={() => khoiPhuc(list)}
                              lng={locale === 'en-us' ? 'en' : 'vi'}
                            />
                            </Box>
                          );
                        }
                        return (
                          <CmsFieldRow
                            key={k}
                            isSelected={oDuocChon === k}
                            onFocus={() => troToi(k)}
                            keyPath={k}
                            label={fieldLabel(k, khoi.prefix, locale)}
                            fallback={schema?.fields[k] ?? ''}
                            value={giaTri(k)}
                            isNumber={oSo.has(k)}
                            onChange={(v) => suaTaiCho(k, v)}
                            onReset={() => khoiPhuc(k)}
                          />
                        );
                      });
                    })()}
                  </Box>
                    ) : null}
                  </Box>
                );
              })}
                  </>
                ) : null}
              </Box>
            </Box>
          ) : null}
        </Box>
      </SectionCard>

      {dangSua && schema ? (
        <CmsInlineEditor
          key={dangSua.key}
          anchor={dangSua.anchor}
          bounds={dangSua.bounds}
          title={`${theoPrefix[dangSuaKhoi]?.label ?? dangSuaKhoi} › ${fieldLabel(dangSua.key, dangSuaKhoi, locale)}`}
          value={dangSuaGiaTri}
          defaultValue={dangSuaMacDinh}
          isNumber={oSo.has(dangSua.key)}
          onChange={(v) => suaTaiCho(dangSua.key, v)}
          onReset={() => {
            // Ô trong danh sách: khôi phục cả danh sách — ô chỉ số lẻ không có
            // bản ghi riêng để xoá.
            khoiPhuc(danhSachCuaO(dangSua.key) ?? dangSua.key);
          }}
          onClose={dongHopSua}
        />
      ) : null}

      <CmsImageDialog
        slot={anhDangChon ? (anhTheoSlot[anhDangChon] ?? null) : null}
        url={anhDangChon ? anhDangDung[anhDangChon] : undefined}
        landingUrl={schema?.landingUrl ?? ''}
        onChange={(slot, url) => setNhap((cu) => ({ ...cu, [`images.${slot}`]: url }))}
        onReset={(slot) => khoiPhuc(`images.${slot}`)}
        onClose={() => setAnhDangChon(null)}
      />

      {/* Xác nhận trước khi lưu: lưu là ĐẨY THẲNG LÊN TRANG THẬT, không có
          bước duyệt nào ở giữa. Nói rõ số ô của từng ngôn ngữ, vì bản nháp giữ
          cả hai và người bấm có thể quên mình đã sửa bên kia. */}
      <Dialog open={hoiLuu} onClose={() => setHoiLuu(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('cms.confirmSaveTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={1}>
            {(['vi-vn', 'en-us'] as CmsLocale[]).map((l) => {
              const n = Object.keys(nhapMoiNgonNgu[l]).length;
              if (n === 0) return null;
              return (
                <Typography key={l} variant="body2">
                  {t(l === 'vi-vn' ? 'cms.vietnamese' : 'cms.english')}:{' '}
                  <b>{t('cms.fieldCount', { count: n })}</b>
                </Typography>
              );
            })}
            <Alert severity="warning" sx={{ mt: 1 }}>
              {t('cms.confirmSaveBody')}
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHoiLuu(false)} disabled={dangLuu}>
            {t('common.actions.cancel')}
          </Button>
          <Button variant="contained" onClick={() => void luu()} disabled={dangLuu}>
            {dangLuu ? t('cms.saving') : t('common.actions.confirm')}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        isOpen={hoiHuy}
        title={t('cms.discardTitle')}
        description={t('cms.discardMessage', { count: soONhapTong })}
        isDestructive
        confirmLabel={t('cms.discard')}
        onConfirm={huyTatCa}
        onClose={() => setHoiHuy(false)}
      />

      <CmsFieldDialog
        keyPath={oDangMo !== null && schema?.fields[oDangMo] !== undefined ? oDangMo : null}
        label={oDangMo ? fieldLabel(oDangMo, schema?.fieldSection[oDangMo] ?? '', locale) : ''}
        value={oDangMo ? giaTri(oDangMo) : ''}
        fallback={oDangMo ? (schema?.fields[oDangMo] ?? '') : ''}
        onSave={(v) => {
          if (oDangMo) suaTaiCho(oDangMo, v);
        }}
        onClose={() => setODangMo(null)}
      />

      {/* Thêm dịch vụ: thêm xong nạp lại danh mục ô rồi mở luôn trang mới —
          người ta vừa tạo nó ra để viết, không phải để đi tìm lại. */}
      <CmsAddServiceDialog
        open={moThemDichVu}
        onClose={() => setMoThemDichVu(false)}
        locale={locale}
        duongDanDaCo={duongDanDaCo}
        onAdded={async (khoa) => {
          await resource.reload();
          setTrangDangXem(`service.${khoa}`);
          enqueueSnackbar(t('cms.addService.added'), { variant: 'success' });
        }}
      />
    </PageContainer>
  );
}
