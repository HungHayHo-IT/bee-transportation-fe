import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, MenuItem, Stack, Tab, Tabs, TextField } from '@mui/material';
import { PageContainer } from '@/components/PageContainer';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { usePermissions } from '@/hooks/usePermissions';
import { usePageLevels } from '@/hooks/usePageLevels';
import { PermissionAction } from '@/constants/permissions';
import { fetchPriceSessions } from '@/services/pricingService';
import type { PriceSession } from '@/types/pricing';
import { PhienStatusChip } from './PhienStatusChip';
import { RegionRouteListPanel } from './RegionRouteListPanel';
import { RegionRoutesPanel } from './RegionRoutesPanel';

async function taiPhien(): Promise<PriceSession[]> {
  return (await fetchPriceSessions()).items;
}

export function PriceListPage(): ReactNode {
  const { t } = useTranslation();
  const { can } = usePermissions();

  /* Nút của tab Khu vực & tuyến đi theo MA TRẬN PHÂN QUYỀN của chính trang
     này, chứ không theo một danh sách vai trò viết cứng. Bốn bậc ánh xạ đúng
     như backend chặn: đọc thì ai mở được trang cũng làm được, ghi cần bậc
     tạo/sửa, xoá cần toàn quyền. */
  const levels = usePageLevels();
  const mucTrang = levels?.priceList ?? null;
  /* Chưa lấy xong thì giữ luật cũ thay vì ẩn hết nút — một hàng công cụ chớp
     rỗng rồi mới hiện còn khó chịu hơn hiện thừa nửa giây, và backend vẫn chặn
     thật nếu người này không được phép. */
  const ghiDuoc = mucTrang === null
    ? can(PermissionAction.ManagePrices)
    : mucTrang === 'edit' || mucTrang === 'full';
  const xoaDuoc = mucTrang === null
    ? can(PermissionAction.ManagePrices)
    : mucTrang === 'full';

  const danhMuc = useAsyncResource(taiPhien);
  const sessions = useMemo(() => danhMuc.data ?? [], [danhMuc.data]);

  const phienActive = useMemo(() => sessions.find((p) => p.status === 'active') ?? null, [sessions]);
  const [phienId, setPhienId] = useState<number | null>(null);

  // Lần đầu có danh mục: chọn phiên đang áp dụng, không có thì phiên đầu tiên.
  useEffect(() => {
    const macDinh = phienActive ?? sessions[0];
    if (phienId !== null || macDinh === undefined) return;
    setPhienId(macDinh.id);
  }, [sessions, phienActive, phienId]);

  const phienDangXem = sessions.find((p) => p.id === phienId) ?? null;
  /* Chưa tải xong thì KHÔNG coi là chưa có phiên: nếu không, mỗi lần vào màn
     lại chớp một câu cảnh báo rồi biến mất. */
  const chuaCoPhien = !danhMuc.isFirstLoad && sessions.length === 0;
  /* Tab này CHỈ XEM — không xuất Excel. Xuất nằm ở tab Khu vực & tuyến, chỗ
     người ta sửa rồi xuất ra để gửi đi; để cả hai nơi là hai nút cùng làm một
     việc, và lần sau sửa một nút thì hai nơi khác nhau. */

  /** Hai cách xem: bảng giá theo phiên (chỉ xem) và khu vực → tuyến → giá. */
  const [cheDo, setCheDo] = useState<'bangGia' | 'khuVuc'>('bangGia');

  return (
    <PageContainer
      title={t('nav.priceList')}
      description={t(cheDo === 'khuVuc' ? 'pricing.region.hint' : 'pricing.region.sessionViewHint')}
    >
      <Tabs
        value={cheDo}
        onChange={(_event, value: 'bangGia' | 'khuVuc') => setCheDo(value)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab value="bangGia" label={t('pricing.region.tabPriceTable')} />
        <Tab value="khuVuc" label={t('pricing.region.tabRegions')} />
      </Tabs>

      {cheDo === 'khuVuc' ? (
        <RegionRoutesPanel
          canEdit={ghiDuoc}
          canDelete={xoaDuoc}
          /* Cùng một danh sách phiên cho CẢ HAI tab: công bố hay tạo phiên ở
             tab kia là tab này thấy ngay, không phải tải lại trang. */
          sessions={sessions}
          phienId={phienId}
          onChonPhien={setPhienId}
          onPhienDoi={danhMuc.reload}
        />
      ) : (
        <>
          {/* Tab này CHỈ XEM. Mọi thao tác ghi — thêm tuyến, sửa giá, nhập
              Excel — nằm ở tab Khu vực & tuyến, nơi dữ liệu thật sự sống. Để
              hai tab cùng sửa được một bảng giá là hai đường vào cho cùng một
              thứ, và người dùng phải đoán xem đường nào mới đúng. */}
          {chuaCoPhien ? (
            <Alert severity="info" sx={{ mb: 2 }}>{t('pricing.region.noSessionYet')}</Alert>
          ) : null}

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            {/* Ô chọn phiên mở sẵn ở phiên ĐANG ÁP DỤNG, nên ai chỉ muốn xem
                giá hiện hành thì vào là thấy ngay, không phải chọn gì. */}
            <TextField
              select size="small" label={t('pricing.sessionLabel')}
              value={phienId === null ? '' : String(phienId)}
              onChange={(e) => setPhienId(Number(e.target.value))}
              sx={{ minWidth: 220 }}
              /* Ô chọn chỉ mang TÊN phiên; trạng thái đứng riêng bên cạnh —
                 giống hệt tab Khu vực & tuyến, vì đây là cùng một ô chọn. */
              SelectProps={{ renderValue: () => phienDangXem?.name ?? '' }}
            >
              {sessions.map((p) => (
                <MenuItem key={p.id} value={String(p.id)}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <span>{p.name}</span>
                    <PhienStatusChip status={p.status} />
                  </Stack>
                </MenuItem>
              ))}
            </TextField>
            {phienDangXem === null ? null : <PhienStatusChip status={phienDangXem.status} />}
          </Stack>

          <RegionRouteListPanel
            canEdit={false}
            canDelete={false}
            sessionId={phienId ?? undefined}
          />
        </>
      )}
    </PageContainer>
  );
}
