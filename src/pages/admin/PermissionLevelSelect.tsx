import type { ReactNode } from 'react';
import { Box, ListItemIcon, ListItemText, MenuItem, Select, Stack, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  IconBan, IconCheck, IconChevronDown, IconChevronRight, IconEye, IconLock, IconPencil,
  IconShieldCheck,
} from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { brandColors } from '@/theme/palette';
import type { MucQuyen } from '@/services/permissionMatrixService';

/** Bốn bậc, xếp từ thấp lên cao — thứ tự trong danh sách chính là thứ hạng. */
const MUC: MucQuyen[] = ['none', 'view', 'edit', 'full'];

/* Mã màu viết thẳng, KHÔNG lấy theo chủ đề của app: chủ đề ở đây ngả ấm nên
   `info.main` ra gần như đen — nhìn không ra các mức. Màu chỉ là tín hiệu phụ:
   các mức còn khác nhau ở CHỮ và ở ICON, nên người không phân biệt được màu
   vẫn đọc được bảng. */
const KIEU: Record<MucQuyen, { mau: string; nen: string; icon: Icon }> = {
  none: { mau: '#8A9099', nen: 'transparent', icon: IconBan },
  view: { mau: '#0369A1', nen: '#E6F2FA', icon: IconEye },
  edit: { mau: '#6D28D9', nen: '#F1ECFD', icon: IconPencil },
  full: { mau: brandColors.success, nen: brandColors.successWash, icon: IconShieldCheck },
};

/** Đủ rộng cho nhãn dài nhất, và cố định để mũi tên các ô thẳng một hàng dọc. */
const RONG_O = 160;

/** Ô trống viền đứt để lùi ra sau: mắt chỉ nên dừng ở chỗ có quyền. */
const vienO = (muc: MucQuyen): string =>
  muc === 'none' ? `1px dashed ${brandColors.line}` : '1px solid transparent';

function NhanMuc({ muc }: { muc: MucQuyen }): ReactNode {
  const { t } = useTranslation();
  const IconMuc = KIEU[muc].icon;
  return (
    <>
      <IconMuc size={15} stroke={1.9} style={{ flexShrink: 0 }} />
      <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {t(`permissions.level.${muc}`)}
      </Box>
    </>
  );
}

export interface PermissionLevelSelectProps {
  value: MucQuyen;
  /** Đọc cho trình đọc màn hình: ô này là của vai trò nào, trang nào. */
  ariaLabel: string;
  /** Ô không đổi được — vẫn hiện mức, thay mũi tên bằng ổ khoá kèm lý do. */
  locked?: boolean;
  /** Đã sửa so với bản đang lưu, chưa bấm Áp dụng. */
  dirty?: boolean;
  onChange: (muc: MucQuyen) => void;
}

/**
 * Một ô trong ma trận phân quyền.
 *
 * Mỗi ô là một viên có nền theo mức và độ rộng cố định: liếc dọc một cột là
 * thấy ngay vai trò đó được những gì qua mảng màu, không phải đọc từng chữ.
 * Nghĩa của từng mức nằm ngay trong menu chọn, chỗ người ta cần nó lúc đổi,
 * thay vì một câu dài trên đầu trang mà chẳng ai đọc.
 */
export function PermissionLevelSelect({
  value,
  ariaLabel,
  locked = false,
  dirty = false,
  onChange,
}: PermissionLevelSelectProps): ReactNode {
  const { t } = useTranslation();
  const kieu = KIEU[value];

  const vien = {
    width: RONG_O,
    borderRadius: '8px',
    color: kieu.mau,
    bgcolor: kieu.nen,
    border: vienO(value),
    fontSize: 13,
    fontWeight: value === 'none' ? 500 : 600,
    lineHeight: 1.4,
    // Ô sửa dở được viền cam chứ không đổi nền: nền đang nói mức là gì.
    ...(dirty ? { outline: `2px solid ${brandColors.orange}`, outlineOffset: 1 } : {}),
  };

  if (locked) {
    return (
      <Tooltip title={t('permissions.lockedHint')}>
        <Stack
          direction="row"
          alignItems="center"
          sx={{ ...vien, display: 'inline-flex', gap: '5px', py: '5px', pl: '9px', pr: 1, cursor: 'default' }}
        >
          <NhanMuc muc={value} />
          <IconLock size={14} stroke={1.9} style={{ marginLeft: 'auto', opacity: 0.6, flexShrink: 0 }} />
        </Stack>
      </Tooltip>
    );
  }

  return (
    <Select
      variant="standard"
      disableUnderline
      value={value}
      onChange={(e) => onChange(e.target.value as MucQuyen)}
      renderValue={(v) => <NhanMuc muc={v} />}
      IconComponent={IconChevronDown}
      inputProps={{ 'aria-label': ariaLabel }}
      MenuProps={{
        anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
        transformOrigin: { vertical: 'top', horizontal: 'left' },
        slotProps: { paper: { sx: { mt: 0.5, minWidth: 260 } } },
      }}
      sx={{
        ...vien,
        transition: 'background-color .15s, box-shadow .15s',
        '& .MuiSelect-select': {
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          py: '5px',
          pl: '9px',
          pr: '24px !important',
          minHeight: 0,
          borderRadius: '8px',
        },
        '& .MuiSelect-select:focus': { bgcolor: 'transparent' },
        '& .MuiSelect-icon': {
          width: 15, height: 15, right: 7, top: 'calc(50% - 7.5px)', color: 'inherit', opacity: 0.55,
        },
        '&:hover': { bgcolor: value === 'none' ? 'action.hover' : alpha(kieu.mau, 0.16) },
        '&.Mui-focused': { boxShadow: `0 0 0 3px ${alpha(kieu.mau, 0.22)}` },
      }}
    >
      {MUC.map((m) => {
        const IconMuc = KIEU[m].icon;
        return (
          <MenuItem key={m} value={m} sx={{ py: 1, gap: 1.5 }}>
            <ListItemIcon sx={{ minWidth: 0, color: KIEU[m].mau }}>
              <IconMuc size={18} stroke={1.8} />
            </ListItemIcon>
            <ListItemText
              primary={t(`permissions.level.${m}`)}
              secondary={t(`permissions.levelHint.${m}`)}
              slotProps={{
                primary: { sx: { fontSize: 13.5, fontWeight: 600, color: KIEU[m].mau } },
                secondary: { sx: { fontSize: 12 } },
              }}
            />
            {m === value ? <IconCheck size={16} stroke={2} color={KIEU[m].mau} /> : null}
          </MenuItem>
        );
      })}
    </Select>
  );
}

/**
 * Chú giải bốn mức, xếp theo thứ bậc. Mũi tên giữa các mức nói điều câu mô tả
 * cũ phải nói bằng cả một câu: bậc sau bao hàm bậc trước.
 */
export function PermissionLevelLegend(): ReactNode {
  const { t } = useTranslation();
  return (
    <Stack direction="row" alignItems="center" flexWrap="wrap" useFlexGap spacing={0.75}>
      <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
        {t('permissions.legend')}
      </Typography>
      {MUC.map((m, i) => (
        <Stack key={m} direction="row" alignItems="center" spacing={0.75}>
          {i === 0 ? null : (
            <IconChevronRight size={13} stroke={2} color={brandColors.muted} aria-hidden />
          )}
          <Tooltip title={t(`permissions.levelHint.${m}`)}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.5}
              sx={{
                px: 1,
                py: '2px',
                borderRadius: '7px',
                fontSize: 12,
                fontWeight: 600,
                color: KIEU[m].mau,
                bgcolor: KIEU[m].nen,
                border: vienO(m),
              }}
            >
              <NhanMuc muc={m} />
            </Stack>
          </Tooltip>
        </Stack>
      ))}
    </Stack>
  );
}
