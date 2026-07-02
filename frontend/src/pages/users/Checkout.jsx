import { useEffect, useState } from "react";
import { API } from "../../services/api";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaMapMarkerAlt, FaWallet, FaCreditCard, FaMoneyBillWave, FaShieldAlt, FaClock, FaTag } from "react-icons/fa";
import { IoFlash } from "react-icons/io5";

export default function Checkout() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [placing, setPlacing] = useState(false);
  const [address, setAddress] = useState({ name:"", phone:"", street:"", city:"", state:"", pincode:"" });
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [activeField, setActiveField] = useState(null);
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    setCartItems(cart);
    setAddress(prev => ({ ...prev, name: user.name || "", phone: user.mobile || "" }));
  }, []);

  const itemsTotal = cartItems.reduce((t, item) => t + item.price * item.quantity, 0);
  const delivery = 40;
  const gst = +(itemsTotal * 0.05).toFixed(2);
  const grandTotal = +(itemsTotal + delivery + gst).toFixed(2);
  const savings = cartItems.reduce((t, item) => {
    if (item.discount_price) return t + (item.price - item.discount_price) * item.quantity;
    return t;
  }, 0);

  const handlePlaceOrder = async () => {
    if (!address.name || !address.phone || !address.street || !address.city || !address.pincode) {
      alert("Please fill all address fields"); return;
    }
    if (cartItems.length === 0) { alert("Your cart is empty"); return; }
    const storeId = cartItems[0]?.storeId?._id || cartItems[0]?.storeId || null;
    try {
      setPlacing(true);
      await API.post("/orders/place", {
        userId: user.id || user._id,
        storeId,
        items: cartItems.map(item => ({ productId: item._id || item.id || "", name: item.name, price: item.price, quantity: item.quantity })),
        address,
        paymentMethod,
        itemsTotal,
        deliveryCharge: delivery,
        gst,
        totalAmount: grandTotal,
        status: "Placed"
      });
      localStorage.removeItem("cart");
      window.dispatchEvent(new Event("cartUpdated"));
      navigate("/order-success");
    } catch (error) {
      console.error(error);
      alert("Failed to place order. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  const PAYMENT_OPTIONS = [
    { id:"COD",  label:"Cash on Delivery",    sub:"Pay when your order arrives",     icon:<FaMoneyBillWave size={20} color="#1a9c3e" />, color:"#e8f5e9" },
    { id:"UPI",  label:"UPI Payment",          sub:"Google Pay, PhonePe, Paytm",      icon:<FaWallet size={20} color="#6366f1" />,        color:"#f0f0ff" },
    { id:"Card", label:"Credit / Debit Card",  sub:"Visa, Mastercard, Rupay",         icon:<FaCreditCard size={20} color="#3b82f6" />,     color:"#eff6ff" },
  ];

  const ADDRESS_FIELDS = [
    { key:"name",    label:"Full Name",       placeholder:"Your full name",         full:false, type:"text" },
    { key:"phone",   label:"Phone Number",    placeholder:"10 digit mobile number", full:false, type:"tel" },
    { key:"street",  label:"Street / Area",   placeholder:"House no., street name", full:true,  type:"text" },
    { key:"city",    label:"City",            placeholder:"City",                   full:false, type:"text" },
    { key:"state",   label:"State",           placeholder:"State",                  full:false, type:"text" },
    { key:"pincode", label:"Pincode",         placeholder:"6 digit pincode",        full:false, type:"text" },
  ];

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:"#f5f5f0", minHeight:"100vh", paddingBottom:110 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        .field-input:focus { border-color:#1a9c3e !important; box-shadow:0 0 0 3px rgba(26,156,62,0.12) !important; background:white !important; }
        .pay-opt:hover { border-color:#1a9c3e !important; }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ background:"white", padding:"0 20px", display:"flex", alignItems:"center", gap:14, borderBottom:"1px solid #f0f0f0", position:"sticky", top:0, zIndex:40, height:60, boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
        <button onClick={() => navigate(-1)} style={{ background:"#f5f5f5", border:"none", borderRadius:"50%", width:38, height:38, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"background 0.2s" }}
          onMouseEnter={e=>e.currentTarget.style.background="#e5e7eb"}
          onMouseLeave={e=>e.currentTarget.style.background="#f5f5f5"}>
          <FaArrowLeft size={15} color="#374151" />
        </button>
        <div>
          <div style={{ fontWeight:900, fontSize:18, color:"#111", letterSpacing:"-0.3px" }}>Checkout</div>
          <div style={{ fontSize:12, color:"#6b7280", marginTop:1 }}>{cartItems.length} item{cartItems.length !== 1 ? "s" : ""} in your order</div>
        </div>
        {/* Delivery estimate */}
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6, background:"#f0fdf4", border:"1px solid #bbf7d0", padding:"6px 12px", borderRadius:20 }}>
          <FaClock color="#1a9c3e" size={12} />
          <span style={{ fontSize:12, fontWeight:700, color:"#1a9c3e" }}>15-20 min delivery</span>
        </div>
      </div>

      <div style={{ maxWidth:680, margin:"0 auto", padding:"20px 16px", display:"flex", flexDirection:"column", gap:16 }}>

        {/* ── DELIVERY TIME BANNER ── */}
        <div style={{ background:"linear-gradient(135deg,#1a9c3e,#0d5c24)", borderRadius:20, padding:"16px 20px", display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:48, height:48, background:"rgba(255,255,255,0.15)", borderRadius:16, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>🛵</div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:800, fontSize:16, color:"white" }}>Delivery in 15 minutes!</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.8)", marginTop:3 }}>Your order will be delivered super fast</div>
          </div>
          <div style={{ background:"rgba(255,255,255,0.15)", padding:"6px 14px", borderRadius:20, backdropFilter:"blur(8px)" }}>
            <IoFlash color="#facc15" size={18} />
          </div>
        </div>

        {/* ── ORDER ITEMS ── */}
        <div style={{ background:"white", borderRadius:20, overflow:"hidden", boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ padding:"16px 20px", borderBottom:"1px solid #f5f5f5", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ fontWeight:800, fontSize:16, color:"#111" }}>🛒 Your Order</div>
            <span style={{ background:"#f0fdf4", color:"#1a9c3e", fontSize:12, fontWeight:700, padding:"3px 10px", borderRadius:20 }}>{cartItems.length} items</span>
          </div>
          <div style={{ padding:"8px 0" }}>
            {cartItems.map((item, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 20px", borderBottom: i < cartItems.length - 1 ? "1px solid #f9f9f9" : "none" }}>
                <div style={{ width:44, height:44, background:"#f5f5f5", borderRadius:12, flexShrink:0, overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {item.image_url
                    ? <img src={item.image_url} alt={item.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e=>e.target.style.display="none"} />
                    : <span style={{ fontSize:22 }}>📦</span>
                  }
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:"#111", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.name}</div>
                  <div style={{ fontSize:12, color:"#9ca3af", marginTop:2 }}>Qty: {item.quantity} × ₹{item.price}</div>
                </div>
                <div style={{ fontWeight:800, fontSize:14, color:"#1a9c3e", flexShrink:0 }}>₹{(item.price * item.quantity).toFixed(2)}</div>
              </div>
            ))}
          </div>
          {savings > 0 && (
            <div style={{ padding:"12px 20px", background:"#f0fdf4", borderTop:"1px solid #dcfce7", display:"flex", alignItems:"center", gap:8 }}>
              <FaTag color="#1a9c3e" size={12} />
              <span style={{ fontSize:13, fontWeight:700, color:"#1a9c3e" }}>You save ₹{savings.toFixed(2)} on this order! 🎉</span>
            </div>
          )}
        </div>

        {/* ── DELIVERY ADDRESS ── */}
        <div style={{ background:"white", borderRadius:20, overflow:"hidden", boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ padding:"16px 20px", borderBottom:"1px solid #f5f5f5", display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, background:"#f0fdf4", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <FaMapMarkerAlt color="#1a9c3e" size={16} />
            </div>
            <div style={{ fontWeight:800, fontSize:16, color:"#111" }}>Delivery Address</div>
          </div>
          <div style={{ padding:"16px 20px" }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {ADDRESS_FIELDS.map(field => (
                <div key={field.key} style={{ gridColumn: field.full ? "1 / -1" : "auto" }}>
                  <label style={{ fontSize:11, fontWeight:700, color: activeField === field.key ? "#1a9c3e" : "#6b7280", display:"block", marginBottom:6, transition:"color 0.2s", textTransform:"uppercase", letterSpacing:"0.5px" }}>
                    {field.label}
                  </label>
                  <input
                    className="field-input"
                    type={field.type}
                    value={address[field.key]}
                    onChange={e => setAddress(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    onFocus={() => setActiveField(field.key)}
                    onBlur={() => setActiveField(null)}
                    style={{ width:"100%", padding:"11px 14px", borderRadius:12, border:`1.5px solid ${activeField === field.key ? "#1a9c3e" : "#e5e7eb"}`, fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"'DM Sans',sans-serif", background:"#fafafa", transition:"all 0.2s", color:"#111" }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── PAYMENT METHOD ── */}
        <div style={{ background:"white", borderRadius:20, overflow:"hidden", boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ padding:"16px 20px", borderBottom:"1px solid #f5f5f5", display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, background:"#eff6ff", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <FaShieldAlt color="#3b82f6" size={16} />
            </div>
            <div style={{ fontWeight:800, fontSize:16, color:"#111" }}>Payment Method</div>
          </div>
          <div style={{ padding:"12px 20px", display:"flex", flexDirection:"column", gap:10 }}>
            {PAYMENT_OPTIONS.map(opt => (
              <div key={opt.id} className="pay-opt" onClick={() => setPaymentMethod(opt.id)}
                style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", borderRadius:16, border:`2px solid ${paymentMethod === opt.id ? "#1a9c3e" : "#e5e7eb"}`, background: paymentMethod === opt.id ? "#f0fdf4" : "white", cursor:"pointer", transition:"all 0.2s" }}>
                <div style={{ width:44, height:44, background: paymentMethod === opt.id ? opt.color : "#f5f5f5", borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", transition:"background 0.2s" }}>
                  {opt.icon}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:14, color:"#111" }}>{opt.label}</div>
                  <div style={{ fontSize:12, color:"#9ca3af", marginTop:2 }}>{opt.sub}</div>
                </div>
                {/* Radio */}
                <div style={{ width:22, height:22, borderRadius:"50%", border:`2.5px solid ${paymentMethod === opt.id ? "#1a9c3e" : "#d1d5db"}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"border-color 0.2s" }}>
                  {paymentMethod === opt.id && <div style={{ width:11, height:11, borderRadius:"50%", background:"#1a9c3e" }} />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── BILL SUMMARY ── */}
        <div style={{ background:"white", borderRadius:20, overflow:"hidden", boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ padding:"16px 20px", borderBottom:"1px solid #f5f5f5" }}>
            <div style={{ fontWeight:800, fontSize:16, color:"#111" }}>Bill Summary</div>
          </div>
          <div style={{ padding:"16px 20px" }}>
            {[
              { label:"Items Total",     val:`₹${itemsTotal.toFixed(2)}`,   color:"#374151" },
              { label:"Delivery Charge", val:`₹${delivery}`,                 color:"#374151" },
              { label:"GST (5%)",        val:`₹${gst}`,                      color:"#374151" },
            ].map((r,i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", marginBottom:10, fontSize:14, color:"#6b7280" }}>
                <span>{r.label}</span>
                <span style={{ fontWeight:600, color:r.color }}>{r.val}</span>
              </div>
            ))}
            {savings > 0 && (
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10, fontSize:14 }}>
                <span style={{ color:"#1a9c3e" }}>Discount savings</span>
                <span style={{ fontWeight:700, color:"#1a9c3e" }}>-₹{savings.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display:"flex", justifyContent:"space-between", fontWeight:900, fontSize:18, color:"#111", borderTop:"2px dashed #e5e7eb", paddingTop:14, marginTop:6 }}>
              <span>Grand Total</span>
              <span style={{ color:"#1a9c3e" }}>₹{grandTotal}</span>
            </div>
          </div>
        </div>

        {/* ── TRUST BADGES ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
          {[
            { emoji:"🔒", label:"Secure Payment" },
            { emoji:"⚡", label:"Fast Delivery" },
            { emoji:"↩️", label:"Easy Returns" },
          ].map(b => (
            <div key={b.label} style={{ background:"white", borderRadius:16, padding:"12px 8px", textAlign:"center", boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize:22, marginBottom:4 }}>{b.emoji}</div>
              <div style={{ fontSize:11, fontWeight:700, color:"#374151" }}>{b.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── STICKY PLACE ORDER ── */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"white", padding:"16px 20px", borderTop:"1px solid #e5e7eb", zIndex:50, boxShadow:"0 -4px 24px rgba(0,0,0,0.1)" }}>
        <div style={{ maxWidth:680, margin:"0 auto" }}>
          {/* Mini bill preview */}
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#9ca3af", marginBottom:10 }}>
            <span>{cartItems.length} items • GST included</span>
            <span>{paymentMethod === "COD" ? "💵 Pay on delivery" : paymentMethod === "UPI" ? "📱 UPI payment" : "💳 Card payment"}</span>
          </div>
          <button onClick={handlePlaceOrder} disabled={placing || cartItems.length === 0}
            style={{ width:"100%", background: placing ? "#9ca3af" : "linear-gradient(135deg,#1a9c3e,#0d5c24)", color:"white", border:"none", borderRadius:18, padding:"0 24px", height:58, fontSize:16, fontWeight:800, cursor: placing || cartItems.length === 0 ? "not-allowed" : "pointer", fontFamily:"'DM Sans',sans-serif", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow: placing ? "none" : "0 6px 24px rgba(26,156,62,0.4)", transition:"all 0.2s", letterSpacing:"-0.2px" }}>
            <span style={{ display:"flex", alignItems:"center", gap:8 }}>
              {placing ? <span style={{ fontSize:18 }}>⏳</span> : <IoFlash color="#facc15" size={20} />}
              {placing ? "Placing your order..." : "Place Order"}
            </span>
            <span style={{ background:"rgba(255,255,255,0.2)", borderRadius:12, padding:"6px 14px", fontSize:16, fontWeight:900 }}>
              ₹{grandTotal}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}