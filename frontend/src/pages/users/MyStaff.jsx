import { useEffect, useState } from "react";
import { API } from "../../services/api";
import { UserPlus, Users, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

function MyStaff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noStore, setNoStore] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", password: "", mobile: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await API.get("/users/my-staff");
      if (res.data.noStore) {
        setNoStore(true);
      } else {
        setStaff(res.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching staff:", err);
      alert("Failed to load staff");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      if (!formData.name || !formData.email || !formData.password) {
        alert("Name, email and password are required");
        return;
      }
      setSubmitting(true);
      await API.post("/users/my-staff", formData);
      alert("Staff member created successfully ✅");
      setShowModal(false);
      setFormData({ name: "", email: "", password: "", mobile: "" });
      fetchStaff();
    } catch (err) {
      console.error("Error creating staff:", err);
      alert(err.response?.data?.message || "Failed to create staff member");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (member) => {
    try {
      await API.put(`/users/my-staff/${member._id}`, { isActive: !member.isActive });
      fetchStaff();
    } catch (err) {
      alert("Failed to update staff status");
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove "${name}" from your team?`)) return;
    try {
      await API.delete(`/users/my-staff/${id}`);
      fetchStaff();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove staff member");
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500" />
    </div>
  );

  if (noStore) return (
    <div className="p-6 text-center">
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 max-w-md mx-auto">
        <p className="text-yellow-700 font-semibold text-lg">No Store Assigned</p>
        <p className="text-yellow-600 text-sm mt-2">Your account doesn't have a store linked yet. Please contact your super admin to assign a store before you can manage staff.</p>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500 text-white rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">My Staff</h1>
            <p className="text-sm text-slate-500">Manage your store's team members</p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow transition"
        >
          <UserPlus className="w-4 h-4" />
          Add Staff
        </button>
      </div>

      {/* STAFF COUNT BADGE */}
      <div className="bg-white rounded-xl border border-slate-200 px-5 py-3 flex items-center gap-3 w-fit">
        <Users className="w-5 h-5 text-green-500" />
        <span className="font-semibold text-slate-700">{staff.length} team member{staff.length !== 1 ? "s" : ""}</span>
      </div>

      {/* STAFF TABLE */}
      <div className="bg-white rounded-xl shadow border overflow-hidden">
        {staff.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No staff members yet</p>
            <p className="text-sm mt-1">Click "Add Staff" to add your first team member</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="text-left px-6 py-3">Name</th>
                <th className="text-left px-6 py-3">Email</th>
                <th className="text-left px-6 py-3">Mobile</th>
                <th className="text-left px-6 py-3">Joined</th>
                <th className="text-left px-6 py-3">Status</th>
                <th className="text-left px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member._id} className="border-t hover:bg-slate-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-sm">
                        {member.name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-slate-800">{member.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{member.email}</td>
                  <td className="px-6 py-4 text-slate-500">{member.mobile || "—"}</td>
                  <td className="px-6 py-4 text-slate-400">
                    {new Date(member.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleActive(member)}
                      className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full transition ${
                        member.isActive ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-100 text-red-600 hover:bg-red-200"
                      }`}
                    >
                      {member.isActive
                        ? <><ToggleRight className="w-3.5 h-3.5" /> Active</>
                        : <><ToggleLeft className="w-3.5 h-3.5" /> Inactive</>
                      }
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleDelete(member._id, member.name)}
                      className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ADD STAFF MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-5 text-slate-800">Add Staff Member</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  placeholder="Enter full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  placeholder="Enter email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
                <input
                  type="password"
                  placeholder="Set a password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mobile (optional)</label>
                <input
                  type="text"
                  placeholder="10-digit mobile number"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreate}
                disabled={submitting}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50"
              >
                {submitting ? "Creating..." : "Create Staff"}
              </button>
              <button
                onClick={() => { setShowModal(false); setFormData({ name: "", email: "", password: "", mobile: "" }); }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 py-3 rounded-lg font-semibold transition"
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

export default MyStaff;