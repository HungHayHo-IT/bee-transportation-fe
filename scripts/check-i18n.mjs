/**
 * Chặn khoá dịch thiếu TRƯỚC khi build.
 *
 * Vì sao cần: `t('pricing.region.region')` mà thiếu khoá thì i18next không ném
 * lỗi — nó in NGUYÊN TÊN KHOÁ ra màn hình. TypeScript không thấy, eslint không
 * thấy, build vẫn xanh, và thứ duy nhất phát hiện ra là một người mở đúng màn
 * đó lên nhìn. Đã lên tới production một lần: màn Khu vực & tuyến hiện bốn ô
 * lọc mang tên "pricing.region.originProvince".
 *
 * Chạy trong `npm run build`, nên Vercel cũng chạy — đó là cửa cuối trước khi
 * ra production.
 *
 * Chỉ bắt được khoá viết thẳng bằng chuỗi: `t(dong ? 'a' : 'b')` thì đọc được
 * cả hai, còn `t(`x.${y}`)` thì không. Đổi lại là không có bản dựng nào khác
 * phải chạy, và phần lớn khoá trong mã nguồn là chuỗi thẳng.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const NGON_NGU = ['vi', 'en'];
/* Hậu tố số nhiều của i18next: tiếng Anh khai 'itemCount_one'/'itemCount_other'
   chứ không khai 'itemCount'. Coi là CÓ nếu tồn tại bất kỳ dạng nào. */
const HAU_TO = ['', '_zero', '_one', '_two', '_few', '_many', '_other'];

const doc = (p) => JSON.parse(readFileSync(p, 'utf8'));

function coKhoa(json, khoa) {
  return HAU_TO.some((h) => {
    const phan = (khoa + h).split('.');
    let cur = json;
    for (const p of phan) {
      if (typeof cur !== 'object' || cur === null || !(p in cur)) return false;
      cur = cur[p];
    }
    return typeof cur === 'string';
  });
}

function duyet(thuMuc, ra = []) {
  for (const ten of readdirSync(thuMuc)) {
    const p = join(thuMuc, ten);
    if (statSync(p).isDirectory()) duyet(p, ra);
    else if (/\.tsx?$/.test(p)) ra.push(p);
  }
  return ra;
}

const dung = new Map();
for (const p of duyet('src')) {
  const s = readFileSync(p, 'utf8');
  for (const m of s.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) {
    if (!dung.has(m[1])) dung.set(m[1], new Set());
    dung.get(m[1]).add(p);
  }
}

let hong = 0;
for (const ngu of NGON_NGU) {
  const json = doc(`src/locales/${ngu}.json`);
  const thieu = [...dung.keys()].filter((k) => !coKhoa(json, k)).sort();
  for (const k of thieu) {
    hong += 1;
    console.error(`[i18n] ${ngu}.json thiếu "${k}" — dùng ở ${[...dung.get(k)].join(', ')}`);
  }
}

if (hong > 0) {
  console.error(`\n[i18n] ${hong} khoá thiếu. Thêm vào src/locales/*.json rồi dựng lại.`);
  process.exit(1);
}
console.log(`[i18n] ${dung.size} khoá, đủ cả ${NGON_NGU.join(' + ')}.`);
