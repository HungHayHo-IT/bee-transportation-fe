/**
 * Strips Vietnamese diacritics so "ha noi", "Ha Noi" and "Hà Nội" all find the
 * same row — nobody switches keyboard layout to search a list.
 */
export function foldDiacritics(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}
