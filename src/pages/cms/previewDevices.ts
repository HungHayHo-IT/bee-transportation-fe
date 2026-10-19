/**
 * Bề rộng THẬT của từng thiết bị. Khung giữ đúng bề rộng này để landing chạy
 * đúng breakpoint (≤820px là bố cục máy tính bảng, xem globals.css bên landing),
 * rồi thu nhỏ bằng `transform: scale`. Co iframe lại thay vì thu nhỏ là landing
 * nhảy sang bố cục khác — xem sai thứ cần xem.
 */
export const DEVICES = {
  mobile: 390,
  tablet: 820,
  desktop: 1440,
} as const;
export type DeviceKey = keyof typeof DEVICES;

/** "fit" = vừa bề ngang khung; số = tỉ lệ cố định, khung cuộn ngang được. */
export type PreviewZoom = 'fit' | 0.5 | 0.75 | 1;
export const ZOOM_OPTIONS: PreviewZoom[] = ['fit', 0.5, 0.75, 1];

/** Bấm lại cùng một ô vẫn phải cuộn tới — nonce đổi mỗi lần. */
export interface FocusRequest {
  key: string;
  nonce: number;
}
