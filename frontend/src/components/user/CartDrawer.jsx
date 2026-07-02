import { useEffect, useState } from "react";
import { FaTimes, FaPlus, FaMinus, FaTrash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function CartDrawer({ isOpen, onClose }) {

  const [cartItems, setCartItems] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadCart();
    const handleUpdate = () => loadCart();
    window.addEventListener("cartUpdated", handleUpdate);
    return () => window.removeEventListener("cartUpdated", handleUpdate);
  }, [isOpen]);

  const loadCart = () => {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    setCartItems(cart);
  };

  const updateCart = (items) => {
    localStorage.setItem("cart", JSON.stringify(items));
    setCartItems(items);
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const increaseQty = (id) => {
    const updated = cartItems.map(item =>
      item._id === id ? { ...item, quantity: item.quantity + 1 } : item
    );
    updateCart(updated);
  };

  const decreaseQty = (id) => {
    const updated = cartItems
      .map(item =>
        item._id === id ? { ...item, quantity: item.quantity - 1 } : item
      )
      .filter(item => item.quantity > 0);

    updateCart(updated);
  };

  const removeItem = (id) => {
    const updated = cartItems.filter(item => item._id !== id);
    updateCart(updated);
  };

  /* ---------------- PRICE CALCULATIONS ---------------- */

  const itemsTotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const totalItems = cartItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const deliveryCharge = cartItems.length > 0 ? 40 : 0;

  const gst = itemsTotal * 0.05; // 5% GST

  const grandTotal = itemsTotal + deliveryCharge + gst;

  /* ---------------------------------------------------- */

  return (

    <div
      className={`fixed top-0 right-0 h-full w-96 bg-white shadow-2xl transform transition-transform duration-300 ${
        isOpen ? "translate-x-0" : "translate-x-full"
      } z-50 flex flex-col`}
    >

      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b bg-purple-50">

        <h2 className="text-lg font-semibold">
          Your Cart ({totalItems})
        </h2>

        <FaTimes
          onClick={onClose}
          className="cursor-pointer text-gray-600 hover:text-red-500"
        />

      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {cartItems.length === 0 && (

          <div className="text-center mt-20">

            <img
              src="https://cdn-icons-png.flaticon.com/512/2038/2038854.png"
              className="w-24 mx-auto mb-4 opacity-70"
            />

            <p className="text-gray-500 mb-4">
              Your cart is empty
            </p>

            <button
              onClick={() => {
                navigate("/user-dashboard");
                onClose();
              }}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
            >
              Shop Now
            </button>

          </div>

        )}

        {cartItems.map(item => (

          <div
            key={item._id}
            className="flex items-center gap-3 border rounded-lg p-3 hover:shadow-sm"
          >

            <img
              src={item.image || "https://via.placeholder.com/60"}
              alt={item.name}
              className="w-16 h-16 object-cover rounded"
            />

            <div className="flex-1">

              <p className="font-semibold text-sm">
                {item.name}
              </p>

              <p className="text-purple-600 font-medium">
                ₹{item.price}
              </p>

              <div className="flex items-center gap-2 mt-2">

                <button
                  onClick={() => decreaseQty(item._id)}
                  className="bg-gray-200 p-1 rounded hover:bg-gray-300"
                >
                  <FaMinus size={12} />
                </button>

                <span className="font-medium">
                  {item.quantity}
                </span>

                <button
                  onClick={() => increaseQty(item._id)}
                  className="bg-gray-200 p-1 rounded hover:bg-gray-300"
                >
                  <FaPlus size={12} />
                </button>

              </div>

            </div>

            <FaTrash
              onClick={() => removeItem(item._id)}
              className="text-red-400 cursor-pointer hover:text-red-600"
            />

          </div>

        ))}

      </div>

      {/* Footer */}
      {cartItems.length > 0 && (

        <div className="p-4 border-t bg-white shadow-inner space-y-2">

          <div className="flex justify-between text-sm">
            <span>Items Total</span>
            <span>₹{itemsTotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-sm text-gray-600">
            <span>Delivery Charge</span>
            <span>₹{deliveryCharge}</span>
          </div>

          <div className="flex justify-between text-sm text-gray-600">
            <span>GST (5%)</span>
            <span>₹{gst.toFixed(2)}</span>
          </div>

          <div className="flex justify-between font-semibold text-lg border-t pt-2">
            <span>Grand Total</span>
            <span>₹{grandTotal.toFixed(2)}</span>
          </div>

        

<button
  onClick={() => navigate("/checkout")}
  className="bg-purple-600 text-white w-full py-3 rounded-lg font-semibold hover:bg-purple-700 transition"
>
  Proceed to Checkout
</button>

        </div>

      )}

    </div>
  );
}