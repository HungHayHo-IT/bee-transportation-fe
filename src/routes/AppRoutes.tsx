import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthLayout } from '@/layouts/AuthLayout';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { PermissionAction } from '@/constants/permissions';
import { ChangePasswordPage } from '@/pages/ChangePasswordPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { OperationsReportPage } from '@/pages/dashboard/OperationsReportPage';
import { RevenueReportPage } from '@/pages/dashboard/RevenueReportPage';
import { PermissionMatrixPage } from '@/pages/admin/PermissionMatrixPage';
import { SystemSettingsPage } from '@/pages/admin/SystemSettingsPage';
import { PriceListPage } from '@/pages/pricing/PriceListPage';
import { MyTasksPage } from '@/pages/notifications/MyTasksPage';
import { NotificationsPage } from '@/pages/notifications/NotificationsPage';
import { ProfilePage } from '@/pages/notifications/ProfilePage';
import { LandingPage } from '@/pages/landing/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { NewsPage } from '@/pages/admin/NewsPage';
import { CmsPage } from '@/pages/cms/CmsPage';
import { TermsPage } from '@/pages/cms/TermsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { OrgChartPage } from '@/pages/org-chart/OrgChartPage';
import { SaleRepresentativesPage } from '@/pages/sale/SaleRepresentativesPage';
import { ActivityLogPage } from '@/pages/admin/ActivityLogPage';
import { CustomerDetailPage } from '@/pages/customers/CustomerDetailPage';
import { CustomersPage } from '@/pages/customers/CustomersPage';
import { CreateOrderPage } from '@/pages/orders/CreateOrderPage';
import { OrderDetailPage } from '@/pages/orders/OrderDetailPage';
import { OrdersKanbanPage } from '@/pages/orders/OrdersKanbanPage';
import { OrdersListPage } from '@/pages/orders/OrdersListPage';
import { QueuePage } from '@/pages/orders/QueuePage';
import { UnroutedOrdersPage } from '@/pages/orders/UnroutedOrdersPage';
import { DepartmentsPage } from '@/pages/admin/DepartmentsPage';
import { RoutingMatrixPage } from '@/pages/admin/RoutingMatrixPage';
import { ServicesPage } from '@/pages/admin/ServicesPage';
import { UsersPage } from '@/pages/admin/UsersPage';
import { ProtectedRoute } from './ProtectedRoute';
import { RequireSession } from './RequireSession';
import { PartnerSignupPage } from '@/pages/PartnerSignupPage';
import { RoutePath } from './routePaths';
import { TrangMacDinh } from './TrangMacDinh';

export function AppRoutes(): ReactNode {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path={RoutePath.Login} element={<LoginPage />} />
        <Route path={RoutePath.ChangePassword} element={<ChangePasswordPage />} />
        <Route path={RoutePath.PartnerSignup} element={<PartnerSignupPage />} />
      </Route>

      {/* Public landing — no session required. */}
      <Route path={RoutePath.Landing} element={<LandingPage />} />

      <Route
        element={
          <RequireSession>
            <DashboardLayout />
          </RequireSession>
        }
      >
        {/* Chọn trang mở đầu theo ma trận, không viết cứng Bảng điều khiển:
            vai trò đối tác không mở được màn đó. */}
        <Route path="/" element={<TrangMacDinh />} />

        {/* Sáu màn dưới đây trước KHÔNG bọc ProtectedRoute, vì năm vai trò nội
            bộ ai cũng mở được. Vai trò thứ sáu phá vỡ điều đó: không bọc thì
            trang vẫn dựng ra và chỉ hiện một dải báo lỗi giữa màn hình, trong
            khi ma trận nói là không được vào. Mọi trang CÓ TRONG ma trận đều
            phải đi qua đây. */}
        <Route path={RoutePath.Dashboard} element={
          <ProtectedRoute page='dashboard'><DashboardPage /></ProtectedRoute>} />
        <Route path={RoutePath.MyTasks} element={
          <ProtectedRoute page='myTasks'><MyTasksPage /></ProtectedRoute>} />
        <Route path={RoutePath.Notifications} element={
          <ProtectedRoute page='notifications'><NotificationsPage /></ProtectedRoute>} />
        {/* Hồ sơ cá nhân KHÔNG nằm trong ma trận: ai đăng nhập được cũng phải
            vào được, vì ở đó có nút đổi mật khẩu và đăng xuất. */}
        <Route path={RoutePath.Profile} element={<ProfilePage />} />
        <Route path={RoutePath.OrgChart} element={
          <ProtectedRoute page='orgChart'><OrgChartPage /></ProtectedRoute>} />
        <Route
          path={RoutePath.RevenueReport}
          element={
            <ProtectedRoute page='revenueReport' action={PermissionAction.ViewDepartmentReport}>
              <RevenueReportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={RoutePath.OperationsReport}
          element={
            <ProtectedRoute page='operationsReport' action={PermissionAction.ViewDepartmentReport}>
              <OperationsReportPage />
            </ProtectedRoute>
          }
        />

        {/* Bảng giá: XEM thì ai cũng xem được — Sale cần nó để báo
            khách, trưởng phòng cần nó để soát. Chỉ nút sửa mới theo quyền,
            và chính màn hình tự ẩn chúng. */}
        {/* Màn phân quyền tự nó cũng là một dòng trong ma trận — ai vào được
            do chính bảng đó quyết định, trừ Quản trị viên không bao giờ mất. */}
        <Route
          path={RoutePath.AdminPermissions}
          element={
            <ProtectedRoute page="permissions" action={PermissionAction.ManageOrganisation}>
              <PermissionMatrixPage />
            </ProtectedRoute>
          }
        />
        {/* Cấu hình hệ thống: chỉ Quản trị viên. Đây là nơi đặt trần số lần
            tra giá, nên mở rộng hơn là vô nghĩa. */}
        <Route
          path={RoutePath.AdminSettings}
          element={
            <ProtectedRoute page="systemSettings" action={PermissionAction.ManageOrganisation}>
              <SystemSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route path={RoutePath.PriceList} element={
          <ProtectedRoute page='priceList'><PriceListPage /></ProtectedRoute>} />
        {/* Màn "Giá niêm yết" đã bỏ — nó chỉ là chính bảng này khoá vào phiên
            đang áp dụng, mà ô chọn phiên vốn đã mở sẵn ở đó. Giữ đường dẫn cũ
            và chuyển hướng: link đã gửi cho nhau hoặc lưu dấu trang thì vẫn
            tới đúng chỗ, thay vì rơi vào một trang 404 không giải thích gì. */}
        <Route
          path={RoutePath.PriceQuoted}
          element={<Navigate to={RoutePath.PriceList} replace />}
        />
        {/* Màn "Địa điểm" đã gộp vào tab Khu vực & tuyến của màn bảng giá:
            khu vực của một tuyến LÀ khu vực của địa điểm nhận, nên hai màn
            tách nhau buộc người dùng tự đoán ra mối liên hệ đó. Giữ đường dẫn
            cũ và chuyển hướng, như đã làm với màn Giá niêm yết. */}
        <Route
          path={RoutePath.PriceLocations}
          element={<Navigate to={RoutePath.PriceList} replace />}
        />

        <Route
          path={RoutePath.OrderCreate}
          element={
            <ProtectedRoute page='createOrder' action={PermissionAction.CreateOrder}>
              <CreateOrderPage />
            </ProtectedRoute>
          }
        />
        <Route path={RoutePath.Orders} element={
          <ProtectedRoute page='orders'><OrdersListPage /></ProtectedRoute>} />
        <Route path={RoutePath.OrdersKanban} element={
          <ProtectedRoute page='ordersKanban'><OrdersKanbanPage /></ProtectedRoute>} />
        <Route path={RoutePath.OrderDetail} element={
          <ProtectedRoute page='orderDetail'><OrderDetailPage /></ProtectedRoute>} />
        <Route
          path={RoutePath.Queue}
          element={
            <ProtectedRoute page='queue' action={PermissionAction.QuoteOrder}>
              <QueuePage />
            </ProtectedRoute>
          }
        />
        <Route
          path={RoutePath.OrdersUnrouted}
          element={
            <ProtectedRoute page='unroutedOrders' action={PermissionAction.ManageOrganisation}>
              <UnroutedOrdersPage />
            </ProtectedRoute>
          }
        />
        <Route path={RoutePath.Customers} element={
          <ProtectedRoute page='customers'><CustomersPage /></ProtectedRoute>} />
        <Route path={RoutePath.CustomerDetail} element={
          <ProtectedRoute page='customerDetail'><CustomerDetailPage /></ProtectedRoute>} />

        <Route
          path={RoutePath.AdminDepartments}
          element={
            <ProtectedRoute page='departments' action={PermissionAction.ManageOrganisation}>
              <DepartmentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={RoutePath.AdminUsers}
          element={
            <ProtectedRoute page='users' action={PermissionAction.CreateUser}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={RoutePath.AdminServices}
          element={
            <ProtectedRoute page='services' action={PermissionAction.ManageOrganisation}>
              <ServicesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={RoutePath.AdminRouting}
          element={
            <ProtectedRoute page='routingMatrix' action={PermissionAction.ManageOrganisation}>
              <RoutingMatrixPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={RoutePath.SaleRepresentatives}
          element={
            <ProtectedRoute page='saleRepresentatives' action={PermissionAction.ManageOrganisation}>
              <SaleRepresentativesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={RoutePath.AdminActivity}
          element={
            <ProtectedRoute page='activityLog' action={PermissionAction.ManageOrganisation}>
              <ActivityLogPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={RoutePath.AdminNews}
          element={
            <ProtectedRoute page='news' action={PermissionAction.ManageOrganisation}>
              <NewsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={RoutePath.AdminCms}
          element={
            <ProtectedRoute page='cms' action={PermissionAction.ManageOrganisation}>
              <CmsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={RoutePath.AdminTerms}
          element={
            <ProtectedRoute page='cms' action={PermissionAction.ManageOrganisation}>
              <TermsPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
