import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; 
import { API } from "../../services/api";

function UserManagement({ roleFilter = null }) {
  const navigate = useNavigate(); 
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: roleFilter || "staff",
    permissions: []
  });

  // Available roles
  const roles = [
    { value: "super_admin", label: "Super Admin", color: "purple" },
    { value: "admin", label: "Admin", color: "red" },
    { value: "staff", label: "Staff", color: "blue" },
    { value: "user", label: "User", color: "gray" }
  ];

  // Available permissions
  const availablePermissions = [
    { value: "manage_users", label: "Manage Users" },
    { value: "manage_roles", label: "Manage Roles" },
    { value: "delete_data", label: "Delete Data" },
    { value: "export_data", label: "Export Data" },
    { value: "view_reports", label: "View Reports" }
  ];

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await API.get("/users");
      let userData = res.data.data || [];
      if (roleFilter) {
        userData = userData.filter(user => user.role === roleFilter);
      }
      setUsers(userData);
      if (roleFilter === 'admin') {
        document.title = 'Store Admins - SmartStore';
      }
    } catch (err) {
      console.error("Load users error:", err);
      alert("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const togglePermission = (permission) => {
    setFormData(prev => {
      const permissions = prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission];
      return { ...prev, permissions };
    });
  };

  const handleCreate = () => {
    setEditingUser(null);
    setFormData({ name: "", email: "", password: "", role: roleFilter || "staff", permissions: [] });
    setShowModal(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({ name: user.name || "", email: user.email || "", password: "", role: user.role || "staff", permissions: user.permissions || [] });
    setShowModal(true);
  };

  // Navigate to the StoreAdminProfile page instead of opening a modal
  const handleViewProfile = (user) => {
    navigate(`/store-admin/${user._id}`);
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name || !formData.email) { alert("Name and email are required"); return; }
      if (!editingUser && !formData.password) { alert("Password is required for new users"); return; }

      if (editingUser) {
        await API.put(`/users/${editingUser._id}`, {
          name: formData.name, email: formData.email,
          role: formData.role, permissions: formData.permissions,
          isActive: editingUser.isActive
        });
        alert("User updated successfully ✅");
      } else {
        await API.post("/users", formData);
        alert("User created successfully ✅");
      }

      setShowModal(false);
      loadUsers();
    } catch (err) {
      console.error("Submit error:", err);
      alert(err.response?.data?.message || "Operation failed");
    }
  };

  const handleDelete = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to delete "${userName}"?`)) return;
    try {
      await API.delete(`/users/${userId}`);
      alert("User deleted successfully 🗑️");
      loadUsers();
    } catch (err) {
      console.error("Delete error:", err);
      alert(err.response?.data?.message || "Cannot delete this user");
    }
  };

  const toggleActive = async (user) => {
    try {
      await API.put(`/users/${user._id}`, { ...user, isActive: !user.isActive });
      loadUsers();
    } catch (err) {
      console.error("Toggle active error:", err);
      alert("Failed to update user status");
    }
  };

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleColor = (role) => {
    const found = roles.find(r => r.value === role);
    return found?.color || "gray";
  };

  const getPageTitle = () => {
    if (roleFilter === 'admin') return "Store Admins";
    if (roleFilter === 'staff') return "Staff Management";
    return "User Management";
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{getPageTitle()}</h1>
          <p className="text-gray-500 mt-1">
            {roleFilter === 'admin'
              ? "Manage store administrators and their permissions"
              : "Manage all users and their permissions"}
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-700 shadow-lg flex items-center gap-2"
        >
          <span>+</span>
          {roleFilter === 'admin' ? "Create New Admin" : "Create New User"}
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl shadow">
        <input
          type="text"
          placeholder={`Search ${roleFilter === 'admin' ? 'admins' : 'users'}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-4 text-left">User</th>
              <th className="p-4 text-left">Role</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Permissions</th>
              <th className="p-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="p-8 text-center text-gray-500">Loading...</td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan="5" className="p-8 text-center text-gray-500">No {roleFilter === 'admin' ? 'admins' : 'users'} found</td></tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user._id} className="border-t hover:bg-gray-50">
                  <td className="p-4">
                    <div className="font-semibold">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold bg-${getRoleColor(user.role)}-100 text-${getRoleColor(user.role)}-600`}>
                      {user.role?.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => toggleActive(user)}
                      className={`px-3 py-1 rounded-full text-xs font-bold ${user.isActive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                    >
                      {user.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {user.permissions?.slice(0, 2).map(p => (
                        <span key={p} className="px-2 py-1 bg-gray-100 rounded text-xs">{p.replace('_', ' ')}</span>
                      ))}
                      {user.permissions?.length > 2 && (
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs">+{user.permissions.length - 2} more</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      {/* ✅ FIXED: Now navigates to /store-admin/:id */}
                      <button
                        onClick={() => handleViewProfile(user)}
                        className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200"
                      >
                        Profile
                      </button>
                      <button
                        onClick={() => handleEdit(user)}
                        className="px-3 py-1 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                      >
                        Edit
                      </button>
                      {user.role !== 'super_admin' && (
                        <button
                          onClick={() => handleDelete(user._id, user.name)}
                          className="px-3 py-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingUser ? 'Edit User' : `Create New ${roleFilter === 'admin' ? 'Admin' : 'User'}`}
            </h2>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input type="text" name="name" value={formData.name} onChange={handleInputChange}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Enter full name" />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Email *</label>
              <input type="email" name="email" value={formData.email} onChange={handleInputChange}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Enter email address" />
            </div>

            {!editingUser && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Password *</label>
                <input type="password" name="password" value={formData.password} onChange={handleInputChange}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Enter password" />
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Role</label>
              <select name="role" value={formData.role} onChange={handleInputChange} disabled={!!roleFilter}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none disabled:bg-gray-100">
                {roles.map(role => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
              {roleFilter && <p className="text-xs text-gray-500 mt-1">Role is fixed to {roleFilter}</p>}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Permissions</label>
              <div className="space-y-2">
                {availablePermissions.map(perm => (
                  <label key={perm.value} className="flex items-center gap-2">
                    <input type="checkbox" checked={formData.permissions.includes(perm.value)}
                      onChange={() => togglePermission(perm.value)}
                      className="rounded text-purple-600 focus:ring-purple-500" />
                    <span className="text-sm">{perm.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handleSubmit}
                className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700">
                {editingUser ? 'Update' : 'Create'}
              </button>
              <button onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-200 py-3 rounded-lg font-semibold hover:bg-gray-300">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;