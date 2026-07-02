import {
  User,
  Mail,
  ShieldCheck,
  LogOut,
  Crown,
  Briefcase,
  UserCheck,
} from "lucide-react";

function AdminProfile({ admin, onClose, onLogout }) {
  if (!admin) return null;

  const role = admin.role?.toLowerCase();

  /* ================= ROLE CONFIG ================= */
  const roleConfig = {
    super_admin: {
      title: "Super Admin",
      badge: "ALL ACCESS",
      icon: Crown,
      headerBg: "bg-indigo-600",
      iconColor: "text-indigo-600",
      badgeBg: "bg-indigo-100 text-indigo-700",
      containerBg: "bg-white",
    },
    admin: {
      title: "Administrator",
      badge: "ADMIN ACCESS",
      icon: ShieldCheck,
      headerBg: "bg-green-600",
      iconColor: "text-green-600",
      badgeBg: "bg-green-100 text-green-700",
      containerBg: "bg-white",
    },
    staff: {
      title: "Staff User",
      badge: "LIMITED ACCESS",
      icon: Briefcase,
      headerBg: "bg-sky-600",
      iconColor: "text-sky-600",
      badgeBg: "bg-sky-100 text-sky-700",
      containerBg: "bg-white",
    },
  };

  const config = roleConfig[role] || roleConfig.staff;
  const RoleIcon = config.icon;

  return (
    <div className="absolute right-6 top-16 w-72 z-50 rounded-xl shadow-xl border overflow-hidden animate-fade-in">
      
      {/* ================= HEADER ================= */}
      <div className={`${config.headerBg} text-white p-4`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <RoleIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{config.title}</h3>
            <p className="text-xs uppercase opacity-90">{config.badge}</p>
          </div>
        </div>
      </div>

      {/* ================= BODY ================= */}
      <div className={`p-4 space-y-4 ${config.containerBg}`}>

        {/* NAME */}
        <div className="flex items-center gap-3">
          <User className={`w-5 h-5 ${config.iconColor}`} />
          <div>
            <p className="font-semibold">{admin.name}</p>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${config.badgeBg}`}
            >
              {admin.role.toUpperCase()}
            </span>
          </div>
        </div>

        {/* EMAIL */}
        <div className="flex items-center gap-3 text-gray-600">
          <Mail className="w-5 h-5" />
          <span className="text-sm truncate">{admin.email}</span>
        </div>

        {/* ACCESS */}
        <div className="flex items-center gap-3 text-gray-600">
          <UserCheck className="w-5 h-5" />
          <span className="text-sm">
            {role === "super_admin"
              ? "System-wide full control"
              : role === "admin"
              ? "Store-level management"
              : "Operational access"}
          </span>
        </div>

        {/* LOGOUT */}
        <button
          onClick={onLogout}
          className="w-full mt-2 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2
          text-red-500 hover:bg-red-50 transition"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );
}

export default AdminProfile;