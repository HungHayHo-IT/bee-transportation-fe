import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { NoiDungDichVu } from './noiDungDichVu';

/* Màu của chính trang landing, không phải màu của màn quản trị: đây là bản xem
   trước trang công khai, tô theo giao diện admin thì nó nói dối về thứ người
   đọc sẽ thấy. */
const NEN = '#1c1c1c';
const NEN_2 = 'rgba(255,255,255,.045)';
const CAM = '#f26a1b';
const CHU = '#e9edf3';
const CHU_2 = '#9aa5b4';
const VACH = 'rgba(255,255,255,.12)';

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <Typography
      sx={{
        color: CAM, fontSize: 10.5, fontWeight: 700,
        letterSpacing: '.18em', textTransform: 'uppercase', mb: 0.75,
      }}
    >
      {children}
    </Typography>
  );
}

/** Chữ đang gõ, hoặc chữ mồi mờ đi — để khối không bao giờ trống trơn. */
function Chu({
  v, moi, size = 12.5, bold = false, mau = CHU,
}: { v: string; moi: string; size?: number; bold?: boolean; mau?: string }) {
  const rong = !v.trim();
  return (
    <Typography
      sx={{
        fontSize: size, fontWeight: bold ? 700 : 400, lineHeight: 1.5,
        color: rong ? CHU_2 : mau, opacity: rong ? 0.55 : 1,
        fontStyle: rong ? 'italic' : 'normal',
        overflowWrap: 'anywhere',
      }}
    >
      {rong ? moi : v}
    </Typography>
  );
}

export interface CmsServicePreviewProps {
  nd: NoiDungDichVu;
}

/**
 * Trang dịch vụ sẽ hiện ra như thế nào — dựng lại theo đúng thứ tự khối của
 * trang thật, thu nhỏ lại.
 *
 * Vì sao không nhúng khung xem trước thật: trang chưa tồn tại, chưa có địa chỉ
 * để mở. Bản vẽ này chạy theo từng phím gõ, nên người viết thấy ngay chữ của
 * mình rơi vào đâu — thứ một khung nhúng cũng không làm được trước khi bấm Lưu.
 */
export function CmsServicePreview({ nd }: CmsServicePreviewProps): ReactNode {
  const { t } = useTranslation();
  const m = (k: string): string => t(`cms.addService.preview.${k}`);

  return (
    <Box sx={{ bgcolor: NEN, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: VACH }}>
      {/* Thanh địa chỉ giả: chỗ duy nhất nói cho người dùng biết trang sẽ nằm
          ở đâu, và nó đổi theo ô đường dẫn. */}
      <Box sx={{ px: 1.5, py: 0.75, bgcolor: 'rgba(255,255,255,.06)', borderBottom: '1px solid', borderColor: VACH }}>
        <Typography sx={{ color: CHU_2, fontSize: 11, fontFamily: 'monospace' }} noWrap>
          beetransportation.vn/dich-vu/{nd.slugVi || '…'}
        </Typography>
      </Box>

      <Stack sx={{ p: 2 }} spacing={2.25}>
        {/* Đầu trang */}
        <Box>
          {/* Ảnh vẽ ngay trên tên: trên trang thật nó chiếm nửa khối "vấn đề"
              và cả mặt thẻ ở trang chủ, nên không có nó thì bản xem trước đang
              nói dối về sức nặng của tấm ảnh. */}
          {nd.anhUrl ? (
            <Box
              component="img"
              src={nd.anhUrl}
              alt=""
              sx={{
                width: '100%', height: 96, objectFit: 'cover',
                borderRadius: 1.5, display: 'block', mb: 1,
              }}
            />
          ) : null}
          <Eyebrow>{m('service')}</Eyebrow>
          <Chu v={nd.ten} moi={m('namePlaceholder')} size={19} bold />
          <Box sx={{ mt: 0.75 }}>
            <Chu v={nd.intro} moi={m('introPlaceholder')} mau={CHU_2} />
          </Box>
        </Box>

        {/* Thẻ trên trang chủ: tóm tắt một dòng KHÔNG nằm trên trang chi tiết,
            nên vẽ riêng ra một thẻ — không thì người dùng gõ vào một ô mà
            chẳng thấy nó hiện ở đâu. */}
        <Box sx={{ border: '1px solid', borderColor: VACH, borderRadius: 1.5, p: 1.25, bgcolor: NEN_2 }}>
          <Typography sx={{ color: CHU_2, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', mb: 0.5 }}>
            {m('card')}
          </Typography>
          <Chu v={nd.ten} moi={m('namePlaceholder')} size={13.5} bold mau={CAM} />
          <Chu v={nd.body} moi={m('bodyPlaceholder')} size={12} mau={CHU_2} />
        </Box>

        {(['problems', 'approach', 'usps'] as const).map((khoi) => (
          <Box key={khoi}>
            <Eyebrow>{m(`${khoi}Heading`)}</Eyebrow>
            <Stack spacing={1}>
              {nd[khoi].map((muc, i) => (
                <Box key={i} sx={{ borderLeft: '2px solid', borderColor: CAM, pl: 1.25 }}>
                  <Chu v={muc.name} moi={`${m(`${khoi}Item`)} ${i + 1}`} size={13} bold />
                  <Chu v={muc.body} moi={m('bodyShort')} size={12} mau={CHU_2} />
                </Box>
              ))}
            </Stack>
          </Box>
        ))}

        <Box>
          <Eyebrow>{m('scopeHeading')}</Eyebrow>
          <Stack spacing={0.5}>
            {nd.points.map((p, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 0.75, alignItems: 'baseline' }}>
                <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: CAM, flexShrink: 0 }} />
                <Chu v={p} moi={`${m('scopeItem')} ${i + 1}`} size={12.5} mau={CHU_2} />
              </Box>
            ))}
          </Stack>
        </Box>

        <Box>
          <Eyebrow>{m('faqHeading')}</Eyebrow>
          <Stack spacing={1}>
            {nd.faqs.map((f, i) => (
              <Box key={i} sx={{ borderTop: '1px solid', borderColor: VACH, pt: 0.75 }}>
                <Chu v={f.q} moi={`${m('faqItem')} ${i + 1}`} size={12.5} bold />
                <Chu v={f.a} moi={m('bodyShort')} size={12} mau={CHU_2} />
              </Box>
            ))}
          </Stack>
        </Box>

        {/* Thẻ SEO: chữ này KHÔNG hiện trên trang, nó là mẩu kết quả trên
            Google — nên vẽ đúng hình dạng mẩu đó, không vẽ thành một khối
            trang, để không ai tưởng nó nằm dưới phần hỏi đáp. */}
        <Box sx={{ bgcolor: '#fff', borderRadius: 1.5, p: 1.25 }}>
          <Typography sx={{ color: '#5f6368', fontSize: 10, mb: 0.25 }}>{m('google')}</Typography>
          <Typography sx={{ color: '#1a0dab', fontSize: 13.5, lineHeight: 1.3, overflowWrap: 'anywhere' }}>
            {nd.metaTitle.trim() || `${nd.ten.trim() || m('namePlaceholder')} | BEE Transportation`}
          </Typography>
          <Typography sx={{ color: '#006621', fontSize: 11 }} noWrap>
            beetransportation.vn › dich-vu › {nd.slugVi || '…'}
          </Typography>
          <Typography sx={{ color: '#4d5156', fontSize: 11.5, lineHeight: 1.45, overflowWrap: 'anywhere' }}>
            {nd.metaDescription.trim() || m('metaPlaceholder')}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}
