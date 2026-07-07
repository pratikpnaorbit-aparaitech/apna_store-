import { useEffect, useState, useRef } from "react";
import { API } from "../../services/api";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaChevronRight, FaMapMarkerAlt, FaTimes, FaMotorcycle, FaHeart, FaBoxOpen, FaClock } from "react-icons/fa";
import ordersBackground from "../../assets/images/store-covers/grocery-store-hero-v1.jpg";

const STATUS_CONFIG = {
  Placed:             { color: "#3b82f6", bg: "#eff6ff", icon: "🕐", label: "Order Placed" },
  Confirmed:          { color: "#f59e0b", bg: "#fffbeb", icon: "✅", label: "Confirmed" },
  Preparing:          { color: "#f97316", bg: "#fff7ed", icon: "👨‍🍳", label: "Being Prepared" },
  "Out for Delivery": { color: "#8b5cf6", bg: "#f5f3ff", icon: "🛵", label: "Out for Delivery" },
  Delivered:          { color: "#1a9c3e", bg: "#f0fdf4", icon: "✅", label: "Delivered" },
  Cancelled:          { color: "#ef4444", bg: "#fef2f2", icon: "❌", label: "Cancelled" },
};

const STEPS = ["Placed", "Confirmed", "Preparing", "Out for Delivery", "Delivered"];

const formatAddress = (address) => {
  if (!address) return "";
  if (typeof address === "string") return address;
  return [address.street, address.city, address.state, address.pincode]
    .filter(v => v && typeof v === "string").join(", ");
};

// ── Live Map Component using OpenStreetMap (no API key needed) ──
function LiveTrackingMap({ deliveryPartnerId, deliveryPartnerName }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [location, setLocation] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [mapError, setMapError] = useState(false);
  const pollRef = useRef(null);

  // Load Leaflet dynamically
  useEffect(() => {
    if (!deliveryPartnerId) return;

    // Inject Leaflet CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // Load Leaflet JS
    const loadLeaflet = () => {
      return new Promise((resolve) => {
        if (window.L) { resolve(); return; }
        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = resolve;
        document.head.appendChild(script);
      });
    };

    const init = async () => {
      await loadLeaflet();
      if (!mapRef.current || mapInstanceRef.current) return;
      try {
        const map = window.L.map(mapRef.current, { zoomControl: true, attributionControl: false });
        window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
        mapInstanceRef.current = map;
      } catch (e) {
        setMapError(true);
      }
    };

    init();
    startPolling();

    return () => {
      stopPolling();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [deliveryPartnerId]);

  // Update marker when location changes
  useEffect(() => {
    if (!location || !mapInstanceRef.current || !window.L) return;
    const { lat, lng } = location;

    const bikeIcon = window.L.divIcon({
      className: "",
      html: `<div style="
        background: #8b5cf6;
        border: 3px solid white;
        border-radius: 50%;
        width: 42px;
        height: 42px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        box-shadow: 0 4px 12px rgba(139,92,246,0.5);
      ">🛵</div>`,
      iconSize: [42, 42],
      iconAnchor: [21, 21],
    });

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = window.L.marker([lat, lng], { icon: bikeIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`<b>${deliveryPartnerName || "Delivery Partner"}</b><br>On the way!`);
    }

    mapInstanceRef.current.setView([lat, lng], 15, { animate: true });
  }, [location]);

  const startPolling = () => {
    pollRef.current = setInterval(fetchLocation, 10000);
    fetchLocation(); // fetch immediately
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const fetchLocation = async () => {
    try {
      const { data } = await API.get(`/delivery-partners/${deliveryPartnerId}/location`);
      if (data.location?.lat && data.location?.lng) {
        setLocation(data.location);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error("Location fetch failed:", err);
    }
  };

  if (mapError) return (
    <div style={{ background: "#f5f3ff", borderRadius: 16, padding: 20, textAlign: "center", color: "#8b5cf6" }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>🛵</div>
      <div style={{ fontWeight: 700, fontSize: 14 }}>Partner is on the way!</div>
      <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>Map unavailable</div>
    </div>
  );

  return (
    <div style={{ borderRadius: 16, overflow: "hidden", border: "2px solid #e5e7eb" }}>
      {/* Map */}
      <div style={{ position: "relative", height: 220, background: "linear-gradient(135deg,#eef2f7,#e2e8f0)" }}>
        <div ref={mapRef} style={{ height: 220, width: "100%" }} />
        {!location && <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,rgba(245,243,255,.96),rgba(238,242,255,.96))", color: "#6d28d9" }}><div style={{ fontSize: 40 }}>🛵</div><div style={{ marginTop: 8, fontWeight: 800, fontSize: 14 }}>Waiting for rider GPS</div><div style={{ marginTop: 4, fontSize: 12, color: "#8b5cf6" }}>The map will appear after the rider shares location</div></div>}
      </div>

      {/* Status bar below map */}
      <div style={{ background: "white", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 34, height: 34, background: "#f5f3ff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🛵</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#111" }}>{deliveryPartnerName || "Delivery Partner"}</div>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>
              {location
                ? lastUpdated ? `Updated ${Math.round((new Date() - lastUpdated) / 1000)}s ago` : "Location received"
                : "Waiting for location..."}
            </div>
          </div>
        </div>
        {location && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#f0fdf4", borderRadius: 20, padding: "4px 10px" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#1a9c3e", display: "inline-block", animation: "livePulse 1.5s infinite" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#1a9c3e" }}>Live</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [cancellingId, setCancellingId] = useState(null);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const userId = user.id || user._id;
      const res = await API.get(`/orders/user/${userId}`);
      const data = Array.isArray(res.data) ? res.data : res.data?.orders || [];
      setOrders(data);
      // Refresh selected order if open
      if (selected) {
        const updated = data.find(o => o._id === selected._id);
        if (updated) setSelected(updated);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  });

  const getStepIndex = (status) => STEPS.indexOf(status);
  const canCancel = (order) => ["Placed", "Confirmed"].includes(order.status) && !(order.paymentMethod === "Razorpay" && order.paymentStatus === "paid");
  const cancelOrder = async (event, order) => {
    event?.stopPropagation();
    const reason = window.prompt("Why are you cancelling this order?\nExample: Ordered by mistake, delivery taking too long, or address issue.");
    if (reason === null) return;
    if (reason.trim().length < 3) { window.alert("Please enter a cancellation reason."); return; }
    if (!window.confirm("Cancel this order? The store and admin will be notified.")) return;
    try {
      setCancellingId(order._id);
      const { data } = await API.put(`/orders/${order._id}/cancel`, { reason: reason.trim() });
      const cancelledOrder = data.order || { ...order, status: "Cancelled" };
      setOrders(current => current.map(item => item._id === order._id ? cancelledOrder : item));
      setSelected(current => current?._id === order._id ? cancelledOrder : current);
    } catch (error) {
      window.alert(error.response?.data?.message || "Order cancellation failed. Please try again.");
    } finally {
      setCancellingId(null);
    }
  };
  const completedOrders = orders.filter(order => ["Delivered", "Cancelled"].includes(order.status));
  const activeOrders = orders.filter(order => !["Delivered", "Cancelled"].includes(order.status));
  const favoriteIds = (() => { try { return JSON.parse(localStorage.getItem("favorites") || "[]"); } catch { return []; } })();
  const favoriteItems = Array.from(new Map(orders.flatMap(order => order.items || []).filter(item => favoriteIds.includes(item.productId?._id || item.productId || item._id)).map(item => [String(item.productId?._id || item.productId || item._id), item])).values());
  const visibleOrders = activeTab === "active" ? activeOrders : activeTab === "completed" ? completedOrders : orders;

  return (
    <div className="orders-page" style={{ fontFamily: "'DM Sans', sans-serif", minHeight: "100vh", paddingBottom: 56 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(1.3)} }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        .orders-page{position:relative;background:#f4f7f4;isolation:isolate}.orders-page:before{content:"";position:fixed;inset:0;z-index:-2;background:linear-gradient(rgba(244,249,245,.90),rgba(244,249,245,.96)),url(${ordersBackground}) center/cover no-repeat}.orders-page:after{content:"";position:fixed;inset:0;z-index:-1;backdrop-filter:blur(10px);pointer-events:none}.orders-shell{max-width:1120px;margin:0 auto;padding:32px}.orders-hero{position:relative;overflow:hidden;padding:34px 36px;border-radius:28px;background:linear-gradient(120deg,rgba(10,91,37,.96),rgba(32,178,86,.88));color:white;box-shadow:0 24px 60px rgba(12,90,39,.18)}.orders-hero:after{content:"";position:absolute;width:260px;height:260px;border-radius:50%;right:-70px;top:-120px;background:rgba(255,255,255,.10)}.orders-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:22px}.orders-summary>div{padding:18px 20px;border:1px solid rgba(255,255,255,.2);border-radius:18px;background:rgba(255,255,255,.13);backdrop-filter:blur(12px)}.orders-tabs{display:flex;gap:10px;margin:28px 0 20px;padding:7px;border:1px solid #e5ece7;border-radius:18px;background:rgba(255,255,255,.85);box-shadow:0 8px 28px rgba(15,23,42,.05)}.orders-tabs button{display:flex;align-items:center;gap:8px;padding:11px 18px;border:0;border-radius:12px;background:transparent;color:#647067;font-weight:700;cursor:pointer}.orders-tabs button.active{background:#159b49;color:white;box-shadow:0 8px 18px rgba(21,155,73,.22)}.orders-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.professional-order-card{padding:20px!important;border:1px solid rgba(226,232,226,.9)!important;border-radius:20px!important;box-shadow:0 12px 35px rgba(30,55,39,.07)!important;transition:transform .2s,box-shadow .2s}.professional-order-card:hover{transform:translateY(-3px);box-shadow:0 18px 42px rgba(30,55,39,.12)!important}.favorite-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:18px}.favorite-order-item{display:flex;align-items:center;gap:14px;padding:20px;border:1px solid #e7ede8;border-radius:20px;background:rgba(255,255,255,.92);box-shadow:0 12px 34px rgba(30,55,39,.07)}.favorite-order-item>span{width:54px;height:54px;display:grid;place-items:center;border-radius:16px;background:#fff0f2;font-size:25px}.empty-orders{grid-column:1/-1;padding:70px 24px;border:1px dashed #cddace;border-radius:24px;background:rgba(255,255,255,.7);text-align:center}@media(max-width:720px){.orders-shell{padding:20px 16px}.orders-hero{padding:26px 22px;border-radius:22px}.orders-summary{grid-template-columns:1fr;gap:10px}.orders-tabs{overflow-x:auto}.orders-tabs button{white-space:nowrap;padding:10px 13px}.orders-list{grid-template-columns:1fr}.orders-page:after{backdrop-filter:blur(7px)}}
      `}</style>

      {/* HEADER */}
      <div style={{ background: "rgba(255,255,255,.9)", backdropFilter: "blur(16px)", padding: "16px 24px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #e8eee9", position: "sticky", top: 0, zIndex: 40 }}>
        <button onClick={() => navigate(-1)} style={{ background: "#f5f5f5", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <FaArrowLeft size={14} color="#374151" />
        </button>
        <span style={{ fontWeight: 800, fontSize: 18, color: "#111" }}>My Bookings & Orders</span>
      </div>

      <div className="orders-shell">
        <section className="orders-hero">
          <div style={{ position: "relative", zIndex: 1 }}><div style={{ fontSize: 13, fontWeight: 700, color: "#c9f6d8", textTransform: "uppercase", letterSpacing: 1 }}>Your shopping activity</div><h1 style={{ margin: "7px 0 8px", fontSize: "clamp(28px,4vw,42px)", lineHeight: 1.1 }}>Everything you ordered, in one place.</h1><p style={{ margin: 0, maxWidth: 620, color: "rgba(255,255,255,.78)" }}>Track active deliveries, revisit completed bookings and quickly find your saved favourites.</p></div>
          <div className="orders-summary"><div><FaBoxOpen /><strong style={{ display: "block", fontSize: 24, marginTop: 8 }}>{orders.length}</strong><span style={{ fontSize: 12, color: "#d9f8e4" }}>Total orders</span></div><div><FaClock /><strong style={{ display: "block", fontSize: 24, marginTop: 8 }}>{activeOrders.length}</strong><span style={{ fontSize: 12, color: "#d9f8e4" }}>Active bookings</span></div><div><FaHeart /><strong style={{ display: "block", fontSize: 24, marginTop: 8 }}>{favoriteItems.length}</strong><span style={{ fontSize: 12, color: "#d9f8e4" }}>Favourite items</span></div></div>
        </section>
        <div className="orders-tabs">{[["all","All Orders",FaBoxOpen],["active","Active",FaClock],["completed","Completed",FaChevronRight],["favorites","Favourites",FaHeart]].map(([key,label,Icon])=><button key={key} className={activeTab===key?"active":""} onClick={()=>setActiveTab(key)}><Icon />{label}</button>)}</div>
        {loading && orders.length === 0 ? (
          <div className="orders-list">
            {[1,2,3].map(i => (
              <div key={i} style={{ background: "white", borderRadius: 16, padding: 20, height: 100, animation: "pulse 1.5s infinite" }} />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-orders">
            <div style={{ fontSize: 64, marginBottom: 16 }}>📦</div>
            <div style={{ fontWeight: 800, fontSize: 20, color: "#111", marginBottom: 8 }}>No orders yet</div>
            <div style={{ color: "#6b7280", fontSize: 14, marginBottom: 24 }}>Looks like you haven't ordered anything yet!</div>
            <button onClick={() => navigate("/user-dashboard")} style={{ background: "#1a9c3e", color: "white", border: "none", borderRadius: 12, padding: "12px 28px", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
              Start Shopping
            </button>
          </div>
        ) : activeTab === "favorites" ? (
          favoriteItems.length ? <div className="favorite-grid">{favoriteItems.map((item,index)=><div className="favorite-order-item" key={item._id || item.productId || index}><span>❤️</span><div><strong style={{ display:"block",color:"#17221a" }}>{item.name}</strong><small style={{ color:"#718076" }}>Saved from your previous orders</small><div style={{ marginTop:6,fontWeight:800,color:"#159b49" }}>₹{item.price}</div></div></div>)}</div> : <div className="empty-orders"><div style={{fontSize:52}}>♡</div><h3>No favourites yet</h3><p style={{color:"#6b7280"}}>Tap the heart on a product to save it here.</p><button onClick={()=>navigate("/user-dashboard")} style={{border:0,borderRadius:12,padding:"12px 22px",background:"#159b49",color:"white",fontWeight:700,cursor:"pointer"}}>Browse products</button></div>
        ) : visibleOrders.length === 0 ? <div className="empty-orders"><div style={{fontSize:52}}>📦</div><h3>No orders in this section</h3><p style={{color:"#6b7280"}}>Your orders will appear here as their status changes.</p></div> : (
          <div className="orders-list">
            {visibleOrders.map(order => {
              const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.Placed;
              return (
                <div className="professional-order-card" key={order._id} onClick={() => setSelected(order)}
                  style={{ background: "white", borderRadius: 16, padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", cursor: "pointer", border: order.status === "Out for Delivery" ? "2px solid #8b5cf6" : "2px solid transparent" }}>

                  {/* Live badge for out for delivery */}
                  {order.status === "Out for Delivery" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, background: "#f5f3ff", borderRadius: 20, padding: "4px 10px", width: "fit-content" }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#8b5cf6", display: "inline-block", animation: "livePulse 1.5s infinite" }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#8b5cf6" }}>LIVE TRACKING</span>
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, animation: order.status === "Out for Delivery" ? "bounce 1.5s infinite" : "none" }}>
                        {cfg.icon}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#111" }}>
                          {order.items?.slice(0, 2).map(i => i.name).join(", ")}
                          {order.items?.length > 2 ? ` +${order.items.length - 2} more` : ""}
                        </div>
                        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                          {order.items?.length} item{order.items?.length > 1 ? "s" : ""} • {formatDate(order.createdAt)}
                        </div>
                      </div>
                    </div>
                    <FaChevronRight color="#d1d5db" size={13} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ background: cfg.bg, color: cfg.color, fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 20 }}>
                      {cfg.label}
                    </span>
                    <span style={{ fontWeight: 800, fontSize: 16, color: "#111" }}>₹{order.totalAmount}</span>
                  </div>
                  {canCancel(order) && (
                    <button onClick={(event) => cancelOrder(event, order)} disabled={cancellingId === order._id}
                      style={{ width: "100%", marginTop: 14, padding: "10px 14px", border: "1px solid #fecaca", borderRadius: 11, background: "#fff", color: "#dc2626", fontWeight: 750, cursor: cancellingId === order._id ? "wait" : "pointer", opacity: cancellingId === order._id ? 0.65 : 1 }}>
                      {cancellingId === order._id ? "Cancelling..." : "Cancel Order"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ORDER DETAIL BOTTOM SHEET */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={(e) => e.target === e.currentTarget && setSelected(null)}>
          <div style={{ background: "white", borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 600, maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 12 }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: "#e5e7eb" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #f5f5f5" }}>
              <span style={{ fontWeight: 800, fontSize: 18, color: "#111" }}>Order Details</span>
              <button onClick={() => setSelected(null)} style={{ background: "#f5f5f5", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FaTimes size={13} color="#374151" />
              </button>
            </div>

            <div style={{ padding: "20px" }}>

              {/* ── LIVE TRACKING MAP (only when out for delivery) ── */}
              {selected.status === "Out for Delivery" && selected.deliveryPartnerId && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#8b5cf6", animation: "livePulse 1.5s infinite" }} />
                    <span style={{ fontWeight: 800, fontSize: 15, color: "#8b5cf6" }}>Live Tracking</span>
                    <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: "auto" }}>Updates every 10s</span>
                  </div>
                  <LiveTrackingMap
                    deliveryPartnerId={selected.deliveryPartnerId?._id || selected.deliveryPartnerId}
                    deliveryPartnerName={selected.deliveryPartnerId?.name}
                  />
                </div>
              )}

              {/* Delivery partner info card (when out for delivery) */}
              {selected.status === "Out for Delivery" && selected.deliveryPartnerId && (
                <div style={{ background: "#f5f3ff", borderRadius: 14, padding: 14, marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 44, height: 44, background: "#8b5cf6", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🏍️</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#111" }}>{selected.deliveryPartnerId?.name || "Delivery Partner"}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>{selected.deliveryPartnerId?.vehicleType} • {selected.deliveryPartnerId?.phone}</div>
                  </div>
                  <div style={{ background: "#8b5cf6", borderRadius: 20, padding: "4px 12px" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "white" }}>On the way</span>
                  </div>
                </div>
              )}

              {/* STATUS TRACKER */}
              {selected.status !== "Cancelled" ? (
                <div style={{ background: "#f9fafb", borderRadius: 16, padding: 16, marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#111", marginBottom: 16 }}>Order Tracking</div>
                  <div style={{ position: "relative" }}>
                    {/* Vertical line */}
                    <div style={{ position: "absolute", left: 13, top: 14, bottom: 14, width: 2, background: "#e5e7eb", zIndex: 0 }} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                      {STEPS.map((step, i) => {
                        const done = i <= getStepIndex(selected.status);
                        const active = i === getStepIndex(selected.status);
                        return (
                          <div key={step} style={{ display: "flex", alignItems: "center", gap: 14, position: "relative", zIndex: 1 }}>
                            <div style={{ width: 28, height: 28, borderRadius: "50%", background: done ? "#1a9c3e" : "white", border: `2px solid ${done ? "#1a9c3e" : "#e5e7eb"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: active ? "0 0 0 5px rgba(26,156,62,0.15)" : "none", transition: "all 0.3s" }}>
                              {done ? <span style={{ color: "white", fontSize: 12, fontWeight: 700 }}>✓</span> : <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#e5e7eb", display: "block" }} />}
                            </div>
                            <div>
                              <span style={{ fontWeight: active ? 800 : done ? 600 : 400, fontSize: 13, color: active ? "#1a9c3e" : done ? "#111" : "#9ca3af" }}>{step}</span>
                              {active && <div style={{ fontSize: 11, color: "#1a9c3e", marginTop: 1 }}>Current status</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ background: "#fef2f2", borderRadius: 12, padding: 14, marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 24 }}>❌</span>
                  <div>
                    <div style={{ fontWeight: 700, color: "#ef4444" }}>Order Cancelled</div>
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>This order was cancelled</div>
                  </div>
                </div>
              )}

              {/* ITEMS */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#111", marginBottom: 12 }}>Items Ordered</div>
                {selected.items?.map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < selected.items.length - 1 ? "1px solid #f5f5f5" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, background: "#f5f5f5", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📦</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "#111" }}>{item.name}</div>
                        <div style={{ fontSize: 12, color: "#9ca3af" }}>x{item.quantity} • ₹{item.price} each</div>
                      </div>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 14, color: "#111" }}>₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* ADDRESS */}
              {selected.address && (
                <div style={{ background: "#f9fafb", borderRadius: 12, padding: 14, marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 14, color: "#111", marginBottom: 8 }}>
                    <FaMapMarkerAlt color="#1a9c3e" size={14} /> Delivery Address
                  </div>
                  <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.7 }}>
                    {selected.address.name && typeof selected.address.name === "string" && (
                      <div style={{ fontWeight: 600, color: "#374151" }}>{selected.address.name}</div>
                    )}
                    <div>{formatAddress(selected.address)}</div>
                    {selected.address.phone && typeof selected.address.phone === "string" && (
                      <div>📞 {selected.address.phone}</div>
                    )}
                  </div>
                </div>
              )}

              {/* BILL */}
              <div style={{ background: "#f9fafb", borderRadius: 12, padding: 14, marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#111", marginBottom: 12 }}>Bill Details</div>
                {[
                  { label: "Items Total", val: `₹${selected.itemsTotal?.toFixed(2) || 0}` },
                  { label: "Delivery Charge", val: `₹${selected.deliveryCharge || 40}` },
                  { label: "GST (5%)", val: `₹${selected.gst?.toFixed(2) || 0}` },
                ].map((r, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13, color: "#6b7280" }}>
                    <span>{r.label}</span><span>{r.val}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 15, color: "#111", borderTop: "1px solid #e5e7eb", paddingTop: 10, marginTop: 4 }}>
                  <span>Grand Total</span><span>₹{selected.totalAmount}</span>
                </div>
              </div>

              {/* PAYMENT */}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", background: "#f9fafb", borderRadius: 12, marginBottom: 20 }}>
                <span style={{ fontSize: 13, color: "#6b7280" }}>Payment Method</span>
                <span style={{ fontWeight: 700, fontSize: 13, color: "#111" }}>{selected.paymentMethod || "COD"}</span>
              </div>

              <button onClick={() => { setSelected(null); navigate("/user-dashboard"); }}
                style={{ width: "100%", background: "#1a9c3e", color: "white", border: "none", borderRadius: 14, padding: "14px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                Order Again 🛒
              </button>
              {canCancel(selected) && (
                <button onClick={(event) => cancelOrder(event, selected)} disabled={cancellingId === selected._id}
                  style={{ width: "100%", marginTop: 10, background: "#fff", color: "#dc2626", border: "1.5px solid #fecaca", borderRadius: 14, padding: "13px", fontSize: 15, fontWeight: 700, cursor: cancellingId === selected._id ? "wait" : "pointer" }}>
                  {cancellingId === selected._id ? "Cancelling Order..." : "Cancel Order"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
