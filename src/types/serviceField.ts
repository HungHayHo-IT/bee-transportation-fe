export const SERVICE_FIELD_TYPES = ['text', 'number', 'select', 'date', 'boolean'] as const;

export type ServiceFieldType = (typeof SERVICE_FIELD_TYPES)[number];

/** One input box on the create-order form, configured by an admin per service. */
export interface ServiceField {
  id: number;
  serviceId: number;
  /** Ô riêng của MỘT dịch vụ con. null = ô chung của cả dịch vụ. */
  serviceChildId: number | null;
  /** Key inside `order.serviceData`. Immutable once orders carry a value for it. */
  fieldKey: string;
  label: string;
  fieldType: ServiceFieldType;
  /** Shown inside the box: kg, tấn, m, chiếc… */
  unit: string | null;
  /** Only meaningful for `select`. */
  options: string[];
  isRequired: boolean;
  sortOrder: number;
  helpText: string | null;
  /** Retired fields stay so old orders keep a label for their stored value. */
  isActive: boolean;
}

/** Everything the create-order form needs to know about a service. */
export interface ServiceFormSchema {
  serviceId: number;
  serviceCode: string;
  /** Which of the shared cargo figures this service uses; empty hides the block. */
  cargoFields: string[];
  /**
   * Hai đầu của tuyến có nằm trong nước không — ô "Tỉnh/thành" là danh sách
   * tỉnh thành Việt Nam nên vô nghĩa với đầu nằm ngoài nước.
   *
   * ĐÃ TÍNH THEO DỊCH VỤ CON nếu lúc hỏi có truyền `serviceChildId`: hàng xuất
   * và hàng nhập nằm cùng một dịch vụ cha nhưng ngược đầu nhau.
   *
   * Backend đọc cùng hai cờ này khi quyết định đơn còn thiếu thông tin hay
   * chưa — ẩn ô ở đây mà backend không biết thì đơn kẹt vĩnh viễn.
   */
  hasDomesticOrigin: boolean;
  hasDomesticDestination: boolean;
  fields: ServiceField[];
}

/**
 * Values as the API stores them: a number field holds a number, a boolean field a
 * boolean, everything else a string. A blank box is absent, never `""`.
 */
export type ServiceDataValues = Record<string, string | number | boolean>;

export interface CreateServiceFieldPayload {
  fieldKey: string;
  label: string;
  fieldType: ServiceFieldType;
  unit?: string;
  options?: string[];
  isRequired?: boolean;
  sortOrder?: number;
  helpText?: string;
}

/** `fieldKey` is absent on purpose: renaming it orphans every stored value. */
export interface UpdateServiceFieldPayload {
  label?: string;
  fieldType?: ServiceFieldType;
  unit?: string;
  options?: string[];
  isRequired?: boolean;
  sortOrder?: number;
  helpText?: string;
  isActive?: boolean;
}

/** A field still in use is retired rather than deleted; `deleted` says which happened. */
export interface DeleteServiceFieldResult {
  deleted: boolean;
  notice: string;
}
