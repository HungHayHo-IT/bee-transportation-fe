import type { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { usePageLevels } from '@/hooks/usePageLevels';
import type { PermissionAction } from '@/constants/permissions';
import { NotFoundPage } from '@/pages/NotFoundPage';

export interface ProtectedRouteProps {
  /** Đường lui khi KHÔNG khai `page`. Khai `page` rồi thì không cần. */
  action?: PermissionAction;
  /**
   * Khoá trang trong ma trận phân quyền. Có thì ma trận quyết định, `action`
   * chỉ còn là đường lui khi chưa lấy được ma trận.
   */
  page?: string;
  children: ReactNode;
}

/**
 * Renders the not-found page rather than a "forbidden" page: the backend answers
 * 404 for anything outside the caller's reach, and the UI must not contradict it
 * by confirming that a screen exists.
 *
 * Chặn theo MA TRẬN khi khai `page`. Thiếu bước này thì menu và route nói hai
 * thứ khác nhau: bật quyền trong ma trận, mục menu hiện ra, bấm vào ra 404 —
 * và người dùng đi tìm lỗi ở chỗ khác.
 */
export function ProtectedRoute({ action, page, children }: ProtectedRouteProps): ReactNode {
  const { can } = usePermissions();
  const levels = usePageLevels();

  if (page) {
    /* Chưa lấy xong ma trận thì CHƯA trả lời. Trước đây chỗ này rơi xuống
       `can(action)`, tức là đoán theo vai trò rồi đổi ý khi ma trận về — với
       vai trò không nằm trong ACTION_ROLES (như đối tác) thì cú đoán đó luôn
       sai, và người có quyền thật bị chớp một trang "không tìm thấy" vào mặt. */
    if (!levels) return null;
    return levels[page] === 'none' ? <NotFoundPage /> : children;
  }
  if (action === undefined || !can(action)) return <NotFoundPage />;
  return children;
}
