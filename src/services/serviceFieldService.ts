import apiClient from './apiClient';
import { SERVICE_FIELD_ENDPOINTS } from './apiEndpoints';
import type { ApiPage } from './pageAdapter';
import { SERVICE_FIELD_TYPES } from '@/types/serviceField';
import type {
  CreateServiceFieldPayload,
  DeleteServiceFieldResult,
  ServiceField,
  ServiceFieldType,
  ServiceFormSchema,
  UpdateServiceFieldPayload,
} from '@/types/serviceField';

interface ApiServiceField {
  id: number;
  serviceId: number;
  serviceChildId?: number | null;
  fieldKey: string;
  label: string;
  fieldType: string;
  unit: string | null;
  options: string[];
  isRequired: boolean;
  sortOrder: number;
  helpText: string | null;
  isActive: boolean;
}

interface ApiServiceFormSchema {
  serviceId: number;
  serviceCode: string;
  cargoFields: string[];
  hasDomesticOrigin?: boolean;
  hasDomesticDestination?: boolean;
  fields: ApiServiceField[];
}

/** An unknown type from a newer backend degrades to a plain text box, not a crash. */
function toFieldType(raw: string): ServiceFieldType {
  return (SERVICE_FIELD_TYPES as readonly string[]).includes(raw)
    ? (raw as ServiceFieldType)
    : 'text';
}

function adaptField(api: ApiServiceField): ServiceField {
  return {
    id: api.id,
    serviceId: api.serviceId,
    // Backend cũ hơn bản ô riêng theo dịch vụ con không có trường này.
    serviceChildId: api.serviceChildId ?? null,
    fieldKey: api.fieldKey,
    label: api.label,
    fieldType: toFieldType(api.fieldType),
    unit: api.unit,
    options: api.options,
    isRequired: api.isRequired,
    sortOrder: api.sortOrder,
    helpText: api.helpText,
    isActive: api.isActive,
  };
}

/**
 * Read by anyone who can create an order — the form cannot render without it.
 *
 * `serviceChildId` đổi câu trả lời chứ không chỉ lọc bớt: hai cờ điểm đi/đến
 * và bộ ô riêng đều tính theo dịch vụ con. Bỏ trống thì trả theo dịch vụ cha.
 */
export async function fetchServiceFormSchema(
  serviceId: number,
  serviceChildId?: number,
): Promise<ServiceFormSchema> {
  const response = await apiClient.get<ApiServiceFormSchema>(
    SERVICE_FIELD_ENDPOINTS.FORM_SCHEMA(serviceId),
    serviceChildId === undefined ? undefined : { params: { serviceChildId } },
  );
  return {
    serviceId: response.data.serviceId,
    serviceCode: response.data.serviceCode,
    cargoFields: response.data.cargoFields,
    // Mặc định là CÓ đòi: một backend cũ chưa có cờ này thì form giữ nguyên
    // hành vi cũ, thay vì lặng lẽ ẩn mất ô điểm đi/đến của mọi dịch vụ.
    hasDomesticOrigin: response.data.hasDomesticOrigin ?? true,
    hasDomesticDestination: response.data.hasDomesticDestination ?? true,
    fields: response.data.fields.map(adaptField),
  };
}

/**
 * Admin view: includes the retired fields the form schema leaves out — that is the
 * endpoint's default, since hiding them would hide their ids and leave no way to
 * switch one back on.
 */
export async function fetchServiceFields(serviceId: number): Promise<ServiceField[]> {
  const response = await apiClient.get<ApiPage<ApiServiceField>>(
    SERVICE_FIELD_ENDPOINTS.FIELDS(serviceId),
  );
  return response.data.items.map(adaptField);
}

export async function createServiceField(
  serviceId: number,
  payload: CreateServiceFieldPayload,
): Promise<ServiceField> {
  const response = await apiClient.post<ApiServiceField>(
    SERVICE_FIELD_ENDPOINTS.FIELDS(serviceId),
    payload,
  );
  return adaptField(response.data);
}

export async function updateServiceField(
  fieldId: number,
  payload: UpdateServiceFieldPayload,
): Promise<ServiceField> {
  const response = await apiClient.patch<ApiServiceField>(
    SERVICE_FIELD_ENDPOINTS.FIELD_DETAIL(fieldId),
    payload,
  );
  return adaptField(response.data);
}

/**
 * Deletes only when no order has ever filled the field in; otherwise the backend
 * retires it and says so. The caller must read `deleted` before claiming it is gone.
 */
export async function deleteServiceField(fieldId: number): Promise<DeleteServiceFieldResult> {
  const response = await apiClient.delete<DeleteServiceFieldResult>(
    SERVICE_FIELD_ENDPOINTS.FIELD_DETAIL(fieldId),
  );
  return response.data;
}
