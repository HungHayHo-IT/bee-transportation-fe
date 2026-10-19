/**
 * A text field holds a string; the API wants real text or nothing at all. An
 * empty field means "not provided" and must never reach the API as `""`.
 * Numbers do not need a counterpart: `NumberField` already answers with
 * `number | null`.
 */
export function toOptionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}


/**
 * Ô chọn giữ id dưới dạng chuỗi; API muốn một con số hoặc không gì cả.
 *
 * Phải có hàm riêng chứ không dùng `Number(value)`: `Number('')` ra **0**, mà
 * 0 không phải id của bản ghi nào — gửi lên là backend đi tìm một địa điểm
 * không tồn tại và trả lỗi khoá ngoại, trong khi người dùng chỉ đơn giản là
 * không chọn gì.
 */
export function soHoacBoQua(value: string): number | undefined {
  const t = value.trim();
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}
