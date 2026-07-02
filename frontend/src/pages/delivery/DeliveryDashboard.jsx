import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaMotorcycle, FaSignOutAlt, FaMapMarkerAlt, FaPhone } from "react-icons/fa";
import { CheckCircle, Truck, MapPin, Bug } from "lucide-react";

const STATUS_COLORS = {
  Confirmed:          "bg-yellow-100 text-yellow-700",
  Preparing:          "bg-orange-100 text-orange-700",
  "Out for Delivery": "bg-blue-100 text-blue-700",
  Delivered:          "bg-green-100 text-green-700",
};

const formatAddress = (address) => {
  if (!address) return "";
  if (typeof address === "string") return address;
  return [address.street, address.city, address.pincode]
    .filter(v => v && typeof v === "string").join(", ");
};

const getPhone = (address) => {
  if (!address || typeof address === "string") return "";
  return typeof address.phone === "string" ? address.phone : "";
};

// ── Mini map to show YOUR current GPS position ──
function MiniMap({ lat, lng }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!lat || !lng) return;

    // Inject Leaflet CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const loadAndInit = () => {
      return new Promise((resolve) => {
        if (window.L) { resolve(); return; }
        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = resolve;
        document.head.appendChild(script);
      });
    };

    loadAndInit().then(() => {
      if (!mapRef.current) return;

      if (!mapInstanceRef.current) {
        const map = window.L.map(mapRef.current, { zoomControl: true, attributionControl: false });
        window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
        mapInstanceRef.current = map;
      }

      const icon = window.L.divIcon({
        className: "",
        html: `<div style="background:#f97316;border:3px solid white;border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 3px 10px rgba(249,115,22,0.5)">🏍️</div>`,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = window.L.marker([lat, lng], { icon })
          .addTo(mapInstanceRef.current)
          .bindPopup("<b>Your location</b>").openPopup();
      }

      mapInstanceRef.current.setView([lat, lng], 16, { animate: true });
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [lat, lng]);

  return <div ref={mapRef} style={{ height: 200, width: "100%", borderRadius: 12, overflow: "hidden" }} />;
}

export default function DeliveryDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [partner, setPartner] = useState(null);
  const [locationStatus, setLocationStatus] = useState("idle");
  const [myLocation, setMyLocation] = useState(null); // { lat, lng }
  const [serverLocation, setServerLocation] = useState(null); // what server stored
  const [showDebug, setShowDebug] = useState(false);
  const [lastPushed, setLastPushed] = useState(null);
  const locationIntervalRef = useRef(null);

  const dpToken = localStorage.getItem("dp_token");
  const partnerData = JSON.parse(localStorage.getItem("dp_user") || "{}");

  const API = axios.create({
    baseURL: "http://localhost:5000/api",
    headers: { Authorization: `Bearer ${dpToken}` }
  });

  useEffect(() => {
    const dp = localStorage.getItem("dp_user");
    if (!dp || !dpToken) { navigate("/delivery-login"); return; }
    setPartner(JSON.parse(dp));
    fetchOrders();
    return () => stopLocationSharing();
  }, []);

  useEffect(() => {
    const hasActiveDelivery = orders.some(o => o.status === "Out for Delivery");
    if (hasActiveDelivery) startLocationSharing();
    else stopLocationSharing();
  }, [orders]);

  const startLocationSharing = () => {
    if (locationIntervalRef.current) return;
    if (!navigator.geolocation) { setLocationStatus("error"); return; }
    setLocationStatus("sharing");
    const pushLocation = () => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setMyLocation({ lat, lng });
          try {
            await API.put("/delivery-partners/location", { lat, lng });
            setLastPushed(new Date());
            // Also fetch back from server to confirm it saved correctly
            if (partnerData?.id || partnerData?._id) {
              const id = partnerData.id || partnerData._id;
              const res = await fetch(`http://localhost:5000/api/delivery-partners/${id}/location`);
              const data = await res.json();
              if (data.location) setServerLocation(data.location);
            }
          } catch (err) {
            console.error("Location push failed:", err);
          }
        },
        () => setLocationStatus("error"),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };
    pushLocation();
    locationIntervalRef.current = setInterval(pushLocation, 10000);
  };

  const stopLocationSharing = () => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
    setLocationStatus("idle");
  };

  // Manual one-time location test (even without active delivery)
  const testLocation = () => {
    if (!navigator.geolocation) { alert("GPS not available"); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMyLocation({ lat, lng });
        try {
          await API.put("/delivery-partners/location", { lat, lng });
          setLastPushed(new Date());
          const id = partnerData?.id || partnerData?._id;
          if (id) {
            const res = await fetch(`http://localhost:5000/api/delivery-partners/${id}/location`);
            const data = await res.json();
            if (data.location) setServerLocation(data.location);
          }
          alert("✅ Location pushed! Check the map below.");
        } catch (err) {
          alert("❌ Failed to push location: " + err.message);
        }
      },
      (err) => alert("❌ GPS error: " + err.message),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await API.get("/delivery-partners/my-orders");
      setOrders(res.data?.data || []);
    } catch (err) {
      if (err.response?.status === 401) navigate("/delivery-login");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId, status) => {
    try {
      setUpdating(orderId);
      await API.put(`/delivery-partners/order/${orderId}/status`, { status });
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status } : o));
    } catch {
      alert("Failed to update status");
    } finally {
      setUpdating(null);
    }
  };

  const logout = () => {
    stopLocationSharing();
    localStorage.removeItem("dp_token");
    localStorage.removeItem("dp_user");
    navigate("/delivery-login");
  };

  const formatDate = (d) => new Date(d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
  });

  const activeOrders = orders.filter(o => o.status !== "Delivered" && o.status !== "Cancelled");
  const completedOrders = orders.filter(o => o.status === "Delivered");

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-orange-500 text-white px-4 py-4 sticky top-0 z-30 shadow-md">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <FaMotorcycle size={18} />
            </div>
            <div>
              <p className="font-bold text-base">{partner?.name}</p>
              <p className="text-orange-100 text-xs">{partner?.vehicleType} • {partner?.vehicleNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {locationStatus === "sharing" && (
              <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1">
                <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse inline-block" />
                <span className="text-xs font-semibold">Live</span>
              </div>
            )}
            {/* Debug toggle button */}
            <button onClick={() => setShowDebug(!showDebug)}
              className={`p-2 rounded-lg transition ${showDebug ? "bg-white/40" : "bg-white/20 hover:bg-white/30"}`}
              title="GPS Debug Panel">
              <Bug size={16} />
            </button>
            <button onClick={logout} className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition">
              <FaSignOutAlt />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* ── GPS DEBUG PANEL ── */}
        {showDebug && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border-2 border-orange-200">
            <div className="bg-orange-50 px-4 py-3 flex items-center justify-between border-b border-orange-100">
              <div className="flex items-center gap-2">
                <Bug size={16} className="text-orange-500" />
                <span className="font-bold text-orange-700 text-sm">GPS Debug Panel</span>
              </div>
              <span className="text-xs text-orange-500">Verify your location is correct</span>
            </div>

            <div className="p-4 space-y-4">

              {/* Test button */}
              <button onClick={testLocation}
                className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold transition">
                <MapPin size={16} />
                Test — Get & Push My Location Now
              </button>

              {/* Coordinates comparison */}
              {myLocation && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                    <p className="text-xs font-bold text-blue-600 mb-2">📱 Your Device GPS</p>
                    <p className="text-xs font-mono text-blue-800">lat: {myLocation.lat.toFixed(6)}</p>
                    <p className="text-xs font-mono text-blue-800">lng: {myLocation.lng.toFixed(6)}</p>
                  </div>
                  <div className={`rounded-xl p-3 border ${serverLocation ? "bg-green-50 border-green-100" : "bg-gray-50 border-gray-100"}`}>
                    <p className={`text-xs font-bold mb-2 ${serverLocation ? "text-green-600" : "text-gray-400"}`}>
                      🖥️ Server Stored
                    </p>
                    {serverLocation ? (
                      <>
                        <p className="text-xs font-mono text-green-800">lat: {serverLocation.lat?.toFixed(6)}</p>
                        <p className="text-xs font-mono text-green-800">lng: {serverLocation.lng?.toFixed(6)}</p>
                      </>
                    ) : (
                      <p className="text-xs text-gray-400">Not pushed yet</p>
                    )}
                  </div>
                </div>
              )}

              {/* Match check */}
              {myLocation && serverLocation && (
                <div className={`rounded-xl p-3 text-center font-bold text-sm ${
                  Math.abs(myLocation.lat - serverLocation.lat) < 0.0001 &&
                  Math.abs(myLocation.lng - serverLocation.lng) < 0.0001
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}>
                  {Math.abs(myLocation.lat - serverLocation.lat) < 0.0001 &&
                   Math.abs(myLocation.lng - serverLocation.lng) < 0.0001
                    ? "✅ Device GPS matches Server — Tracking is working!"
                    : "❌ Mismatch — Location may not be saved correctly"}
                </div>
              )}

              {lastPushed && (
                <p className="text-xs text-center text-gray-400">
                  Last pushed to server: {lastPushed.toLocaleTimeString()}
                </p>
              )}

              {/* Mini map showing YOUR position */}
              {myLocation && (
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-2">📍 Your position on map (this is what customer sees)</p>
                  <MiniMap lat={myLocation.lat} lng={myLocation.lng} />
                  <p className="text-xs text-center text-gray-400 mt-2">
                    If this pin is in the right place, the customer map is also correct ✅
                  </p>
                </div>
              )}

              {/* Google Maps link for quick verification */}
              {myLocation && (
                <a
                  href={`https://www.google.com/maps?q=${myLocation.lat},${myLocation.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center bg-blue-50 text-blue-600 font-bold text-sm py-2.5 rounded-xl border border-blue-100 hover:bg-blue-100 transition">
                  🗺️ Open in Google Maps to verify
                </a>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-black text-orange-500">{activeOrders.length}</p>
            <p className="text-xs text-slate-400 mt-1">Active</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-black text-green-500">{completedOrders.length}</p>
            <p className="text-xs text-slate-400 mt-1">Delivered</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-black text-slate-800">{orders.length}</p>
            <p className="text-xs text-slate-400 mt-1">Total</p>
          </div>
        </div>

        {/* Location sharing banner */}
        {locationStatus === "sharing" && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <FaMapMarkerAlt className="text-green-600" size={16} />
            </div>
            <div>
              <p className="font-bold text-green-800 text-sm">📍 Sharing live location</p>
              <p className="text-xs text-green-600">
                Customer can see you on the map • Updates every 10s
                {lastPushed && ` • Last: ${lastPushed.toLocaleTimeString()}`}
              </p>
            </div>
          </div>
        )}

        {locationStatus === "error" && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-bold text-red-700 text-sm">Location access denied</p>
              <p className="text-xs text-red-500">Enable GPS in browser settings for live tracking</p>
            </div>
          </div>
        )}

        {/* Active Orders */}
        <div>
          <h2 className="font-black text-slate-800 text-lg mb-3">🚀 Active Orders ({activeOrders.length})</h2>

          {loading ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : activeOrders.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center text-slate-400">
              <Truck className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No active orders right now</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeOrders.map(order => {
                const phone = getPhone(order.address);
                const addressText = formatAddress(order.address);
                return (
                  <div key={order._id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b flex items-center justify-between">
                      <div>
                        <p className="font-black text-slate-800">Order #{order._id.slice(-6).toUpperCase()}</p>
                        <p className="text-xs text-slate-400">{formatDate(order.createdAt)}</p>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${STATUS_COLORS[order.status] || "bg-slate-100 text-slate-600"}`}>
                        {order.status}
                      </span>
                    </div>

                    <div className="p-4 border-b bg-slate-50">
                      <p className="font-semibold text-slate-700 flex items-center gap-2 mb-1">
                        <FaPhone className="text-orange-400" size={12} />
                        {order.userId?.name || "Customer"}
                        {phone ? ` • ${phone}` : ""}
                      </p>
                      {addressText && (
                        <p className="text-sm text-slate-500 flex items-start gap-2">
                          <FaMapMarkerAlt className="text-red-400 mt-0.5 shrink-0" size={12} />
                          {addressText}
                        </p>
                      )}
                    </div>

                    <div className="p-4 border-b">
                      <p className="text-xs text-slate-400 mb-2">Items</p>
                      {order.items?.map((item, i) => (
                        <p key={i} className="text-sm text-slate-600">{item.name} × {item.quantity}</p>
                      ))}
                      <p className="font-black text-slate-800 mt-2">₹{order.totalAmount}</p>
                      <p className="text-xs text-slate-400">{order.paymentMethod || "COD"}</p>
                    </div>

                    <div className="p-4">
                      {(order.status === "Confirmed" || order.status === "Preparing") ? (
                        <button onClick={() => updateStatus(order._id, "Out for Delivery")}
                          disabled={updating === order._id}
                          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition disabled:opacity-50">
                          <Truck className="w-4 h-4" />
                          {updating === order._id ? "Updating..." : "Pick Up / Out for Delivery"}
                        </button>
                      ) : order.status === "Out for Delivery" ? (
                        <button onClick={() => updateStatus(order._id, "Delivered")}
                          disabled={updating === order._id}
                          className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold transition disabled:opacity-50">
                          <CheckCircle className="w-4 h-4" />
                          {updating === order._id ? "Updating..." : "Mark as Delivered ✓"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Completed */}
        {completedOrders.length > 0 && (
          <div>
            <h2 className="font-black text-slate-800 text-lg mb-3">✅ Completed ({completedOrders.length})</h2>
            <div className="space-y-3">
              {completedOrders.slice(0, 5).map(order => (
                <div key={order._id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-700">#{order._id.slice(-6).toUpperCase()}</p>
                    <p className="text-xs text-slate-400">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-800">₹{order.totalAmount}</p>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Delivered</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}