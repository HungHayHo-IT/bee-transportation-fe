import { alpha } from '@mui/material/styles';
import type { SxProps, Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';

/** Khung tô ô đang chọn trên trang — giống `ring-2 ring-brand/40` bên btn. */
export const selectedSx = (selected: boolean): SystemStyleObject<Theme> =>
  selected
    ? {
        borderRadius: 2,
        p: 0.75,
        bgcolor: (th) => alpha(th.palette.primary.main, 0.06),
        boxShadow: (th) => `0 0 0 2px ${alpha(th.palette.primary.main, 0.4)}`,
      }
    : { borderRadius: 2 };

/** Ô nhập chữ nhỏ gọn trong cột ô — Textarea 13px bên btn. */
export const compactInputSx: SxProps<Theme> = {
  '& .MuiInputBase-root': { fontSize: 13, lineHeight: 1.5, py: 0.75, px: 1.25, bgcolor: 'background.paper' },
  '& .MuiInputBase-input': { p: 0 },
};

/** Ô chọn bo viên, cao 36px — Select `rounded-full h-9` bên btn. */
export const pillSelectSx: SystemStyleObject<Theme> = {
  '& .MuiOutlinedInput-root': { borderRadius: 999, height: 36, fontSize: 13, fontWeight: 600 },
  '& .MuiSelect-select': { py: 0, pl: 2 },
};

/** Nút viên ở đầu trang — Button `shape="pill"` bên btn. */
export const pillButtonSx: SystemStyleObject<Theme> = { borderRadius: 999, height: 40, px: 2.5, boxShadow: 'none' };
