import { useState, type ReactNode } from 'react';
import { TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { CmsListShell } from './cmsUi';
import { compactInputSx } from './cmsStyles';

export interface CmsListEditorProps {
  /** Khoá của cả danh sách, ví dụ 'customs.scope'. */
  keyPath: string;
  label: string;
  /** Danh sách đang dùng, đã tính cả phần gõ dở. */
  items: string[];
  /** Danh sách mặc định trong mã nguồn, để biết đã đổi hay chưa. */
  fallback: string[];
  /** Gửi lên cả danh sách, đã mã hoá JSON. */
  onChange: (value: string) => void;
  onReset: () => void;
  /**
   * Ngôn ngữ của NỘI DUNG đang sửa.
   *
   * Nhãn của từng ô quanh đây đã theo ngôn ngữ nội dung, nên mấy chữ của
   * riêng màn này — "2 mục", "Thêm mục" — phải theo cùng, nếu không chỉ mình
   * chúng lạc ngôn ngữ giữa một cột toàn tiếng Anh.
   */
  lng?: string;
}

/**
 * Sửa cả một danh sách: thêm dòng, xoá dòng, đổi thứ tự.
 *
 * Vì sao gửi CẢ DANH SÁCH thay vì từng ô như mọi chỗ khác: ghi đè từng ô không
 * thêm và không đổi thứ tự được. Ô thứ 7 chưa tồn tại thì không có gì để ghi
 * đè, còn đổi chỗ hai ô bằng cách ghi đè là ghi lại nội dung của cả hai — lưu
 * xong nhìn dữ liệu sẽ không ai hiểu chuyện gì đã xảy ra.
 *
 * Dòng rỗng bị bỏ lúc lưu, nên xoá trắng một dòng cũng là một cách xoá nó.
 */
export function CmsListEditor({
  keyPath, label, items, fallback, onChange, onReset, lng,
}: CmsListEditorProps): ReactNode {
  const { t: tGoc } = useTranslation();
  const t = (key: string, opts?: Record<string, unknown>): string =>
    tGoc(key, { ...opts, ...(lng ? { lng } : {}) });
  /**
   * Dòng vừa thêm, giữ riêng cho tới khi người dùng gõ chữ vào.
   *
   * Không đẩy thẳng dòng rỗng vào bản nháp: nó sẽ bị luật "bỏ mục trống" dọn
   * đi ngay, và nút Thêm trông như bấm không ăn.
   */
  const [dongMoi, setDongMoi] = useState<number | null>(null);

  const gui = (ds: string[]): void => onChange(JSON.stringify(ds));

  const suaDong = (i: number, v: string): void => {
    const ds = [...items];
    if (i === items.length) ds.push(v);
    else ds[i] = v;
    setDongMoi(null);
    gui(ds);
  };

  const xoaDong = (i: number): void => gui(items.filter((_, j) => j !== i));

  const doiCho = (i: number, buoc: number): void => {
    const j = i + buoc;
    if (j < 0 || j >= items.length) return;
    const ds = [...items];
    /* Đọc ra biến rồi mới đổi chỗ, thay vì khẳng định "chắc chắn có" bằng `!`:
       `noUncheckedIndexedAccess` nói đúng — chỉ `j` được kiểm biên ở trên, còn
       `i` thì chưa. Thiếu một trong hai thì dừng, đừng ghi `undefined` vào mảng
       rồi để nó nổ ở chỗ khác. */
    const a = ds[i];
    const b = ds[j];
    if (a === undefined || b === undefined) return;
    ds[i] = b;
    ds[j] = a;
    gui(ds);
  };

  const hienThi = dongMoi === null ? items : [...items, ''];

  return (
    <CmsListShell
      label={label}
      changed={JSON.stringify(items) !== JSON.stringify(fallback)}
      onReset={onReset}
      onAdd={() => setDongMoi(items.length)}
      t={t}
      items={hienThi.map((gt, i) => ({
        key: `${keyPath}-${i}`,
        onUp: i > 0 && i < items.length ? () => doiCho(i, -1) : undefined,
        onDown: i < items.length - 1 ? () => doiCho(i, 1) : undefined,
        onRemove: () => (i >= items.length ? setDongMoi(null) : xoaDong(i)),
        content: (
          <TextField
            value={gt}
            onChange={(e) => suaDong(i, e.target.value)}
            fullWidth
            size="small"
            multiline
            autoFocus={dongMoi !== null && i === items.length}
            placeholder={t('cms.newItemPlaceholder')}
            sx={compactInputSx}
          />
        ),
      }))}
    />
  );
}
