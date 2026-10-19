import { DAC_BIET_EN, DOAN_EN, MUC_EN } from './fieldLabelsEn';

/**
 * Đổi khoá kỹ thuật thành cái tên người biên tập đọc được.
 *
 * 'services.items.consulting.problems.0.name' tự nó không nói cho ai biết đang
 * sửa cái gì. Dịch từng đoạn rồi ghép lại cho ra "Vấn đề 1 › Tiêu đề".
 *
 * Từ điển này bao 747 ô bằng vài chục mục, vì tên trường trong landing lặp đi
 * lặp lại: gần như nhánh nào cũng có title, body, cta. Đoạn nào không có trong
 * đây thì giữ nguyên — thiếu một nhãn đẹp còn hơn hiện sai chỗ.
 */
const DOAN: Record<string, string> = {
  // khung sườn hay gặp
  title: 'Tiêu đề',
  titleAccent: 'Tiêu đề (phần nhấn màu)',
  subtitle: 'Tiêu đề phụ',
  heading: 'Tiêu đề khối',
  eyebrow: 'Dòng nhãn nhỏ phía trên',
  sub: 'Dòng phụ',
  body: 'Nội dung',
  intro: 'Đoạn mở đầu',
  lead: 'Đoạn dẫn',
  note: 'Ghi chú',
  hint: 'Dòng gợi ý',
  label: 'Nhãn',
  name: 'Tiêu đề',
  desc: 'Mô tả',
  description: 'Mô tả',
  caption: 'Chú thích',
  cta: 'Chữ trên nút',
  ctaNote: 'Ghi chú dưới nút',
  copyright: 'Dòng bản quyền',
  // ảnh và trợ năng
  alt: 'Mô tả ảnh (cho trình đọc màn hình)',
  imageAlt: 'Mô tả ảnh (cho trình đọc màn hình)',
  mapAlt: 'Mô tả bản đồ',
  videoAlt: 'Mô tả video',
  // SEO
  meta: 'Thẻ SEO',
  og: 'Thẻ chia sẻ',
  // nhóm hay lặp
  items: 'Mục',
  points: 'Phạm vi dịch vụ (viết “Nhãn: nội dung” để có nhãn cam)',
  problems: 'Vấn đề',
  faqs: 'Câu hỏi thường gặp',
  steps: 'Bước',
  sections: 'Phần',
  captions: 'Khung chữ',
  chapters: 'Chương',
  facts: 'Con số',
  q: 'Câu hỏi',
  a: 'Câu trả lời',
  // khối Tải ứng dụng (trang chủ)
  available: 'Dòng chữ trên hai nút cửa hàng',
  googlePlayUrl: 'Link Google Play (để trống: nút không bấm được)',
  appStoreUrl: 'Link App Store (để trống: nút không bấm được)',
  qrUrl: 'Link mã QR trỏ tới (để trống: dùng link Google Play / App Store, chưa có thì trỏ về trang web)',
  qrAlt: 'Mô tả mã QR (cho trình đọc màn hình)',
  phoneAlt: 'Mô tả ảnh điện thoại (cho trình đọc màn hình)',
  // thông tin công ty
  shortName: 'Tên viết tắt',
  email: 'Email',
  customsLicence: 'Số giấy phép đại lý hải quan',
  phoneLabel: 'Tên người nghe máy',
  phoneNumber: 'Số điện thoại',
  offices: 'Văn phòng',
  street: 'Địa chỉ',
  city: 'Tỉnh/thành',
  // ---- nhóm lặp lại ở nhiều trang ----
  approach: 'Bước triển khai',
  usps: 'Điểm mạnh',
  warehouses: 'Loại kho',
  specs: 'Thông số',
  spec: 'Thông số',
  stats: 'Con số',
  overview: 'Số liệu tổng quan',
  routes: 'Tuyến đường',
  corridors: 'Hành lang vận tải',
  highlights: 'Con số nổi bật',
  tech: 'Công nghệ',
  infra: 'Hạ tầng',
  scope: 'Phạm vi dịch vụ',
  benefits: 'Lợi ích',
  equipment: 'Thiết bị',
  special: 'Hạng mục đặc biệt',
  sla: 'Cam kết thời gian',
  labels: 'Nhãn',
  group: 'Nhóm',
  detail: 'Khối chi tiết',
  value: 'Giá trị',
  to: 'Con số',
  suffix: 'Đuôi sau số',
  titleTail: 'Tiêu đề (phần đuôi)',

  // ---- tiêu đề từng khối ----
  contactHeading: 'Tiêu đề khối liên hệ',
  contactBody: 'Nội dung khối liên hệ',
  scopeHeading: 'Tiêu đề khối phạm vi dịch vụ',
  problemsHeading: 'Tiêu đề khối vấn đề',
  approachHeading: 'Tiêu đề khối cách triển khai',
  uspHeading: 'Tiêu đề khối điểm mạnh',
  faqHeading: 'Tiêu đề khối câu hỏi thường gặp',
  faqLead: 'Câu giới thiệu dưới tiêu đề câu hỏi thường gặp',
  faqCtaTitle: 'Thẻ liên hệ (câu hỏi thường gặp) — tiêu đề',
  faqCtaBody: 'Thẻ liên hệ (câu hỏi thường gặp) — nội dung',
  faqCtaButton: 'Thẻ liên hệ (câu hỏi thường gặp) — chữ trên nút',
  relatedHeading: 'Tiêu đề khối dịch vụ liên quan',
  typesHeading: 'Tiêu đề khối loại kho',
  techHeading: 'Tiêu đề khối công nghệ',
  infraHeading: 'Tiêu đề khối hạ tầng',
  routesHeading: 'Tiêu đề khối tuyến đường',
  corridorsHeading: 'Tiêu đề khối hành lang vận tải',
  equipmentHeading: 'Tiêu đề khối thiết bị',
  slaHeading: 'Tiêu đề khối cam kết thời gian',
  slaNote: 'Ghi chú dưới cam kết thời gian',
  servicesHeading: 'Tiêu đề cột Dịch vụ',
  companyHeading: 'Tiêu đề cột Công ty',
  supportHeading: 'Tiêu đề cột Hỗ trợ',
  slideTitle: 'Tiêu đề khối',
  licenceLabel: 'Nhãn trước số giấy phép',

  // ---- trang chủ và giới thiệu ----
  founding: 'Câu về ngày thành lập',
  motto: 'Khẩu hiệu',
  mottoTail: 'Câu sau khẩu hiệu',
  marquee: 'Dòng chữ chạy',

  // ---- nút và liên kết ----
  ctaPrimary: 'Chữ trên nút chính',
  ctaGhost: 'Chữ trên nút phụ',
  cardCta: 'Chữ trên thẻ',
  backToAll: 'Chữ nút quay lại',
  backToList: 'Chữ nút quay lại danh sách',
  aboutLabel: 'Nhãn mục Giới thiệu',
  privacyLabel: 'Nhãn mục Chính sách bảo mật',
  termsLabel: 'Nhãn mục Điều khoản',
  listLabel: 'Nhãn danh sách',
  railLabel: 'Nhãn dải trượt',
  publishedLabel: 'Nhãn ngày đăng',
  articleEyebrow: 'Dòng nhãn trên bài viết',

  // ---- mạng xã hội ----
  facebook: 'Địa chỉ trang Facebook',
  zalo: 'Địa chỉ trang Zalo',
  youtube: 'Địa chỉ kênh YouTube',
  linkedin: 'Địa chỉ trang LinkedIn',
  tiktok: 'Địa chỉ kênh TikTok',

  // ---- thanh điều hướng ----
  skipToContent: 'Chữ nút bỏ qua điều hướng',
  callNow: 'Chữ nút Gọi ngay',
  openMenu: 'Chữ nút mở menu',
  languageLabel: 'Nhãn chọn ngôn ngữ',

  // ---- trạng thái rỗng và lỗi ----
  empty: 'Chữ khi chưa có dữ liệu',
  emptyTitle: 'Tiêu đề khi chưa có dữ liệu',
  emptyBody: 'Nội dung khi chưa có dữ liệu',
  loadFailed: 'Chữ khi tải thất bại',
  updated: 'Dòng ngày cập nhật',

  // ---- địa chỉ ----
  headquarters: 'Nhãn Trụ sở',
  branch: 'Nhãn Chi nhánh',
  hotline: 'Nhãn Hotline',
  mapCaption: 'Chú thích bản đồ',
  mapSource: 'Nguồn bản đồ',

  // ---- tên trang, dùng trong thẻ SEO ----
  home: 'Trang chủ',
  about: 'Giới thiệu',
  services: 'Dịch vụ',
  capabilities: 'Năng lực',
  warehousing: 'Kho bãi',
  crossborder: 'Xuyên biên giới',
  blog: 'Tin tức',
  contact: 'Liên hệ',
  privacy: 'Chính sách bảo mật',
  terms: 'Điều khoản dịch vụ',

  // form liên hệ
  form: 'Biểu mẫu',
  // Chữ gợi ý nằm trong thuộc tính placeholder, không phải chữ trong trang:
  // bấm vào ô nhập trên trang thì mở hộp sửa riêng — xem CmsFieldDialog.
  namePlaceholder: 'Chữ gợi ý ô Họ và tên',
  phonePlaceholder: 'Chữ gợi ý ô Số điện thoại',
  emailPlaceholder: 'Chữ gợi ý ô Email',
  messagePlaceholder: 'Chữ gợi ý ô Thông tin hàng hoá',
  phone: 'Nhãn ô Số điện thoại',
  service: 'Nhãn ô Loại dịch vụ',
  message: 'Nhãn ô Thông tin hàng hoá',
  sending: 'Chữ lúc đang gửi',
  sentTitle: 'Tiêu đề báo đã nhận',
  sentBody: 'Nội dung báo đã nhận',
  sentClose: 'Chữ trên nút đóng',
  failed: 'Báo gửi thất bại',
  consent: 'Dòng đồng ý',
  consentLink: 'Chữ trên link chính sách',
  required: 'Báo lỗi: bỏ trống',
  invalidEmail: 'Báo lỗi: email sai',
  submit: 'Chữ trên nút gửi',
  success: 'Báo gửi thành công',
  error: 'Báo gửi thất bại',
};

/**
 * Vài ô mà tên ghép từ từng đoạn vẫn không nói lên điều gì.
 *
 * 'og.facts.0' ghép ra "Con số 1" — đúng chữ, nhưng người sửa vẫn không biết
 * con số đó rơi vào đâu. Ba ô đó thật ra là một HÀNG ở chân ảnh chia sẻ, nên
 * gọi theo chỗ đứng thì nhìn ảnh là biết ngay ô nào.
 *
 * Khoá ở đây là phần CÒN LẠI sau khi bỏ tiền tố mục.
 */
const DAC_BIET: Record<string, string> = {
  'facts.0': 'Số liệu ở chân ảnh — bên trái',
  'facts.1': 'Số liệu ở chân ảnh — ở giữa',
  'facts.2': 'Số liệu ở chân ảnh — bên phải',
  homeTitle: 'Tiêu đề lớn trên ảnh',
  homeAccent: 'Dòng nhấn màu cam dưới tiêu đề',
  // Ô của một văn phòng. Khoá đầy đủ vì 'phone', 'label' ở chỗ khác nghĩa khác
  // ('phone' trong biểu mẫu là NHÃN ô nhập, không phải số điện thoại).
  'site.offices.label': 'Nhóm',
  'site.offices.phone': 'Số điện thoại',
  'site.offices.email': 'Email',
  // Ô của một điều khoản. 'name' ở chỗ khác là tên người/tên mục, 'body' trần
  // thì không ai đoán ra là nội dung điều.
  'legal.privacy.sections.name': 'Tên điều',
  'legal.privacy.sections.body': 'Nội dung điều',
  'legal.privacy.sections.id': 'Mã neo (để trống trừ khi biết rõ)',
  'legal.terms.sections.group': 'Mở nhóm mới (để trống nếu nằm tiếp nhóm trên)',
  'legal.terms.sections.name': 'Tên điều',
  'legal.terms.sections.body': 'Nội dung điều',
};

/**
 * Chỉ số mảng đọc thành số thứ tự người thường hiểu: '0' -> 'mục 1'.
 *
 * `en` = đang sửa nội dung tiếng Anh. Bảng tiếng Anh thiếu đoạn nào thì rơi về
 * bảng tiếng Việt — xem fieldLabelsEn.ts.
 */
function doanDoc(d: string, en: boolean): string {
  if (/^\d+$/.test(d)) return `${en ? MUC_EN : 'mục'} ${Number(d) + 1}`;
  if (en) return DOAN_EN[d] ?? DOAN[d] ?? d;
  return DOAN[d] ?? d;
}

/**
 * Nhãn của một ô, bỏ phần tiền tố đã hiện ở tên mục.
 *
 * Ghép các đoạn bằng '›' thay vì dấu chấm: dấu chấm đọc ra như một khoá kỹ
 * thuật, mũi tên đọc ra như một đường đi.
 *
 * `locale` là ngôn ngữ của NỘI DUNG đang sửa, không phải ngôn ngữ giao diện
 * admin: bấm sang tab Tiếng Anh thì chữ trong ô, khung xem trước và nhãn quanh
 * chúng phải cùng một thứ tiếng, nếu không người sửa phải dịch ngược trong đầu
 * ở từng dòng.
 */
export function fieldLabel(
  keyPath: string,
  sectionPrefix: string,
  locale: string = 'vi-vn',
): string {
  const en = locale === 'en-us';
  const con_lai = keyPath.startsWith(`${sectionPrefix}.`)
    ? keyPath.slice(sectionPrefix.length + 1)
    : keyPath;
  const tra = (k: string): string | undefined =>
    en ? (DAC_BIET_EN[k] ?? DAC_BIET[k]) : DAC_BIET[k];
  // Khoá đầy đủ trước (ô văn phòng), rồi mới tới phần sau tiền tố khối.
  const dacBiet = tra(keyPath) ?? tra(con_lai);
  if (dacBiet) return dacBiet;

  const doan = con_lai.split('.').filter(Boolean);
  if (doan.length === 0) return keyPath;

  // Ô của một mục danh sách ('site.offices.1.phone') tra nhãn theo khoá bỏ chỉ
  // số ('site.offices.phone'), nếu không 'phone' rơi vào nhãn của biểu mẫu.
  const boChiSo = keyPath.replace(/\.\d+(?=\.)/g, '');
  const nhanCuoi = boChiSo !== keyPath ? tra(boChiSo) : undefined;

  const ra: string[] = [];
  for (let i = 0; i < doan.length; i += 1) {
    const d = doan[i];
    const ke = doan[i + 1];
    // Vòng lặp chạy trong biên nên `d` luôn có; kiểm một câu vẫn hơn khẳng định
    // bằng `!`, vì thân vòng lặp còn tự nhảy thêm `i += 1` ở vài nhánh.
    if (d === undefined) continue;
    // 'problems.0' đọc là 'Vấn đề 1' chứ không phải 'Vấn đề › mục 1'.
    if (ke !== undefined && /^\d+$/.test(ke)) {
      ra.push(`${doanDoc(d, en)} ${Number(ke) + 1}`);
      i += 1;
      continue;
    }
    ra.push(i === doan.length - 1 && nhanCuoi ? nhanCuoi : doanDoc(d, en));
  }
  return ra.join(' › ');
}
