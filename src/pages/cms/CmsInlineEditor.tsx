import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Button, ButtonBase, Paper, Stack, TextField, Typography } from '@mui/material';
import { CmsTonalButton } from './cmsUi';
import { IconArrowBackUp } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export interface AnchorRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface CmsInlineEditorProps {
  anchor: AnchorRect;
  /** Giới hạn đặt hộp — khung xem trước, để hộp không đè lên cột ô hay thanh công cụ. */
  bounds: AnchorRect;
  title: string;
  value: string;
  defaultValue: string;
  isNumber?: boolean;
  onChange: (value: string) => void;
  onReset: () => void;
  onClose: () => void;
}

const WIDTH = 416;
const GAP = 10;

/**
 * Chỗ điền `{year}` và thẻ định dạng `<b>…</b>` trong chữ. Sửa mất một cái là
 * trang hiện nguyên `{year}`, hoặc chữ in đậm biến mất.
 */
const markupTokensOf = (text: string): string[] =>
  [...text.matchAll(/\{\w+\}|<\/?\w+>/g)].map((m) => m[0]).sort();

/**
 * Hộp sửa nổi ngay dưới đoạn chữ vừa bấm trên khung xem trước.
 *
 * Nằm ở admin chứ không nằm trong iframe: khung bị thu nhỏ cho vừa chỗ (máy
 * tính 1440px còn ~60%), ô nhập đặt trong đó sẽ nhỏ theo và gần như không đọc
 * được. Gõ tới đâu bản nháp đổi tới đó, khung xem trước hiện ngay.
 */
export function CmsInlineEditor({
  anchor, bounds, title, value, defaultValue, isNumber = false, onChange, onReset, onClose,
}: CmsInlineEditorProps): ReactNode {
  const { t } = useTranslation();
  const hop = useRef<HTMLDivElement>(null);
  const [giaTriDau] = useState(value);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    setHeight(hop.current?.offsetHeight ?? 0);
  }, [value]);

  // Bấm ra ngoài là xong (giữ thay đổi) — giống thoát khỏi một ô nhập thường.
  // Bấm vào trang trong khung không phát pointerdown ở đây; cú đó sang dạng
  // cms-select và trang admin tự đổi ô.
  useEffect(() => {
    const ngoai = (e: PointerEvent): void => {
      if (!hop.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener('pointerdown', ngoai, true);
    return () => document.removeEventListener('pointerdown', ngoai, true);
  }, [onClose]);

  const huy = (): void => {
    onChange(giaTriDau);
    onClose();
  };

  const width = Math.min(WIDTH, bounds.width - GAP * 2);
  const left = Math.min(
    Math.max(anchor.left, bounds.left + GAP),
    bounds.left + bounds.width - width - GAP,
  );
  const duoi = bounds.top + bounds.height - (anchor.top + anchor.height);
  const datDuoi = duoi >= height + GAP || anchor.top - bounds.top < height + GAP;
  const top = datDuoi
    ? Math.min(anchor.top + anchor.height + GAP, bounds.top + bounds.height - height - GAP)
    : anchor.top - height - GAP;

  const can = markupTokensOf(defaultValue);
  const thieuToken = can.join() !== markupTokensOf(value).join();

  return (
    <Paper
      ref={hop}
      role="dialog"
      aria-label={title}
      elevation={8}
      sx={{
        position: 'fixed',
        zIndex: 1300,
        p: 1.5,
        borderRadius: 4,
        border: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
      style={{ left, top: Math.max(bounds.top + GAP, top), width }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="caption" fontWeight={600} color="text.secondary" noWrap sx={{ flex: 1 }}>
          {title}
        </Typography>
        {value !== defaultValue ? (
          <ButtonBase
            onClick={onReset}
            sx={{ gap: 0.5, fontSize: 12, fontWeight: 600, color: 'primary.main', '&:hover': { textDecoration: 'underline' } }}
          >
            <IconArrowBackUp size={14} />
            {t('cms.resetField')}
          </ButtonBase>
        ) : null}
      </Stack>
      <TextField
        autoFocus
        onFocus={(e) => e.target.select()}
        value={value}
        onChange={(e) =>
          onChange(isNumber ? e.target.value.replace(/[^0-9.-]/g, '') : e.target.value)
        }
        onKeyDown={(e) => {
          // Enter là xong; Shift+Enter giữ xuống dòng cho các chữ cần ngắt dòng.
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onClose();
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            huy();
          }
        }}
        fullWidth
        size="small"
        sx={{ '& .MuiInputBase-root': { fontSize: 14, lineHeight: 1.6 } }}
        multiline={!isNumber}
        maxRows={10}
        inputMode={isNumber ? 'numeric' : undefined}
        helperText={isNumber ? t('cms.numberOnly') : undefined}
        slotProps={{ htmlInput: { spellCheck: false } }}
      />
      {thieuToken ? (
        <Typography variant="caption" color="error">
          {t('cms.markupWarning', { tokens: can.join(' ') })}
        </Typography>
      ) : null}
      {value !== defaultValue ? (
        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
          {t('cms.defaultIs')}: {defaultValue}
        </Typography>
      ) : null}
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
        <Typography variant="caption" color="text.disabled" sx={{ mr: 'auto' }}>
          {t('cms.editorKeys')}
        </Typography>
        <CmsTonalButton onClick={huy}>{t('common.actions.cancel')}</CmsTonalButton>
        <Button size="small" variant="contained" onClick={onClose} sx={{ borderRadius: 999, height: 28, boxShadow: 'none' }}>
          {t('cms.editorDone')}
        </Button>
      </Stack>
    </Paper>
  );
}
