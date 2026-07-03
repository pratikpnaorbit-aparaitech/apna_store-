import { useEffect, useState } from "react";
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
  const [activeSheet, setActiveSheet] = useState(null);
  const [savedAddress, setSavedAddress] = useState(localStorage.getItem("savedAddress") || "");
  const [ticketForm, setTicketForm] = useState({ subject: "", category: "order", orderNumber: "", description: "" });
  const [tickets, setTickets] = useState([]);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketMessage, setTicketMessage] = useState("");

  useEffect(() => {
    if (activeSheet !== "support") return;
    API.get("/support-tickets/mine")
      .then(({ data }) => setTickets(data.tickets || []))
      .catch(() => setTicketMessage("Could not load your previous tickets."));
  }, [activeSheet]);

  const submitTicket = async (event) => {
    event.preventDefault();
    setTicketLoading(true);
    setTicketMessage("");
    try {
      const { data } = await API.post("/support-tickets", ticketForm);
      setTickets((current) => [data.ticket, ...current]);
      setTicketForm({ subject: "", category: "order", orderNumber: "", description: "" });
      setTicketMessage(`Ticket ${data.ticket.ticketNumber} submitted successfully.`);
    } catch (error) {
      setTicketMessage(error.response?.data?.message || "Unable to submit ticket. Please try again.");
    } finally { setTicketLoading(false); }
  };

  const joinedDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
    : "Recently";

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await API.put("/users/profile", { name, email, mobile });
      const updated = { ...user, ...(data.data || { name, email, mobile }) };
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
    localStorage.removeItem("userLocation");
    navigate("/login");
  };

  const initial = (user.name || "U")[0].toUpperCase();

  const menuItems = [
    { icon: <FaShoppingBag size={17} />, label: "My Orders", action: () => navigate("/my-orders"), color: "#1a9c3e" },
    { icon: <MdOutlineLocalOffer size={17} />, label: "My Refunds", action: () => setActiveSheet("refunds"), color: "#f59e0b" },
    { icon: <FaBell size={17} />, label: "Help & Support", action: () => setActiveSheet("support"), color: "#6366f1" },
  ];

  const listItems = [
    { icon: <MdOutlineLocalOffer size={18} />, label: "Offers & Benefits", action: () => setActiveSheet("offers") },
    { icon: <FaMapMarkerAlt size={18} />, label: "Saved Addresses", action: () => setActiveSheet("address") },
    { icon: <FaWallet size={18} />, label: "Payment Methods", action: () => setActiveSheet("payments") },
    { icon: <FaBell size={18} />, label: "Notifications", action: () => setActiveSheet("notifications") },
    { icon: <FaInfoCircle size={18} />, label: "About", action: () => setActiveSheet("about") },
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
      <div onClick={() => setActiveSheet("invite")} style={{ margin: "0 16px 12px", background: "linear-gradient(135deg,#e8f5e9,#c8e6c9)", borderRadius: 16, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
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
            onClick={item.action} role="button" tabIndex={0} onKeyDown={(event) => event.key === "Enter" && item.action()}>
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

      {activeSheet && (
        <div onClick={() => setActiveSheet(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.48)", zIndex: 110, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(event) => event.stopPropagation()} style={{ width: "100%", maxWidth: 520, background: "white", borderRadius: "24px 24px 0 0", padding: 24, maxHeight: "75vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}><strong style={{ fontSize: 19 }}>{({ refunds:"My Refunds", support:"Help & Support", offers:"Offers & Benefits", address:"Saved Address", payments:"Payment Methods", notifications:"Notifications", about:"About SmartStore", invite:"Invite & Earn" })[activeSheet]}</strong><button onClick={() => setActiveSheet(null)} style={{ border: 0, borderRadius: "50%", width: 34, height: 34, cursor: "pointer" }}>✕</button></div>
            {activeSheet === "address" ? <><textarea value={savedAddress} onChange={(event) => setSavedAddress(event.target.value)} placeholder="House number, street, area, city and pincode" style={{ width:"100%", minHeight:110, border:"1.5px solid #e5e7eb", borderRadius:14, padding:14, boxSizing:"border-box", fontFamily:"inherit" }}/><button onClick={() => { localStorage.setItem("savedAddress", savedAddress); setActiveSheet(null); }} style={{ width:"100%", marginTop:12, border:0, borderRadius:14, padding:13, background:"#1a9c3e", color:"white", fontWeight:800, cursor:"pointer" }}>Save Address</button></>
              : activeSheet === "offers" ? <p style={{ color:"#4b5563", lineHeight:1.7 }}>Use <strong>TRY50</strong> on eligible first orders. Available offers are shown automatically at checkout.</p>
              : activeSheet === "payments" ? <p style={{ color:"#4b5563", lineHeight:1.7 }}>Pay securely using Razorpay UPI/cards or choose Cash on Delivery. Card and UPI details are never stored by SmartStore.</p>
              : activeSheet === "notifications" ? <p style={{ color:"#4b5563", lineHeight:1.7 }}>Order, payment and delivery updates appear in the notification bell on your shopping dashboard.</p>
              : activeSheet === "refunds" ? <><p style={{ color:"#4b5563" }}>Refund status is attached to the relevant order.</p><button onClick={() => navigate("/my-orders")} style={{ border:0, borderRadius:12, padding:"11px 16px", background:"#1a9c3e", color:"white", fontWeight:700, cursor:"pointer" }}>Open My Orders</button></>
              : activeSheet === "support" ? <div>
                  <p style={{ color:"#4b5563", lineHeight:1.6, marginTop:0 }}>Create a ticket and our support team will track it through resolution.</p>
                  <form onSubmit={submitTicket}>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                      <select value={ticketForm.category} onChange={(e) => setTicketForm({ ...ticketForm, category:e.target.value })} style={{ padding:12, border:"1.5px solid #e5e7eb", borderRadius:12, background:"white", fontFamily:"inherit" }}>
                        <option value="order">Order</option><option value="payment">Payment</option><option value="refund">Refund</option><option value="delivery">Delivery</option><option value="account">Account</option><option value="other">Other</option>
                      </select>
                      <input value={ticketForm.orderNumber} onChange={(e) => setTicketForm({ ...ticketForm, orderNumber:e.target.value })} placeholder="Order number (optional)" style={{ padding:12, border:"1.5px solid #e5e7eb", borderRadius:12, fontFamily:"inherit", minWidth:0 }}/>
                    </div>
                    <input required minLength={5} maxLength={120} value={ticketForm.subject} onChange={(e) => setTicketForm({ ...ticketForm, subject:e.target.value })} placeholder="What do you need help with?" style={{ width:"100%", marginTop:10, padding:12, border:"1.5px solid #e5e7eb", borderRadius:12, boxSizing:"border-box", fontFamily:"inherit" }}/>
                    <textarea required minLength={10} maxLength={2000} value={ticketForm.description} onChange={(e) => setTicketForm({ ...ticketForm, description:e.target.value })} placeholder="Describe the issue in detail" style={{ width:"100%", minHeight:100, marginTop:10, padding:12, border:"1.5px solid #e5e7eb", borderRadius:12, boxSizing:"border-box", fontFamily:"inherit", resize:"vertical" }}/>
                    <button disabled={ticketLoading} style={{ width:"100%", marginTop:10, border:0, borderRadius:12, padding:13, background:ticketLoading ? "#86c995" : "#1a9c3e", color:"white", fontWeight:800, cursor:ticketLoading ? "wait" : "pointer" }}>{ticketLoading ? "Submitting..." : "Submit Support Ticket"}</button>
                  </form>
                  {ticketMessage && <div style={{ marginTop:10, padding:10, borderRadius:10, background:"#f0fdf4", color:"#166534", fontSize:13, fontWeight:600 }}>{ticketMessage}</div>}
                  {tickets.length > 0 && <div style={{ marginTop:18 }}><strong style={{ fontSize:14 }}>Your tickets</strong>{tickets.map((ticket) => <div key={ticket._id} style={{ marginTop:9, padding:12, border:"1px solid #e5e7eb", borderRadius:12 }}><div style={{ display:"flex", justifyContent:"space-between", gap:8 }}><span style={{ fontWeight:800, fontSize:13 }}>{ticket.ticketNumber}</span><span style={{ textTransform:"capitalize", color:ticket.status === "resolved" ? "#15803d" : "#b45309", fontSize:12, fontWeight:800 }}>{ticket.status?.replace("_", " ")}</span></div><div style={{ marginTop:4, fontSize:13, color:"#374151" }}>{ticket.subject}</div>{ticket.adminReply && <div style={{ marginTop:7, padding:8, background:"#f3f4f6", borderRadius:8, fontSize:12, color:"#4b5563" }}><strong>Support:</strong> {ticket.adminReply}</div>}</div>)}</div>}
                </div>
              : activeSheet === "invite" ? <><p style={{ color:"#4b5563" }}>Share SmartStore with friends.</p><button onClick={() => navigator.clipboard?.writeText(window.location.origin)} style={{ border:0, borderRadius:12, padding:"11px 16px", background:"#1a9c3e", color:"white", fontWeight:700, cursor:"pointer" }}>Copy Invite Link</button></>
              : <p style={{ color:"#4b5563", lineHeight:1.7 }}>SmartStore connects nearby stores, customers and delivery partners for fast local delivery. Version 1.0.0.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
