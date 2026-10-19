/**
 * Đoán đường dẫn từ tên dịch vụ — cùng luật với backend.
 *
 * Có ở cả hai nơi là CỐ Ý, và không phải hai nguồn sự thật: bản ở đây chỉ để
 * ô đường dẫn tự điền trong lúc người dùng còn đang gõ tên, còn bản dưới
 * backend là thứ quyết định khoá thật. Người dùng vẫn sửa được ô đường dẫn
 * trước khi lưu, nên hai bên lệch nhau cũng không sinh ra dữ liệu sai.
 */

const DAU: Record<string, string> = {
  a: 'àáạảãâầấậẩẫăằắặẳẵ',
  e: 'èéẹẻẽêềếệểễ',
  i: 'ìíịỉĩ',
  o: 'òóọỏõôồốộổỗơờớợởỡ',
  u: 'ùúụủũưừứựửữ',
  y: 'ỳýỵỷỹ',
  d: 'đ',
};

function boDau(ch: string): string {
  const thuong = ch.toLowerCase();
  for (const [goc, coDau] of Object.entries(DAU)) {
    if (coDau.includes(thuong)) return goc;
  }
  return thuong;
}

export function slugTuTen(ten: string): string {
  return [...ten.trim()]
    .map(boDau)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Hình dạng đường dẫn hợp lệ — khớp đúng ràng buộc của backend. */
export const SLUG_HOP_LE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
