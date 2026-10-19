import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack,
  TextField, Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { RichTextEditor } from '@/components/rich-editor/RichTextEditor';
import type { NewsArticle, NewsStatus } from '@/services/newsService';
import { CoverImageUpload } from './CoverImageUpload';

export interface NewsFormValues {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  coverImageUrl: string;
  status: NewsStatus;
}

export interface NewsFormDialogProps {
  isOpen: boolean;
  initial: NewsArticle | null;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (values: NewsFormValues) => void;
}

const EMPTY: NewsFormValues = {
  title: '', slug: '', excerpt: '', body: '', coverImageUrl: '', status: 'draft',
};

/** VN diacritics → ASCII, xoá ký tự lạ, ép về slug. */
function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Tạo/sửa 1 bài news. Slug auto suggest từ title khi tạo mới. */
export function NewsFormDialog(props: NewsFormDialogProps): ReactNode {
  const { isOpen, initial, isSubmitting, errorMessage, onClose, onSubmit } = props;
  const { t } = useTranslation();
  const [values, setValues] = useState<NewsFormValues>(EMPTY);
  // Track xem slug đã bị user chỉnh tay chưa. Chỉ auto-suggest khi TẠO mới VÀ
  // user chưa đụng slug — đang sửa bài cũ không được đè slug đã public.
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initial) {
        setValues({
          title: initial.title, slug: initial.slug,
          excerpt: initial.excerpt ?? '', body: initial.body,
          coverImageUrl: initial.coverImageUrl ?? '', status: initial.status,
        });
        setSlugTouched(true);
      } else {
        setValues(EMPTY);
        setSlugTouched(false);
      }
    }
  }, [isOpen, initial]);

  const handleTitle = (title: string): void => {
    setValues((v) => ({
      ...v,
      title,
      slug: !initial && !slugTouched ? slugify(title) : v.slug,
    }));
  };

  const canSubmit =
    values.title.trim().length >= 3 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.slug) &&
    !isSubmitting;

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        {initial ? t('news.form.editTitle') : t('news.form.createTitle')}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

          <TextField
            label={t('news.form.title')} required autoFocus
            value={values.title}
            onChange={(e) => handleTitle(e.target.value)}
            fullWidth
          />
          <TextField
            label={t('news.form.slug')} required
            value={values.slug}
            onChange={(e) => {
              setSlugTouched(true);
              setValues((v) => ({ ...v, slug: e.target.value }));
            }}
            helperText={t('news.form.slugHint')}
            fullWidth
          />
          <CoverImageUpload
            value={values.coverImageUrl}
            onChange={(url) => setValues((v) => ({ ...v, coverImageUrl: url }))}
          />
          <TextField
            label={t('news.form.excerpt')} value={values.excerpt}
            onChange={(e) => setValues((v) => ({ ...v, excerpt: e.target.value }))}
            multiline minRows={2} maxRows={4} fullWidth
            helperText={t('news.form.excerptHint')}
          />
          <Box>
            <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
              {t('news.form.body')}
            </Typography>
            {/* Key theo id bài + phiên mở dialog để mount editor lại KHI đổi bài,
                chứ không remount mỗi keystroke. */}
            <RichTextEditor
              key={`news-editor-${initial?.id ?? 'new'}`}
              value={values.body}
              onChange={(html) => setValues((v) => ({ ...v, body: html }))}
              placeholder={t('news.form.bodyPlaceholder')}
              minHeight={280}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {t('news.form.bodyHint')}
            </Typography>
          </Box>
          <TextField
            select label={t('news.form.status')} value={values.status}
            onChange={(e) => setValues((v) => ({ ...v, status: e.target.value as NewsStatus }))}
            fullWidth
          >
            <MenuItem value="draft">{t('news.status.draft')}</MenuItem>
            <MenuItem value="published">{t('news.status.published')}</MenuItem>
            <MenuItem value="archived">{t('news.status.archived')}</MenuItem>
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={isSubmitting}>
          {t('common.actions.cancel')}
        </Button>
        <Button
          variant="contained" disabled={!canSubmit}
          onClick={() => onSubmit(values)}
        >
          {initial ? t('common.actions.save') : t('common.actions.create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
