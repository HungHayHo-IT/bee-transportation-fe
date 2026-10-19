import { useEffect, useState } from 'react';
import { fetchMyPageLevels, type MucQuyen } from '@/services/permissionMatrixService';

/**
 * Mức quyền của người đang đăng nhập trên từng trang, lấy một lần khi vào app.
 *
 * `null` = chưa lấy xong. Lúc đó menu giữ nguyên luật cũ thay vì trống trơn:
 * một thanh menu chớp rỗng rồi mới hiện còn khó chịu hơn là hiện thừa một mục
 * trong nửa giây — và backend vẫn chặn thật nếu mục đó không được phép.
 *
 * Hỏng mạng cũng trả `null` vì lý do đó: mất menu là mất đường đi trong app,
 * còn hiện thừa chỉ dẫn tới một thông báo 403 đọc được.
 */
export function usePageLevels(): Record<string, MucQuyen> | null {
  const [levels, setLevels] = useState<Record<string, MucQuyen> | null>(null);

  useEffect(() => {
    let huy = false;
    void fetchMyPageLevels()
      .then((x) => { if (!huy) setLevels(x); })
      .catch(() => { if (!huy) setLevels(null); });
    return () => { huy = true; };
  }, []);

  return levels;
}
