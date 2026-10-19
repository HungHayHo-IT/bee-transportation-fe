import type { ReactNode } from 'react';
import { Alert, Box, Chip, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

export interface CmsMetaPreviewProps {
  kind: 'seo' | 'share';
  /** Giá trị đang dùng của một ô, đã tính cả phần gõ dở. */
  giaTri: (keyPath: string) => string;
  /** Mọi khoá của mục đang mở. */
  keys: string[];
  onChange: (keyPath: string, value: string) => void;
  landingUrl: string;
  locale: string;
  /** Đổi sau mỗi lần lưu, để lấy lại tấm ảnh chia sẻ thay vì dùng bản cache. */
  reloadKey: number;
}

/**
 * Xem trước VÀ sửa, cho hai mục không hiện ở đâu trên trang.
 *
 * Thẻ SEO nằm trong <title> và <meta>; chữ thẻ chia sẻ được vẽ LÊN MỘT TẤM ẢNH
 * do máy chủ sinh ra. Nhúng trang thật vào đây chỉ ra một màn đen — chế độ sửa
 * giấu hết mọi vùng vì không vùng nào thuộc hai mục này.
 *
 * Nên chỗ này dựng lại thứ người đọc sẽ thấy (mẩu kết quả Google, tấm ảnh chia
 * sẻ) và đặt ô nhập NGAY DƯỚI mỗi thứ. Ô nhập nằm cùng chỗ với bản xem là điều
 * làm hai mục này dễ hình dung: gõ một chữ, thấy ngay nó rơi vào đâu.
 */

/** Google cắt tiêu đề quanh mốc này, và mô tả quanh mốc kia. */
const DAI_TIEU_DE = 60;
const DAI_MO_TA = 155;

function Dem({ n, toiDa }: { n: number; toiDa: number }): ReactNode {
  // Quá dài thì Google cắt giữa chừng bằng dấu ba chấm. Không phải lỗi, nên
  // chỉ nhắc bằng màu chứ không chặn gõ.
  const qua = n > toiDa;
  return (
    <Chip
      size="small"
      variant="outlined"
      color={qua ? 'warning' : 'default'}
      label={`${n}/${toiDa}`}
      sx={{ height: 20, '& .MuiChip-label': { px: 0.75, fontSize: 11 } }}
    />
  );
}

export function CmsMetaPreview({
  kind, giaTri, keys, onChange, landingUrl, locale, reloadKey,
}: CmsMetaPreviewProps): ReactNode {
  const { t } = useTranslation();
  const host = (() => {
    try {
      return new URL(landingUrl).host;
    } catch {
      return landingUrl;
    }
  })();

  if (kind === 'share') {
    const oChu = keys.filter((k) => k.startsWith('og.'));
    return (
      <Box sx={{ height: '100%', overflow: 'auto' }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('cms.sharePreviewNote')}
        </Alert>
        <Box
          sx={{
            maxWidth: 560,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            overflow: 'hidden',
            bgcolor: 'background.paper',
            mb: 3,
          }}
        >
          {/* Chính tấm ảnh máy chủ vẽ — không phải bản dựng lại. Dựng lại thì
              nó sẽ lệch với bản thật ngay lần đầu ai đó sửa cách vẽ. */}
          <Box
            component="img"
            src={`${landingUrl}/${locale}/opengraph-image?v=${reloadKey}`}
            alt=""
            sx={{ width: '100%', display: 'block', aspectRatio: '1200 / 630', objectFit: 'cover' }}
          />
          <Box sx={{ p: 1.5, bgcolor: 'action.hover' }}>
            <Typography variant="caption" color="text.secondary" display="block">
              {host}
            </Typography>
            <Typography variant="body2" fontWeight={600} noWrap>
              {giaTri('meta.home.title')}
            </Typography>
          </Box>
        </Box>

        <Stack spacing={2} sx={{ maxWidth: 560 }}>
          {oChu.map((k) => (
            <TextField
              key={k}
              size="small"
              fullWidth
              label={t(`cms.ogLabel.${k.split('.').slice(1).join('.')}`, {
                defaultValue: k.slice('og.'.length),
              })}
              value={giaTri(k)}
              onChange={(e) => onChange(k, e.target.value)}
            />
          ))}
        </Stack>
      </Box>
    );
  }

  /**
   * Mỗi trang một mẩu kết quả. Gom theo 'meta.<trang>' — title và description
   * của cùng một trang phải đứng cạnh nhau, vì người lướt trang kết quả đọc
   * chúng cùng lúc.
   */
  const theoTrang = new Map<string, { title?: string; desc?: string }>();
  for (const k of keys) {
    const doan = k.split('.');
    // Tách ra biến rồi kiểm, thay vì khẳng định bằng `!`: khoá là chuỗi tự do
    // nên trình biên dịch nói đúng khi bảo hai mảnh giữa có thể không có.
    const [nhom, trang, truong] = doan;
    if (doan.length !== 3 || nhom !== 'meta' || trang === undefined) continue;
    const o = theoTrang.get(trang) ?? {};
    if (truong === 'title') o.title = k;
    if (truong === 'description') o.desc = k;
    theoTrang.set(trang, o);
  }

  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      <Alert severity="info" sx={{ mb: 2 }}>
        {t('cms.seoPreviewNote')}
      </Alert>
      <Stack spacing={3} sx={{ maxWidth: 620 }}>
        {[...theoTrang].map(([trang, o]) => {
          /* Rút khoá ra hằng số cục bộ: `o.title` là thuộc tính của một đối
             tượng thay đổi được, nên trình biên dịch không thu hẹp kiểu nó bên
             trong callback của onChange — và `!` ở đó chỉ là bịt miệng. */
          const khoaTitle = o.title;
          const khoaDesc = o.desc;
          const title = khoaTitle ? giaTri(khoaTitle) : '';
          const desc = khoaDesc ? giaTri(khoaDesc) : '';
          return (
            <Box
              key={trang}
              sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 2.5 }}
            >
              {/* Bản xem: đúng màu và cỡ chữ Google dùng, nên người sửa nhìn ra
                  ngay câu nào bị cắt vì quá dài. */}
              <Typography variant="caption" color="text.secondary" display="block">
                {host} › {locale} › {trang}
              </Typography>
              <Typography
                sx={{
                  color: '#1a0dab',
                  fontSize: 20,
                  lineHeight: 1.3,
                  mt: 0.25,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {title || '—'}
              </Typography>
              <Typography
                sx={{
                  color: 'text.secondary',
                  fontSize: 14,
                  lineHeight: 1.58,
                  mt: 0.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {desc || '—'}
              </Typography>

              {/* Ô nhập ngay dưới bản xem. */}
              <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                {khoaTitle ? (
                  <Stack direction="row" spacing={1} alignItems="flex-start">
                    <TextField
                      size="small"
                      fullWidth
                      label={t('cms.metaTitle')}
                      value={title}
                      onChange={(e) => onChange(khoaTitle, e.target.value)}
                    />
                    <Box sx={{ pt: 1 }}>
                      <Dem n={title.length} toiDa={DAI_TIEU_DE} />
                    </Box>
                  </Stack>
                ) : null}
                {khoaDesc ? (
                  <Stack direction="row" spacing={1} alignItems="flex-start">
                    <TextField
                      size="small"
                      fullWidth
                      multiline
                      minRows={2}
                      label={t('cms.metaDescription')}
                      value={desc}
                      onChange={(e) => onChange(khoaDesc, e.target.value)}
                    />
                    <Box sx={{ pt: 1 }}>
                      <Dem n={desc.length} toiDa={DAI_MO_TA} />
                    </Box>
                  </Stack>
                ) : null}
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
