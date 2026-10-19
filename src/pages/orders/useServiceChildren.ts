import { useEffect, useState } from 'react';
import { describeError } from '@/services/apiClient';
import { fetchServiceChildren } from '@/services/organisationService';
import type { ServiceChild } from '@/types/organisation';

export interface ServiceChildrenState {
  /** Rỗng cũng là một câu trả lời: dịch vụ này không chia nhỏ. */
  children: ServiceChild[];
  isLoading: boolean;
  errorMessage: string | null;
}

/**
 * Dịch vụ con ĐANG BẬT của một dịch vụ, cho ô chọn trên form tạo đơn.
 *
 * Giống `useServiceSchema`: không dùng useAsyncResource vì nó không có trạng
 * thái "chưa chọn dịch vụ nào", và một danh sách cũ còn trên màn hình trong lúc
 * danh sách mới đang tải là danh sách của dịch vụ TRƯỚC — người dùng chọn phải
 * một dòng không thuộc dịch vụ mình vừa đổi sang.
 */
export function useServiceChildren(serviceId: number | null): ServiceChildrenState {
  const [children, setChildren] = useState<ServiceChild[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (serviceId === null) {
      setChildren([]);
      setErrorMessage(null);
      return;
    }

    let isCurrent = true;
    setIsLoading(true);
    setChildren([]);
    setErrorMessage(null);

    fetchServiceChildren(serviceId, true)
      .then((next) => {
        if (isCurrent) setChildren(next);
      })
      .catch((error: unknown) => {
        if (isCurrent) setErrorMessage(describeError(error));
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [serviceId]);

  return { children, isLoading, errorMessage };
}
