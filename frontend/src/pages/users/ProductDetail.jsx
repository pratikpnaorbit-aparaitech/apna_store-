import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { FaArrowLeft, FaStar, FaFire } from "react-icons/fa";

const PUBLIC = axios.create({ baseURL: "http://localhost:5000/api" });

export default function ProductDetail() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [cart, setCart] = useState(JSON.parse(localStorage.getItem("cart") || "[]"));
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const res = await PUBLIC.get(`/inventory/public/${productId}`);
        setProduct(res.data);
  
        if (res.data?.category) {
          const allRes = await PUBLIC.get(`/inventory/public?category=${res.data.category}`);
          const all = Array.isArray(allRes.data) ? allRes.data : allRes.data?.data || [];
          setRelated(all.filter(p => p._id !== productId).slice(0, 6));
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchProduct();
  }, [productId]);

  const updateCart = (newCart) => {
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const addToCart = (p) => {
    const price = p.discount_price || p.price;
    const existing = cart.find(c => c._id === p._id);
    const newCart = existing
      ? cart.map(c => c._id === p._id ? { ...c, quantity: c.quantity + 1 } : c)
      : [...cart, { ...p, price, quantity: 1 }];
    updateCart(newCart);
  };

  const decreaseQty = (p) => {
    updateCart(cart.map(c => c._id === p._id ? { ...c, quantity: c.quantity - 1 } : c).filter(c => c.quantity > 0));
  };

  const getQty = (pid) => cart.find(c => c._id === pid)?.quantity || 0;
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  const handleImageError = () => {
    setImageError(true);
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f5f5f0" }}>
      <div style={{ width: 40, height: 40, border: "4px solid #e5e7eb", borderTop: "4px solid #1a9c3e", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!product) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>😕</div>
        <div style={{ fontWeight: 700, fontSize: 18 }}>Product not found</div>
        <button onClick={() => navigate(-1)} style={{ marginTop: 16, background: "#1a9c3e", color: "white", border: "none", borderRadius: 12, padding: "10px 24px", fontWeight: 700, cursor: "pointer" }}>Go Back</button>
      </div>
    </div>
  );

  const qty = getQty(product._id);
  const discount = product.discount_price && product.price
    ? Math.round(((product.price - product.discount_price) / product.price) * 100)
    : 0;

  // Debug: Log the image URL

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#f5f5f0", minHeight: "100vh", paddingBottom: 100 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* BACK BUTTON */}
      <button onClick={() => navigate(-1)} style={{ position: "fixed", top: 16, left: 16, zIndex: 50, background: "rgba(255,255,255,0.9)", border: "none", borderRadius: "50%", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 12px rgba(0,0,0,0.1)", backdropFilter: "blur(8px)" }}>
        <FaArrowLeft size={15} color="#374151" />
      </button>

      {/* PRODUCT IMAGE - FIXED */}
      <div style={{ width: "100%", height: 320, background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
        {product.image_url && !imageError ? (
          <img 
            src={product.image_url} 
            alt={product.name} 
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={handleImageError}
            loading="lazy"
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 80 }}>📦</span>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>No image available</span>
          </div>
        )}
        {discount > 0 && (
          <span style={{ position: "absolute", top: 60, right: 16, background: "#ef4444", color: "white", fontSize: 12, fontWeight: 800, padding: "4px 10px", borderRadius: 20 }}>{discount}% OFF</span>
        )}
        {product.is_featured && (
          <span style={{ position: "absolute", top: 60, left: 16, background: "#1a9c3e", color: "white", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20 }}>⭐ Bestseller</span>
        )}
      </div>

      {/* PRODUCT INFO */}
      <div style={{ background: "white", borderRadius: "24px 24px 0 0", marginTop: -20, padding: "24px 20px", position: "relative" }}>
        {/* Veg/Non-veg indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{ width: 20, height: 20, border: "2px solid #1a9c3e", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#1a9c3e" }} />
          </div>
          {product.category && <span style={{ background: "#f0fdf4", color: "#1a9c3e", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>{product.category}</span>}
          {product.stock < 10 && product.stock > 0 && <span style={{ background: "#fff7ed", color: "#f97316", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>Only {product.stock} left!</span>}
        </div>

        <h1 style={{ fontWeight: 900, fontSize: 24, color: "#111", marginBottom: 8, marginTop: 0 }}>{product.name}</h1>

        {product.description && (
          <p style={{ color: "#6b7280", fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>{product.description}</p>
        )}

        {/* Highlights */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          {[
            { icon: "⚡", text: "10 min delivery" },
            { icon: "✅", text: "Quality assured" },
            { icon: "🔄", text: "Easy returns" },
          ].map((h, i) => (
            <div key={i} style={{ flex: 1, background: "#f9fafb", borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 18, marginBottom: 2 }}>{h.icon}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#6b7280" }}>{h.text}</div>
            </div>
          ))}
        </div>

        {/* Price */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ fontWeight: 900, fontSize: 28, color: "#111" }}>₹{product.discount_price || product.price}</span>
          {product.discount_price && <span style={{ fontSize: 16, color: "#9ca3af", textDecoration: "line-through" }}>₹{product.price}</span>}
          {discount > 0 && <span style={{ background: "#f0fdf4", color: "#1a9c3e", fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>Save {discount}%</span>}
        </div>

        {product.stock === 0 && (
          <div style={{ background: "#fef2f2", color: "#ef4444", fontWeight: 700, fontSize: 13, padding: "8px 14px", borderRadius: 10, marginBottom: 12, display: "inline-block" }}>
            ❌ Out of Stock
          </div>
        )}
      </div>

      {/* PEOPLE ALSO BOUGHT */}
      {related.length > 0 && (
        <div style={{ padding: "20px 20px 0", background: "white", marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 800, fontSize: 16, color: "#111", marginBottom: 14 }}>
            <FaFire color="#f97316" size={16} /> People also bought
          </div>
          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 16, scrollbarWidth: "none" }}>
            {related.map(p => {
              const rQty = getQty(p._id);
              return (
                <div key={p._id} style={{ flexShrink: 0, width: 140, background: "#f9fafb", borderRadius: 14, overflow: "hidden", cursor: "pointer" }} onClick={() => navigate(`/product/${p._id}`)}>
                  <div style={{ position: "relative", height: 110, display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f0f0" }}>
                    {p.image_url ? (
                      <img 
                        src={p.image_url} 
                        alt={p.name} 
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = '<span style="font-size:36px">📦</span>';
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: 36 }}>📦</span>
                    )}
                    {p.is_featured && <span style={{ position: "absolute", top: 6, left: 6, background: "#1a9c3e", color: "white", fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 10 }}>⭐</span>}
                    {rQty === 0
                      ? <button onClick={e => { e.stopPropagation(); addToCart(p); }} style={{ position: "absolute", bottom: 6, right: 6, background: "#1a9c3e", color: "white", border: "none", borderRadius: 8, width: 28, height: 28, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>+</button>
                      : <div style={{ position: "absolute", bottom: 6, right: 6, background: "#1a9c3e", borderRadius: 8, display: "flex", alignItems: "center", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
                          <button onClick={() => decreaseQty(p)} style={{ background: "none", border: "none", color: "white", fontWeight: 700, fontSize: 14, padding: "3px 7px", cursor: "pointer" }}>−</button>
                          <span style={{ color: "white", fontWeight: 700, fontSize: 11, minWidth: 14, textAlign: "center" }}>{rQty}</span>
                          <button onClick={() => addToCart(p)} style={{ background: "none", border: "none", color: "white", fontWeight: 700, fontSize: 14, padding: "3px 7px", cursor: "pointer" }}>+</button>
                        </div>
                    }
                  </div>
                  <div style={{ padding: "8px 10px" }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: "#111", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: "#111" }}>₹{p.discount_price || p.price}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STICKY ADD TO CART */}
      {product.stock !== 0 && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "white", padding: "14px 20px", borderTop: "1px solid #e5e7eb", zIndex: 50 }}>
          <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 20, color: "#111" }}>₹{product.discount_price || product.price}</div>
              {product.discount_price && <div style={{ fontSize: 12, color: "#9ca3af", textDecoration: "line-through" }}>₹{product.price}</div>}
            </div>
            {qty === 0 ? (
              <button onClick={() => addToCart(product)} style={{ background: "#1a9c3e", color: "white", border: "none", borderRadius: 14, padding: "13px 32px", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", boxShadow: "0 4px 16px rgba(26,156,62,0.3)", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>Customise</span> Add +
              </button>
            ) : (
              <div style={{ background: "#1a9c3e", borderRadius: 14, display: "flex", alignItems: "center", overflow: "hidden", boxShadow: "0 4px 16px rgba(26,156,62,0.3)" }}>
                <button onClick={() => decreaseQty(product)} style={{ background: "none", border: "none", color: "white", fontWeight: 700, fontSize: 22, padding: "10px 18px", cursor: "pointer" }}>−</button>
                <span style={{ color: "white", fontWeight: 800, fontSize: 16, minWidth: 24, textAlign: "center" }}>{qty}</span>
                <button onClick={() => addToCart(product)} style={{ background: "none", border: "none", color: "white", fontWeight: 700, fontSize: 22, padding: "10px 18px", cursor: "pointer" }}>+</button>
              </div>
            )}
          </div>
          {cartCount > 0 && (
            <button onClick={() => navigate("/checkout")} style={{ width: "100%", background: "#111", color: "white", border: "none", borderRadius: 12, padding: "10px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", paddingLeft: 16, paddingRight: 16 }}>
              <span>{cartCount} items in cart</span>
              <span>View Cart → ₹{cartTotal.toFixed(0)}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}