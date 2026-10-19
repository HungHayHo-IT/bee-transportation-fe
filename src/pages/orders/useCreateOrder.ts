import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createOrder, uploadOrderFile } from '@/services/orderService';
import { describeError } from '@/services/apiClient';
import { toOrderSource } from '@/constants/provinces';
import { soHoacBoQua, toOptionalText } from '@/utils/formValues';
import type { CreateOrderPayload, NewCustomerPayload, OrderSummary } from '@/types/order';
import type { ServiceDataValues } from '@/types/serviceField';
import type { CargoFigures } from './OrderCargoFields';
import { toCargoPayload } from './orderCargoValues';
import type { CustomerSelection } from './OrderCustomerPicker';
import type { OrderRouteValues } from './orderRouteValues';

export interface CreateOrderFormValues {
  customer: CustomerSelection;
  serviceId: string;
  /** Chuỗi rỗng = dịch vụ này không có dịch vụ con, hoặc chưa chọn. */
  serviceChildId: string;
  route: OrderRouteValues;
  cargo: CargoFigures;
  /** Only the figures the chosen service uses reach the API. */
  visibleCargoKeys: readonly string[];
  /** Values for the service's own input boxes, already stripped of blanks. */
  serviceData: ServiceDataValues;
  goodsName: string;
  note: string;
  source: string;
  files: File[];
}

export interface CreateOrderState {
  isSubmitting: boolean;
  submitError: string | null;
  createdOrder: OrderSummary | null;
  /** Set when the order was created but one of its attachments did not upload. */
  uploadWarning: string | null;
  submit: (values: CreateOrderFormValues) => Promise<void>;
  clear: () => void;
}

/**
 * A customer picked from the directory travels as an id; one typed by hand travels
 * inline, and the backend creates it in the same transaction as the order — or
 * reuses the profile that already carries the name.
 */
function buildCustomerFields(
  customer: CustomerSelection,
): { customerId: number } | { newCustomer: NewCustomerPayload } {
  if (customer.existing !== null) return { customerId: customer.existing.id };
  return {
    newCustomer: {
      companyName: customer.companyName.trim(),
      contactName: toOptionalText(customer.contactName),
      phone: toOptionalText(customer.phone),
      email: toOptionalText(customer.email),
    },
  };
}

/**
 * Creating an order is one call plus its attachments, and they must fail as one
 * story: a failed upload is a warning on a created order, never a failed order.
 */
export function useCreateOrder(): CreateOrderState {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<OrderSummary | null>(null);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);

  const clear = (): void => {
    setCreatedOrder(null);
    setUploadWarning(null);
    setSubmitError(null);
  };

  const submit = async (values: CreateOrderFormValues): Promise<void> => {
    const {
      customer, serviceId, serviceChildId, route, cargo, visibleCargoKeys, serviceData,
      goodsName, note, source, files,
    } = values;
    setIsSubmitting(true);
    setSubmitError(null);
    setUploadWarning(null);
    try {
      // An undefined field is dropped by JSON serialisation, so an empty input
      // never reaches the API as "" or 0.
      const payload: CreateOrderPayload = {
        serviceId: Number(serviceId),
        serviceChildId: soHoacBoQua(serviceChildId),
        ...buildCustomerFields(customer),
        originProvince: route.originProvince,
        destinationProvince: route.destinationProvince,
        originAddress: toOptionalText(route.originAddress),
        destinationAddress: toOptionalText(route.destinationAddress),
        // Chuỗi rỗng = không chọn kho, và phải gửi undefined chứ không phải 0:
        // Number('') ra 0, mà 0 không phải id của địa điểm nào.
        originLocationId: soHoacBoQua(route.originLocationId),
        destinationLocationId: soHoacBoQua(route.destinationLocationId),
        desiredDate: toOptionalText(route.desiredDate),
        ...toCargoPayload(cargo, visibleCargoKeys),
        serviceData,
        goodsName: toOptionalText(goodsName),
        note: toOptionalText(note),
        source: toOrderSource(source),
      };

      const order = await createOrder(payload);

      // Attachments belong to an existing order, so they follow the creation.
      for (const file of files) {
        try {
          await uploadOrderFile(order.id, file);
        } catch (error) {
          setUploadWarning(
            t('orders.create.uploadFailed', { name: file.name, message: describeError(error) }),
          );
        }
      }

      setCreatedOrder(order);
    } catch (error) {
      setSubmitError(describeError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return { isSubmitting, submitError, createdOrder, uploadWarning, submit, clear };
}
