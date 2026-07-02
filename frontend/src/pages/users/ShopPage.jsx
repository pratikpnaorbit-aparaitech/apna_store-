import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { FaArrowLeft, FaSearch, FaMapMarkerAlt, FaPhone } from "react-icons/fa";

const PUBLIC = axios.create({ baseURL: "http://localhost:5000/api" });

// Helper: safely format address object or string
const formatAddress = (address) => {
  if (!address) return "";
  if (typeof address === "string") return address;
  return [address.street, address.city, address.state, address.pincode]
    .filter(v => v && typeof v === "string")
    .join(", ");
};

export default function ShopPage() {
  const { storeId } = useParams();
  const navigate = useNavigate();
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState(JSON.parse(localStorage.getItem("cart") || "[]"));
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [storeRes, prodRes] = await Promise.all([
          PUBLIC.get("/stores/public"),
          PUBLIC.get(`/inventory/public?storeId=${storeId}`)
        ]);
        const storesData = Array.isArray(storeRes.data)
          ? storeRes.data
          : storeRes.data?.stores || storeRes.data?.data || [];
        setStore(storesData.find(s => s._id === storeId));

        const prodsData = Array.isArray(prodRes.data)
          ? prodRes.data
          : prodRes.data?.products || prodRes.data?.data || [];
        setProducts(prodsData);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, [storeId]);

  const updateCart = (newCart) => {
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const addToCart = (e, product) => {
    e.stopPropagation();
    const pid = product._id;
    const price = product.discount_price || product.price;
    const existing = cart.find(p => p._id === pid);
    const newCart = existing
      ? cart.map(p => p._id === pid ? { ...p, quantity: p.quantity + 1 } : p)
      : [...cart, { ...product, _id: pid, price, quantity: 1 }];
    updateCart(newCart);
    setTimeout(() => window.dispatchEvent(new Event("openCartDrawer")), 100);
  };

  const decreaseQty = (e, product) => {
    e.stopPropagation();
    const pid = product._id;
    updateCart(cart.map(p => p._id === pid ? { ...p, quantity: p.quantity - 1 } : p).filter(p => p.quantity > 0));
  };

  const getQty = (id) => cart.find(p => p._id === id)?.quantity || 0;
  const categories = ["All", ...new Set(products.map(p => p.category).filter(Boolean))];
  const filtered = products.filter(p => {
    const matchCat = categoryFilter === "All" || p.category === categoryFilter;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });
  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f5f5f0" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 40, height: 40, border: "4px solid #e5e7eb", borderTop: "4px solid #1a9c3e", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#f5f5f0", minHeight: "100vh", paddingBottom: 80 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* HERO */}
      <div style={{ position: "relative", height: 220, background: "linear-gradient(135deg,#1a9c3e,#0d5c24)", overflow: "hidden" }}>
        <button onClick={() => navigate(-1)} style={{ position: "absolute", top: 16, left: 16, zIndex: 10, background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <FaArrowLeft color="white" size={15} />
        </button>
        <div style={{ position: "absolute", right: -30, top: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
        <div style={{ position: "absolute", right: 40, bottom: -40, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
        <div style={{ position: "absolute", bottom: 20, left: 20, right: 20 }}>
          <h1 style={{ color: "white", fontWeight: 900, fontSize: 26, margin: 0, textTransform: "uppercase" }}>{store?.name || "Store"}</h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {(store?.categories || []).map((c, i) => (
              <span key={i} style={{ background: "rgba(255,255,255,0.2)", color: "white", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>{c}</span>
            ))}
          </div>
          {/* FIX: store.address is an object — use formatAddress() */}
          {store?.address && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6, color: "rgba(255,255,255,0.8)", fontSize: 12 }}>
              <FaMapMarkerAlt size={10} />
              <span>{formatAddress(store.address)}</span>
            </div>
          )}
          {store?.phone && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3, color: "rgba(255,255,255,0.8)", fontSize: 12 }}>
              <FaPhone size={10} />
              <span>{store.phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* INFO STRIP */}
      <div style={{ background: "white", padding: "10px 16px", display: "flex", gap: 20, borderBottom: "1px solid #f0f0f0" }}>
        {[{v:"4.5 ⭐",l:"Rating"},{v:"15 min",l:"Delivery"},{v:"₹40",l:"Delivery fee"},{v:products.length,l:"Products",g:true}].map((s,i)=>(
          <div key={i} style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: s.g ? "#1a9c3e" : "#111" }}>{s.v}</div>
            <div style={{ fontSize: 10, color: "#6b7280" }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* SEARCH */}
      <div style={{ padding: "12px 16px" }}>
        <div style={{ background: "white", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
          <FaSearch color="#9ca3af" size={13} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search in this store..."
            style={{ flex: 1, border: "none", outline: "none", fontSize: 13, color: "#374151", background: "transparent" }} />
        </div>
      </div>

      {/* CATEGORY TABS */}
      <div style={{ padding: "0 16px", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 4 }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setCategoryFilter(cat)}
              style={{ flexShrink: 0, padding: "7px 16px", borderRadius: 20, border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", background: categoryFilter === cat ? "#1a9c3e" : "white", color: categoryFilter === cat ? "white" : "#374151", boxShadow: "0 1px 6px rgba(0,0,0,0.08)", transition: "all 0.2s" }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* PRODUCTS GRID */}
      <div style={{ padding: "0 16px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>No products found</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {filtered.map(product => {
              const qty = getQty(product._id);
              return (
                <div key={product._id}
                  onClick={() => navigate(`/product/${product._id}`)}
                  style={{ background: "white", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", cursor: "pointer" }}>
                  <div style={{ position: "relative", height: 130, background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {product.image_url
                      ? <img src={product.image_url} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <span style={{ fontSize: 42 }}>📦</span>
                    }
                    {product.is_featured && (
                      <span style={{ position: "absolute", top: 8, left: 8, background: "#1a9c3e", color: "white", fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 20 }}>⭐ Bestseller</span>
                    )}
                    {qty === 0 ? (
                      <button onClick={e => addToCart(e, product)}
                        style={{ position: "absolute", bottom: 8, right: 8, background: "#1a9c3e", color: "white", border: "none", borderRadius: 10, width: 34, height: 34, fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, boxShadow: "0 2px 8px rgba(26,156,62,0.4)" }}>
                        +
                      </button>
                    ) : (
                      <div onClick={e => e.stopPropagation()}
                        style={{ position: "absolute", bottom: 8, right: 8, background: "#1a9c3e", borderRadius: 10, display: "flex", alignItems: "center", overflow: "hidden", boxShadow: "0 2px 8px rgba(26,156,62,0.4)" }}>
                        <button onClick={e => decreaseQty(e, product)} style={{ background: "none", border: "none", color: "white", fontWeight: 700, fontSize: 18, padding: "4px 10px", cursor: "pointer" }}>−</button>
                        <span style={{ color: "white", fontWeight: 700, fontSize: 13, minWidth: 16, textAlign: "center" }}>{qty}</span>
                        <button onClick={e => addToCart(e, product)} style={{ background: "none", border: "none", color: "white", fontWeight: 700, fontSize: 18, padding: "4px 10px", cursor: "pointer" }}>+</button>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: "10px 12px" }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#111827", marginBottom: 2 }}>{product.name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontWeight: 800, fontSize: 14, color: "#111827" }}>₹{product.discount_price || product.price}</span>
                      {product.discount_price && <span style={{ fontSize: 11, color: "#9ca3af", textDecoration: "line-through" }}>₹{product.price}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CART BAR */}
      {cartCount > 0 && (
        <div style={{ position: "fixed", bottom: 16, left: 16, right: 16, zIndex: 50 }}>
          <button onClick={() => navigate("/checkout")}
            style={{ width: "100%", background: "#1a9c3e", color: "white", border: "none", borderRadius: 16, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", boxShadow: "0 4px 20px rgba(26,156,62,0.4)" }}>
            <span style={{ background: "rgba(255,255,255,0.2)", borderRadius: 8, padding: "2px 10px", fontWeight: 700, fontSize: 14 }}>{cartCount} items</span>
            <span style={{ fontWeight: 800, fontSize: 16 }}>Proceed to Checkout</span>
            <span style={{ fontWeight: 700, fontSize: 14 }}>₹{cartTotal.toFixed(2)}</span>
          </button>
        </div>
      )}
    </div>
  );
}