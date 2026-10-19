import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  Box, Button, Divider, InputAdornment, Stack, TableCell, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { IconSearch } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { PageContainer } from '@/components/PageContainer';
import { SectionCard } from '@/components/SectionCard';
import { DataTableShell } from '@/components/DataTableShell';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { describeError } from '@/services/apiClient';
import { ROLE_LABEL_KEY, findRole } from '@/constants/roles';
import { brandColors } from '@/theme/palette';
import { foldDiacritics } from '@/utils/foldDiacritics';
import {
  fetchPermissionMatrix, savePermissionMatrix,
  type MucQuyen, type ODat,
} from '@/services/permissionMatrixService';
import { PermissionLevelLegend, PermissionLevelSelect } from './PermissionLevelSelect';

const khoaO = (role: string, pageKey: string): string => `${role}:${pageKey}`;

const RONG_COT_TRAI = 210;
/** Viên chọn mức rộng 160 cộng đệm hai bên — năm vai trò vừa màn 1440 không phải cuộn ngang. */
const RONG_COT_VAI = 172;

/** Cột trái dính lại khi bảng cuộn ngang — mất tên trang thì cả hàng vô nghĩa. */
const COT_TRAI = {
  position: 'sticky' as const,
  left: 0,
  zIndex: 1,
  minWidth: RONG_COT_TRAI,
  backgroundColor: 'background.paper',
  borderRight: (theme: { palette: { divider: string } }) => `1px solid ${theme.palette.divider}`,
};

/**
 * Ma trận phân quyền: vai trò nào vào được trang nào, ở mức nào.
 *
 * Dựng theo đúng bố cục của Ma trận định tuyến — một bảng phẳng, cột trái dính,
 * mỗi ô một điều khiển — để hai màn ma trận trong cùng phần Quản trị đọc giống
 * nhau, thay vì mỗi màn một ngôn ngữ riêng.
 *
 * Khác định tuyến ở chỗ lưu: định tuyến ghi từng hàng vì endpoint thay cả hàng,
 * còn ở đây một lần bấm gửi mọi ô đã đổi. Nút Lưu từng hàng sẽ là thêm 26 nút
 * vào đúng cái màn đang cần bớt nút đi.
 *
 * Không có nút "Đặt lại mặc định": một cú bấm ghi đè cả ma trận công ty đang
 * dùng là quá nặng tay so với chỗ đặt nó. Thứ người ta thật sự cần là bỏ những
 * ô vừa sửa dở — nút "Bỏ thay đổi" làm đúng việc đó, và chỉ trên máy mình.
 */
export function PermissionMatrixPage(): ReactNode {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();

  const tai = useCallback(() => fetchPermissionMatrix(), []);
  const resource = useAsyncResource(tai, []);
  const data = resource.data ?? null;

  const [nhap, setNhap] = useState<Record<string, MucQuyen>>({});
  const [dangLuu, setDangLuu] = useState(false);
  const [tim, setTim] = useState('');

  const banDau = useMemo(() => {
    const m: Record<string, MucQuyen> = {};
    for (const c of data?.cells ?? []) m[khoaO(c.role, c.pageKey)] = c.level;
    return m;
  }, [data]);

  const muc = (role: string, pageKey: string): MucQuyen =>
    nhap[khoaO(role, pageKey)] ?? banDau[khoaO(role, pageKey)] ?? 'none';
  const daSua = (role: string, pageKey: string): boolean => {
    const k = khoaO(role, pageKey);
    return nhap[k] !== undefined && nhap[k] !== banDau[k];
  };
  const daDoi = Object.entries(nhap).filter(([k, v]) => banDau[k] !== v);
  const bikhoa = (role: string, pageKey: string): boolean =>
    role === 'admin' && pageKey === data?.lockedPage;

  const pages = data?.pages ?? [];
  const roles = data?.roles ?? [];
  const nhanVai = (r: string): string => {
    const vai = findRole(r);
    return vai ? t(ROLE_LABEL_KEY[vai]) : r;
  };

  const luu = async (): Promise<void> => {
    if (daDoi.length === 0) return;
    setDangLuu(true);
    try {
      const cells: ODat[] = daDoi.map(([k, level]) => {
        const [role, pageKey] = k.split(':');
        return { role: role ?? '', pageKey: pageKey ?? '', level };
      });
      const kq = await savePermissionMatrix(cells);
      enqueueSnackbar(t('permissions.saved', { count: kq.saved }), { variant: 'success' });
      setNhap({});
      resource.reload();
    } catch (e) {
      enqueueSnackbar(describeError(e), { variant: 'error' });
    } finally {
      setDangLuu(false);
    }
  };

  // Gõ "don hang" cũng phải ra "Đơn hàng", và gõ đúng tên nhóm thì ra cả nhóm:
  // "Đơn hàng" là tên nhóm chứ không nằm trong tên "Bảng Kanban".
  const loc = foldDiacritics(tim.trim());
  const hien = pages.filter(
    (p) =>
      loc === '' ||
      foldDiacritics(t(`permissions.pages.${p.key}`)).includes(loc) ||
      foldDiacritics(t(`permissions.group.${p.group}`)).includes(loc),
  );
  const soTrangNhom = (group: string): number => hien.filter((p) => p.group === group).length;

  return (
    <PageContainer title={t('permissions.title')} description={t('permissions.description')}>
      <SectionCard disableContentPadding>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', md: 'center' }}
          spacing={1.5}
          sx={{ px: 2.5, py: 2 }}
        >
          <TextField
            value={tim}
            onChange={(e) => setTim(e.target.value)}
            placeholder={t('permissions.search')}
            sx={{ width: { xs: '100%', md: 380 } }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <IconSearch size={17} stroke={1.7} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
            {daDoi.length === 0 ? null : (
              <Button color="inherit" disabled={dangLuu} onClick={() => setNhap({})}>
                {t('permissions.discard')}
              </Button>
            )}
            <Button
              variant="contained"
              disabled={dangLuu || daDoi.length === 0}
              onClick={() => void luu()}
            >
              {daDoi.length === 0
                ? t('permissions.apply')
                : t('permissions.applyCount', { count: daDoi.length })}
            </Button>
          </Stack>
        </Stack>
        <Divider />

        <DataTableShell
          isFirstLoad={resource.isFirstLoad}
          isRefetching={resource.isRefetching}
          errorMessage={resource.errorMessage}
          onDismissError={resource.clearError}
          isEmpty={hien.length === 0}
          emptyTitle={t('permissions.noMatch')}
          emptyDescription={t('permissions.noMatchHint')}
          minWidth={RONG_COT_TRAI + roles.length * RONG_COT_VAI}
          head={
            <TableRow>
              <TableCell sx={{ ...COT_TRAI, zIndex: 3, verticalAlign: 'bottom' }}>
                {t('permissions.page')}
              </TableCell>
              {roles.map((r) => (
                <TableCell key={r} align="center" sx={{ minWidth: RONG_COT_VAI, px: 0.75, pb: 1.5 }}>
                  <Typography
                    noWrap
                    sx={{
                      fontSize: 13.5,
                      fontWeight: 700,
                      letterSpacing: 0,
                      textTransform: 'none',
                      color: 'text.primary',
                    }}
                  >
                    {nhanVai(r)}
                  </Typography>
                  <Typography noWrap sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.25 }}>
                    {t(`permissions.roleSub.${r}`, { defaultValue: '' })}
                  </Typography>
                </TableCell>
              ))}
            </TableRow>
          }
        >
          {hien.flatMap((p, i) => {
            const dauNhom = i === 0 || hien[i - 1]?.group !== p.group;
            const tenTrang = t(`permissions.pages.${p.key}`);
            const hangDaSua = roles.some((r) => daSua(r, p.key));
            const dong = (
              <TableRow key={p.key} hover>
                {/* Không gắn nhãn "Phạm vi" lên hàng nữa: nó lặp lại trên gần
                    hết các trang nên thành nhiễu, mà phạm vi dữ liệu vốn không
                    phải thứ đổi được ở màn này — nó tính từ phòng ban của từng
                    người chứ không từ vai trò. */}
                <TableCell sx={COT_TRAI}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="body2" fontWeight={500} noWrap>
                      {tenTrang}
                    </Typography>
                    {hangDaSua ? (
                      <Tooltip title={t('permissions.rowDirty')}>
                        <Box
                          sx={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            bgcolor: brandColors.orange,
                            flexShrink: 0,
                          }}
                        />
                      </Tooltip>
                    ) : null}
                  </Stack>
                </TableCell>
                {roles.map((r) => (
                  <TableCell key={r} align="center" sx={{ py: 1, px: 0.75 }}>
                    <PermissionLevelSelect
                      value={muc(r, p.key)}
                      ariaLabel={`${tenTrang} — ${nhanVai(r)}`}
                      locked={bikhoa(r, p.key)}
                      dirty={daSua(r, p.key)}
                      onChange={(v) => setNhap((cu) => ({ ...cu, [khoaO(r, p.key)]: v }))}
                    />
                  </TableCell>
                ))}
              </TableRow>
            );
            if (!dauNhom) return [dong];
            return [
              <TableRow key={`nhom-${p.group}`}>
                <TableCell
                  colSpan={roles.length + 1}
                  sx={{ bgcolor: brandColors.lineSoft, py: 0.75, borderBottomColor: brandColors.line }}
                >
                  {/* Nhãn nhóm dính trái theo cột tên trang: cuộn ngang mà
                      nhãn trôi theo thì không còn biết đang ở nhóm nào. */}
                  <Stack
                    direction="row"
                    alignItems="baseline"
                    spacing={1}
                    sx={{ position: 'sticky', left: 20, width: 'fit-content' }}
                  >
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      sx={{ textTransform: 'uppercase', letterSpacing: '.06em', color: brandColors.inkStrong }}
                    >
                      {t(`permissions.group.${p.group}`)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('permissions.groupCount', { count: soTrangNhom(p.group) })}
                    </Typography>
                  </Stack>
                </TableCell>
              </TableRow>,
              dong,
            ];
          })}
        </DataTableShell>

        <Box sx={{ px: 2.5, py: 1.5, borderTop: 1, borderColor: 'divider' }}>
          <PermissionLevelLegend />
        </Box>
      </SectionCard>
    </PageContainer>
  );
}
