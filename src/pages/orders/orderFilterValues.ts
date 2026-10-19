export const ALL_OPTION = 'all';

export interface OrderFilterValues {
  q: string;
  status: string;
  serviceId: string;
  departmentId: string;
  assigneeId: string;
  /** Id khách hàng, hoặc rỗng — không dùng ALL_OPTION vì đây là ô tìm kiếm. */
  customerId: string;
  originProvince: string;
  destinationProvince: string;
  fromDate: string;
  toDate: string;
  dateField: string;
  /**
   * One of the chosen service's own fields, and the value to match. Only usable
   * once `serviceId` names a single service — the fields differ per service.
   */
  serviceFieldKey: string;
  serviceFieldValue: string;
}

export const EMPTY_FILTERS: OrderFilterValues = {
  q: '',
  status: ALL_OPTION,
  serviceId: ALL_OPTION,
  departmentId: ALL_OPTION,
  assigneeId: ALL_OPTION,
  customerId: '',
  originProvince: ALL_OPTION,
  destinationProvince: ALL_OPTION,
  fromDate: '',
  toDate: '',
  dateField: 'created',
  serviceFieldKey: '',
  serviceFieldValue: '',
};

/** The three date columns an order list can be filtered on. */
export const ORDER_DATE_FIELDS = ['created', 'closed', 'completed'] as const;

export type OrderDateField = (typeof ORDER_DATE_FIELDS)[number];
