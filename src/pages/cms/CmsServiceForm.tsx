import { useRef, useState, type ReactNode } from 'react';
import {
  Alert, Box, Button, Divider, Stack, TextField, Typography,
} from '@mui/material';
import { IconCamera, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { uploadCmsImage } from '@/services/cmsService';
import type { NoiDungDichVu } from './noiDungDichVu';

/** Đúng danh sách backend ký URL cho — chặn sớm để khỏi đi một vòng mạng. */
const LOAI_ANH = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
/** 5MB: ảnh trang web nén đúng cỡ không chạm mức này, ảnh máy ảnh thì có. */
const TOI_DA_MB = 5;

export interface CmsServiceFormProps {
  nd: NoiDungDichVu;
  doi: (sua: Partial<NoiDungDichVu>) => void;
  loiSlugVi: string;
  loiSlugEn: string;
  doiTen: (v: string) => void;
}

/** Tiêu đề một nhóm ô, kèm một dòng nói nhóm đó hiện ở đâu trên trang. */
function Nhom({ tieuDe, chuThich, children }: {
  tieuDe: string; chuThich: string; children: ReactNode;
}) {
  return (
    <Box>
      <Typography variant="subtitle2">{tieuDe}</Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
        {chuThich}
      </Typography>
      <Stack spacing={1.25}>{children}</Stack>
    </Box>
  );
}

const o = { size: 'small', fullWidth: true } as const;

/**
 * Form điền toàn bộ nội dung của dịch vụ mới.
 *
 * Nhóm theo đúng khối của trang, cùng thứ tự với bản xem trước bên trái: mắt
 * đi từ ô đang gõ sang chỗ nó hiện ra mà không phải đi tìm.
 *
 * Mọi ô đều được phép để trống — dịch vụ mới sinh ra đã có chữ mồi ở khối đó,
 * nên trang vẫn chạy. Bắt điền đủ ba mươi ô mới cho tạo là biến một việc mười
 * phút thành một buổi chiều.
 */
export function CmsServiceForm({
  nd, doi, loiSlugVi, loiSlugEn, doiTen,
}: CmsServiceFormProps): ReactNode {
  const { t } = useTranslation();
  const m = (k: string, v?: Record<string, unknown>): string => t(`cms.addService.${k}`, v ?? {});

  const oFile = useRef<HTMLInputElement>(null);
  const [dangTai, setDangTai] = useState(false);
  const [loiAnh, setLoiAnh] = useState('');

  /**
   * Tải ảnh lên NGAY khi chọn, rồi giữ URL trong form.
   *
   * Tải ngay chứ không chờ bấm Thêm: ảnh là thứ nặng nhất trong form, để dồn
   * vào lúc bấm Thêm thì nút đó treo vài giây và không ai biết đang chờ gì.
   * Đổi lại, chọn ảnh rồi bấm Hủy sẽ để lại một file trên kho — đó là cái giá
   * rẻ hơn.
   */
  const chonAnh = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    setLoiAnh('');
    if (!LOAI_ANH.includes(file.type)) {
      setLoiAnh(m('photoWrongType'));
      return;
    }
    if (file.size > TOI_DA_MB * 1024 * 1024) {
      setLoiAnh(m('photoTooBig', { mb: TOI_DA_MB }));
      return;
    }
    setDangTai(true);
    try {
      doi({ anhUrl: await uploadCmsImage(file) });
    } catch {
      setLoiAnh(m('photoFailed'));
    } finally {
      setDangTai(false);
      // Xoá giá trị input để chọn LẠI ĐÚNG file vừa rồi vẫn nổ sự kiện change.
      if (oFile.current) oFile.current.value = '';
    }
  };

  const doiCap = (
    khoi: 'problems' | 'approach' | 'usps',
    i: number,
    truong: 'name' | 'body',
    v: string,
  ): void => {
    const ds = nd[khoi].map((x, j) => (j === i ? { ...x, [truong]: v } : x));
    doi({ [khoi]: ds } as Partial<NoiDungDichVu>);
  };

  return (
    <Stack spacing={2.5}>
      <Nhom tieuDe={m('group.basic')} chuThich={m('group.basicHint')}>
        <TextField
          {...o}
          label={m('name')}
          value={nd.ten}
          onChange={(e) => doiTen(e.target.value)}
          autoFocus
          slotProps={{ htmlInput: { maxLength: 200 } }}
        />
        <TextField
          {...o}
          label={m('slugVi')}
          value={nd.slugVi}
          onChange={(e) => doi({ slugVi: e.target.value })}
          error={!!loiSlugVi}
          helperText={loiSlugVi || m('slugViHint')}
        />
        <TextField
          {...o}
          label={m('slugEn')}
          value={nd.slugEn}
          onChange={(e) => doi({ slugEn: e.target.value })}
          error={!!loiSlugEn}
          helperText={loiSlugEn || m('slugEnHint')}
        />
      </Nhom>

      <Divider />

      <Nhom tieuDe={m('group.photo')} chuThich={m('group.photoHint')}>
        <input
          ref={oFile}
          type="file"
          hidden
          accept={LOAI_ANH.join(',')}
          onChange={(e) => void chonAnh(e.target.files?.[0])}
        />
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            size="small"
            variant="outlined"
            startIcon={<IconCamera size={16} />}
            disabled={dangTai}
            onClick={() => oFile.current?.click()}
            sx={{ textTransform: 'none' }}
          >
            {dangTai ? m('photoUploading') : m(nd.anhUrl ? 'photoChange' : 'photoUpload')}
          </Button>
          {nd.anhUrl ? (
            <Button
              size="small"
              color="inherit"
              startIcon={<IconTrash size={16} />}
              onClick={() => doi({ anhUrl: '' })}
              sx={{ textTransform: 'none' }}
            >
              {m('photoRemove')}
            </Button>
          ) : (
            <Typography variant="caption" color="text.secondary">
              {m('photoDefault')}
            </Typography>
          )}
        </Stack>
        {loiAnh ? <Alert severity="error">{loiAnh}</Alert> : null}
      </Nhom>

      <Divider />

      <Nhom tieuDe={m('group.head')} chuThich={m('group.headHint')}>
        <TextField
          {...o} multiline minRows={2} maxRows={4}
          label={m('field.body')}
          value={nd.body}
          onChange={(e) => doi({ body: e.target.value })}
        />
        <TextField
          {...o} multiline minRows={3} maxRows={6}
          label={m('field.intro')}
          value={nd.intro}
          onChange={(e) => doi({ intro: e.target.value })}
        />
      </Nhom>

      {(['problems', 'approach', 'usps'] as const).map((khoi) => (
        <Box key={khoi}>
          <Divider sx={{ mb: 2.5 }} />
          <Nhom tieuDe={m(`group.${khoi}`)} chuThich={m(`group.${khoi}Hint`)}>
            {nd[khoi].map((muc, i) => (
              <Stack key={i} spacing={1} sx={{ pl: 1, borderLeft: '2px solid', borderColor: 'divider' }}>
                <TextField
                  {...o}
                  label={m(`field.${khoi}Name`, { so: i + 1 })}
                  value={muc.name}
                  onChange={(e) => doiCap(khoi, i, 'name', e.target.value)}
                />
                <TextField
                  {...o} multiline minRows={2} maxRows={4}
                  label={m(`field.${khoi}Body`, { so: i + 1 })}
                  value={muc.body}
                  onChange={(e) => doiCap(khoi, i, 'body', e.target.value)}
                />
              </Stack>
            ))}
          </Nhom>
        </Box>
      ))}

      <Divider />

      <Nhom tieuDe={m('group.scope')} chuThich={m('group.scopeHint')}>
        {nd.points.map((p, i) => (
          <TextField
            key={i}
            {...o}
            label={m('field.point', { so: i + 1 })}
            value={p}
            onChange={(e) => doi({ points: nd.points.map((x, j) => (j === i ? e.target.value : x)) })}
          />
        ))}
      </Nhom>

      <Divider />

      <Nhom tieuDe={m('group.faq')} chuThich={m('group.faqHint')}>
        {nd.faqs.map((f, i) => (
          <Stack key={i} spacing={1} sx={{ pl: 1, borderLeft: '2px solid', borderColor: 'divider' }}>
            <TextField
              {...o}
              label={m('field.faqQ', { so: i + 1 })}
              value={f.q}
              onChange={(e) => doi({
                faqs: nd.faqs.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)),
              })}
            />
            <TextField
              {...o} multiline minRows={2} maxRows={4}
              label={m('field.faqA', { so: i + 1 })}
              value={f.a}
              onChange={(e) => doi({
                faqs: nd.faqs.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)),
              })}
            />
          </Stack>
        ))}
      </Nhom>

      <Divider />

      <Nhom tieuDe={m('group.seo')} chuThich={m('group.seoHint')}>
        <TextField
          {...o}
          label={m('field.metaTitle')}
          value={nd.metaTitle}
          onChange={(e) => doi({ metaTitle: e.target.value })}
          slotProps={{ htmlInput: { maxLength: 70 } }}
          helperText={m('field.metaTitleHint')}
        />
        <TextField
          {...o} multiline minRows={2} maxRows={4}
          label={m('field.metaDescription')}
          value={nd.metaDescription}
          onChange={(e) => doi({ metaDescription: e.target.value })}
          slotProps={{ htmlInput: { maxLength: 160 } }}
          helperText={m('field.metaDescriptionHint')}
        />
      </Nhom>
    </Stack>
  );
}
