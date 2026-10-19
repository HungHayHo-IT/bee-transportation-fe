import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { usePageLevels } from '@/hooks/usePageLevels';
import { RoutePath } from './routePaths';

/**
 * Thứ tự ưu tiên khi chọn trang mở đầu. Dòng đầu tiên mà người này mở được
 * sẽ thắng.
 */
const THU_TU: readonly (readonly [string, string])[] = [
  [RoutePath.Dashboard, 'dashboard'],
  [RoutePath.Orders, 'orders'],
  [RoutePath.PriceList, 'priceList'],
  [RoutePath.MyTasks, 'myTasks'],
  [RoutePath.Notifications, 'notifications'],
];

/**
 * Trang mở đầu sau khi đăng nhập, chọn theo MA TRẬN chứ không viết cứng.
 *
 * Trước đây cả `/` lẫn màn đăng nhập đều nhảy thẳng vào Bảng điều khiển — đúng
 * với năm vai trò nội bộ vì ai cũng mở được nó. Vai trò đối tác thì không, nên
 * họ đăng nhập xong rơi vào một trang báo "Vai trò của bạn không có quyền vào
 * trang này" ngay giữa màn hình, mà menu lại không chỉ ra chỗ nào đi được.
 *
 * Chọn theo ma trận thì thêm vai trò mới sau này cũng không phải sửa lại đây.
 *
 * Hồ sơ cá nhân là đường lui cuối: nó không nằm trong ma trận nên ai đăng nhập
 * được đều mở được, và ở đó có nút đăng xuất.
 */
export function TrangMacDinh(): ReactNode {
  const levels = usePageLevels();

  // Chưa lấy xong thì chưa chuyển đi đâu cả — nhảy sớm là nhảy vào chỗ sai rồi
  // phải nhảy lần nữa, người dùng thấy hai lần chớp màn hình.
  if (!levels) return null;

  const dich = THU_TU.find(([, trang]) => levels[trang] !== 'none')?.[0];
  return <Navigate to={dich ?? RoutePath.Profile} replace />;
}
