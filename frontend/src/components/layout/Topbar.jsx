import { useEffect, useState } from "react";
import AdminProfile from "../../pages/users/AdminProfile";  // ✅ Fixed import

function Topbar() {
  const [showProfile, setShowProfile] = useState(false);
  const [user, setUser] = useState(null);

  // ✅ Load user from localStorage (single source of truth)
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  if (!user) return null;

  return (
    <div className="fixed top-0 left-64 right-0 h-16 bg-white shadow flex items-center justify-between px-6 z-40 border-b">

      {/* Search */}
      <input
        className="border px-4 py-2 rounded-lg w-80 focus:outline-none focus:ring-2 focus:ring-green-400"
        placeholder="Search orders, customers..."
      />

      {/* Profile */}
      <div className="relative">
        <button
          onClick={() => setShowProfile(!showProfile)}
          className="flex items-center gap-3 bg-green-100 px-4 py-2 rounded-full hover:bg-green-200 transition"
        >
          {/* Avatar */}
          <div className="w-9 h-9 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
            {user.name?.charAt(0).toUpperCase()}
          </div>

          {/* Name + Role */}
          <div className="text-left">
            <p className="text-sm font-semibold leading-tight">
              {user.name}
            </p>
            <p className="text-xs uppercase text-green-700 font-bold">
              {user.role}
            </p>
          </div>
        </button>

        {/* {showProfile && (
          <AdminProfile
            admin={user}
            onClose={() => setShowProfile(false)}
            onLogout={handleLogout}
          />
        )} */}
      </div>

    </div>
  );
}

export default Topbar;