import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../../services/api";
import {
  FaChevronRight, FaShoppingBag, FaMapMarkerAlt, FaWallet,
  FaBell, FaInfoCircle, FaSignOutAlt, FaEdit, FaUser
} from "react-icons/fa";
import { MdOutlineLocalOffer } from "react-icons/md";

export default function ProfilePage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [showEdit, setShowEdit] = useState(false);
  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const [mobile, setMobile] = useState(user.mobile || "");
  const [saving, setSaving] = useState(false);

  const joinedDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
    : "Recently";

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await API.put("/users/profile", { name, email, mobile });
      const updated = { ...user, name, email, mobile };
      localStorage.setItem("user", JSON.stringify(updated));
      setShowEdit(false);
      window.location.reload();
    } catch (e) {
      alert("Failed to update profile");
    } finally { setSaving(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("cart");
    navigate("/login");
  };

  const initial = (user.name || "U")[0].toUpperCase();

  const menuItems = [
    { icon: <FaShoppingBag size={17} />, label: "My Orders", action: () => navigate("/my-orders"), color: "#1a9c3e" },
    { icon: <MdOutlineLocalOffer size={17} />, label: "My Refunds", action: () => {}, color: "#f59e0b" },
    { icon: <FaBell size={17} />, label: "Help & Support", action: () => {}, color: "#6366f1" },
  ];

  const listItems = [
    { icon: <MdOutlineLocalOffer size={18} />, label: "Offers & Benefits" },
    { icon: <FaMapMarkerAlt size={18} />, label: "Saved Addresses" },
    { icon: <FaWallet size={18} />, label: "Payment Methods" },
    { icon: <FaBell size={18} />, label: "Notifications" },
    { icon: <FaInfoCircle size={18} />, label: "About" },
  ];

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#f5f5f0", minHeight: "100vh", paddingBottom: 40 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <div style={{ background: "white", padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #f0f0f0" }}>
        <button onClick={() => navigate(-1)} style={{ background: "#f5f5f5", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          ←
        </button>
        <span style={{ fontWeight: 800, fontSize: 18, color: "#111" }}>Account</span>
      </div>

      {/* PROFILE CARD */}
      <div style={{ background: "white", padding: "24px 20px", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#1a9c3e,#0d5c24)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, color: "white", fontWeight: 800, flexShrink: 0 }}>
            {initial}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 20, color: "#111" }}>{user.name || "User"}</div>
            <div style={{ color: "#6b7280", fontSize: 13, marginTop: 2 }}>
              {user.mobile ? `(+91) ${user.mobile}` : user.email}
              {" • "}
              <span style={{ color: "#6b7280" }}>Member since {joinedDate}</span>
            </div>
            <button onClick={() => setShowEdit(true)} style={{ color: "#1a9c3e", fontWeight: 700, fontSize: 13, background: "none", border: "none", cursor: "pointer", marginTop: 4, padding: 0 }}>
              ✏️ Edit Profile &gt;
            </button>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div style={{ background: "white", padding: "16px 20px", marginBottom: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {menuItems.map((item, i) => (
            <button key={i} onClick={item.action} style={{ background: "#f9fafb", border: "none", borderRadius: 14, padding: "16px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <div style={{ color: item.color }}>{item.icon}</div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", textAlign: "center" }}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* REFERRAL BANNER */}
      <div style={{ margin: "0 16px 12px", background: "linear-gradient(135deg,#e8f5e9,#c8e6c9)", borderRadius: 16, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#1a9c3e" }}>🎁 Invite & Earn</div>
          <div style={{ fontSize: 12, color: "#2d6a4f", marginTop: 2 }}>Share SmartStore, earn rewards!</div>
        </div>
        <div style={{ background: "#1a9c3e", color: "white", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <FaChevronRight size={12} />
        </div>
      </div>

      {/* LIST ITEMS */}
      <div style={{ background: "white", borderRadius: 16, margin: "0 0 12px", overflow: "hidden" }}>
        {listItems.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: i < listItems.length - 1 ? "1px solid #f5f5f5" : "none", cursor: "pointer" }}
            onClick={() => {}}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ color: "#6b7280" }}>{item.icon}</span>
              <span style={{ fontWeight: 600, fontSize: 15, color: "#111" }}>{item.label}</span>
            </div>
            <FaChevronRight color="#d1d5db" size={13} />
          </div>
        ))}

        {/* LOGOUT */}
        <div onClick={handleLogout} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <FaSignOutAlt color="#ef4444" size={18} />
            <span style={{ fontWeight: 600, fontSize: 15, color: "#ef4444" }}>Log out</span>
          </div>
          <FaChevronRight color="#fca5a5" size={13} />
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ textAlign: "center", padding: "20px 0", color: "#9ca3af" }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: "#d1d5db" }}>★ SmartStore</div>
        <div style={{ fontSize: 11, marginTop: 2 }}>v1.0.0</div>
      </div>

      {/* EDIT MODAL */}
      {showEdit && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "white", borderRadius: "20px 20px 0 0", padding: "24px 20px", width: "100%", maxWidth: 480 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <span style={{ fontWeight: 800, fontSize: 18 }}>Edit Profile</span>
              <button onClick={() => setShowEdit(false)} style={{ background: "#f5f5f5", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", fontSize: 16 }}>✕</button>
            </div>
            {[
              { label: "Name", value: name, setter: setName, placeholder: "Your name" },
              { label: "Email", value: email, setter: setEmail, placeholder: "your@email.com" },
              { label: "Mobile", value: mobile, setter: setMobile, placeholder: "10 digit number" },
            ].map((field, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 6 }}>{field.label}</label>
                <input value={field.value} onChange={e => field.setter(e.target.value)} placeholder={field.placeholder}
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1.5px solid #e5e7eb", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif" }} />
              </div>
            ))}
            <button onClick={handleSave} disabled={saving} style={{ width: "100%", background: "#1a9c3e", color: "white", border: "none", borderRadius: 14, padding: "14px", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 6, fontFamily: "'DM Sans', sans-serif" }}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}