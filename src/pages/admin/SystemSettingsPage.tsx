import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { Button, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { PageContainer } from '@/components/PageContainer';
import { SectionCard } from '@/components/SectionCard';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { describeError } from '@/services/apiClient';
import { fetchSettings, saveSetting, type ThamSo } from '@/services/settingsService';

/**
 * Cấu hình hệ thống — các tham số sửa được mà không cần deploy.
 *
 * Danh sách tham số do BACKEND khai (`cau-hinh.ts`), màn này chỉ dựng ô nhập
 * theo những gì nó trả về. Thêm một tham số mới vì thế là thêm một dòng ở
 * backend, không phải sửa màn hình này — và không có nguy cơ màn hình liệt kê
 * một khoá mà backend từ chối ghi.
 */
export function SystemSettingsPage(): ReactNode {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();

  const load = useCallback(() => fetchSettings(), []);
  const resource = useAsyncResource(load);

  return (
    <PageContainer title={t('settings.title')} description={t('settings.description')}>
      <SectionCard>
        <Stack spacing={3}>
          {(resource.data ?? []).map((ts: ThamSo) => (
            <DongThamSo
              key={ts.key}
              thamSo={ts}
              onLuu={async (gt) => {
                try {
                  await saveSetting(ts.key, gt);
                  resource.reload();
                  enqueueSnackbar(t('common.states.saved'), { variant: 'success' });
                } catch (e) {
                  enqueueSnackbar(describeError(e), { variant: 'error' });
                }
              }}
            />
          ))}
        </Stack>
      </SectionCard>
    </PageContainer>
  );
}

function DongThamSo({
  thamSo,
  onLuu,
}: {
  thamSo: ThamSo;
  onLuu: (value: number) => Promise<void>;
}): ReactNode {
  const { t } = useTranslation();
  const [nhap, setNhap] = useState(String(thamSo.value));
  const [dangLuu, setDangLuu] = useState(false);

  const so = Number(nhap);
  const hopLe = Number.isInteger(so) && so >= thamSo.min && so <= thamSo.max;
  const daDoi = so !== thamSo.value;

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <TextField
          label={thamSo.label}
          value={nhap}
          onChange={(e) => setNhap(e.target.value)}
          error={nhap !== '' && !hopLe}
          helperText={t('settings.range', { min: thamSo.min, max: thamSo.max, default: thamSo.macDinh })}
          sx={{ maxWidth: 320 }}
        />
        <Button
          variant="contained"
          sx={{ mt: 1 }}
          disabled={!hopLe || !daDoi || dangLuu}
          onClick={() => {
            setDangLuu(true);
            void onLuu(so).finally(() => setDangLuu(false));
          }}
        >
          {t('common.actions.save')}
        </Button>
      </Stack>
      {/* Mô tả in NGUYÊN VĂN từ backend: nó giải thích tham số này ảnh hưởng
          tới ai, và chép lại ở đây là hai bản sẽ lệch nhau. */}
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 680 }}>
        {thamSo.moTa}
      </Typography>
    </Stack>
  );
}
