import { useState, type ReactNode } from 'react';
import { Box, FormControlLabel, Stack, Switch, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { CmsListShell } from './cmsUi';
import { compactInputSx } from './cmsStyles';

export type MucDoiTuong = Record<string, string>;

export interface CmsObjectListEditorProps {
  /** Khoá của cả danh sách, ví dụ 'site.offices'. */
  keyPath: string;
  label: string;
  /** Các ô của MỘT mục, đúng thứ tự hiện ra. */
  fields: readonly string[];
  /**
   * Ô nào vẽ thành CÔNG TẮC thay vì ô gõ chữ.
   *
   * Trong dữ liệu vẫn là chuỗi ('1' = bật, rỗng = tắt) vì cả cơ chế lớp phủ
   * chỉ biết chuỗi — chỉ cách hiện ra là khác.
   */
  toggles?: readonly string[];
  /** Nhãn đọc được của từng ô. */
  fieldLabel: (field: string) => string;
  items: MucDoiTuong[];
  /** Bản mặc định trong mã nguồn, để biết đã thêm hay bớt bao nhiêu. */
  fallback: MucDoiTuong[];
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
 * Sửa một danh sách mà mỗi mục gồm NHIỀU ô — văn phòng công ty chẳng hạn.
 *
 * Tách khỏi CmsListEditor thay vì nhồi thêm nhánh vào đó: ở kia một dòng là
 * một ô nhập, luật xoá và luật dòng-mới đều dựa vào điều đó. Gộp lại thì mỗi
 * chỗ phải rẽ hai nhánh, và cả hai kiểu danh sách cùng khó đọc.
 *
 * Mục mới tạo ra với đầy đủ ô rỗng — đúng hình dạng mà landing đòi; thiếu một
 * ô là cả danh sách bị từ chối và rơi về bản trong mã nguồn, im lặng.
 */
export function CmsObjectListEditor({
  keyPath, label, fields, toggles = [], fieldLabel, items, fallback, onChange, onReset, lng,
}: CmsObjectListEditorProps): ReactNode {
  const { t: tGoc } = useTranslation();
  const t = (key: string, opts?: Record<string, unknown>): string =>
    tGoc(key, { ...opts, ...(lng ? { lng } : {}) });
  /**
   * Mục vừa thêm, giữ riêng cho tới khi người dùng gõ chữ vào.
   *
   * Không đẩy thẳng một mục rỗng vào bản nháp: luật "bỏ mục trống" sẽ dọn nó
   * đi ngay, và nút Thêm trông như bấm không ăn.
   */
  const [dangThem, setDangThem] = useState(false);

  const gui = (ds: MucDoiTuong[]): void => onChange(JSON.stringify(ds));

  const mucRong = (): MucDoiTuong =>
    Object.fromEntries(fields.map((f) => [f, '']));

  const suaO = (i: number, field: string, v: string): void => {
    const ds = i === items.length ? [...items, mucRong()] : [...items];
    // Chỉ số lạ thì dựng một mục rỗng, thay vì khẳng định bằng `!` rồi trải
    // `undefined` ra thành một đối tượng không có trường nào.
    ds[i] = { ...(ds[i] ?? mucRong()), [field]: v };
    setDangThem(false);
    gui(ds);
  };

  const xoaMuc = (i: number): void => gui(items.filter((_, j) => j !== i));

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

  const hienThi = dangThem ? [...items, mucRong()] : items;

  return (
    <CmsListShell
      label={label}
      changed={JSON.stringify(items) !== JSON.stringify(fallback)}
      onReset={onReset}
      onAdd={() => setDangThem(true)}
      t={t}
      items={hienThi.map((muc, i) => ({
        key: `${keyPath}-${i}`,
        onUp: i > 0 && i < items.length ? () => doiCho(i, -1) : undefined,
        onDown: i < items.length - 1 ? () => doiCho(i, 1) : undefined,
        onRemove: () => (i >= items.length ? setDangThem(false) : xoaMuc(i)),
        content: (
              <Stack spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
                {fields.map((f) =>
                  toggles.includes(f) ? (
                    /* Ô công tắc lưu '1' = ẩn (xem OBJECT_LISTS bên landing).
                       Công tắc BẬT = đang hiển thị — bật để ẩn là ngược với
                       mọi công tắc người dùng từng thấy. */
                    <FormControlLabel
                      key={f}
                      sx={{ ml: 0, gap: 1 }}
                      control={
                        <Switch
                          size="small"
                          checked={muc[f] !== '1'}
                          onChange={(e) => suaO(i, f, e.target.checked ? '' : '1')}
                        />
                      }
                      label={<Typography sx={{ fontSize: 13 }}>{t('cms.toggleShown')}</Typography>}
                    />
                  ) : (
                    <Box key={f} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {/* Nhãn nằm TRÊN ô, như btn — nhãn nổi của MUI đè lên ô phía trên. */}
                      <Typography component="label" sx={{ fontSize: 12, color: 'text.secondary' }}>
                        {fieldLabel(f)}
                      </Typography>
                      <TextField
                        value={muc[f] ?? ''}
                        onChange={(e) => suaO(i, f, e.target.value)}
                        fullWidth
                        size="small"
                        sx={compactInputSx}
                        slotProps={{ htmlInput: { 'aria-label': fieldLabel(f) } }}
                        autoFocus={dangThem && i === items.length && f === fields[0]}
                      />
                    </Box>
                  ),
                )}
              </Stack>
        ),
      }))}
    />
  );
}
