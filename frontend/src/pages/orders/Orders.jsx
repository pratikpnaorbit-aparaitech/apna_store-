import { useEffect, useState } from "react";
import { API } from "../../services/api";
import { FaEye, FaTimes } from "react-icons/fa";
import { MapPin, Package } from "lucide-react";

const STATUS_OPTIONS = ["Placed", "Confirmed", "Preparing", "Out for Delivery", "Delivered", "Cancelled"];

const STATUS_COLORS = {
  Placed:               "bg-blue-100 text-blue-700",
  Confirmed:            "bg-yellow-100 text-yellow-700",
  Preparing:            "bg-orange-100 text-orange-700",
  "Out for Delivery":   "bg-purple-100 text-purple-700",
  Delivered:            "bg-green-100 text-green-700",
  Cancelled:            "bg-red-100 text-red-700",
};

// Helper: safely format address object or string
const formatAddress = (address) => {
  if (!address) return "";
  if (typeof address === "string") return address;
  return [address.name, address.street, address.city, address.state, address.pincode]
    .filter(v => v && typeof v === "string")
    .join(", ");
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await API.get("/orders/all");
      setOrders(res.data || []);
    } catch (error) {
      console.error("Error fetching orders", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId, newStatus) => {
    try {
      setUpdatingId(orderId);
      await API.put(`/orders/${orderId}/status`, { status: newStatus });
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o));
      if (selectedOrder?._id === orderId) setSelectedOrder(prev => ({ ...prev, status: newStatus }));
    } catch (err) {
      alert("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  });

  const filtered = filterStatus === "All" ? orders : orders.filter(o => o.status === filterStatus);

  const stats = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s] = orders.filter(o => o.status === s).length;
    return acc;
  }, {});

  return (
    <div className="p-6">
      <h1 className="text-2xl font-black text-slate-800 mb-6">All Orders</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
        {STATUS_OPTIONS.map(s => (
          <div key={s} className={`rounded-xl p-3 text-center cursor-pointer border-2 transition ${
            filterStatus === s ? "border-purple-500 bg-purple-50" : "border-transparent bg-white"
          }`} onClick={() => setFilterStatus(filterStatus === s ? "All" : s)}>
            <p className="text-2xl font-black text-slate-800">{stats[s] || 0}</p>
            <p className={`text-xs font-semibold px-1.5 py-0.5 rounded-full mt-1 ${STATUS_COLORS[s]}`}>{s}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap mb-4">
        {["All", ...STATUS_OPTIONS].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
              filterStatus === s ? "bg-purple-600 text-white border-purple-600" : "bg-white text-slate-500 border-slate-200"
            }`}>
            {s} {s !== "All" && `(${stats[s] || 0})`}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-2xl p-8 text-center text-slate-400">Loading orders...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-slate-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No orders found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Order ID</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Customer</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Items</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Total</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(order => (
                <tr key={order._id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    #{order._id.slice(-6).toUpperCase()}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800">{order.userId?.name || "—"}</p>
                    <p className="text-xs text-slate-400">{order.userId?.mobile || order.userId?.email || ""}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {order.items?.length} item{order.items?.length > 1 ? "s" : ""}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-800">₹{order.totalAmount}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{formatDate(order.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status] || "bg-slate-100 text-slate-600"}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelectedOrder(order)}
                      className="p-2 hover:bg-purple-50 rounded-lg text-purple-600 transition">
                      <FaEye />
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
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="font-black text-slate-800">Order Details</h2>
                <p className="text-xs text-slate-400 font-mono">#{selectedOrder._id.slice(-6).toUpperCase()}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 rounded-full">
                <FaTimes />
              </button>
            </div>
            <div className="p-6 space-y-5">

              {/* Status update */}
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-2 block">Update Status</label>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map(s => (
                    <button key={s} onClick={() => updateStatus(selectedOrder._id, s)}
                      disabled={updatingId === selectedOrder._id}
                      className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition ${
                        selectedOrder.status === s
                          ? STATUS_COLORS[s] + " border-transparent"
                          : "border-slate-200 text-slate-500 hover:border-purple-300"
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer */}
              <div>
                <h3 className="font-semibold text-slate-700 mb-2">Customer</h3>
                <p className="text-sm text-slate-600">{selectedOrder.userId?.name || "—"}</p>
                <p className="text-xs text-slate-400">{selectedOrder.userId?.email || ""}</p>
              </div>

              {/* Items */}
              <div>
                <h3 className="font-semibold text-slate-700 mb-3">Items</h3>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-slate-600">{item.name} × {item.quantity}</span>
                      <span className="font-semibold">₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Address — safe rendering */}
              {selectedOrder.address && (
                <div>
                  <h3 className="font-semibold text-slate-700 mb-2 flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> Delivery Address
                  </h3>
                  <p className="text-sm text-slate-500">
                    {formatAddress(selectedOrder.address)}
                  </p>
                  {selectedOrder.address?.phone && typeof selectedOrder.address.phone === "string" && (
                    <p className="text-sm text-slate-500">📞 {selectedOrder.address.phone}</p>
                  )}
                </div>
              )}

              {/* Price */}
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
                <span className="text-slate-500">Payment Method</span>
                <span className="font-semibold">{selectedOrder.paymentMethod || "COD"}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}