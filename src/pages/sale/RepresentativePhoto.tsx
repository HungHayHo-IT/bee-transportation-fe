import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Avatar, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useTranslation } from 'react-i18next';
import { uploadRepresentativePhoto } from '@/services/saleService';

/** Đúng danh sách backend ký URL cho — chặn sớm để khỏi đi một vòng mạng. */
const LOAI_ANH = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
/** 5MB: ảnh chân dung 400px không bao giờ chạm mức này, ảnh máy ảnh thì có. */
const TOI_DA_MB = 5;

export interface RepresentativePhotoProps {
  /** URL ảnh đang có, null = chưa có ảnh (vẽ chữ cái đầu tên). */
  url: string | null;
  initials: string;
  disabled: boolean;
  /** Chuỗi rỗng nghĩa là GỠ ảnh — cùng quy ước với API. */
  onChange: (url: string) => void | Promise<void>;
  onError: (message: string) => void;
}

/**
 * Nửa bên phải của thẻ người đại diện: ảnh, và hai nút thao tác với ảnh.
 *
 * Tự tải lên ngay khi chọn file chứ không chờ một nút Lưu: một màn có mười mấy
 * người mà mỗi người một nút Lưu thì không ai biết mình đã lưu ai. Cùng lối
 * với ô mô tả — lưu khi rời ô.
 */
export function RepresentativePhoto({
  url, initials, disabled, onChange, onError,
}: RepresentativePhotoProps): ReactNode {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [dangTai, setDangTai] = useState(false);

  const chon = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    if (!LOAI_ANH.includes(file.type)) {
      onError(t('sale.representatives.photoWrongType'));
      return;
    }
    if (file.size > TOI_DA_MB * 1024 * 1024) {
      onError(t('sale.representatives.photoTooBig', { mb: TOI_DA_MB }));
      return;
    }
    setDangTai(true);
    try {
      await onChange(await uploadRepresentativePhoto(file));
    } catch {
      onError(t('sale.representatives.photoFailed'));
    } finally {
      setDangTai(false);
      // Xoá giá trị input để chọn LẠI ĐÚNG file vừa rồi vẫn nổ sự kiện change.
      if (input.current) input.current.value = '';
    }
  };

  return (
    <Stack spacing={1} alignItems="center" sx={{ width: '100%' }}>
      <input
        ref={input}
        type="file"
        hidden
        accept={LOAI_ANH.join(',')}
        onChange={(e) => void chon(e.target.files?.[0])}
      />
      <Box sx={{ position: 'relative' }}>
        <Avatar
          src={url ?? undefined}
          variant="rounded"
          sx={{
            width: 112, height: 112, fontSize: 36, fontWeight: 700,
            bgcolor: 'primary.main', borderRadius: 2,
          }}
        >
          {initials}
        </Avatar>
        {/* Vòng quay đè LÊN ảnh cũ chứ không thay chỗ nó: ảnh biến mất một
            nhịp rồi hiện lại làm cả thẻ nhảy. */}
        {dangTai ? (
          <Box
            sx={{
              position: 'absolute', inset: 0, borderRadius: 2,
              bgcolor: 'rgba(0,0,0,.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <CircularProgress size={22} sx={{ color: '#fff' }} />
          </Box>
        ) : null}
      </Box>

      <Button
        size="small"
        startIcon={<PhotoCameraIcon />}
        disabled={disabled || dangTai}
        onClick={() => input.current?.click()}
        sx={{ textTransform: 'none' }}
      >
        {t(url ? 'sale.representatives.changePhoto' : 'sale.representatives.uploadPhoto')}
      </Button>

      {url ? (
        <Button
          size="small"
          color="inherit"
          startIcon={<DeleteOutlineIcon />}
          disabled={disabled || dangTai}
          onClick={() => void onChange('')}
          sx={{ textTransform: 'none' }}
        >
          {t('sale.representatives.removePhoto')}
        </Button>
      ) : (
        // Chỗ trống bằng đúng chiều cao nút "Gỡ ảnh" để thẻ có ảnh và thẻ chưa
        // có ảnh cao bằng nhau — không thì cả cột so le.
        <Typography variant="caption" color="text.disabled" sx={{ lineHeight: '30px' }}>
          {t('sale.representatives.noPhoto')}
        </Typography>
      )}
    </Stack>
  );
}
