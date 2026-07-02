import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaTimes, FaTrash, FaShoppingBag, FaTag, FaClock } from "react-icons/fa";
import { IoFlash } from "react-icons/io5";

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

  const updateCart = items => {
    localStorage.setItem("cart", JSON.stringify(items));
    setCartItems(items);
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const increaseQty = id => updateCart(cartItems.map(p => p._id === id ? { ...p, quantity: p.quantity + 1 } : p));
  const decreaseQty = id => updateCart(cartItems.map(p => p._id === id ? { ...p, quantity: p.quantity - 1 } : p).filter(p => p.quantity > 0));
  const removeItem  = id => updateCart(cartItems.filter(p => p._id !== id));

  const itemsTotal = cartItems.reduce((t, i) => t + i.price * i.quantity, 0);
  const delivery   = cartItems.length > 0 ? 40 : 0;
  const gst        = +(itemsTotal * 0.05).toFixed(2);
  const grandTotal = +(itemsTotal + delivery + gst).toFixed(2);
  const totalItems = cartItems.reduce((s, i) => s + i.quantity, 0);
  const savings    = cartItems.reduce((t, item) => item.discount_price ? t + (item.price - item.discount_price) * item.quantity : t, 0);
  const freeDeliveryLeft = Math.max(0, 199 - itemsTotal);

  if (!isOpen) return null;

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes drawerIn { from{transform:translateX(100%);opacity:0} to{transform:translateX(0);opacity:1} }
        @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
        .qty-btn:hover { background:rgba(255,255,255,0.2) !important; }
        .remove-btn:hover { background:#fee2e2 !important; }
      `}</style>

      {/* Overlay */}
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:90, animation:"fadeIn 0.25s ease", backdropFilter:"blur(3px)" }} />

      {/* Drawer */}
      <div style={{ position:"fixed", right:0, top:0, bottom:0, width:"100%", maxWidth:440, background:"#f5f5f0", zIndex:100, display:"flex", flexDirection:"column", fontFamily:"'DM Sans',sans-serif", animation:"drawerIn 0.3s ease", boxShadow:"-8px 0 40px rgba(0,0,0,0.15)" }}>

        {/* ── HEADER ── */}
        <div style={{ background:"linear-gradient(135deg,#1a9c3e,#0d5c24)", padding:"18px 20px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:38, height:38, background:"rgba(255,255,255,0.2)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <FaShoppingBag color="white" size={17} />
              </div>
              <div>
                <div style={{ fontWeight:900, fontSize:18, color:"white" }}>Your Cart</div>
                {totalItems > 0 && <div style={{ fontSize:12, color:"rgba(255,255,255,0.8)", marginTop:1 }}>{totalItems} item{totalItems !== 1 ? "s" : ""} added</div>}
              </div>
            </div>
            <button onClick={onClose} style={{ background:"rgba(255,255,255,0.2)", border:"none", borderRadius:"50%", width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"background 0.2s" }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.3)"}
              onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.2)"}>
              <FaTimes size={14} color="white" />
            </button>
          </div>

          {/* Delivery strip */}
          {cartItems.length > 0 && (
            <div style={{ background:"rgba(255,255,255,0.15)", borderRadius:14, padding:"10px 14px", display:"flex", alignItems:"center", gap:10, backdropFilter:"blur(8px)" }}>
              <div style={{ fontSize:22 }}>🛵</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:13, color:"white" }}>
                  {freeDeliveryLeft > 0
                    ? `Add ₹${freeDeliveryLeft.toFixed(0)} more for free delivery`
                    : "🎉 You've unlocked free delivery!"
                  }
                </div>
                {freeDeliveryLeft > 0 && (
                  <div style={{ marginTop:6, background:"rgba(255,255,255,0.2)", borderRadius:20, height:6, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${Math.min(100,(itemsTotal/199)*100)}%`, background:"#facc15", borderRadius:20, transition:"width 0.4s ease" }} />
                  </div>
                )}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:4, background:"rgba(255,255,255,0.2)", padding:"5px 10px", borderRadius:20, flexShrink:0 }}>
                <FaClock color="white" size={10} />
                <span style={{ fontSize:11, fontWeight:700, color:"white" }}>15 min</span>
              </div>
            </div>
          )}
        </div>

        {/* ── ITEMS ── */}
        <div style={{ flex:1, overflowY:"auto", padding:"12px 16px" }}>
          {cartItems.length === 0 ? (
            <div style={{ textAlign:"center", padding:"70px 20px", animation:"fadeIn 0.4s ease" }}>
              <div style={{ fontSize:72, marginBottom:16, opacity:0.6 }}>🛒</div>
              <div style={{ fontWeight:900, fontSize:20, color:"#111", marginBottom:8 }}>Your cart is empty</div>
              <div style={{ color:"#9ca3af", fontSize:14, marginBottom:28, lineHeight:1.6 }}>Add items from a store to get started!</div>
              <button onClick={onClose} style={{ background:"linear-gradient(135deg,#1a9c3e,#0d5c24)", color:"white", border:"none", borderRadius:16, padding:"14px 32px", fontWeight:800, fontSize:15, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", boxShadow:"0 4px 16px rgba(26,156,62,0.3)" }}>
                Browse Stores 🏪
              </button>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {cartItems.map(item => (
                <div key={item._id} style={{ background:"white", borderRadius:18, padding:14, display:"flex", gap:12, alignItems:"center", boxShadow:"0 2px 10px rgba(0,0,0,0.06)", transition:"transform 0.2s" }}
                  onMouseEnter={e=>e.currentTarget.style.transform="translateX(-2px)"}
                  onMouseLeave={e=>e.currentTarget.style.transform="translateX(0)"}>

                  {/* Image */}
                  <div style={{ width:58, height:58, borderRadius:14, background:"#f5f5f5", flexShrink:0, overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {item.image_url
                      ? <img src={item.image_url} alt={item.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e=>e.target.style.display="none"} />
                      : <span style={{ fontSize:26 }}>📦</span>
                    }
                  </div>

                  {/* Info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:14, color:"#111", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:3 }}>{item.name}</div>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ fontWeight:900, fontSize:15, color:"#1a9c3e" }}>₹{item.price}</span>
                      <span style={{ fontSize:11, color:"#9ca3af" }}>× {item.quantity} = ₹{(item.price * item.quantity).toFixed(0)}</span>
                    </div>
                  </div>

                  {/* Qty controls */}
                  <div style={{ display:"flex", alignItems:"center", gap:0, background:"#1a9c3e", borderRadius:12, overflow:"hidden", flexShrink:0 }}>
                    <button className="qty-btn" onClick={() => decreaseQty(item._id)} style={{ background:"none", border:"none", color:"white", fontWeight:800, fontSize:20, padding:"6px 12px", cursor:"pointer", lineHeight:1, transition:"background 0.15s" }}>−</button>
                    <span style={{ color:"white", fontWeight:800, fontSize:14, minWidth:22, textAlign:"center" }}>{item.quantity}</span>
                    <button className="qty-btn" onClick={() => increaseQty(item._id)} style={{ background:"none", border:"none", color:"white", fontWeight:800, fontSize:20, padding:"6px 12px", cursor:"pointer", lineHeight:1, transition:"background 0.15s" }}>+</button>
                  </div>

                  {/* Delete */}
                  <button className="remove-btn" onClick={() => removeItem(item._id)} style={{ background:"#fef2f2", border:"none", borderRadius:10, width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0, transition:"background 0.2s" }}>
                    <FaTrash size={12} color="#ef4444" />
                  </button>
                </div>
              ))}

              {/* Offer strip */}
              <div style={{ background:"white", border:"1.5px dashed #86efac", borderRadius:16, padding:"12px 16px", display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:36, height:36, background:"#f0fdf4", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <FaTag color="#1a9c3e" size={14} />
                </div>
                <div>
                  <div style={{ fontWeight:800, fontSize:13, color:"#1a9c3e" }}>50% off upto ₹150</div>
                  <div style={{ fontSize:11, color:"#6b7280", marginTop:1 }}>USE TRY50 • Minimum order ₹99</div>
                </div>
                <div style={{ marginLeft:"auto", background:"#1a9c3e", color:"white", fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:20, cursor:"pointer", whiteSpace:"nowrap" }}>Apply</div>
              </div>

              {savings > 0 && (
                <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:14, padding:"10px 16px", display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:18 }}>🎉</span>
                  <span style={{ fontSize:13, fontWeight:700, color:"#1a9c3e" }}>You're saving ₹{savings.toFixed(2)} on this order!</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── BILL + CHECKOUT ── */}
        {cartItems.length > 0 && (
          <div style={{ background:"white", padding:"16px 20px", borderTop:"1px solid #f0f0f0", boxShadow:"0 -4px 20px rgba(0,0,0,0.08)" }}>
            {/* Bill */}
            <div style={{ marginBottom:14 }}>
              {[
                { label:"Items Total",     val:`₹${itemsTotal.toFixed(2)}` },
                { label:"Delivery charge", val:`₹${delivery}` },
                { label:"GST (5%)",        val:`₹${gst}` },
              ].map((r,i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:"#6b7280", marginBottom:7 }}>
                  <span>{r.label}</span>
                  <span style={{ fontWeight:600, color:"#374151" }}>{r.val}</span>
                </div>
              ))}
              <div style={{ display:"flex", justifyContent:"space-between", fontWeight:900, fontSize:17, color:"#111", borderTop:"2px dashed #e5e7eb", paddingTop:12, marginTop:6 }}>
                <span>Grand Total</span>
                <span style={{ color:"#1a9c3e" }}>₹{grandTotal}</span>
              </div>
            </div>

            {/* Checkout button */}
            <button onClick={() => { onClose(); navigate("/checkout"); }}
              style={{ width:"100%", background:"linear-gradient(135deg,#1a9c3e,#0d5c24)", color:"white", border:"none", borderRadius:18, padding:"0 20px", height:58, fontSize:15, fontWeight:800, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 6px 24px rgba(26,156,62,0.35)", transition:"transform 0.2s" }}
              onMouseEnter={e=>e.currentTarget.style.transform="scale(1.01)"}
              onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
              <span style={{ background:"rgba(255,255,255,0.2)", borderRadius:10, padding:"4px 12px", fontSize:13, fontWeight:700 }}>
                {totalItems} item{totalItems !== 1 ? "s" : ""}
              </span>
              <span style={{ display:"flex", alignItems:"center", gap:6 }}>
                <IoFlash color="#facc15" size={16} />
                Proceed to Checkout
              </span>
              <span style={{ fontWeight:900, fontSize:16 }}>₹{grandTotal}</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}