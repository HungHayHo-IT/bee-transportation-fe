import type { CmsEntry } from '@/services/cmsService';

/**
 * Toàn bộ nội dung của một dịch vụ mới, gom vào một chỗ.
 *
 * Điền hết trong một lần chứ không tạo rồi sửa từng ô: người viết đang có cả
 * câu chuyện dịch vụ trong đầu, bắt họ tạo trang trống rồi đi dò ba mươi ô là
 * cắt vụn đúng lúc họ đang liền mạch.
 */
export interface NoiDungDichVu {
  ten: string;
  slugVi: string;
  slugEn: string;
  /** Một dòng tóm tắt, hiện trên thẻ dịch vụ ở trang chủ. */
  body: string;
  /** Đoạn mở đầu của trang chi tiết. */
  intro: string;
  problems: { name: string; body: string }[];
  approach: { name: string; body: string }[];
  usps: { name: string; body: string }[];
  points: string[];
  faqs: { q: string; a: string }[];
  metaTitle: string;
  metaDescription: string;
  /** URL ảnh vừa tải lên, rỗng = dùng ảnh mặc định của trang dịch vụ. */
  anhUrl: string;
}

/**
 * Số mục mỗi khối, khớp đúng với khuôn bên landing và với chín dịch vụ có sẵn:
 * ba vấn đề, BỐN bước triển khai, ba ưu thế, bốn hạng mục, ba câu hỏi.
 *
 * Lệch số ở đây không làm hỏng gì — ô thừa thì lưu thêm, ô thiếu thì giữ chữ
 * mồi — nhưng nó làm trang mới trông khác hẳn chín trang cũ, và đó mới là thứ
 * người đọc thấy.
 */
export const SO_MUC = { problems: 3, approach: 4, usps: 3, points: 4, faqs: 3 } as const;

const cap = (n: number) => Array.from({ length: n }, () => ({ name: '', body: '' }));

export function noiDungRong(): NoiDungDichVu {
  return {
    ten: '', slugVi: '', slugEn: '', body: '', intro: '',
    problems: cap(SO_MUC.problems),
    approach: cap(SO_MUC.approach),
    usps: cap(SO_MUC.usps),
    points: Array.from({ length: SO_MUC.points }, () => ''),
    faqs: Array.from({ length: SO_MUC.faqs }, () => ({ q: '', a: '' })),
    metaTitle: '', metaDescription: '', anhUrl: '',
  };
}

/**
 * Đổi nội dung đã điền thành danh sách ô để lưu xuống CMS.
 *
 * Ô ĐỂ TRỐNG thì KHÔNG lưu — và đó là điều đúng, không phải chỗ làm tắt: dịch
 * vụ mới sinh ra đã có sẵn chữ mồi ở mọi khối, nên ô không điền vẫn có chữ
 * chạy được. Lưu chuỗi rỗng vào thì khối đó biến mất khỏi trang, và người
 * dùng sẽ tưởng mình làm hỏng cái gì.
 *
 * Tên dịch vụ không nằm ở đây: nó đã đi theo đường tạo dịch vụ bên BeeOps.
 */
export function oNoiDung(khoa: string, nd: NoiDungDichVu): CmsEntry[] {
  const goc = `services.items.${khoa}`;
  const ra: CmsEntry[] = [];
  const them = (duoi: string, v: string): void => {
    const s = v.trim();
    if (s) ra.push({ keyPath: `${goc}.${duoi}`, value: s });
  };

  them('body', nd.body);
  them('intro', nd.intro);
  nd.problems.forEach((p, i) => {
    them(`problems.${i}.name`, p.name);
    them(`problems.${i}.body`, p.body);
  });
  nd.approach.forEach((p, i) => {
    them(`approach.${i}.name`, p.name);
    them(`approach.${i}.body`, p.body);
  });
  nd.usps.forEach((p, i) => {
    them(`usps.${i}.name`, p.name);
    them(`usps.${i}.body`, p.body);
  });
  nd.points.forEach((p, i) => them(`points.${i}`, p));
  nd.faqs.forEach((f, i) => {
    them(`faqs.${i}.q`, f.q);
    them(`faqs.${i}.a`, f.a);
  });
  them('meta.title', nd.metaTitle);
  them('meta.description', nd.metaDescription);

  /* Ô ảnh nằm ngoài nhánh nội dung của dịch vụ: khoá của nó là
     `images.service.<khoá>`, và backend ghi ô ảnh cho CẢ HAI ngôn ngữ — một
     tấm ảnh không có bản tiếng Anh riêng. */
  if (nd.anhUrl.trim()) {
    ra.push({ keyPath: `images.service.${khoa}`, value: nd.anhUrl.trim() });
  }
  return ra;
}
