/** Một đầu tuyến — kho, bãi, cảng. Tự khai, không phải danh mục 63 tỉnh/thành. */
export interface Location {
  id: number;
  name: string;
  province: string | null;
  address: string | null;
  /** Văn phòng phụ trách. Theo VÙNG của địa chỉ, không phải một chiều của giá. */
  officeCode: string | null;
  /**
   * Id địa điểm trong master data của OF1-TMS. Bee Logistics cấp.
   *
   * null = chưa xin được, và đơn đi qua địa điểm này KHÔNG chuyển sang TMS
   * được: tài liệu OF1 mục 4 bắt buộc cả hai mã địa điểm.
   */
  of1Id: number | null;
  /**
   * Khu vực của bảng giá tuyến. NGUỒN SỰ THẬT DUY NHẤT của khu vực: khu vực
   * của một tuyến suy ra từ địa điểm NHẬN, không lưu trên tuyến.
   */
  regionId: number | null;
  regionName: string | null;
  isActive: boolean;
}

export interface LocationPayload {
  name: string;
  province?: string;
  address?: string;
  officeCode?: string;
  of1Id?: number | null;
  /** Bỏ trống khi tạo = kế thừa khu vực của địa điểm khác cùng tỉnh. */
  regionId?: number | null;
}

/**
 * Đơn vị tính giá: loại container, tải trọng xe, CBM, pallet...
 *
 * `kind` theo luật Bee: loại nào là DC thì FCL, loại nào tính theo tấn thì
 * LCL. Hàng không (từ sân bay về) cũng LCL — đó là vận chuyển đường bộ một
 * đầu ở sân bay, không phải dịch vụ hàng không.
 */
export interface PriceUnit {
  code: string;
  label: string;
  kind: string;
}

/** draft = đang soạn · active = đang áp dụng · archived = đã bị thay thế. */
export type PriceSessionStatus = 'draft' | 'active' | 'archived';

/**
 * Một phiên bản của bảng giá.
 *
 * Chỉ MỘT phiên `active` tại một thời điểm — backend ép bằng chỉ số của DB,
 * nên màn hình không phải tự giữ luật đó.
 */
export interface PriceSession {
  id: number;
  name: string;
  /** YYYY-MM-DD */
  effectiveFrom: string;
  status: PriceSessionStatus;
  note: string | null;
  priceCount: number;
  /** Số tuyến của bảng giá khu vực trong phiên này. */
  routeCount: number;
  createdByName: string | null;
  activatedAt: string | null;
}

export interface PriceSessionPayload {
  name: string;
  effectiveFrom: string;
  note?: string;
  /** Chép toàn bộ dòng giá từ phiên này — cách dùng lại một bảng giá cũ. */
  copyFromSessionId?: number;
}

export interface RoutePrice {
  id: number;
  sessionId: number;
  originId: number;
  originName: string;
  destinationId: number;
  destinationName: string;
  unitCode: string;
  unitLabel: string;
  /** FCL | LCL */
  unitKind: string;
  price: number;
  note: string | null;
}

export interface RoutePricePayload {
  /** Mã đơn vị tính — một phần của khoá, bắt buộc khi tạo dòng mới. */
  unitCode?: string;
  sessionId: number;
  originId: number;
  destinationId: number;
  price: number;
  note?: string;
}

/** Kết quả một lần nhập file — nói rõ đã bỏ gì, không im lặng nuốt dòng. */
export interface ImportResult {
  imported: number;
  /** Số dòng trùng ngay trong file, đã lấy dòng cuối. */
  merged: number;
  skipped: string[];
  /**
   * Việc hệ thống đã TỰ LÀM trong lần nhập này — khác hẳn dòng bị bỏ.
   *
   * Ví dụ: file ghi cột "20DC" mà danh mục chưa có đơn vị tính nào tên vậy thì
   * hệ thống tự thêm vào danh mục. Im lặng thì danh mục tự mọc thêm dòng mới
   * mà không ai biết.
   */
  notes?: string[];
  /**
   * Số tuyến đã ghi. KHÁC `imported`: một tuyến chưa khai giá vẫn được ghi,
   * nên `imported` bằng 0 mà lần nhập vẫn thành công.
   */
  routes?: number;
}

/** Một dòng trong bảng đánh giá nhân viên. */
export interface StaffScore {
  userId: number;
  fullName: string;
  orderCount: number;
  /** Mẫu số của tỷ lệ chuyển đổi — đơn ĐÃ RA KẾT QUẢ. */
  decidedCount: number;
  closedCount: number;
  /** Tổng tiền đã báo giá. Khác doanh thu: báo giá không phải đơn nào cũng thắng. */
  quotedTotal: number;
  revenue: number;
  /** null = chưa có đơn nào ra kết quả. KHÁC với 0%. */
  conversionRate: number | null;
}

export interface StaffScorecard {
  bySale: StaffScore[];
  byPricing: StaffScore[];
}

/** Một khu vực của bảng giá tuyến — Bắc, Trung, Nam... admin tự thêm bớt. */
export interface PriceRegion {
  id: number;
  name: string;
  /**
   * Trưởng phòng phụ trách. Chỉ người này xem được bảng giá của khu vực;
   * Quản trị và Giám đốc thấy hết. null = chưa giao cho ai.
   */
  managerId: number | null;
  managerName: string | null;
  /** Số tuyến ĐI TỪ khu vực này. */
  routeCount: number;
  /** Số địa điểm đang bật thuộc khu vực. Xoá khu vực đòi con số này bằng 0. */
  locationCount: number;
}

/** Một đầu tuyến. Tỉnh là tỉnh CỦA ĐỊA ĐIỂM, backend trả về chứ không ai gửi lên. */
export interface RouteEndpoint {
  province: string | null;
  locationId: number;
  locationName: string;
}

/**
 * Một mức giá của dịch vụ trên tuyến — theo ĐƠN VỊ TÍNH.
 *
 * Dùng chung danh mục `price_units` với bảng giá cũ, không phải một ô số "tấn"
 * riêng: bảng giá thật có cả bậc tải theo tấn lẫn loại container (20'DC, 40'DC),
 * và không có con số tấn nào điền vào ô đó mà không phải bịa ra.
 */
export interface RoutePriceConfig {
  unitCode: string;
  /** Nhãn đơn vị tính. Chỉ có khi ĐỌC từ API. */
  unitLabel?: string;
  /** null = không chạy chiều này; ít nhất một trong hai giá phải có. */
  oneWayPrice: number | null;
  roundTripPrice: number | null;
}

/**
 * Một KHỐI GIÁ trên tuyến: nguyên container (FCL) hoặc hàng lẻ (LCL).
 *
 * Bảng giá thật của Bee chia đúng hai khối này. Một tuyến chở một cái 20DC thì
 * giá như nhau, bất kể đơn được xếp vào dịch vụ con nào — nên giá khoá theo
 * FCL/LCL, không theo dịch vụ.
 */
export interface RouteService {
  kind: 'FCL' | 'LCL';
  prices: RoutePriceConfig[];
}

export interface RegionRoute {
  id: number;
  /** Phiên giá chứa tuyến này. Một phiên là một BẢN CHỤP đầy đủ của bảng giá. */
  sessionId: number;
  /**
   * Quãng đường HAI CHIỀU, km. Thuộc TUYẾN, không thuộc từng mức giá: đoạn
   * đường không đổi theo việc chở bằng xe 1.4T hay container 20DC.
   */
  roundTripKm: number | null;
  /** Khu vực của địa điểm NHẬN. null = địa điểm đó chưa gán khu vực nào. */
  regionId: number | null;
  regionName: string | null;
  origin: RouteEndpoint;
  destination: RouteEndpoint;
  services: RouteService[];
}

/**
 * Thêm / sửa một tuyến.
 *
 * KHÔNG có `regionId` và cũng không có tỉnh: khu vực của tuyến là khu vực của
 * địa điểm NHẬN, tỉnh là tỉnh của địa điểm. Gửi kèm chúng là mở đường cho một
 * tuyến ghi "Miền Nam" trong khi kho của nó ở Đà Nẵng — đúng lỗi hai ô chọn
 * tỉnh vừa sửa ở form đơn hàng. Đổi khu vực của tuyến = đổi khu vực của địa
 * điểm nhận, ở ngay danh mục địa điểm cùng màn này.
 */
export interface RegionRoutePayload {
  /** Phiên để ghi vào. Bỏ trống = phiên đang áp dụng. */
  sessionId?: number;
  originLocationId: number;
  destinationLocationId: number;
  roundTripKm: number | null;
  /** Thay CẢ danh sách — không vá từng dòng. */
  services: { kind: 'FCL' | 'LCL'; prices: RoutePriceConfig[] }[];
}

/** Bộ lọc của danh sách tuyến phẳng (mọi khu vực). Trống = không lọc. */
export interface RegionRouteFilters {
  sessionId?: number;
  regionId?: number;
  originProvince?: string;
  destinationProvince?: string;
  /** Lọc theo ĐÚNG một địa điểm: một tỉnh có hàng chục kho, cảng và KCN. */
  originLocationId?: number;
  destinationLocationId?: number;
  kind?: 'FCL' | 'LCL';
  /** Chỉ tuyến có giá ở đơn vị tính này. */
  unitCode?: string;
  page: number;
  limit: number;
}
