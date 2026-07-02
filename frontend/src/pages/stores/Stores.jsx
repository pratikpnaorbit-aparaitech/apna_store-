import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../../services/api";
import {
  Store,
  Plus,
  Search,
  MapPin,
  Phone,
  Mail,
  Users,
  UserCheck,
  ToggleLeft,
  ToggleRight,
  ChevronRight,
  X,
  CheckCircle,
  Building2,
  AlertCircle,
} from "lucide-react";

function Stores() {
  const navigate = useNavigate();
  const [stores, setStores] = useState([]);
  const [admins, setAdmins] = useState([]); // unassigned admins for dropdown
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [storeForm, setStoreForm] = useState({
    name: "",
    phone: "",
    email: "",
    adminId: "",
    street: "",
    city: "",
    state: "",
    pincode: "",
  });

  useEffect(() => {
    fetchStores();
    fetchUnassignedAdmins();
  }, []);

  const fetchStores = async () => {
    try {
      setLoading(true);
      const res = await API.get("/stores");
      setStores(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch stores:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnassignedAdmins = async () => {
    try {
      const res = await API.get("/users");
      const allUsers = res.data.data || [];
      // Only admins without a store assigned
      const unassigned = allUsers.filter(
        (u) => u.role === "admin" && !u.storeId,
      );
      setAdmins(unassigned);
    } catch (err) {
      console.error("Failed to fetch admins:", err);
    }
  };

  const handleCreateStore = async () => {
    try {
      if (!storeForm.name) {
        alert("Store name is required");
        return;
      }
      if (!storeForm.adminId) {
        alert("Please select an admin for this store");
        return;
      }
      setSubmitting(true);

      await API.post("/stores", {
        name: storeForm.name,
        phone: storeForm.phone,
        email: storeForm.email,
        address: {
          street: storeForm.street,
          city: storeForm.city,
          state: storeForm.state,
          pincode: storeForm.pincode,
        },
        adminId: storeForm.adminId,
      });

      alert("Store created successfully ✅");
      setShowModal(false);
      setStoreForm({
        name: "",
        phone: "",
        email: "",
        adminId: "",
        street: "",
        city: "",
        state: "",
        pincode: "",
      });
      fetchStores();
      fetchUnassignedAdmins();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create store");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStore = async (store) => {
    try {
      await API.put(`/stores/${store._id}`, {
        isActive: !store.isActive,
      });
      fetchStores();
    } catch {
      alert("Failed to update store status");
    }
  };

  const filteredStores = stores.filter(
    (s) =>
      s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.admin?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.address?.city?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const activeCount = stores.filter((s) => s.isActive).length;
  const inactiveCount = stores.filter((s) => !s.isActive).length;

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Stores</h1>
            <p className="text-sm text-slate-500">Manage all store locations</p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-indigo-200 transition"
        >
          <Plus className="w-4 h-4" /> Create Store
        </button>
      </div>

      {/* STATS ROW */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
            <Store className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{stores.length}</p>
            <p className="text-xs text-slate-400 font-medium">Total Stores</p>
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
            <p className="text-2xl font-bold text-slate-800">{inactiveCount}</p>
            <p className="text-xs text-slate-400 font-medium">Inactive</p>
          </div>
        </div>
      </div>

      {/* SEARCH */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Search by store name, admin, or city..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 outline-none text-sm text-slate-700 placeholder:text-slate-400"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm("")}>
            <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
          </button>
        )}
      </div>

      {/* STORES GRID */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
        </div>
      ) : filteredStores.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <Building2 className="w-12 h-12 mx-auto mb-3 text-slate-200" />
          <p className="font-semibold text-slate-400">No stores found</p>
          <p className="text-sm text-slate-300 mt-1">
            Create your first store to get started
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredStores.map((store) => (
            <StoreCard
              key={store._id}
              store={store}
              onToggle={handleToggleStore}
              onViewAdmin={() =>
                store.admin?._id && navigate(`/store-admin/${store.admin._id}`)
              }
            />
          ))}
        </div>
      )}

      {/* CREATE STORE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Store className="w-4 h-4 text-indigo-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-800">
                  Create New Store
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Store Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Store Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. SmartStore Pune"
                  value={storeForm.name}
                  onChange={(e) =>
                    setStoreForm({ ...storeForm, name: e.target.value })
                  }
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>

              {/* Assign Admin */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Assign Admin *
                </label>
                {admins.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    No unassigned admins available. Create an admin first.
                  </div>
                ) : (
                  <select
                    value={storeForm.adminId}
                    onChange={(e) =>
                      setStoreForm({ ...storeForm, adminId: e.target.value })
                    }
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  >
                    <option value="">Select an admin...</option>
                    {admins.map((admin) => (
                      <option key={admin._id} value={admin._id}>
                        {admin.name} ({admin.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Phone
                  </label>
                  <input
                    type="text"
                    placeholder="Store phone"
                    value={storeForm.phone}
                    onChange={(e) =>
                      setStoreForm({ ...storeForm, phone: e.target.value })
                    }
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="store@email.com"
                    value={storeForm.email}
                    onChange={(e) =>
                      setStoreForm({ ...storeForm, email: e.target.value })
                    }
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Address
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Street"
                    value={storeForm.street}
                    onChange={(e) =>
                      setStoreForm({ ...storeForm, street: e.target.value })
                    }
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="City"
                      value={storeForm.city}
                      onChange={(e) =>
                        setStoreForm({ ...storeForm, city: e.target.value })
                      }
                      className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    />
                    <input
                      type="text"
                      placeholder="State"
                      value={storeForm.state}
                      onChange={(e) =>
                        setStoreForm({ ...storeForm, state: e.target.value })
                      }
                      className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Pincode"
                      value={storeForm.pincode}
                      onChange={(e) =>
                        setStoreForm({ ...storeForm, pincode: e.target.value })
                      }
                      className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-6 border-t border-slate-100">
              <button
                onClick={handleCreateStore}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold transition disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                {submitting ? "Creating..." : "Create Store"}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 py-3 rounded-xl font-semibold transition text-slate-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== STORE CARD ===================== */
function StoreCard({ store, onToggle, onViewAdmin }) {
  const address = store.address
    ? [
        store.address.street,
        store.address.city,
        store.address.state,
        store.address.pincode,
      ]
        .filter(Boolean)
        .join(", ")
    : null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Card Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
            <Store className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm">{store.name}</p>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                store.isActive
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-500"
              }`}
            >
              {store.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
        {/* Toggle */}
        <button
          onClick={() => onToggle(store)}
          className="text-slate-400 hover:text-indigo-600 transition"
          title={store.isActive ? "Deactivate store" : "Activate store"}
        >
          {store.isActive ? (
            <ToggleRight className="w-7 h-7 text-green-500" />
          ) : (
            <ToggleLeft className="w-7 h-7 text-slate-300" />
          )}
        </button>
      </div>

      {/* Card Body */}
      <div className="px-5 py-4 space-y-2.5">
        {address && (
          <div className="flex items-start gap-2 text-sm text-slate-500">
            <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <span className="line-clamp-2">{address}</span>
          </div>
        )}
        {store.phone && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Phone className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{store.phone}</span>
          </div>
        )}
        {store.email && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Mail className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">{store.email}</span>
          </div>
        )}
      </div>

      {/* Card Footer — Admin */}
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-600 font-medium">
            {store.admin?.name || "No admin assigned"}
          </span>
        </div>
        {store.admin?._id && (
          <button
            onClick={onViewAdmin}
            className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
          >
            View Admin <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export default Stores;
