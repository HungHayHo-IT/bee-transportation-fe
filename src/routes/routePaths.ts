/** Every route path in the application. Components never write a path literal. */
export const RoutePath = {
  Login: '/authentication/login',
  ChangePassword: '/authentication/change-password',
  /** Doi tac Bee Logistics tu mo tai khoan — cong khai, khong can phien. */
  PartnerSignup: '/authentication/doi-tac',

  Landing: '/landing',
  SaleRepresentatives: '/sale/representatives',

  Dashboard: '/dashboard',
  MyTasks: '/my-tasks',

  Orders: '/orders',
  OrdersKanban: '/orders/kanban',
  OrderCreate: '/orders/new',
  OrdersUnrouted: '/orders/unrouted',
  OrderDetail: '/orders/:orderId',

  Queue: '/queue',

  Customers: '/customers',
  CustomerDetail: '/customers/:customerId',

  RevenueReport: '/reports/revenue',
  OperationsReport: '/reports/operations',

  /** Bảng giá tuyến: một bảng, hai lối vào — xem PriceListPage. */
  PriceList: '/pricing/routes',
  PriceQuoted: '/pricing/quoted',
  PriceLocations: '/pricing/locations',

  OrgChart: '/org-chart',

  AdminDepartments: '/admin/departments',
  AdminUsers: '/admin/users',
  AdminServices: '/admin/services',
  AdminRouting: '/admin/routing',
  AdminPermissions: '/admin/permissions',
  AdminSettings: '/admin/settings',
  AdminActivity: '/admin/activity',
  AdminNews: '/admin/news',
  AdminCms: '/admin/cms',
  AdminTerms: '/admin/dieu-khoan',

  Notifications: '/notifications',
  Profile: '/profile',
} as const;

export type RoutePath = (typeof RoutePath)[keyof typeof RoutePath];

export function buildOrderDetailPath(orderId: number): string {
  return `/orders/${orderId}`;
}

export function buildCustomerDetailPath(customerId: number): string {
  return `/customers/${customerId}`;
}
