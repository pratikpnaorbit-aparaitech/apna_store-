import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { FaArrowLeft, FaSearch } from "react-icons/fa";

const PUBLIC = axios.create({ baseURL: "http://localhost:5000/api" });

const CATEGORY_HEROES = {
  "Grocery": { bg: "linear-gradient(135deg,#2d6a4f,#1b4332)", emoji: "🛒", sub: "FRESH • FAST • DELIVERED" },
  "Pharmacy": { bg: "linear-gradient(135deg,#e63946,#c1121f)", emoji: "💊", sub: "HEALTH • WELLNESS • CARE" },
  "Electronics": { bg: "linear-gradient(135deg,#0077b6,#023e8a)", emoji: "📱", sub: "LATEST • TECH • GADGETS" },
  "Clothing & Fashion": { bg: "linear-gradient(135deg,#7b2d8b,#4a0e6e)", emoji: "👗", sub: "STYLE • TREND • FASHION" },
  "Food & Beverages": { bg: "linear-gradient(135deg,#f4a261,#e76f51)", emoji: "🍔", sub: "TASTY • FRESH • HOT" },
  "Hardware": { bg: "linear-gradient(135deg,#495057,#212529)", emoji: "🔧", sub: "BUILD • FIX • CREATE" },
  "Stationery": { bg: "linear-gradient(135deg,#2d9cdb,#1565c0)", emoji: "✏️", sub: "WRITE • CREATE • LEARN" },
  "Beauty & Cosmetics": { bg: "linear-gradient(135deg,#e91e8c,#ad1457)", emoji: "💄", sub: "GLOW • SHINE • BEAUTY" },
  "Sports & Fitness": { bg: "linear-gradient(135deg,#00897b,#004d40)", emoji: "🏋️", sub: "TRAIN • PLAY • WIN" },
  "Books": { bg: "linear-gradient(135deg,#8d6e63,#4e342e)", emoji: "📚", sub: "READ • LEARN • GROW" },
  "Toys & Games": { bg: "linear-gradient(135deg,#7c4dff,#4527a0)", emoji: "🎮", sub: "PLAY • FUN • JOY" },
};

export default function Category() {
  const { category } = useParams();
  const navigate = useNavigate();
  const decodedCategory = decodeURIComponent(category);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState(JSON.parse(localStorage.getItem("cart") || "[]"));
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const hero = CATEGORY_HEROES[decodedCategory] || { bg: "linear-gradient(135deg,#1a9c3e,#0d5c24)", emoji: "🔍", sub: "DISCOVER • EXPLORE • SHOP" };

  const knownCategories = Object.keys(CATEGORY_HEROES);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        let res;
        if (knownCategories.includes(decodedCategory)) {
          res = await PUBLIC.get(`/inventory/public?category=${encodeURIComponent(decodedCategory)}`);
        } else {
          res = await PUBLIC.get(`/inventory/public?search=${encodeURIComponent(decodedCategory)}`);
        }
        setProducts(res.data || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
  }, [decodedCategory]);

  const updateCart = (newCart) => {
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const addToCart = (product) => {
    const pid = product._id;
    const price = product.discount_price || product.price;
    const existing = cart.find(p => p._id === pid);
    const newCart = existing
      ? cart.map(p => p._id === pid ? { ...p, quantity: p.quantity + 1 } : p)
      : [...cart, { ...product, _id: pid, price, quantity: 1 }];
    updateCart(newCart);
    setTimeout(() => window.dispatchEvent(new Event("openCartDrawer")), 100);
  };

  const decreaseQty = (product) => {
    const newCart = cart.map(p => p._id === product._id ? { ...p, quantity: p.quantity - 1 } : p).filter(p => p.quantity > 0);
    updateCart(newCart);
  };

  const getQty = (id) => cart.find(p => p._id === id)?.quantity || 0;

  const filtered = products.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#f5f5f0", minHeight: "100vh", paddingBottom: 80 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* HERO */}
      <div style={{ position: "relative", height: 200, background: hero.bg, overflow: "hidden" }}>
        <button onClick={() => navigate(-1)} style={{ position: "absolute", top: 16, left: 16, zIndex: 10, background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <FaArrowLeft color="white" size={15} />
        </button>
        <div style={{ position: "absolute", right: -20, top: -20, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
        <div style={{ position: "absolute", right: 20, top: 20, fontSize: 80, opacity: 0.3 }}>{hero.emoji}</div>
        <div style={{ position: "absolute", bottom: 24, left: 20 }}>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 4 }}>{hero.sub}</div>
          <h1 style={{ color: "white", fontWeight: 900, fontSize: 28, margin: 0, textTransform: "uppercase", letterSpacing: -0.5 }}>{decodedCategory}</h1>
          <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 4 }}>{loading ? "Loading..." : `${products.length} products found`}</div>
        </div>
      </div>

      {/* SEARCH */}
      <div style={{ padding: "12px 16px" }}>
        <div style={{ background: "white", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
          <FaSearch color="#9ca3af" size={13} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search in ${decodedCategory}...`} style={{ flex: 1, border: "none", outline: "none", fontSize: 13, color: "#374151", background: "transparent" }} />
        </div>
      </div>

      {/* PRODUCTS */}
      <div style={{ padding: "0 16px" }}>
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ background: "white", borderRadius: 16, height: 200, animation: "pulse 1.5s infinite" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🛒</div>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#111" }}>No products in {decodedCategory} yet</div>
            <div style={{ color: "#9ca3af", fontSize: 13, marginTop: 4 }}>Check back soon!</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {filtered.map(product => {
              const qty = getQty(product._id);
              return (
                <div key={product._id} style={{ background: "white", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
                  <div style={{ position: "relative", height: 140, background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {product.image_url
                      ? <img src={product.image_url} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <span style={{ fontSize: 48 }}>📦</span>
                    }
                    {product.is_featured && <span style={{ position: "absolute", top: 8, left: 8, background: "#1a9c3e", color: "white", fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 20 }}>⭐ Bestseller</span>}
                    {qty === 0
                      ? <button onClick={() => addToCart(product)} style={{ position: "absolute", bottom: 8, right: 8, background: "#1a9c3e", color: "white", border: "none", borderRadius: 10, width: 34, height: 34, fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, boxShadow: "0 2px 8px rgba(26,156,62,0.4)" }}>+</button>
                      : <div style={{ position: "absolute", bottom: 8, right: 8, background: "#1a9c3e", borderRadius: 10, display: "flex", alignItems: "center", overflow: "hidden", boxShadow: "0 2px 8px rgba(26,156,62,0.4)" }}>
                          <button onClick={() => decreaseQty(product)} style={{ background: "none", border: "none", color: "white", fontWeight: 700, fontSize: 18, padding: "4px 10px", cursor: "pointer" }}>−</button>
                          <span style={{ color: "white", fontWeight: 700, fontSize: 13, minWidth: 16, textAlign: "center" }}>{qty}</span>
                          <button onClick={() => addToCart(product)} style={{ background: "none", border: "none", color: "white", fontWeight: 700, fontSize: 18, padding: "4px 10px", cursor: "pointer" }}>+</button>
                        </div>
                    }
                  </div>
                  <div style={{ padding: "10px 12px" }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#111827", marginBottom: 4, lineHeight: 1.3 }}>{product.name}</div>
                    {product.description && <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6, lineHeight: 1.4 }}>{product.description.slice(0, 40)}{product.description.length > 40 ? "..." : ""}</div>}
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontWeight: 800, fontSize: 15, color: "#111827" }}>₹{product.discount_price || product.price}</span>
                      {product.discount_price && <span style={{ fontSize: 11, color: "#9ca3af", textDecoration: "line-through" }}>₹{product.price}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CART BOTTOM BAR */}
      {cartCount > 0 && (
        <div style={{ position: "fixed", bottom: 16, left: 16, right: 16, zIndex: 50 }}>
          <button onClick={() => navigate("/checkout")} style={{ width: "100%", background: "#1a9c3e", color: "white", border: "none", borderRadius: 16, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", boxShadow: "0 4px 20px rgba(26,156,62,0.4)" }}>
            <span style={{ background: "rgba(255,255,255,0.2)", borderRadius: 8, padding: "2px 10px", fontWeight: 700, fontSize: 14 }}>{cartCount} items</span>
            <span style={{ fontWeight: 800, fontSize: 16 }}>Proceed to Checkout</span>
            <span style={{ fontWeight: 700, fontSize: 14 }}>₹{cartTotal.toFixed(2)}</span>
          </button>
        </div>
      )}
    </div>
  );
}