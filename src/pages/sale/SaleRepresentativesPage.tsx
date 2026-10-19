import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { BeeLoader } from '@/components/BeeLoader';
import {
  Alert, Box, Paper, Stack, Switch, TextField, Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { PageContainer } from '@/components/PageContainer';
import { SectionCard } from '@/components/SectionCard';
import { EmptyState } from '@/components/EmptyState';
import { ROLE_LABEL_KEY } from '@/constants/roles';
import type { Role } from '@/constants/roles';
import {
  fetchRepresentativeGroups, updateRepresentative,
} from '@/services/saleService';
import type { DepartmentRepresentativeGroup, RepresentativeUser } from '@/services/saleService';
import { RepresentativePhoto } from './RepresentativePhoto';

function initials(fullName: string): string {
  const words = fullName.trim().split(/\s+/u).slice(-2);
  return words.map((w) => w[0] ?? '').join('').toLocaleUpperCase();
}

export function SaleRepresentativesPage(): ReactNode {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<DepartmentRepresentativeGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setGroups(await fetchRepresentativeGroups());
      setError(null);
    } catch {
      setError(t('sale.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** Gộp một thay đổi vào danh sách đang hiện, không nạp lại cả trang. */
  const vaSo = (userId: number, sua: Partial<RepresentativeUser>): void => {
    setGroups((prev) =>
      prev?.map((g) => ({
        ...g,
        users: g.users.map((u) => (u.id === userId ? { ...u, ...sua } : u)),
      })) ?? null,
    );
  };

  const handleToggle = async (userId: number, next: boolean): Promise<void> => {
    setBusyId(userId);
    try {
      await updateRepresentative(userId, { isLandingRepresentative: next });
      vaSo(userId, { isLandingRepresentative: next });
    } catch {
      setError(t('sale.toggleFailed'));
    } finally {
      setBusyId(null);
    }
  };

  /**
   * Lưu mô tả khi rời ô, không lưu theo từng phím gõ.
   *
   * Gõ tới đâu gửi tới đó là một request mỗi ký tự; còn bắt bấm một nút Lưu
   * riêng cho từng người thì màn này đầy nút. Rời ô là lúc người ta đã viết
   * xong — cùng cách màn CMS đang làm với chữ trên trang.
   */
  const luuMoTa = async (userId: number, moTa: string, cu: string | null): Promise<void> => {
    if (moTa.trim() === (cu ?? '')) return;
    setBusyId(userId);
    try {
      await updateRepresentative(userId, { landingDescription: moTa.trim() });
      vaSo(userId, { landingDescription: moTa.trim() || null });
    } catch {
      setError(t('sale.toggleFailed'));
    } finally {
      setBusyId(null);
    }
  };

  /** Lưu URL ảnh vừa tải lên; chuỗi rỗng là gỡ ảnh, cùng quy ước với API. */
  const luuAnh = async (userId: number, url: string): Promise<void> => {
    setBusyId(userId);
    try {
      await updateRepresentative(userId, { landingAvatarUrl: url });
      vaSo(userId, { landingAvatarUrl: url || null });
    } catch {
      setError(t('sale.representatives.photoFailed'));
    } finally {
      setBusyId(null);
    }
  };

  const totalUsers = groups?.reduce((n, g) => n + g.users.length, 0) ?? 0;
  const enabledCount = groups?.reduce(
    (n, g) => n + g.users.filter((u) => u.isLandingRepresentative).length,
    0,
  ) ?? 0;

  return (
    <PageContainer title={t('sale.representatives.title')}>
      <SectionCard disableContentPadding>
        <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            {t('sale.representatives.summary', { total: totalUsers, on: enabledCount })}
          </Typography>
        </Box>
        <Box>
          {loading && groups === null ? (
            <BeeLoader />
          ) : null}

          {error !== null ? (
            <Alert severity="error" onClose={() => setError(null)} sx={{ m: 2 }}>
              {error}
            </Alert>
          ) : null}

          {groups !== null && groups.length === 0 ? (
            <EmptyState title={t('sale.representatives.empty')} />
          ) : null}

          {groups?.map((group) => (
            <Box key={group.departmentId ?? 'none'} sx={{ px: 3, py: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {group.departmentName}
              </Typography>
              <Stack spacing={1}>
                {group.users.map((u) => (
                  <Paper
                    key={u.id}
                    variant="outlined"
                    sx={{ borderRadius: 2, overflow: 'hidden' }}
                  >
                    {/* Thẻ chia đôi: trái là THÔNG TIN, phải là ẢNH. Ảnh trước
                        đây chen vào cùng hàng với tên nên nó chỉ to bằng hai
                        dòng chữ; tách hẳn một cột thì ảnh mới có chỗ. */}
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column-reverse', sm: 'row' },
                        alignItems: 'stretch',
                      }}
                    >
                      <Box
                        sx={{
                          flex: 1, minWidth: 0, p: 1.5,
                          display: 'flex', flexDirection: 'column', gap: 1.25,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={600} noWrap>
                              {u.fullName}
                            </Typography>
                            <Typography
                              variant="caption" color="text.secondary" noWrap display="block"
                            >
                              {u.roles.map((r: Role) => t(ROLE_LABEL_KEY[r])).join(', ')}
                              {u.email ? ` · ${u.email}` : ''}
                            </Typography>
                          </Box>
                          <Switch
                            size="small"
                            checked={u.isLandingRepresentative}
                            disabled={busyId === u.id}
                            onChange={(_, checked) => void handleToggle(u.id, checked)}
                          />
                        </Box>

                        {/* Ô mô tả LUÔN hiện, kể cả người đang tắt: soạn sẵn mô
                            tả rồi mới bật là thứ tự làm việc tự nhiên — bật lên
                            là landing có ngay chữ, không phải bật xong quay lại
                            viết. */}
                        <TextField
                          size="small"
                          fullWidth
                          multiline
                          minRows={2}
                          maxRows={4}
                          label={t('sale.representatives.description')}
                          placeholder={t('sale.representatives.descriptionHint')}
                          defaultValue={u.landingDescription ?? ''}
                          disabled={busyId === u.id}
                          slotProps={{ htmlInput: { maxLength: 280 } }}
                          onBlur={(e) => void luuMoTa(u.id, e.target.value, u.landingDescription)}
                        />
                      </Box>

                      <Box
                        sx={{
                          // Cột ảnh chiếm hẳn một mảng của thẻ chứ không phải
                          // một góc: đây là nửa "ảnh" của thẻ, và ảnh 112px cần
                          // chỗ thở hai bên.
                          width: { xs: '100%', sm: 240, lg: 300 }, flexShrink: 0, p: 1.5,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          // Vạch ngăn đổi cạnh theo hướng xếp: trên điện thoại
                          // hai nửa nằm chồng nhau nên vạch phải nằm ngang.
                          borderLeft: { sm: '1px solid' },
                          borderBottom: { xs: '1px solid', sm: 'none' },
                          borderColor: { xs: 'divider', sm: 'divider' },
                          bgcolor: 'action.hover',
                        }}
                      >
                        <RepresentativePhoto
                          url={u.landingAvatarUrl}
                          initials={initials(u.fullName)}
                          disabled={busyId === u.id}
                          onChange={(url) => luuAnh(u.id, url)}
                          onError={setError}
                        />
                      </Box>
                    </Box>
                  </Paper>
                ))}
              </Stack>
            </Box>
          ))}
        </Box>
      </SectionCard>
    </PageContainer>
  );
}
