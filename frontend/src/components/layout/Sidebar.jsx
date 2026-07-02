import { NavLink, useLocation } from "react-router-dom";
import {
  FaHome, FaBox, FaShoppingCart, FaUsers, FaTruck,
  FaChartBar, FaUserCircle, FaSignOutAlt, FaStore,
  FaBoxOpen, FaCog
} from "react-icons/fa";
import {
  LayoutDashboard, Store, UserCheck, UserCircle, Truck,
  Package, ShoppingCart, BarChart2, ChevronRight, Users
} from "lucide-react";

/* ── Super admin menu — only routes that actually exist in App.jsx ── */
const superAdminMenu = [
  { label: "Dashboard",     path: "/super-admin-dashboard", icon: LayoutDashboard },
  { label: "Stores",        path: "/stores",                icon: Store },
  { label: "Store Admins",  path: "/admins",                icon: UserCheck },
  { label: "Customers",     path: "/registered-customers",  icon: UserCircle },
  { label: "Delivery",      path: "/delivery",              icon: Truck },
  { label: "Inventory",     path: "/inventory",             icon: Package },
  { label: "Orders",        path: "/orders",                icon: ShoppingCart },
  { label: "Reports",       path: "/reports",               icon: BarChart2 },
];

/* ── Admin menu ── */
const adminMenu = [
  { path: "/dashboard",    icon: FaHome,         label: "Dashboard"  },
  { path: "/inventory",    icon: FaBox,          label: "Inventory"  },
  { path: "/admin-orders", icon: FaShoppingCart, label: "Orders"     },
  { path: "/billing",      icon: FaShoppingCart, label: "Billing"    },
  { path: "/my-staff",     icon: FaUsers,        label: "My Staff"   },
  { path: "/suppliers",    icon: FaTruck,        label: "Suppliers"  },
  { path: "/reports",      icon: FaChartBar,     label: "Reports"    },
];

/* ── Staff menu ── */
const staffMenu = [
  { path: "/dashboard",  icon: FaHome,         label: "Dashboard" },
  { path: "/billing",    icon: FaShoppingCart, label: "Billing"   },
  { path: "/customers",  icon: FaUsers,        label: "Customers" },
  { path: "/inventory",  icon: FaBox,          label: "Inventory" },
];

function Sidebar() {
  let role = "unknown";
  let userName = "";
  let storeName = "";

  try {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    role      = String(u.role || "unknown").toLowerCase();
    userName  = u.name || "";
    storeName = u.storeId?.name || "";
  } catch (err) {
    console.error("Sidebar parse error", err);
  }

  const isSuperAdmin = role === "super_admin";
  const isAdmin      = role === "admin";
  const isStaff      = role === "staff";

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  /* ════════════════ SUPER ADMIN ════════════════ */
  if (isSuperAdmin) {
    return (
      <aside style={{ position: "fixed", left: 0, top: 0, height: "100vh", width: 240, background: "white", borderRight: "1px solid #e5e7eb", zIndex: 50, display: "flex", flexDirection: "column", fontFamily: "'DM Sans',sans-serif" }}>

        {/* Logo */}
        <div style={{ padding: "22px 20px 16px", borderBottom: "1px solid #f3f4f6" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, background: "linear-gradient(135deg,#6366f1,#4f46e5)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}>
              <Package color="white" size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 17, color: "#111827", letterSpacing: "-0.3px" }}>SmartStore</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.5px" }}>Super Admin</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "12px 10px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.8px", padding: "4px 10px 8px" }}>Main Menu</div>
          {superAdminMenu.map((item, i) => (
            <NavLink key={i} to={item.path}
              style={({ isActive }) => ({
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 12px", borderRadius: 12, marginBottom: 2,
                background: isActive ? "#eef2ff" : "transparent",
                color: isActive ? "#4f46e5" : "#6b7280",
                textDecoration: "none", fontWeight: isActive ? 700 : 500, fontSize: 14,
                transition: "all 0.15s"
              })}>
              {({ isActive }) => (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <item.icon size={16} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight size={14} />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: "14px 16px", borderTop: "1px solid #f3f4f6" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <UserCircle size={20} color="#6366f1" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>{userName || "Super Admin"}</div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>Administrator</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px", borderRadius: 10, border: "none", background: "#fef2f2", color: "#ef4444", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "background 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "#fee2e2"}
            onMouseLeave={e => e.currentTarget.style.background = "#fef2f2"}>
            <FaSignOutAlt size={13} /> Logout
          </button>
        </div>
      </aside>
    );
  }

  /* ════════════════ ADMIN / STAFF ════════════════ */
  const menu = isAdmin ? adminMenu : staffMenu;
  const accentColor = "#1a9c3e";

  return (
    <aside style={{ position: "fixed", left: 0, top: 0, height: "100vh", width: 240, background: "linear-gradient(180deg,#0b1220 0%,#020617 100%)", zIndex: 50, display: "flex", flexDirection: "column", fontFamily: "'DM Sans',sans-serif" }}>

      {/* Logo */}
      <div style={{ padding: "22px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, background: accentColor, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: "0 4px 16px rgba(26,156,62,0.4)" }}>
            🏪
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 17, color: "white", letterSpacing: "-0.3px" }}>SmartStore</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: accentColor, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {isAdmin ? storeName || "Store Admin" : "Staff"}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "14px 12px", overflowY: "auto" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.8px", padding: "0 8px 10px" }}>Navigation</div>
        {menu.map((item, i) => (
          <NavLink key={i} to={item.path}
            style={({ isActive }) => ({
              display: "flex", alignItems: "center", gap: 12,
              padding: "11px 14px", borderRadius: 12, marginBottom: 4,
              background: isActive ? accentColor : "transparent",
              color: isActive ? "white" : "rgba(255,255,255,0.55)",
              textDecoration: "none", fontWeight: isActive ? 700 : 500, fontSize: 14,
              transition: "all 0.15s",
              boxShadow: isActive ? `0 4px 16px rgba(26,156,62,0.35)` : "none"
            })}
            onMouseEnter={e => { if (!e.currentTarget.style.boxShadow.includes("rgba(26")) e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
            onMouseLeave={e => { if (!e.currentTarget.style.boxShadow.includes("rgba(26")) e.currentTarget.style.background = "transparent"; }}>
            <item.icon size={16} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(26,156,62,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <FaUserCircle size={20} color={accentColor} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "white" }}>{userName || "User"}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "capitalize" }}>{role}</div>
          </div>
        </div>
        <button onClick={handleLogout} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px", borderRadius: 10, border: "none", background: "rgba(239,68,68,0.12)", color: "#f87171", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "background 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.22)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(239,68,68,0.12)"}>
          <FaSignOutAlt size={13} /> Logout
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;