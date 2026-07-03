import { Routes, Route, Navigate, useParams } from "react-router-dom";

/* ================= PAGE IMPORTS ================= */

// Auth
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";

// Dashboards
import Dashboard from "./pages/dashboard/Dashboard";                     // Admin/Staff dashboard
import SuperAdminDashboard from "./pages/dashboard/SuperAdminDashboard"; // Super admin dashboard
import UserDashboard from "./pages/dashboard/UserDashboard";             // User shopping home

// User-facing pages
import ShopPage from "./pages/users/ShopPage";             // Individual store page
import ProductDetail from "./pages/users/ProductDetail";   // Product detail page
import Checkout from "./pages/users/Checkout";             // Checkout page
import OrderSuccess from "./pages/users/OrderSuccess";     // Order placed success page
import MyOrders from "./pages/users/MyOrders";             // User's order history
import ProfilePage from "./pages/users/ProfilePage";       // User account/profile page
import CustomerStores from "./pages/users/CustomerStores";

// Orders
import Orders from "./pages/orders/Orders";               // Super admin orders view
import AdminOrders from "./pages/orders/AdminOrders";     // Admin store orders view

// Delivery
import DeliveryDashboard from "./pages/delivery/DeliveryDashboard"; // Delivery partner dashboard
import DeliveryPartners from "./pages/delivery/DeliveryPartners";   // Super admin manage delivery partners

// User/Staff Management
import UserManagement from "./pages/users/UserManagement";       // Super admin manage users
import AdminStaff from "./pages/users/AdminStaff";               // Super admin view admin's staff
import StoreAdmins from "./pages/users/StoreAdmins";             // Super admin view store admins
import StoreAdminProfile from "./pages/users/StoreAdminProfile"; // Super admin view admin profile
import MyStaff from "./pages/users/MyStaff";                     // Admin manage own staff

// Stores
import Stores from "./pages/stores/Stores"; // Super admin manage stores

// Customers
import Customers from "./pages/customers/Customers";                     // Admin view customers
import RegisteredCustomers from "./pages/customers/RegisteredCustomers"; // Super admin registered users

// Inventory
import Inventory from "./pages/inventory/Inventory";                   // Admin/Staff inventory list
import AddProduct from "./pages/inventory/AddProduct";                 // Add new product
import EditProduct from "./pages/inventory/EditProduct";               // Edit existing product
import BulkUploadInventory from "./pages/inventory/BulkUploadInventory"; // Bulk CSV upload

// Other Admin Pages
import Billing from "./pages/billing/Billing";       // POS billing
import Suppliers from "./pages/suppliers/Suppliers"; // Manage suppliers
import Reports from "./pages/reports/Reports";       // Sales reports

// Landing
import Home from "./pages/Home"; // Public landing page

/* ================= LAYOUT IMPORTS ================= */
import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import ProtectedRoute from "./components/common/ProtectedRoute";
import "./assets/styles/thermal.css";

/* =================================================
   HOW TO ADD A NEW ROUTE:
   
   1. Import your page component above
   2. Add a <Route> in the correct section below
   3. Wrap with <ProtectedRoute roles={[...]}> if auth needed
   4. Wrap with <LayoutWrapper> for admin sidebar layout
   5. Wrap with <SuperAdminLayout> for super admin layout
   
   ROLES: "user" | "admin" | "staff" | "super_admin"
   PUBLIC routes: no ProtectedRoute needed
================================================= */

function App() {
  return (
    <Routes>

      {/* ─────────────────────────────────────────
          PUBLIC ROUTES — no login required
          Add new public pages here
      ───────────────────────────────────────── */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/shop/:storeId" element={<ShopPage />} />           {/* Store page - public so anyone can browse */}
      <Route path="/product/:productId" element={<ProductDetail />} /> {/* Product detail - public */}
      <Route path="/order-success" element={<OrderSuccess />} />       {/* After order placed */}
      <Route path="/delivery-login" element={<Navigate to="/login?role=delivery" replace />} />
       


      {/* ─────────────────────────────────────────
          USER ROUTES — role: "user"
          Add new user-facing pages here
      ───────────────────────────────────────── */}
      <Route path="/user-dashboard" element={
        <ProtectedRoute roles={["user"]}>
          <UserDashboard />
        </ProtectedRoute>
      } />

      <Route path="/category/:category" element={
        <ProtectedRoute roles={["user"]}>
          <CategoryStoreRedirect />
        </ProtectedRoute>
      } />

      <Route path="/checkout" element={
        <ProtectedRoute roles={["user"]}>
          <Checkout />
        </ProtectedRoute>
      } />

      <Route path="/my-orders" element={
        <ProtectedRoute roles={["user"]}>
          <MyOrders />
        </ProtectedRoute>
      } />

      <Route path="/profile" element={
        <ProtectedRoute roles={["user"]}>
          <ProfilePage />
        </ProtectedRoute>
      } />

      <Route path="/browse-stores" element={
        <ProtectedRoute roles={["user"]}>
          <CustomerStores />
        </ProtectedRoute>
      } />


      {/* ─────────────────────────────────────────
          SUPER ADMIN ROUTES — role: "super_admin"
          Add new super admin pages here
          All wrapped in <SuperAdminLayout> (sidebar + topbar)
      ───────────────────────────────────────── */}
      <Route path="/super-admin-dashboard" element={
        <ProtectedRoute roles={["super_admin"]}>
          <SuperAdminLayout><SuperAdminDashboard /></SuperAdminLayout>
        </ProtectedRoute>
      } />

      <Route path="/users" element={
        <ProtectedRoute roles={["super_admin"]}>
          <SuperAdminLayout><UserManagement /></SuperAdminLayout>
        </ProtectedRoute>
      } />

      <Route path="/admins" element={
        <ProtectedRoute roles={["super_admin"]}>
          <SuperAdminLayout><UserManagement roleFilter="admin" /></SuperAdminLayout>
        </ProtectedRoute>
      } />

      <Route path="/staff" element={
        <ProtectedRoute roles={["super_admin"]}>
          <SuperAdminLayout><UserManagement roleFilter="staff" /></SuperAdminLayout>
        </ProtectedRoute>
      } />

      <Route path="/admin/:adminId/staff" element={
        <ProtectedRoute roles={["super_admin"]}>
          <SuperAdminLayout><AdminStaff /></SuperAdminLayout>
        </ProtectedRoute>
      } />

      <Route path="/store-admins" element={
        <ProtectedRoute roles={["super_admin"]}>
          <SuperAdminLayout><StoreAdmins /></SuperAdminLayout>
        </ProtectedRoute>
      } />

      <Route path="/store-admin/:adminId" element={
        <ProtectedRoute roles={["super_admin"]}>
          <SuperAdminLayout><StoreAdminProfile /></SuperAdminLayout>
        </ProtectedRoute>
      } />

      <Route path="/registered-customers" element={
        <ProtectedRoute roles={["super_admin"]}>
          <SuperAdminLayout><RegisteredCustomers /></SuperAdminLayout>
        </ProtectedRoute>
      } />

      <Route path="/delivery" element={
        <ProtectedRoute roles={["super_admin"]}>
          <SuperAdminLayout><DeliveryPartners /></SuperAdminLayout>
        </ProtectedRoute>
      } />

      {/* Delivery partner dashboard */}
      <Route path="/delivery-dashboard" element={
        localStorage.getItem("dp_token") ? <DeliveryDashboard /> : <Navigate to="/delivery-login" replace />
      } />


      <Route path="/stores" element={
        <ProtectedRoute roles={["super_admin"]}>
          <SuperAdminLayout><Stores /></SuperAdminLayout>
        </ProtectedRoute>
      } />

      <Route path="/orders" element={
        <ProtectedRoute roles={["super_admin"]}>
          <SuperAdminLayout><Orders /></SuperAdminLayout>
        </ProtectedRoute>
      } />


      {/* ─────────────────────────────────────────
          ADMIN ROUTES — role: "admin"
          Add new admin-only pages here
          All wrapped in <LayoutWrapper> (sidebar only)
      ───────────────────────────────────────── */}
      <Route path="/my-staff" element={
        <ProtectedRoute roles={["admin"]}>
          <LayoutWrapper><MyStaff /></LayoutWrapper>
        </ProtectedRoute>
      } />

      <Route path="/admin-orders" element={
        <ProtectedRoute roles={["admin"]}>
          <LayoutWrapper><AdminOrders /></LayoutWrapper>
        </ProtectedRoute>
      } />


      {/* ─────────────────────────────────────────
          MULTI-ROLE ROUTES — admin + staff + super_admin
          Add pages accessible by multiple roles here
          All wrapped in <LayoutWrapper>
      ───────────────────────────────────────── */}
      <Route path="/dashboard" element={
        <ProtectedRoute roles={["admin", "staff", "super_admin"]}>
          <LayoutWrapper showTopbar><Dashboard /></LayoutWrapper>
        </ProtectedRoute>
      } />

      <Route path="/inventory" element={
        <ProtectedRoute roles={["admin", "staff", "super_admin"]}>
          <LayoutWrapper><Inventory /></LayoutWrapper>
        </ProtectedRoute>
      } />

      <Route path="/inventory/add" element={
        <ProtectedRoute roles={["admin", "super_admin"]}>
          <LayoutWrapper><AddProduct /></LayoutWrapper>
        </ProtectedRoute>
      } />

      <Route path="/inventory/edit/:id" element={
        <ProtectedRoute roles={["admin", "super_admin"]}>
          <LayoutWrapper><EditProduct /></LayoutWrapper>
        </ProtectedRoute>
      } />

      <Route path="/inventory/bulk-upload" element={
        <ProtectedRoute roles={["admin", "super_admin"]}>
          <LayoutWrapper><BulkUploadInventory /></LayoutWrapper>
        </ProtectedRoute>
      } />

      <Route path="/billing" element={
        <ProtectedRoute roles={["admin", "staff", "super_admin"]}>
          <LayoutWrapper><Billing /></LayoutWrapper>
        </ProtectedRoute>
      } />

      <Route path="/customers" element={
        <ProtectedRoute roles={["admin", "staff", "super_admin"]}>
          <LayoutWrapper><Customers /></LayoutWrapper>
        </ProtectedRoute>
      } />

      <Route path="/suppliers" element={
        <ProtectedRoute roles={["admin", "super_admin"]}>
          <LayoutWrapper><Suppliers /></LayoutWrapper>
        </ProtectedRoute>
      } />

      <Route path="/reports" element={
        <ProtectedRoute roles={["admin", "super_admin"]}>
          <LayoutWrapper><Reports /></LayoutWrapper>
        </ProtectedRoute>
      } />


      {/* ─────────────────────────────────────────
          FALLBACK — catches any unknown routes
          Change <Home /> to a 404 page if needed
      ───────────────────────────────────────── */}
      <Route path="*" element={<Home />} />

    </Routes>
  );
}

function CategoryStoreRedirect() {
  const { category } = useParams();
  return <Navigate to={`/browse-stores?q=${encodeURIComponent(category || "")}`} replace />;
}

/* ─────────────────────────────────────────
   LAYOUT COMPONENTS
   
   LayoutWrapper     → Admin/Staff pages (sidebar only, optional topbar)
   SuperAdminLayout  → Super admin pages (sidebar + topbar always)
───────────────────────────────────────── */

function LayoutWrapper({ children, showTopbar = false }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar />
      <div className="ml-64 min-h-screen flex flex-col">
        {showTopbar && <Topbar />}
        <div className={`flex-1 p-6 ${showTopbar ? "mt-16" : ""}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

function SuperAdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar />
      <div className="ml-64 min-h-screen flex flex-col">
        <Topbar />
        <div className="flex-1 p-6 mt-16">
          {children}
        </div>
      </div>
    </div>
  );
}

export default App;
