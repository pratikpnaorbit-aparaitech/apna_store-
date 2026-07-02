import { useEffect, useState } from "react";
import { API } from "../../services/api";
import { Package, X, MapPin, Truck } from "lucide-react";

const STATUS_COLORS = {
  Placed:             "bg-blue-100 text-blue-700",
  Confirmed:          "bg-yellow-100 text-yellow-700",
  Preparing:          "bg-orange-100 text-orange-700",
  "Out for Delivery": "bg-purple-100 text-purple-700",
  Delivered:          "bg-green-100 text-green-700",
  Cancelled:          "bg-red-100 text-red-700",
};

// Helper: safely format address object or string
const formatAddress = (address) => {
  if (!address) return "";
  if (typeof address === "string") return address;
  return [address.street, address.city, address.state, address.pincode]
    .filter(v => v && typeof v === "string")
    .join(", ");
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [deliveryPartners, setDeliveryPartners] = useState([]);
  const [assigning, setAssigning] = useState(false);
  const [filterStatus, setFilterStatus] = useState("All");

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const storeId = user.storeId?._id || user.storeId;

  useEffect(() => {
    fetchOrders();
    fetchDeliveryPartners();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/orders/store/${storeId}`);
      setOrders(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveryPartners = async () => {
    try {
      const res = await API.get("/delivery-partners");
      setDeliveryPartners((res.data?.data || []).filter(p => p.isActive));
    } catch (err) {
      console.error(err);
    }
  };

  const updateStatus = async (orderId, status) => {
    try {
      await API.put(`/orders/${orderId}/status`, { status });
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status } : o));
      if (selectedOrder?._id === orderId) setSelectedOrder(prev => ({ ...prev, status }));
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const assignDeliveryPartner = async (orderId, partnerId) => {
    try {
      setAssigning(true);
      await API.put(`/orders/${orderId}/assign-delivery`, { deliveryPartnerId: partnerId });
      setOrders(prev => prev.map(o => {
        if (o._id !== orderId) return o;
        const partner = deliveryPartners.find(p => p._id === partnerId);
        return { ...o, deliveryPartnerId: partner, status: "Confirmed" };
      }));
      if (selectedOrder?._id === orderId) {
        const partner = deliveryPartners.find(p => p._id === partnerId);
        setSelectedOrder(prev => ({ ...prev, deliveryPartnerId: partner, status: "Confirmed" }));
      }
      alert("Delivery partner assigned! ✅");
    } catch (err) {
      alert("Failed to assign delivery partner");
    } finally {
      setAssigning(false);
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
  });

  const statuses = ["All", "Placed", "Confirmed", "Preparing", "Out for Delivery", "Delivered", "Cancelled"];
  const filtered = filterStatus === "All" ? orders : orders.filter(o => o.status === filterStatus);
  const newOrders = orders.filter(o => o.status === "Placed").length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Store Orders</h1>
          {newOrders > 0 && (
            <p className="text-sm text-orange-600 font-semibold mt-1">
              🔔 {newOrders} new order{newOrders > 1 ? "s" : ""} waiting!
            </p>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap mb-5">
        {statuses.map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
              filterStatus === s
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300"
            }`}>
            {s} {s !== "All" && `(${orders.filter(o => o.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-2xl p-8 text-center text-slate-400">Loading orders...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center">
          <Package className="w-12 h-12 mx-auto mb-3 text-slate-200" />
          <p className="text-slate-400">No orders found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Order</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Customer</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Items</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Total</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Delivery Partner</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(order => (
                <tr key={order._id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs text-slate-400">#{order._id.slice(-6).toUpperCase()}</p>
                    <p className="text-xs text-slate-400">{formatDate(order.createdAt)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800">{order.userId?.name || "—"}</p>
                    <p className="text-xs text-slate-400">
                      {order.address && typeof order.address === "object"
                        ? order.address.phone || ""
                        : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {order.items?.length} item{order.items?.length > 1 ? "s" : ""}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-800">₹{order.totalAmount}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status] || "bg-slate-100 text-slate-600"}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {order.deliveryPartnerId ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">🏍️</span>
                        <span className="text-xs font-semibold text-slate-700">
                          {order.deliveryPartnerId?.name || "Assigned"}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Not assigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelectedOrder(order)}
                      className="text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-lg font-semibold transition">
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white rounded-t-3xl">
              <div>
                <h2 className="font-black text-slate-800">Order #{selectedOrder._id.slice(-6).toUpperCase()}</h2>
                <p className="text-xs text-slate-400">{formatDate(selectedOrder.createdAt)}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">

              {/* Current status */}
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${STATUS_COLORS[selectedOrder.status]}`}>
                  {selectedOrder.status}
                </span>
              </div>

              {/* Status actions */}
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  {["Confirmed", "Preparing", "Cancelled"].map(s => (
                    <button key={s} onClick={() => updateStatus(selectedOrder._id, s)}
                      disabled={selectedOrder.status === s}
                      className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition ${
                        selectedOrder.status === s
                          ? STATUS_COLORS[s] + " border-transparent"
                          : "border-slate-200 text-slate-500 hover:border-indigo-300"
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Assign delivery partner */}
              <div className="bg-orange-50 rounded-xl p-4">
                <p className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
                  <Truck className="w-4 h-4 text-orange-500" /> Assign Delivery Partner
                </p>
                {selectedOrder.deliveryPartnerId ? (
                  <div className="flex items-center gap-2 bg-white rounded-lg p-2.5">
                    <span className="text-xl">🏍️</span>
                    <div>
                      <p className="font-semibold text-sm text-slate-800">
                        {selectedOrder.deliveryPartnerId?.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {selectedOrder.deliveryPartnerId?.phone} • {selectedOrder.deliveryPartnerId?.vehicleType}
                      </p>
                    </div>
                  </div>
                ) : (
                  <select
                    onChange={e => e.target.value && assignDeliveryPartner(selectedOrder._id, e.target.value)}
                    disabled={assigning}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                    defaultValue="">
                    <option value="">Select delivery partner...</option>
                    {deliveryPartners.map(p => (
                      <option key={p._id} value={p._id}>
                        🏍️ {p.name} • {p.phone} • {p.vehicleType}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Customer & Address — safe rendering */}
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">Customer</p>
                <p className="font-semibold text-slate-800">{selectedOrder.userId?.name || "—"}</p>
                {selectedOrder.address && (
                  <p className="text-sm text-slate-500 flex items-start gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
                    {formatAddress(selectedOrder.address)}
                  </p>
                )}
                {selectedOrder.address?.phone && typeof selectedOrder.address.phone === "string" && (
                  <p className="text-sm text-slate-500 mt-1">📞 {selectedOrder.address.phone}</p>
                )}
              </div>

              {/* Items */}
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">Items</p>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-slate-600">{item.name} × {item.quantity}</span>
                      <span className="font-semibold">₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price summary */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Items Total</span><span>₹{selectedOrder.itemsTotal?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Delivery</span><span>₹{selectedOrder.deliveryCharge}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>GST</span><span>₹{selectedOrder.gst?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-slate-800 text-base border-t pt-2">
                  <span>Total</span><span>₹{selectedOrder.totalAmount}</span>
                </div>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Payment</span>
                <span className="font-semibold">{selectedOrder.paymentMethod || "COD"}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}