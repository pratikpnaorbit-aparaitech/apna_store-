import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaMapMarkerAlt, FaSearch, FaShoppingCart } from "react-icons/fa";
import CartDrawer from "../../components/user/CartDrawer";

export default function UserTopbar() {

  const [location, setLocation] = useState("Detecting location...");
  const [cartCount, setCartCount] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const initial = (user.name || "U")[0].toUpperCase();

  useEffect(() => {
    getLocation();
    loadCartCount();
    const updateCart = () => loadCartCount();
    const openCart = () => setCartOpen(true);
    window.addEventListener("cartUpdated", updateCart);
    window.addEventListener("openCartDrawer", openCart);
    return () => {
      window.removeEventListener("cartUpdated", updateCart);
      window.removeEventListener("openCartDrawer", openCart);
    };
  }, []);

  const loadCartCount = () => {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    setCartCount(cart.reduce((sum, item) => sum + item.quantity, 0));
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      setLocation("Location not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        try {
          const res = await fetch(`http://localhost:5000/api/users/geocode?lat=${lat}&lon=${lon}`);
          const data = await res.json();
          const city = data.address.city || data.address.town || data.address.village || "Your Location";
          setLocation(city);
        } catch {
          setLocation("Location found");
        }
      },
      () => setLocation("Location denied")
    );
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white shadow-md flex items-center justify-between px-10 py-4 border-b">

        {/* LEFT */}
        <div className="flex items-center gap-6">
          <h1 onClick={() => navigate("/user-dashboard")} className="text-2xl font-bold text-purple-600 cursor-pointer">
            SmartStore
          </h1>
          <div className="flex flex-col text-sm">
            <span className="font-semibold text-gray-800">Delivery in 15 minutes</span>
            <div className="flex items-center text-gray-600 gap-2">
              <FaMapMarkerAlt className="text-blue-600" />
              <span className="truncate max-w-[150px]">{location}</span>
            </div>
          </div>
        </div>

        {/* SEARCH */}
        <div className="flex-1 flex justify-center px-10">
          <div className="flex items-center bg-gray-100 rounded-xl px-5 py-3 w-full max-w-xl border hover:border-blue-400 transition">
            <FaSearch className="text-gray-400 mr-3 text-lg" />
            <input
              type="text"
              placeholder="Search products, shops, food..."
              className="bg-transparent outline-none w-full text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.target.value.trim()) {
                  navigate(`/category/${encodeURIComponent(e.target.value.trim())}`);
                }
              }}
            />
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-6">

          {/* AVATAR */}
          <div
            onClick={() => navigate("/profile")}
            className="w-9 h-9 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm cursor-pointer hover:bg-purple-700 transition"
          >
            {initial}
          </div>

          {/* CART BUTTON */}
          <div
            onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg cursor-pointer hover:bg-blue-700 transition"
          >
            <FaShoppingCart />
            <span className="hidden sm:block">Cart</span>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-xs text-white px-2 py-0.5 rounded-full">
                {cartCount}
              </span>
            )}
          </div>

        </div>
      </header>

      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}