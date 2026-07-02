import { useEffect, useState } from "react";
import { API } from "../../services/api";
import { Link, useNavigate } from "react-router-dom";

function SuperAdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAdmins: 0,
    totalStaff: 0,
    totalCustomers: 0
  });
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch users data
      const usersRes = await API.get("/users");
      const users = usersRes.data.data || [];
      
      // Calculate stats
      const admins = users.filter(u => u.role === 'admin').length;
      const staff = users.filter(u => u.role === 'staff').length;
      const superAdmins = users.filter(u => u.role === 'super_admin').length;
      
      setStats({
        totalUsers: users.length,
        totalAdmins: admins,
        totalStaff: staff,
        totalSuperAdmins: superAdmins
      });

      // Get recent users (last 5)
      setRecentUsers(users.slice(0, 5));

      // Also fetch customers count
      const customersRes = await API.get("/customers");
      setStats(prev => ({
        ...prev,
        totalCustomers: customersRes.data.length || 0
      }));

    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-purple-700 text-white p-6 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-purple-800 rounded-lg hover:bg-purple-900 transition"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-sm text-gray-500 mb-1">Total Users</div>
            <div className="text-3xl font-bold text-purple-600">{stats.totalUsers}</div>
          </div>
          
          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-sm text-gray-500 mb-1">Super Admins</div>
            <div className="text-3xl font-bold text-purple-600">{stats.totalSuperAdmins || 1}</div>
          </div>
          
          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-sm text-gray-500 mb-1">Admins</div>
            <div className="text-3xl font-bold text-blue-600">{stats.totalAdmins}</div>
          </div>
          
          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-sm text-gray-500 mb-1">Staff</div>
            <div className="text-3xl font-bold text-green-600">{stats.totalStaff}</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link
            to="/users"
            className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition text-center"
          >
            <div className="text-4xl mb-3">👥</div>
            <h3 className="font-semibold">Manage Users</h3>
            <p className="text-sm text-gray-500 mt-1">Create, edit, or delete users</p>
          </Link>
          
          <Link
  to="/registered-customers"
  className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition text-center"
>
  <div className="text-4xl mb-3">👤</div>
  <h3 className="font-semibold">Customers</h3>
  <p className="text-sm text-gray-500 mt-1">
    View and manage customers
  </p>
</Link>
          
          <Link
            to="/inventory"
            className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition text-center"
          >
            <div className="text-4xl mb-3">📦</div>
            <h3 className="font-semibold">Inventory</h3>
            <p className="text-sm text-gray-500 mt-1">Manage products and stock</p>
          </Link>
        </div>

        {/* Recent Users */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold mb-4">Recent Users</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Email</th>
                  <th className="p-3 text-left">Role</th>
                  <th className="p-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map(user => (
                  <tr key={user._id} className="border-t hover:bg-gray-50">
                    <td className="p-3">{user.name}</td>
                    <td className="p-3">{user.email}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        user.role === 'super_admin' ? 'bg-purple-100 text-purple-600' :
                        user.role === 'admin' ? 'bg-red-100 text-red-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        user.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

export default SuperAdminDashboard;