import type { ReactNode } from 'react';
import { Box, ButtonBase } from '@mui/material';
import { IconPhoto } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { CmsImageSlot } from '@/services/cmsService';
import { CmsFieldLabel } from './cmsUi';
import { selectedSx } from './cmsStyles';

export interface CmsImageGridProps {
  slots: CmsImageSlot[];
  /** slot -> URL đang dùng. Vắng mặt nghĩa là đang dùng ảnh trong code. */
  values: Record<string, string>;
  /** Gốc địa chỉ landing, để dựng URL ảnh mặc định. */
  landingUrl: string;
  /** Mở hộp thay ảnh (CmsImageDialog) — tải ảnh lên nằm ở đó. */
  onOpen: (slot: string) => void;
  onReset: (slot: string) => void;
  /** Ô ảnh đang chọn trên khung xem trước. */
  selectedSlot?: string | null;
}

/**
 * Các ô ảnh của một khối — mỗi ô một dòng như bên btn-admin: ảnh thu nhỏ đang
 * dùng, tên ô (vị trí trên trang ở tooltip), chấm cam nếu đã thay, nút "Đổi ảnh".
 *
 * Ảnh thu nhỏ là chính URL đang dùng (S3 hoặc ảnh mặc định của landing), không
 * qua trình tối ưu: ảnh hỏng thì hỏng ngay ở đây chứ không đợi ra trang thật.
 */
export function CmsImageGrid({
  slots, values, landingUrl, onOpen, onReset, selectedSlot = null,
}: CmsImageGridProps): ReactNode {
  const { t } = useTranslation();
  return (
    <>
      {slots.map((s) => {
        const url = values[s.slot];
        return (
          <Box
            key={s.slot}
            data-field-key={`images.${s.slot}`}
            sx={[{ display: 'flex', alignItems: 'center', gap: 1.5, p: 0.75 }, selectedSx(selectedSlot === s.slot)]}
          >
            <ButtonBase
              onClick={() => onOpen(s.slot)}
              aria-label={t('cms.changeImage')}
              sx={{
                width: 64,
                height: 48,
                flexShrink: 0,
                overflow: 'hidden',
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'action.hover',
              }}
            >
              <Box
                component="img"
                src={url || `${landingUrl}${s.defaultUrl}`}
                alt=""
                loading="lazy"
                sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </ButtonBase>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <CmsFieldLabel
                label={s.label}
                title={s.usage}
                changed={!!url}
                onReset={() => onReset(s.slot)}
              />
              <ButtonBase
                onClick={() => onOpen(s.slot)}
                sx={{
                  gap: 0.5,
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'primary.main',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                <IconPhoto size={14} />
                {t('cms.changeImage')}
              </ButtonBase>
            </Box>
          </Box>
        );
      })}
    </>
  );
}
