import { useEffect, useState } from "react";
import { API } from "../../services/api";
import {
  Truck, Plus, Search, Phone, Mail, X,
  CheckCircle, AlertCircle, Pencil, Trash2,
  ToggleLeft, ToggleRight
} from "lucide-react";

const VEHICLE_TYPES = ["bike", "scooter", "other"];

const vehicleEmoji = {
  bike: "🏍️", scooter: "🛵",
   other: "🚚"
};

function DeliveryPartners() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "", phone: "", email: "",
    vehicleType: "bike", vehicleNumber: ""
  });

  /* ── Password modal state ── */
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordPartner, setPasswordPartner] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [settingPassword, setSettingPassword] = useState(false);

  useEffect(() => { fetchPartners(); }, []);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const res = await API.get("/delivery-partners");
      setPartners(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch delivery partners:", err);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingPartner(null);
    setForm({ name: "", phone: "", email: "", vehicleType: "bike", vehicleNumber: "" });
    setShowModal(true);
  };

  const openEdit = (partner) => {
    setEditingPartner(partner);
    setForm({
      name: partner.name || "",
      phone: partner.phone || "",
      email: partner.email || "",
      vehicleType: partner.vehicleType || "bike",
      vehicleNumber: partner.vehicleNumber || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
      if (!form.name || !form.phone) { alert("Name and phone are required"); return; }
      setSubmitting(true);
      if (editingPartner) {
        await API.put(`/delivery-partners/${editingPartner._id}`, form);
        alert("Partner updated successfully ✅");
      } else {
        await API.post("/delivery-partners", form);
        alert("Delivery partner added successfully ✅");
      }
      setShowModal(false);
      fetchPartners();
    } catch (err) {
      alert(err.response?.data?.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (partner) => {
    try {
      await API.put(`/delivery-partners/${partner._id}`, { isActive: !partner.isActive });
      fetchPartners();
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove "${name}" as a delivery partner?`)) return;
    try {
      await API.delete(`/delivery-partners/${id}`);
      fetchPartners();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete");
    }
  };

  const handleSetPassword = async () => {
    if (!newPassword || newPassword.length < 4) {
      alert("Password must be at least 4 characters");
      return;
    }
    try {
      setSettingPassword(true);
      await API.put(`/delivery-partners/${passwordPartner._id}/set-password`, { password: newPassword });
      alert(`Password set for ${passwordPartner.name} ✅`);
      setShowPasswordModal(false);
      setNewPassword("");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to set password");
    } finally {
      setSettingPassword(false);
    }
  };

  const filtered = partners.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phone?.includes(searchTerm) ||
    p.vehicleNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCount = partners.filter(p => p.isActive).length;

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-orange-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Delivery Partners</h1>
            <p className="text-sm text-slate-500">Manage your delivery fleet</p>
          </div>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-orange-200 transition">
          <Plus className="w-4 h-4" /> Add Partner
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
            <Truck className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{partners.length}</p>
            <p className="text-xs text-slate-400 font-medium">Total Partners</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{activeCount}</p>
            <p className="text-xs text-slate-400 font-medium">Active</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{partners.length - activeCount}</p>
            <p className="text-xs text-slate-400 font-medium">Inactive</p>
          </div>
        </div>
      </div>

      {/* SEARCH */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input type="text" placeholder="Search by name, phone, or vehicle number..."
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 outline-none text-sm text-slate-700 placeholder:text-slate-400"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm("")}>
            <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
          </button>
        )}
      </div>

      {/* TABLE */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <Truck className="w-12 h-12 mx-auto mb-3 text-slate-200" />
          <p className="font-semibold text-slate-400">No delivery partners found</p>
          <p className="text-sm text-slate-300 mt-1">Click "Add Partner" to get started</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-6 py-3">Partner</th>
                <th className="text-left px-6 py-3">Contact</th>
                <th className="text-left px-6 py-3">Vehicle</th>
                <th className="text-left px-6 py-3">Plate No.</th>
                <th className="text-left px-6 py-3">Status</th>
                <th className="text-left px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((partner) => (
                <tr key={partner._id} className="border-t hover:bg-slate-50 transition">

                  {/* Name */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold">
                        {partner.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{partner.name}</p>
                        <p className="text-xs text-slate-400">
                          {partner.password ? "🔑 Password set" : "⚠️ No password"}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Contact */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-slate-600 text-xs">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> {partner.phone}
                    </div>
                    {partner.email && (
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs mt-1">
                        <Mail className="w-3.5 h-3.5" /> {partner.email}
                      </div>
                    )}
                  </td>

                  {/* Vehicle Type */}
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1.5 text-sm">
                      <span>{vehicleEmoji[partner.vehicleType] || "🚚"}</span>
                      <span className="capitalize text-slate-600">{partner.vehicleType}</span>
                    </span>
                  </td>

                  {/* Plate */}
                  <td className="px-6 py-4">
                    {partner.vehicleNumber ? (
                      <span className="font-mono bg-slate-100 text-slate-700 px-2.5 py-1 rounded text-xs font-bold tracking-wider">
                        {partner.vehicleNumber.toUpperCase()}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>

                  {/* Status Toggle */}
                  <td className="px-6 py-4">
                    <button onClick={() => handleToggle(partner)}
                      className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full transition ${
                        partner.isActive
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-red-100 text-red-500 hover:bg-red-200"
                      }`}>
                      {partner.isActive
                        ? <><ToggleRight className="w-3.5 h-3.5" /> Active</>
                        : <><ToggleLeft className="w-3.5 h-3.5" /> Inactive</>}
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => openEdit(partner)}
                        className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg transition">
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => { setPasswordPartner(partner); setShowPasswordModal(true); }}
                        className="flex items-center gap-1 text-xs font-medium text-orange-500 hover:bg-orange-50 px-2.5 py-1.5 rounded-lg transition">
                        🔑 Password
                      </button>
                      <button onClick={() => handleDelete(partner._id, partner.name)}
                        className="flex items-center gap-1 text-xs font-medium text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition">
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Truck className="w-4 h-4 text-orange-500" />
                </div>
                <h2 className="text-lg font-bold text-slate-800">
                  {editingPartner ? "Edit Partner" : "Add Delivery Partner"}
                </h2>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name *</label>
                <input type="text" placeholder="Enter full name" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone *</label>
                <input type="text" placeholder="Mobile number" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email (optional)</label>
                <input type="email" placeholder="email@example.com" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Vehicle Type</label>
                  <select value={form.vehicleType}
                    onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm">
                    {VEHICLE_TYPES.map(v => (
                      <option key={v} value={v}>{vehicleEmoji[v]} {v.charAt(0).toUpperCase() + v.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Plate Number</label>
                  <input type="text" placeholder="e.g. MH12AB1234" value={form.vehicleNumber}
                    onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value.toUpperCase() })}
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm font-mono uppercase"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-slate-100">
              <button onClick={handleSubmit} disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-semibold transition disabled:opacity-50">
                <CheckCircle className="w-4 h-4" />
                {submitting ? "Saving..." : editingPartner ? "Update Partner" : "Add Partner"}
              </button>
              <button onClick={() => setShowModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 py-3 rounded-xl font-semibold transition text-slate-600">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SET PASSWORD MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold text-slate-800">Set Password</h2>
              <button onClick={() => { setShowPasswordModal(false); setNewPassword(""); }}
                className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-orange-50 rounded-xl p-3">
                <p className="text-sm text-slate-600">
                  Setting password for <strong>{passwordPartner?.name}</strong>
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  They will login at <strong>/delivery-login</strong> using phone: <strong>{passwordPartner?.phone}</strong>
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-600 mb-1 block">New Password</label>
                <input type="text" placeholder="Min 4 characters" value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <button onClick={handleSetPassword} disabled={settingPassword}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold transition disabled:opacity-50">
                {settingPassword ? "Setting..." : "🔑 Set Password"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default DeliveryPartners;