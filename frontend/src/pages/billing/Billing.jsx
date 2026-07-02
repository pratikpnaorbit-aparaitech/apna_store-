import { useEffect, useMemo, useState } from "react";
import { API } from "../../services/api";
import { getExpiryInfo } from "../../utils/expiryUtils";
import { QRCodeCanvas } from "qrcode.react";

function Billing() {
  /* ================= STATE ================= */
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");

  /* CUSTOMER */
  const [phone, setPhone] = useState("");
  const [customer, setCustomer] = useState(null);
  const [joinLoyalty, setJoinLoyalty] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", email: "" });

  /* PAYMENT */
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [cashReceived, setCashReceived] = useState("");
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  /* BILL */
  const [billGenerated, setBillGenerated] = useState(false);

  /* ================= LOAD PRODUCTS ================= */
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const res = await API.get("/inventory");
    setProducts(
      res.data.map(p => ({
        ...p,
        price: Number(p.price),
        stock: Number(p.stock)
      }))
    );
  };

  /* ================= FIND CUSTOMER ================= */
  useEffect(() => {
    if (phone.length === 10) findCustomer();
    else {
      setCustomer(null);
      setJoinLoyalty(false);
    }
  }, [phone]);

  const findCustomer = async () => {
    try {
      const res = await API.get("/customers/check", {
        params: { phone }
      });
      if (res.data.exists) {
        setCustomer(res.data.customer);
        setJoinLoyalty(false);
      } else {
        setCustomer(null);
      }
    } catch {
      setCustomer(null);
    }
  };

  /* ================= SEARCH ================= */
  const filteredProducts = useMemo(() => {
    return products.filter(
      p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);

  /* ================= ADD TO CART ================= */
  const addToCart = (p) => {
    const { blocked, discountPercent } = getExpiryInfo(p);
    if (blocked || p.stock <= 0) return;

    const finalPrice =
      discountPercent > 0
        ? p.price * (1 - discountPercent / 100)
        : p.price;

    const exists = cart.find(i => i.productId === p.id);

    if (exists) {
      setCart(cart.map(i =>
        i.productId === p.id
          ? { ...i, qty: i.qty + 1, total: (i.qty + 1) * finalPrice }
          : i
      ));
    } else {
      setCart([
        ...cart,
        {
          productId: p.id,
          name: p.name,
          qty: 1,
          mrp: p.price,
          price: finalPrice,
          discountPercent,
          total: finalPrice
        }
      ]);
    }
  };

  /* ================= TOTALS ================= */
  const subtotal = cart.reduce((s, i) => s + i.total, 0);
  const gst = subtotal * 0.18;
  const grandTotal = subtotal + gst;

  const balance =
    paymentMode === "CASH" && cashReceived
      ? Math.max(cashReceived - grandTotal, 0).toFixed(2)
      : 0;

  /* ================= UPI QR ================= */
  const upiId = "7410781884@ibl";
  const upiPayUrl = `upi://pay?pa=${upiId}&pn=SmartStore&am=${grandTotal.toFixed(
    2
  )}&cu=INR&tn=SmartStore%20Purchase`;

  /* ================= GENERATE BILL ================= */
  const generateBill = async () => {
    if (!cart.length) return alert("Cart is empty");
    if (!phone || phone.length !== 10) return alert("Enter customer mobile");

    if (paymentMode === "CASH") {
      if (Number(cashReceived) < grandTotal)
        return alert("Cash is less than total");
    } else {
      if (!paymentConfirmed)
        return alert("Please confirm payment first");
    }

    if (joinLoyalty && !customer && !newCustomer.name)
      return alert("Enter customer name");

    try {
      await API.post("/billing", {
        phone,
        paymentMode,
        joinLoyalty,
        newCustomer,
        cashReceived: paymentMode === "CASH" ? Number(cashReceived) : null,
        items: cart.map(i => ({
          productId: i.productId,
          qty: i.qty
        }))
      });

      setBillGenerated(true);
      alert("✅ Bill Generated & WhatsApp Sent");
    } catch (err) {
      alert(err.response?.data?.message || "Billing failed");
    }
  };

  /* ================= PRINT + RESET ================= */
  const handlePrint = () => {
    window.print();
    setTimeout(() => window.location.reload(), 300);
  };

  /* ================= CART CONTROLS ================= */
const increaseQty = (item) => {
  const product = products.find(p => p.id === item.productId);
  if (!product) return;

  const cartQty = cart.find(i => i.productId === item.productId)?.qty || 0;
  if (cartQty >= product.stock) return; // stock limit

  setCart(cart.map(i =>
    i.productId === item.productId
      ? {
          ...i,
          qty: i.qty + 1,
          total: (i.qty + 1) * i.price
        }
      : i
  ));
};

const decreaseQty = (item) => {
  if (item.qty === 1) {
    setCart(cart.filter(i => i.productId !== item.productId));
  } else {
    setCart(cart.map(i =>
      i.productId === item.productId
        ? {
            ...i,
            qty: i.qty - 1,
            total: (i.qty - 1) * i.price
          }
        : i
    ));
  }
};


  /* ================= UI ================= */
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* PRODUCTS */}
      <div className="lg:col-span-2 space-y-4">
        <input
          className="border p-3 rounded-xl w-full"
          placeholder="Search / Scan product"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProducts.map(p => {
            const { blocked, discountPercent, label } = getExpiryInfo(p);
            const finalPrice =
              discountPercent > 0
                ? p.price * (1 - discountPercent / 100)
                : p.price;

            return (
              <div
                key={p.id}
                className={`bg-white p-4 rounded-xl shadow flex justify-between ${
                  blocked || p.stock <= 0 ? "opacity-50" : ""
                }`}
              >
                <div>
                  <p className="font-bold">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.sku}</p>

                  {discountPercent > 0 ? (
                    <>
                      <p className="text-xs line-through text-gray-400">
                        ₹{p.price}
                      </p>
                      <p className="text-green-600 font-bold">
                        ₹{finalPrice.toFixed(2)}
                      </p>
                      <p className="text-xs text-orange-600">
                        🔥 {discountPercent}% OFF ({label})
                      </p>
                    </>
                  ) : (
                    <p>₹{p.price}</p>
                  )}

                  {blocked && (
                    <p className="text-xs text-red-600 font-semibold">
                      ❌ Expired
                    </p>
                  )}

                  <p className="text-xs text-gray-500">Stock: {p.stock}</p>
                </div>

                <button
                  disabled={blocked || p.stock <= 0}
                  onClick={() => addToCart(p)}
                  className="px-4 py-2 rounded text-white bg-green-600"
                >
                  Add
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* BILLING / PRINT AREA */}
      <div
 
  id="print-area"
  className="bg-white p-5 rounded-xl shadow space-y-4
             sticky top-4 h-[calc(100vh-2rem)]"
>


        {/* HEADER */}
        <div className="text-center">
          <p className="font-bold">SMARTSTORE</p>
          <p className="text-xs">Thank you for shopping</p>
          <hr />
        </div>
      <div className="overflow-y-auto max-h-[calc(100vh-220px)] pr-2 space-y-4">
  {/* EVERYTHING BELOW GOES INSIDE */}


        {/* ITEMS */}
        {cart.map(i => (
  <div
    key={i.productId}
    className="flex justify-between items-center text-sm border-b pb-1"
  >
    <div>
      <p className="font-medium">{i.name}</p>

      <div className="flex items-center gap-2 mt-1">
        <button
          onClick={() => decreaseQty(i)}
          className="px-2 py-1 border rounded"
        >
          −
        </button>

        <span className="w-6 text-center">{i.qty}</span>

        <button
          onClick={() => increaseQty(i)}
          className="px-2 py-1 border rounded"
        >
          +
        </button>

        {i.discountPercent > 0 && (
          <span className="text-green-600 text-xs">
            ({i.discountPercent}% OFF)
          </span>
        )}
      </div>
    </div>

    <span className="font-semibold">
      ₹{i.total.toFixed(2)}
    </span>
  </div>
))}


        {/* MOBILE INPUT */}
        {!billGenerated && (
          <input
            className="border p-3 rounded w-full"
            placeholder="Customer Mobile Number"
            value={phone}
            maxLength={10}
            onChange={e => setPhone(e.target.value.replace(/\D/g, ""))}
          />
        )}

        {/* LOYALTY */}
        {!billGenerated && phone.length === 10 && !customer && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={joinLoyalty}
                onChange={e => setJoinLoyalty(e.target.checked)}
              />
              Join Loyalty Program
            </label>

            {joinLoyalty && (
              <input
                className="border p-2 rounded w-full"
                placeholder="Customer Name"
                value={newCustomer.name}
                onChange={e =>
                  setNewCustomer({ ...newCustomer, name: e.target.value })
                }
              />
            )}
          </div>
        )}

        {customer && (
          <div className="bg-green-50 p-3 rounded text-sm">
            👤 {customer.name} | ⭐ {customer.points} points
          </div>
        )}

        {/* TOTALS */}
        <div className="border-t pt-3">
          <p>Subtotal: ₹{subtotal.toFixed(2)}</p>
          <p>GST: ₹{gst.toFixed(2)}</p>
          <p className="font-bold text-lg">Total: ₹{grandTotal.toFixed(2)}</p>
        </div>

        {/* FOOTER */}
        <hr />
        <p className="text-center text-xs">Visit Again 🙂</p>

        {/* PAYMENTS */}
        {!billGenerated && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {["CASH", "UPI", "CARD", "WALLET"].map(p => (
                <button
                  key={p}
                  onClick={() => {
                    setPaymentMode(p);
                    setPaymentConfirmed(false);
                  }}
                  className={`border py-2 rounded ${
                    paymentMode === p ? "bg-green-600 text-white" : ""
                  }`}
                >
                  {p === "CARD" ? "Credit / Debit Card" : p}
                </button>
              ))}
            </div>

            {paymentMode === "CASH" && (
              <>
                <input
                  type="number"
                  className="border p-2 rounded w-full"
                  placeholder="Cash Received"
                  value={cashReceived}
                  onChange={e => setCashReceived(e.target.value)}
                />
                <p className="text-sm font-semibold">Balance: ₹{balance}</p>
              </>
            )}

            {paymentMode === "UPI" && (
              <div className="border rounded p-3 text-center space-y-2">
                <p className="text-sm font-semibold">
                  Scan QR to Pay ₹{grandTotal.toFixed(2)}
                </p>
                <QRCodeCanvas value={upiPayUrl} size={160} />
                <button
                  onClick={() => setPaymentConfirmed(true)}
                  className={`w-full py-2 rounded ${
                    paymentConfirmed
                      ? "bg-green-600 text-white"
                      : "bg-gray-200"
                  }`}
                >
                  {paymentConfirmed ? "✅ Payment Received" : "Confirm Payment"}
                </button>
              </div>
            )}

            {(paymentMode === "CARD" || paymentMode === "WALLET") && (
              <button
                onClick={() => setPaymentConfirmed(true)}
                className={`w-full py-2 rounded ${
                  paymentConfirmed
                    ? "bg-green-600 text-white"
                    : "bg-gray-200"
                }`}
              >
                {paymentConfirmed ? "✅ Payment Received" : "Confirm Payment"}
              </button>
            )}
          </>
        )}

        {!billGenerated ? (
          <button
            onClick={generateBill}
            className="bg-green-600 text-white w-full py-3 rounded"
          >
            Generate Bill
          </button>
        ) : (
          <button
            onClick={handlePrint}
            className="border w-full py-3 rounded"
          >
            🖨 Print
          </button>
        )}
        </div>
      </div>
    </div>
  );
}

export default Billing;
