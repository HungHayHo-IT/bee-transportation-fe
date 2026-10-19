import { useMemo } from 'react';
import {
  IconAdjustments,
  IconBuildingWarehouse,
  IconChartBar,
  IconChecklist,
  IconClipboardList,
  IconFilePlus,
  IconHistory,
  IconInbox,
  IconLayoutDashboard,
  IconLayoutKanban,
  IconLayoutBoard,
  IconNews,
  IconRoute,
  IconShieldLock,
  IconSettings,
  IconSitemap,
  IconStar,
  IconTable,
  IconUsers,
  IconUsersGroup,
} from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { RoutePath } from '@/routes/routePaths';
import { PermissionAction } from '@/constants/permissions';
import { usePermissions } from '@/hooks/usePermissions';
import { usePageLevels } from '@/hooks/usePageLevels';

export interface NavItem {
  key: string;
  labelKey: string;
  href: string;
  icon: Icon;
  /** The entry is hidden when the user cannot perform this action. */
  action?: PermissionAction;
}

export interface NavGroup {
  key: string;
  labelKey: string;
  items: NavItem[];
}

const NAV_GROUPS: readonly NavGroup[] = [
  {
    key: 'overview',
    labelKey: 'nav.overview',
    items: [
      {
        key: 'dashboard',
        labelKey: 'nav.dashboard',
        href: RoutePath.Dashboard,
        icon: IconLayoutDashboard,
      },
      {
        key: 'myTasks',
        labelKey: 'nav.myTasks',
        href: RoutePath.MyTasks,
        icon: IconChecklist,
      },
      {
        key: 'orgChart',
        labelKey: 'orgChart.title',
        href: RoutePath.OrgChart,
        icon: IconSitemap,
      },
    ],
  },
  {
    key: 'orders',
    labelKey: 'nav.orderGroup',
    items: [
      {
        key: 'createOrder',
        labelKey: 'nav.createOrder',
        href: RoutePath.OrderCreate,
        icon: IconFilePlus,
        action: PermissionAction.CreateOrder,
      },
      {
        key: 'orders',
        labelKey: 'nav.orders',
        href: RoutePath.Orders,
        icon: IconClipboardList,
      },
      {
        key: 'ordersKanban',
        labelKey: 'nav.ordersKanban',
        href: RoutePath.OrdersKanban,
        icon: IconLayoutKanban,
      },
      {
        key: 'queue',
        labelKey: 'nav.queue',
        href: RoutePath.Queue,
        icon: IconInbox,
        action: PermissionAction.QuoteOrder,
      },
      {
        key: 'unroutedOrders',
        labelKey: 'nav.unroutedOrders',
        href: RoutePath.OrdersUnrouted,
        icon: IconRoute,
        action: PermissionAction.ManageOrganisation,
      },
    ],
  },
  {
    key: 'reports',
    labelKey: 'nav.reportGroup',
    items: [
      {
        key: 'revenueReport',
        labelKey: 'nav.revenueReport',
        href: RoutePath.RevenueReport,
        icon: IconChartBar,
        action: PermissionAction.ViewDepartmentReport,
      },
      {
        key: 'operationsReport',
        labelKey: 'nav.operationsReport',
        href: RoutePath.OperationsReport,
        icon: IconTable,
        action: PermissionAction.ViewDepartmentReport,
      },
    ],
  },
  {
    key: 'pricing',
    labelKey: 'nav.priceGroup',
    items: [
      /* KHÔNG gắn `action`: phạm vi do MA TRẬN quyết định, và vòng lọc ở
         cuối tệp này đã tự ẩn mục nào có mức `none`.

         Từ migration 057, Sale và Pricing có `priceList = none` nên không
         còn thấy mục này — bảng giá niêm yết là toàn bộ cơ cấu chi phí của
         Bee trên mọi tuyến. Họ vẫn tra được GIÁ CỦA MỘT TUYẾN ngay trong màn
         báo giá, qua `priceLookup`. Ghi chú cũ ở đây nói ngược lại ("Sale
         phải tra để báo khách"), và nó đúng cho tới khi luật đổi. */
      {
        key: 'priceList',
        labelKey: 'nav.priceList',
        href: RoutePath.PriceList,
        icon: IconRoute,
      },
    ],
  },
  {
    key: 'seo',
    labelKey: 'nav.seoGroup',
    items: [
      {
        key: 'news',
        labelKey: 'nav.news',
        href: RoutePath.AdminNews,
        icon: IconNews,
        action: PermissionAction.ManageOrganisation,
      },
      {
        key: 'cms',
        labelKey: 'nav.cms',
        href: RoutePath.AdminCms,
        icon: IconLayoutBoard,
        action: PermissionAction.ManageOrganisation,
      },
      {
        key: 'saleRepresentatives',
        labelKey: 'nav.saleRepresentatives',
        href: RoutePath.SaleRepresentatives,
        icon: IconStar,
        action: PermissionAction.ManageOrganisation,
      },
    ],
  },
  {
    key: 'directory',
    labelKey: 'nav.directoryGroup',
    items: [
      {
        key: 'customers',
        labelKey: 'nav.customers',
        href: RoutePath.Customers,
        icon: IconUsers,
      },
    ],
  },
  {
    key: 'administration',
    labelKey: 'nav.adminGroup',
    items: [
      {
        key: 'departments',
        labelKey: 'nav.departments',
        href: RoutePath.AdminDepartments,
        icon: IconBuildingWarehouse,
        action: PermissionAction.ManageOrganisation,
      },
      {
        key: 'users',
        labelKey: 'nav.users',
        href: RoutePath.AdminUsers,
        icon: IconUsersGroup,
        action: PermissionAction.CreateUser,
      },
      {
        key: 'services',
        labelKey: 'nav.services',
        href: RoutePath.AdminServices,
        icon: IconAdjustments,
        action: PermissionAction.ManageOrganisation,
      },
      {
        key: 'routingMatrix',
        labelKey: 'nav.routingMatrix',
        href: RoutePath.AdminRouting,
        icon: IconRoute,
        action: PermissionAction.ManageOrganisation,
      },
      {
        key: 'permissions',
        labelKey: 'permissions.title',
        href: RoutePath.AdminPermissions,
        icon: IconShieldLock,
        action: PermissionAction.ManageOrganisation,
      },
      {
        key: 'systemSettings',
        labelKey: 'settings.title',
        href: RoutePath.AdminSettings,
        icon: IconSettings,
        action: PermissionAction.ManageOrganisation,
      },
      {
        key: 'activityLog',
        labelKey: 'nav.activityLog',
        href: RoutePath.AdminActivity,
        icon: IconHistory,
        action: PermissionAction.ManageOrganisation,
      },
    ],
  },
];

/**
 * Menu chạy theo MA TRẬN PHÂN QUYỀN: mục nào mức `none` thì ẩn.
 *
 * `item.key` trùng đúng khoá trang trong ma trận, nên không có bảng ánh xạ thứ
 * hai — thêm một mục menu mà quên khai trong ma trận thì nó hiện ra, và backend
 * là nơi chặn thật.
 *
 * Chưa lấy được ma trận (đang tải, hoặc mạng hỏng) thì quay về luật cũ theo vai
 * trò: mất menu là mất đường đi trong app, còn hiện thừa một mục chỉ dẫn tới
 * một thông báo 403 đọc được.
 *
 * Ẩn ở đây vẫn chỉ là chuyện dễ dùng — backend mới là nơi quyết định.
 */
export function useMenuItems(): NavGroup[] {
  const { can } = usePermissions();
  const levels = usePageLevels();

  return useMemo<NavGroup[]>(
    () =>
      NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          levels
            ? (levels[item.key] ?? 'full') !== 'none'
            : item.action === undefined || can(item.action)),
      })).filter((group) => group.items.length > 0),
    [can, levels],
  );
}
