import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { railColors } from '@/theme';
import logoUrl from '@/assets/logo.svg';

export interface LogoProps {
  isExpanded: boolean;
}

/**
 * Logo đầy đủ bản cho nền tối: đầu xe TRẮNG, chữ BEE / TRANSPORTATION CORP cam,
 * dòng "Connecting Everywhere" trắng — đọc rõ trên rail #1E232B. Bản logo-full.png
 * (đầu xe xám đen) vẫn dùng ở trang đăng nhập nền sáng.
 *
 * Khoá chiều cao, tỉ lệ gốc 174×85 (~2,05:1): 52px khi mở rộng (~106px ngang),
 * còn khi rail thu gọn 80px thì co về 30px (~61px) cho khỏi chạm mép.
 */
export function Logo({ isExpanded }: LogoProps): ReactNode {
  const { t } = useTranslation();

  return (
    <Box
      component={Link}
      /* Về '/' chứ không về Bảng điều khiển: TrangMacDinh chọn trang theo ma
         trận, nên vai trò nào bấm logo cũng tới một trang mở được. Trỏ cứng
         vào Bảng điều khiển thì đối tác bấm logo là ra "không tìm thấy". */
      to="/"
      aria-label={t('app.name')}
      sx={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textDecoration: 'none',
        borderBottom: `1px solid ${railColors.border}`,
      }}
    >
      <Box
        component="img"
        src={logoUrl}
        alt={t('app.name')}
        sx={{
          height: isExpanded ? 52 : 30,
          width: 'auto',
          display: 'block',
          objectFit: 'contain',
          transition: 'height 150ms',
        }}
      />
    </Box>
  );
}
