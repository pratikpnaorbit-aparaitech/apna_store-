import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaHome,
  FaStore,
  FaBoxOpen,
  FaShoppingCart,
  FaClipboardList,
  FaUser,
  FaSignOutAlt,
} from "react-icons/fa";

export default function UserSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { name: "Dashboard", path: "/user-dashboard", icon: <FaHome /> },
    { name: "Browse Shops", path: "/shops", icon: <FaStore /> },
    { name: "Products", path: "/products", icon: <FaBoxOpen /> },
    { name: "My Orders", path: "/orders", icon: <FaClipboardList /> },
    
    
  ];

  const handleLogout = () => {
    localStorage.removeItem("token"); // remove auth token
    localStorage.removeItem("user");  // optional user data
    navigate("/login");               // redirect to login
  };

  return (
    <div className="w-64 min-h-screen bg-white shadow-lg flex flex-col justify-between border-r">

      {/* Logo */}
      <div>
        <div className="p-6 text-2xl font-bold text-blue-600 border-b">
          SmartStore
        </div>

        {/* Menu */}
        <nav className="flex flex-col p-4 gap-2">

          {menuItems.map((item) => {
            const active = location.pathname === item.path;

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                ${
                  active
                    ? "bg-blue-500 text-white shadow"
                    : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}

        </nav>
      </div>

      {/* Logout */}
      <div className="p-4 border-t">

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition"
        >
          <FaSignOutAlt />
          <span className="font-medium">Logout</span>
        </button>

      </div>

    </div>
  );
}