import {
  User,
  Mail,
  ShieldCheck,
  LogOut,
  Crown,
  Briefcase,
  UserCheck,
  ImagePlus,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { API } from "../../services/api";
import defaultStoreCover from "../../assets/images/store-covers/grocery-store-hero-v1.jpg";

function AdminProfile({ admin, onClose, onLogout }) {
  const [store, setStore] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (admin?.role?.toLowerCase() !== "admin") return;
    API.get("/stores/my-store").then(({ data }) => setStore(data.data)).catch(() => {});
  }, [admin?.role]);

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

  const uploadCover = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setMessage("Please choose an image file.");
    if (file.size > 5 * 1024 * 1024) return setMessage("Image must be smaller than 5 MB.");
    const formData = new FormData();
    formData.append("cover", file);
    setUploading(true);
    setMessage("");
    try {
      const { data } = await API.post("/stores/my-store/cover", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setStore(data.data);
      setMessage("Store cover updated successfully.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not upload store cover.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="absolute right-6 top-16 w-80 z-50 rounded-xl shadow-xl border overflow-hidden animate-fade-in">
      
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

        {role === "admin" && store && (
          <div className="border-t pt-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Store Cover</p>
            <div className="relative h-24 overflow-hidden rounded-xl bg-green-900">
              <img src={store.cover_image_url || store.image_url || defaultStoreCover} alt={`${store.name} cover`} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <span className="absolute bottom-2 left-3 right-3 truncate text-sm font-bold text-white">{store.name}</span>
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadCover} className="hidden" />
            <button type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-2.5 text-sm font-bold text-white transition hover:bg-green-700 disabled:cursor-wait disabled:opacity-60">
              <ImagePlus className="h-4 w-4" />
              {uploading ? "Uploading..." : "Change Store Cover"}
            </button>
            <p className="mt-2 text-[11px] text-gray-500">JPG, PNG or WebP • Maximum 5 MB</p>
            {message && <p className={`mt-2 text-xs font-semibold ${message.includes("successfully") ? "text-green-700" : "text-red-600"}`}>{message}</p>}
          </div>
        )}

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
        <button type="button" onClick={onClose} className="w-full text-xs font-semibold text-gray-500 hover:text-gray-800">Close</button>
      </div>
    </div>
  );
}

export default AdminProfile;
