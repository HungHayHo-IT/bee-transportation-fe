import apiClient from './apiClient';
import { CMS_ENDPOINTS } from './apiEndpoints';

/** Hai ngôn ngữ landing phục vụ. */
export const CMS_LOCALES = ['vi-vn', 'en-us'] as const;
export type CmsLocale = (typeof CMS_LOCALES)[number];

/** Một ô ảnh: khoá lưu là `images.<slot>`. */
export interface CmsImageSlot {
  slot: string;
  label: string;
  /** Ảnh này đang nằm ở đâu trên trang — để người sửa biết mình đổi cái gì. */
  usage: string;
  /** Mục nội dung chứa ô ảnh này, cùng hệ tiền tố với CmsSection. */
  section: string;
  /** Ảnh đang dùng khi chưa ai thay, tính theo gốc địa chỉ landing. */
  defaultUrl: string;
}

/**
 * Danh mục ô sửa được. `fields` là map phẳng 'a.b.0.c' -> giá trị MẶC ĐỊNH
 * đang nằm trong code của landing, không phải giá trị đang hiển thị.
 */
/** Một nhóm nội dung, kèm trang nó hiện lên. */
export interface CmsSection {
  prefix: string;
  label: string;
  /** Khối này là cái gì trên trang — hiện ngay dưới tên mục. */
  hint: string;
  /** Đường dẫn trang chứa nó, dùng cho khung xem trước. */
  path: string;
  /**
   * Ô MƯỢN: hiện trong khối này nhưng lưu dưới tiền tố khác.
   *
   * Nhãn "Vận chuyển đường bộ" trên thanh điều hướng là TÊN DỊCH VỤ
   * (`services.items.domestic.name`), không phải một ô `nav.*` — cố ý, để đổi
   * tên dịch vụ là đổi luôn ở thanh trên, menu, chân trang và thẻ dịch vụ cùng
   * lúc. Nhưng mỗi ô chỉ thuộc đúng một mục, nên nếu không có danh sách này thì
   * mở "Thanh điều hướng" ra sẽ thấy hai nhãn cạnh nhau mà chỉ sửa được một.
   *
   * Ô mượn vẫn thuộc mục gốc của nó — nó hiện ở cả hai nơi, cùng một giá trị.
   */
  khoaMuon?: readonly string[];
}

export interface CmsSchema {
  locale: CmsLocale;
  fields: Record<string, string>;
  /**
   * Những ô mà trong từ điển là SỐ, không phải chữ ('425 chuyến/ngày',
   * '34 tỉnh thành'). Gửi về dạng chuỗi như mọi ô khác, nhưng đánh dấu ở đây
   * để màn sửa chỉ cho nhập chữ số — landing bỏ qua giá trị không đọc ra số và
   * giữ nguyên mặc định, nên nhập sai là im lặng không có gì đổi.
   */
  numberFields?: string[];
  /**
   * Những danh sách cho phép THÊM, BỚT và ĐỔI THỨ TỰ.
   *
   * Lưu cả danh sách vào một ô, giá trị là mảng chuỗi dạng JSON — ghi đè từng
   * ô không thêm và không đổi thứ tự được. Danh sách không có trong đây thì
   * mã nguồn ràng buộc đúng số phần tử, chỉ sửa chữ từng ô.
   */
  editableLists?: string[];
  /**
   * Chín dịch vụ theo đúng thứ tự đang hiển thị trên landing, kèm tên đọc
   * được. Dùng để dựng thư mục Dịch vụ ở danh sách bên trái.
   */
  serviceOrder?: { key: string; name: string; nameKey: string }[];
  /**
   * Thư mục Dịch vụ trong danh sách bên trái gồm những mục nào.
   *
   * Khác serviceOrder: đây là thứ người đọc thấy trong mục Dịch vụ trên trang
   * (bỏ dịch vụ đã có trang riêng, thêm Kho bãi), còn serviceOrder là chín
   * dịch vụ theo nghĩa nghiệp vụ. Landing tính sẵn rồi gửi sang, để admin
   * không phải chép lại luật ghép và rồi lệch với trang thật.
   */
  serviceFolder?: { key: string; name: string; nameKey: string; pageKey: string }[];
  /**
   * Mọi đoạn URL đang bị chiếm ở ngôn ngữ này.
   *
   * Dùng để chặn trùng khi thêm dịch vụ mới. Landing tính và gửi sang vì chỉ
   * nó biết đủ đường dẫn của chính nó — backend chỉ biết các dịch vụ tự thêm,
   * không biết 'lien-he' hay 'kho-bai' cũng là trang.
   */
  reservedSlugs?: string[];
  /**
   * Danh sách chứa ĐỐI TƯỢNG cho thêm/bớt/đổi thứ tự, kèm tên các ô của một
   * mục. Khác editableLists ở chỗ đó: ở kia một mục là một ô chữ.
   */
  objectLists?: { prefix: string; fields: string[]; toggles?: string[] }[];
  /**
   * Các kênh mạng xã hội, kèm hình vẽ biểu tượng.
   *
   * Hình nằm trong mã nguồn landing chứ không gõ được, nên landing gửi sang
   * để màn CMS vẽ đúng cái biểu tượng người đọc sẽ thấy ở chân trang.
   */
  socialIcons?: { key: string; label: string; icon: string }[];
  images: CmsImageSlot[];
  sections: CmsSection[];
  /**
   * Các TRANG của landing — thứ hiện trong danh sách bên trái.
   *
   * Người biên tập nghĩ theo trang, không nghĩ theo khối: "sửa trang Kho bãi",
   * không phải "sửa khối warehousing". Landing là nơi biết khối nào nằm ở
   * trang nào, nên nó gửi sẵn bảng này sang.
   */
  pages: CmsPage[];
  /** Khoá -> tiền tố mục chứa nó. */
  fieldSection: Record<string, string>;
  /** Gốc địa chỉ landing, để nhúng khung xem trước. */
  landingUrl: string;
}

export interface CmsPage {
  key: string;
  label: string;
  hint: string;
  /** Đường dẫn để mở trong khung xem trước. */
  path: string;
  /**
   * Xem trước bằng cách nào: nhúng trang ('page'), dựng mẩu kết quả Google
   * ('seo'), hay lấy tấm ảnh chia sẻ ('share'). Hai loại sau dành cho những
   * mục không hiện ở đâu trên trang — nhúng trang vào chỉ ra màn đen.
   */
  preview?: 'page' | 'seo' | 'share';
  /**
   * Tiền tố của những khối nằm trên trang này.
   *
   * Một khối nằm được ở nhiều trang, nên cộng số ô của mọi trang lại sẽ LỚN
   * HƠN tổng số ô. Cố ý: khối "Vì sao chọn BeeOps" thật sự hiện ở cả mười
   * trang, giấu nó đi ở chín trang là nói dối về trang đó có gì.
   */
  sections: string[];
}

/** Một ô đã bị ghi đè. */
export interface CmsOverride {
  keyPath: string;
  value: string;
  updatedBy: string | null;
  updatedAt: string;
}

export interface CmsEntry {
  keyPath: string;
  /** null = khôi phục về bản mặc định trong code (backend xoá dòng ghi đè). */
  value: string | null;
}

export async function fetchCmsSchema(locale: CmsLocale): Promise<CmsSchema> {
  const res = await apiClient.get<CmsSchema>(CMS_ENDPOINTS.SCHEMA, { params: { locale } });
  return res.data;
}

export async function fetchCmsOverrides(locale: CmsLocale): Promise<CmsOverride[]> {
  const res = await apiClient.get<CmsOverride[]>(CMS_ENDPOINTS.CONTENT, {
    params: { locale },
  });
  return res.data;
}

/** Lưu những ô đã sửa (và khôi phục những ô mang null). Ô ảnh được backend ghi cho cả hai ngôn ngữ. */
export async function saveCmsContent(
  locale: CmsLocale,
  entries: CmsEntry[],
): Promise<{ saved: number }> {
  const res = await apiClient.put<{ saved: number }>(CMS_ENDPOINTS.CONTENT, {
    locale,
    entries,
  });
  return res.data;
}

export interface PresignedUpload {
  key: string;
  uploadUrl: string;
  publicUrl: string;
  method: 'PUT';
  headers: Record<string, string>;
  expiresIn: number;
}

export async function presignCmsImage(
  filename: string,
  contentType: string,
): Promise<PresignedUpload> {
  const res = await apiClient.post<PresignedUpload>(CMS_ENDPOINTS.PRESIGN_IMAGE, {
    filename,
    contentType,
  });
  return res.data;
}

/**
 * Tải ảnh thẳng lên S3 bằng URL vừa xin, trả về URL công khai.
 *
 * Không đi qua backend: file ảnh không có lý do gì phải chạy qua máy chủ ứng
 * dụng rồi mới sang kho lưu trữ. Dùng `fetch` chứ không dùng apiClient vì đây
 * là request sang S3, không mang theo token của mình được — presigned URL đã
 * là giấy phép rồi, gắn thêm Authorization là S3 từ chối.
 */
export async function uploadCmsImage(file: File): Promise<string> {
  const ky = await presignCmsImage(file.name, file.type);
  const res = await fetch(ky.uploadUrl, {
    method: ky.method,
    headers: { ...ky.headers, 'Content-Type': file.type },
    body: file,
  });
  if (!res.ok) throw new Error(`Tải ảnh lên thất bại (HTTP ${res.status})`);
  return ky.publicUrl;
}
