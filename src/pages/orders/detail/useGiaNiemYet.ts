import { useEffect, useState } from 'react';
import { lookupRoutePrice } from '@/services/pricingService';
import type { GiaNiemYetTuyen } from '@/services/pricingService';

/**
 * Giá niêm yết của tuyến mà đơn này đang đi.
 *
 * Dùng chung cho hai chỗ, và đó là lý do nó tách ra: ô báo giá (bấm một mức để
 * điền vào ô tiền) và tab Tổng quan (chỉ để đọc). Để mỗi nơi tự gọi API là hai
 * bản sao của cùng một luật, mà luật ở đây có một vế dễ quên — thiếu một đầu
 * thì KHÔNG hỏi.
 *
 * Hỏi theo ĐƠN: hai đầu tuyến và FCL/LCL đều đọc từ chính đơn đó ở backend, nên
 * màn hình không phải gom ba tham số rồi tự quyết khi nào đủ nghĩa.
 *
 * Khớp theo FCL/LCL suy ra từ dịch vụ con (065): một tuyến chở một cái 20DC thì
 * giá như nhau, bất kể đơn thuộc dịch vụ nào. Đơn có dịch vụ con không mang đuôi
 * FCL/LCL — hàng không, hàng rời, hàng dự án — thì không có giá niêm yết, vì
 * những thứ đó báo giá riêng từng đơn.
 *
 * Tra hỏng thì trả về null chứ không ném: không có gợi ý vẫn làm việc bình
 * thường, còn chặn cả màn vì một danh mục phụ là mất việc chính. Người không
 * có quyền `priceLookup` nhận 403 và rơi vào đúng nhánh đó.
 */
export function useGiaNiemYet(orderId: number): GiaNiemYetTuyen | null {
  const [gia, setGia] = useState<GiaNiemYetTuyen | null>(null);
  useEffect(() => {
    let con = true;
    void lookupRoutePrice(orderId)
      .then((kq) => { if (con) setGia(kq); })
      .catch(() => { if (con) setGia(null); });
    return () => { con = false; };
  }, [orderId]);
  return gia;
}
