import type { ReactNode } from 'react';
import { Box, ButtonBase, IconButton, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { SxProps, Theme } from '@mui/material/styles';
import { IconArrowBackUp, IconArrowDown, IconArrowUp, IconPlus, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

/**
 * Mảnh giao diện dùng chung của màn CMS, chép theo màn "Nội dung landing" bên
 * btn-admin: nút icon tròn 28px, nhãn ô nhỏ có chấm cam khi khác bản gốc, nút
 * viên, khung chọn ô. Một chỗ định nghĩa để các ô, danh sách và ảnh trông như
 * một hệ.
 */

export function CmsIconTool({
  label, onClick, disabled = false, children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}): ReactNode {
  return (
    <Tooltip title={label}>
      <span>
        <IconButton
          aria-label={label}
          onClick={onClick}
          disabled={disabled}
          sx={{
            width: 28,
            height: 28,
            color: 'text.secondary',
            '&:hover': { color: 'primary.main', bgcolor: (th) => alpha(th.palette.primary.main, 0.08) },
            '&.Mui-disabled': { opacity: 0.3 },
          }}
        >
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );
}

/** Dòng nhãn của một ô: tên ô, chấm cam nếu khác bản gốc, nút về bản gốc. */
export function CmsFieldLabel({
  label, prefix, changed, onReset, title,
}: {
  label: string;
  /** Tên khối đứng trước nhãn — dùng ở kết quả tìm kiếm. */
  prefix?: string;
  changed: boolean;
  /** Không truyền = không có nút (ô nằm trong danh sách khôi phục theo cả danh sách). */
  onReset?: () => void;
  /** Mã khoá, hiện ở tooltip cho lúc cần dò. */
  title?: string;
}): ReactNode {
  const { t } = useTranslation();
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minHeight: 28 }}>
      <Tooltip title={title ?? ''} placement="top-start">
        <Typography
          component="span"
          sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: 1, minWidth: 0, fontSize: 12, color: 'text.secondary' }}
        >
          {prefix ? (
            <Box component="span" sx={{ fontWeight: 600, color: 'text.primary', flexShrink: 0 }}>
              {prefix} ›
            </Box>
          ) : null}
          <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {label}
          </Box>
          {changed ? (
            <Box
              component="span"
              title={t('cms.changed')}
              sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0 }}
            />
          ) : null}
        </Typography>
      </Tooltip>
      {changed && onReset ? (
        <CmsIconTool label={t('cms.resetField')} onClick={onReset}>
          <IconArrowBackUp size={15} />
        </CmsIconTool>
      ) : null}
    </Box>
  );
}

/** Nút viên nền nhạt — "tonal" bên btn. */
export function CmsTonalButton({
  onClick, children, disabled = false, sx,
}: {
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  sx?: SxProps<Theme>;
}): ReactNode {
  return (
    <ButtonBase
      onClick={onClick}
      disabled={disabled}
      sx={[
        {
          gap: 0.5,
          height: 28,
          px: 1.5,
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 600,
          color: 'primary.main',
          bgcolor: (th) => alpha(th.palette.primary.main, 0.1),
          '&:hover': { bgcolor: (th) => alpha(th.palette.primary.main, 0.16) },
          '&.Mui-disabled': { opacity: 0.4 },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </ButtonBase>
  );
}

export interface CmsListItem {
  key: string;
  content: ReactNode;
  onUp?: () => void;
  onDown?: () => void;
  onRemove: () => void;
}

/**
 * Khung một danh sách thêm/bớt được — `ListEditor` bên btn: viền nét đứt màu
 * thương hiệu, mỗi mục một thẻ "#n" có nút lên/xuống/xoá, nút viên Thêm mục.
 */
export function CmsListShell({
  label, changed, onReset, onAdd, items, t,
}: {
  label: string;
  changed: boolean;
  onReset: () => void;
  onAdd: () => void;
  items: CmsListItem[];
  /** Dịch theo ngôn ngữ NỘI DUNG — xem `lng` ở CmsListEditor. */
  t: (key: string, opts?: Record<string, unknown>) => string;
}): ReactNode {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        p: 1.25,
        borderRadius: 2,
        border: '1px dashed',
        borderColor: (th) => alpha(th.palette.primary.main, 0.3),
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography sx={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 600, color: 'text.secondary' }} noWrap>
          {label} · {t('cms.itemCount', { count: items.length })}
        </Typography>
        {changed ? (
          <CmsTonalButton onClick={onReset}>
            <IconArrowBackUp size={15} />
            {t('cms.resetList')}
          </CmsTonalButton>
        ) : null}
      </Box>

      {items.map((it, i) => (
        <Box
          key={it.key}
          sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 1, borderRadius: 1.5, bgcolor: 'action.hover' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
            <Typography sx={{ flex: 1, fontSize: 12, fontWeight: 600 }}>#{i + 1}</Typography>
            <CmsIconTool label={t('cms.moveUp')} disabled={!it.onUp} onClick={() => it.onUp?.()}>
              <IconArrowUp size={16} />
            </CmsIconTool>
            <CmsIconTool label={t('cms.moveDown')} disabled={!it.onDown} onClick={() => it.onDown?.()}>
              <IconArrowDown size={16} />
            </CmsIconTool>
            <CmsIconTool label={t('cms.removeItem')} onClick={it.onRemove}>
              <IconTrash size={16} />
            </CmsIconTool>
          </Box>
          {it.content}
        </Box>
      ))}

      <CmsTonalButton onClick={onAdd} sx={{ alignSelf: 'flex-start' }}>
        <IconPlus size={14} />
        {t('cms.addItem')}
      </CmsTonalButton>
    </Box>
  );
}

/** Cụm nút chọn dạng viên — Ngôn ngữ và Thiết bị bên btn (`SegmentedButton`). */
export function CmsSegmented<T extends string>({
  label, value, options, onChange, disabled = false,
}: {
  label: string;
  value: T;
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}): ReactNode {
  return (
    <Box
      role="radiogroup"
      aria-label={label}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        p: '2px',
        borderRadius: 999,
        bgcolor: 'grey.100',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Tooltip key={o.value} title={o.title ?? ''}>
            <ButtonBase
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(o.value)}
              sx={{
                height: 32,
                px: 1.5,
                gap: 0.75,
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                color: active ? 'primary.main' : 'text.secondary',
                bgcolor: active ? 'background.paper' : 'transparent',
                boxShadow: active ? '0 1px 2px rgba(0,0,0,.12), 0 1px 3px rgba(0,0,0,.08)' : 'none',
                transition: 'color .15s, background-color .15s',
                '&:hover': { color: active ? 'primary.main' : 'text.primary' },
              }}
            >
              {o.label}
            </ButtonBase>
          </Tooltip>
        );
      })}
    </Box>
  );
}
