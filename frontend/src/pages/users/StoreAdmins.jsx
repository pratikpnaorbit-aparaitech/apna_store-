import React, { useEffect, useState } from "react";
import { UserCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

function StoreAdmins() {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStoreAdmins = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:5000/api/users/admins", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Failed to fetch store admins");

        const data = await res.json();
        // API returns { success, count, data: [...] }
        setAdmins(data.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStoreAdmins();
  }, []);

  if (loading) return <p className="p-6">Loading store admins...</p>;
  if (error) return <p className="p-6 text-red-500">{error}</p>;

  return (
    <div className="p-6">
      {/* HEADER */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center">
          <UserCheck />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Store Admins</h1>
          <p className="text-sm text-slate-500">Manage all store administrators</p>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow border overflow-hidden">
        {admins.length === 0 ? (
          <div className="p-10 text-center text-slate-400">No store admins found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-6 py-3">Name</th>
                <th className="text-left px-6 py-3">Email</th>
                <th className="text-left px-6 py-3">Store</th>
                <th className="text-left px-6 py-3">Status</th>
                <th className="text-left px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr
                  key={admin._id}
                  className="border-t hover:bg-slate-50 transition cursor-pointer"
                  onClick={() => navigate(`/store-admin/${admin._id}`)}
                >
                  <td className="px-6 py-3 font-semibold">{admin.name}</td>
                  <td className="px-6 py-3 text-slate-600">{admin.email}</td>
                  <td className="px-6 py-3 text-slate-500">
                    {admin.storeId?.name || "No store assigned"}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${
                        admin.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {admin.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/store-admin/${admin._id}`);
                      }}
                      className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 text-xs font-medium"
                    >
                      View Profile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default StoreAdmins;