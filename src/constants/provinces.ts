/**
 * Offline fallback for the province catalogue. `GET /reference/provinces` is the
 * source of truth — the backend validates against it and normalises known
 * spellings — but an empty select would block order creation outright, so
 * `useProvinces()` falls back to this list while the request is in flight or if
 * it fails.
 *
 * The 34 units in force after the 2025 provincial merger.
 */
export const PROVINCES: readonly string[] = [
  'Hà Nội',
  'Hải Phòng',
  'Huế',
  'Đà Nẵng',
  'TP. Hồ Chí Minh',
  'Cần Thơ',
  'An Giang',
  'Bắc Ninh',
  'Cà Mau',
  'Cao Bằng',
  'Điện Biên',
  'Đắk Lắk',
  'Đồng Nai',
  'Đồng Tháp',
  'Gia Lai',
  'Hà Tĩnh',
  'Hưng Yên',
  'Khánh Hòa',
  'Lai Châu',
  'Lạng Sơn',
  'Lào Cai',
  'Lâm Đồng',
  'Nghệ An',
  'Ninh Bình',
  'Phú Thọ',
  'Quảng Ngãi',
  'Quảng Ninh',
  'Quảng Trị',
  'Sơn La',
  'Tây Ninh',
  'Thái Nguyên',
  'Thanh Hóa',
  'Tuyên Quang',
  'Vĩnh Long',
];

export const ORDER_SOURCES = ['website', 'hotline', 'email', 'existing'] as const;
export type OrderSource = (typeof ORDER_SOURCES)[number];

export const ORDER_SOURCE_LABEL_KEY: Record<OrderSource, string> = {
  website: 'orders.source.website',
  hotline: 'orders.source.hotline',
  email: 'orders.source.email',
  existing: 'orders.source.existing',
};

export const CONTAINER_TYPES = ['20', '40'] as const;
export type ContainerType = (typeof CONTAINER_TYPES)[number];

/** Narrows a select value without a type assertion; unknown values become undefined. */
export function toOrderSource(value: string): OrderSource | undefined {
  return ORDER_SOURCES.find((option) => option === value);
}

export function toContainerType(value: string): ContainerType | undefined {
  return CONTAINER_TYPES.find((option) => option === value);
}
