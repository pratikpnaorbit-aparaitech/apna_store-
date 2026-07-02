import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API } from "../../services/api";
import {
  Store, Users, Mail, Phone, Calendar, ArrowLeft,
  UserCircle, Briefcase, MapPin, Shield, Plus, X,
  CheckCircle, Pencil, Save
} from "lucide-react";

const PRESET_CATEGORIES = [
  "Grocery", "Pharmacy", "Electronics", "Clothing & Fashion",
  "Food & Beverages", "Hardware", "Stationery", "Beauty & Cosmetics",
  "Sports & Fitness", "Books", "Toys & Games",
];

const CATEGORY_COLORS = {
  "Grocery":            "bg-green-100 text-green-700",
  "Pharmacy":           "bg-blue-100 text-blue-700",
  "Electronics":        "bg-purple-100 text-purple-700",
  "Clothing & Fashion": "bg-pink-100 text-pink-700",
  "Food & Beverages":   "bg-orange-100 text-orange-700",
  "Hardware":           "bg-yellow-100 text-yellow-700",
  "Stationery":         "bg-cyan-100 text-cyan-700",
  "Beauty & Cosmetics": "bg-rose-100 text-rose-700",
  "Sports & Fitness":   "bg-teal-100 text-teal-700",
  "Books":              "bg-amber-100 text-amber-700",
  "Toys & Games":       "bg-indigo-100 text-indigo-700",
};

function getCategoryColor(cat) {
  return CATEGORY_COLORS[cat] || "bg-slate-100 text-slate-600";
}

function StoreAdminProfile() {
  const { adminId } = useParams();
  const navigate = useNavigate();

  const [admin, setAdmin] = useState(null);
  const [staff, setStaff] = useState([]);
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Edit Admin Modal ──
  const [showEditAdmin, setShowEditAdmin] = useState(false);
  const [adminForm, setAdminForm] = useState({ name: "", email: "", mobile: "" });
  const [savingAdmin, setSavingAdmin] = useState(false);

  // ── Edit Store Modal ──
  const [showEditStore, setShowEditStore] = useState(false);
  const [storeForm, setStoreForm] = useState({
    name: "", phone: "", email: "",
    categories: [],
    street: "", city: "", state: "", pincode: ""
  });
  const [customCategory, setCustomCategory] = useState("");
  const [savingStore, setSavingStore] = useState(false);

  // ── Assign Store Modal ──
  const [showAssignStore, setShowAssignStore] = useState(false);
  const [assignForm, setAssignForm] = useState({
    name: "", phone: "", email: "",
    categories: [],
    street: "", city: "", state: "", pincode: ""
  });
  const [assignCustomCategory, setAssignCustomCategory] = useState("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => { fetchAdminData(); }, [adminId]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/users/admins/${adminId}`);
      if (!res.data.success) throw new Error(res.data.message);
      setAdmin(res.data.data.admin);
      setStore(res.data.data.store);
      setStaff(res.data.data.staff || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Open edit admin ──
  const openEditAdmin = () => {
    setAdminForm({ name: admin.name || "", email: admin.email || "", mobile: admin.mobile || "" });
    setShowEditAdmin(true);
  };

  const handleSaveAdmin = async () => {
    try {
      if (!adminForm.name || !adminForm.email) { alert("Name and email are required"); return; }
      setSavingAdmin(true);
      await API.put(`/users/admins/${adminId}`, {
        name: adminForm.name,
        email: adminForm.email,
        mobile: adminForm.mobile,
      });
      alert("Admin details updated ✅");
      setShowEditAdmin(false);
      fetchAdminData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update admin");
    } finally {
      setSavingAdmin(false);
    }
  };

  // ── Open edit store ──
  const openEditStore = () => {
    setStoreForm({
      name: store.name || "",
      phone: store.phone || "",
      email: store.email || "",
      categories: store.categories || [],
      street: store.address?.street || "",
      city: store.address?.city || "",
      state: store.address?.state || "",
      pincode: store.address?.pincode || "",
    });
    setCustomCategory("");
    setShowEditStore(true);
  };

  const handleSaveStore = async () => {
    try {
      if (!storeForm.name) { alert("Store name is required"); return; }
      setSavingStore(true);
      await API.put(`/stores/${store._id}`, {
        name: storeForm.name,
        phone: storeForm.phone,
        email: storeForm.email,
        categories: storeForm.categories,
        address: {
          street: storeForm.street,
          city: storeForm.city,
          state: storeForm.state,
          pincode: storeForm.pincode,
        },
      });
      alert("Store updated ✅");
      setShowEditStore(false);
      fetchAdminData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update store");
    } finally {
      setSavingStore(false);
    }
  };

  // ── Category helpers (shared) ──
  const toggleCat = (cat, form, setForm) => {
    setForm(prev => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat]
    }));
  };

  const addCustomCat = (val, setVal, form, setForm) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    if (form.categories.includes(trimmed)) { alert("Already added"); return; }
    setForm(prev => ({ ...prev, categories: [...prev.categories, trimmed] }));
    setVal("");
  };

  const removeCat = (cat, form, setForm) => {
    setForm(prev => ({ ...prev, categories: prev.categories.filter(c => c !== cat) }));
  };

  // ── Assign Store ──
  const handleAssignStore = async () => {
    try {
      if (!assignForm.name) { alert("Store name is required"); return; }
      setAssigning(true);
      const res = await API.post("/stores", {
        name: assignForm.name,
        categories: assignForm.categories,
        phone: assignForm.phone,
        email: assignForm.email,
        address: {
          street: assignForm.street,
          city: assignForm.city,
          state: assignForm.state,
          pincode: assignForm.pincode,
        },
        adminId,
      });
      if (!res.data.success) throw new Error(res.data.message);
      alert("Store assigned successfully ✅");
      setShowAssignStore(false);
      setAssignForm({ name: "", phone: "", email: "", categories: [], street: "", city: "", state: "", pincode: "" });
      fetchAdminData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to assign store");
    } finally {
      setAssigning(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
    </div>
  );
  if (error) return <div className="p-6 text-center text-red-500 font-medium">{error}</div>;
  if (!admin) return <div className="p-6 text-center text-slate-500">Admin not found.</div>;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">

      {/* BACK */}
      <button onClick={() => navigate("/store-admins")} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Store Admins
      </button>

      {/* ═══════════════ ADMIN CARD ═══════════════ */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-3xl font-bold text-white">{admin.name?.charAt(0).toUpperCase()}</span>
              </div>
              <div className="text-white">
                <h2 className="text-2xl font-bold">{admin.name}</h2>
                <p className="text-indigo-100 flex items-center gap-2 mt-1">
                  <Briefcase className="w-4 h-4" /> Store Administrator
                </p>
                <span className={`mt-2 inline-block text-xs font-bold px-3 py-1 rounded-full ${admin.isActive ? "bg-green-400/30 text-green-100" : "bg-red-400/30 text-red-100"}`}>
                  {admin.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
            {/* ✅ EDIT ADMIN BUTTON */}
            <button
              onClick={openEditAdmin}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
            >
              <Pencil className="w-4 h-4" /> Edit Admin
            </button>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CONTACT INFO */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
              <UserCircle className="w-4 h-4" /> Contact Information
            </h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-3"><Mail className="w-4 h-4 text-slate-400" /><span>{admin.email}</span></div>
              <div className="flex items-center gap-3"><Phone className="w-4 h-4 text-slate-400" /><span>{admin.mobile || "Not provided"}</span></div>
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Joined {new Date(admin.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
              </div>
            </div>
          </div>

          {/* STORE INFO */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <Store className="w-4 h-4" /> Store Information
              </h3>
              {/* ✅ ASSIGN or EDIT STORE BUTTON */}
              {store ? (
                <button
                  onClick={openEditStore}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit Store
                </button>
              ) : (
                <button
                  onClick={() => setShowAssignStore(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Assign Store
                </button>
              )}
            </div>

            {store ? (
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-3">
                  <Store className="w-4 h-4 text-slate-400" />
                  <span className="font-semibold text-gray-800">{store.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${store.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-500"}`}>
                    {store.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                {store.categories?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {store.categories.map(cat => (
                      <span key={cat} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getCategoryColor(cat)}`}>{cat}</span>
                    ))}
                  </div>
                )}
                {store.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <span>{[store.address.street, store.address.city, store.address.state, store.address.pincode].filter(Boolean).join(", ") || "Address not provided"}</span>
                  </div>
                )}
                {store.phone && <div className="flex items-center gap-3"><Phone className="w-4 h-4 text-slate-400" /><span>{store.phone}</span></div>}
                {store.email && <div className="flex items-center gap-3"><Mail className="w-4 h-4 text-slate-400" /><span>{store.email}</span></div>}
              </div>
            ) : (
              <div className="text-center py-6 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                <Store className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm text-slate-400 font-medium">No store assigned yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Staff", value: staff.length, color: "from-blue-500 to-blue-600", icon: <Users className="w-6 h-6 text-blue-200 mt-2" /> },
          { label: "Permissions", value: admin.permissions?.length || 0, color: "from-green-500 to-green-600", icon: <Shield className="w-6 h-6 text-green-200 mt-2" /> },
          { label: "Store Status", value: store ? (store.isActive ? "Active" : "Inactive") : "None", color: "from-purple-500 to-purple-600", icon: <Store className="w-6 h-6 text-purple-200 mt-2" /> },
          { label: "Account", value: admin.isActive ? "Active" : "Inactive", color: "from-orange-500 to-orange-600", icon: <UserCircle className="w-6 h-6 text-orange-200 mt-2" /> },
        ].map(s => (
          <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-xl p-5 text-white`}>
            <p className="text-white/70 text-xs">{s.label}</p>
            <p className="text-xl font-bold mt-1">{s.value}</p>
            {s.icon}
          </div>
        ))}
      </div>

      {/* STAFF LIST */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2"><Users className="w-4 h-4" /> Staff Members</h3>
          <span className="text-xs font-bold bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full">{staff.length} members</span>
        </div>
        {staff.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No staff members yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {staff.map(member => (
              <div key={member._id} className="p-4 hover:bg-gray-50 transition flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="font-bold text-indigo-600">{member.name?.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{member.name}</p>
                    <p className="text-sm text-gray-500">{member.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${member.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-500"}`}>
                    {member.isActive ? "Active" : "Inactive"}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(member.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══════════ EDIT ADMIN MODAL ═══════════ */}
      {showEditAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <UserCircle className="w-4 h-4 text-indigo-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-800">Edit Admin Details</h2>
              </div>
              <button onClick={() => setShowEditAdmin(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name *</label>
                <input type="text" value={adminForm.name}
                  onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email *</label>
                <input type="email" value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mobile</label>
                <input type="text" placeholder="10-digit mobile" value={adminForm.mobile}
                  onChange={(e) => setAdminForm({ ...adminForm, mobile: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-100">
              <button onClick={handleSaveAdmin} disabled={savingAdmin}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold transition disabled:opacity-50">
                <Save className="w-4 h-4" /> {savingAdmin ? "Saving..." : "Save Changes"}
              </button>
              <button onClick={() => setShowEditAdmin(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 py-3 rounded-xl font-semibold transition text-slate-600">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ EDIT STORE MODAL ═══════════ */}
      {showEditStore && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Store className="w-4 h-4 text-indigo-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-800">Edit Store</h2>
              </div>
              <button onClick={() => setShowEditStore(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Store Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Store Name *</label>
                <input type="text" value={storeForm.name}
                  onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>

              {/* Categories */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Categories <span className="text-xs text-slate-400 font-normal ml-1">Select all that apply</span>
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {PRESET_CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => toggleCat(cat, storeForm, setStoreForm)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                        storeForm.categories.includes(cat)
                          ? `${getCategoryColor(cat)} border-transparent`
                          : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                      }`}>
                      {storeForm.categories.includes(cat) ? "✓ " : ""}{cat}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder="Add custom category..."
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCustomCat(customCategory, setCustomCategory, storeForm, setStoreForm)}
                    className="flex-1 p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                  <button onClick={() => addCustomCat(customCategory, setCustomCategory, storeForm, setStoreForm)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition">
                    Add
                  </button>
                </div>
                {storeForm.categories.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {storeForm.categories.map(cat => (
                      <span key={cat} className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${getCategoryColor(cat)}`}>
                        {cat}
                        <button onClick={() => removeCat(cat, storeForm, setStoreForm)}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone</label>
                  <input type="text" value={storeForm.phone}
                    onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                  <input type="email" value={storeForm.email}
                    onChange={(e) => setStoreForm({ ...storeForm, email: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Address</label>
                <div className="space-y-2">
                  <input type="text" placeholder="Street" value={storeForm.street}
                    onChange={(e) => setStoreForm({ ...storeForm, street: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input type="text" placeholder="City" value={storeForm.city}
                      onChange={(e) => setStoreForm({ ...storeForm, city: e.target.value })}
                      className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    />
                    <input type="text" placeholder="State" value={storeForm.state}
                      onChange={(e) => setStoreForm({ ...storeForm, state: e.target.value })}
                      className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    />
                    <input type="text" placeholder="Pincode" value={storeForm.pincode}
                      onChange={(e) => setStoreForm({ ...storeForm, pincode: e.target.value })}
                      className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-100">
              <button onClick={handleSaveStore} disabled={savingStore}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold transition disabled:opacity-50">
                <Save className="w-4 h-4" /> {savingStore ? "Saving..." : "Save Changes"}
              </button>
              <button onClick={() => setShowEditStore(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 py-3 rounded-xl font-semibold transition text-slate-600">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ ASSIGN STORE MODAL ═══════════ */}
      {showAssignStore && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-slate-800">Assign Store to {admin.name}</h2>
              <button onClick={() => setShowAssignStore(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Store Name *</label>
                <input type="text" placeholder="e.g. SmartStore Pune" value={assignForm.name}
                  onChange={(e) => setAssignForm({ ...assignForm, name: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Categories <span className="text-xs text-slate-400 font-normal ml-1">Select all that apply</span>
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {PRESET_CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => toggleCat(cat, assignForm, setAssignForm)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                        assignForm.categories.includes(cat)
                          ? `${getCategoryColor(cat)} border-transparent`
                          : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                      }`}>
                      {assignForm.categories.includes(cat) ? "✓ " : ""}{cat}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder="Add custom category..."
                    value={assignCustomCategory}
                    onChange={(e) => setAssignCustomCategory(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCustomCat(assignCustomCategory, setAssignCustomCategory, assignForm, setAssignForm)}
                    className="flex-1 p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                  <button onClick={() => addCustomCat(assignCustomCategory, setAssignCustomCategory, assignForm, setAssignForm)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition">
                    Add
                  </button>
                </div>
                {assignForm.categories.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {assignForm.categories.map(cat => (
                      <span key={cat} className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${getCategoryColor(cat)}`}>
                        {cat}
                        <button onClick={() => removeCat(cat, assignForm, setAssignForm)}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone</label>
                  <input type="text" value={assignForm.phone}
                    onChange={(e) => setAssignForm({ ...assignForm, phone: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                  <input type="email" value={assignForm.email}
                    onChange={(e) => setAssignForm({ ...assignForm, email: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Address</label>
                <div className="space-y-2">
                  <input type="text" placeholder="Street" value={assignForm.street}
                    onChange={(e) => setAssignForm({ ...assignForm, street: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    {["city","state","pincode"].map(field => (
                      <input key={field} type="text" placeholder={field.charAt(0).toUpperCase()+field.slice(1)}
                        value={assignForm[field]}
                        onChange={(e) => setAssignForm({ ...assignForm, [field]: e.target.value })}
                        className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-100">
              <button onClick={handleAssignStore} disabled={assigning}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold transition disabled:opacity-50">
                <CheckCircle className="w-4 h-4" /> {assigning ? "Assigning..." : "Assign Store"}
              </button>
              <button onClick={() => setShowAssignStore(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 py-3 rounded-xl font-semibold transition text-slate-600">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StoreAdminProfile;