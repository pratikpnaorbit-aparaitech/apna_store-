import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaSearch, FaShoppingCart, FaMapMarkerAlt, FaChevronDown,
  FaStar, FaHeart, FaRegHeart, FaFire, FaClock,
  FaArrowRight, FaPercent, FaTag, FaShieldAlt, FaLeaf
} from "react-icons/fa";
import { IoFlash } from "react-icons/io5";
import CartDrawer from "../../components/user/CartDrawer";

const PUBLIC = axios.create({ baseURL: "http://localhost:5000/api" });

// Category emoji map — shown only for categories that exist in DB
const CATEGORY_EMOJI = {
  "Food & Beverages":   { emoji: "🍔", bg: "#fff3e0" },
  "Clothing & Fashion": { emoji: "👗", bg: "#f3e5f5" },
  "Sports & Fitness":   { emoji: "🏋️", bg: "#e0f7fa" },
  "Grocery":            { emoji: "🛒", bg: "#e8f5e9" },
  "Pharmacy":           { emoji: "💊", bg: "#fce4ec" },
  "Electronics":        { emoji: "📱", bg: "#e3f2fd" },
  "Hardware":           { emoji: "🔧", bg: "#efebe9" },
  "Stationery":         { emoji: "✏️", bg: "#f1f8e9" },
  "Beauty & Cosmetics": { emoji: "💄", bg: "#fce4ec" },
  "Books":              { emoji: "📚", bg: "#f9fbe7" },
  "Toys & Games":       { emoji: "🎮", bg: "#ede7f6" },
};

const MARQUEE_ITEMS = [
  "🌿 Made Fresh • Delivered Fast",
  "✅ High Quality Products",
  "❤️ Loved by Thousands",
  "⚡ 10 Minute Delivery",
  "🔒 100% Secure Payments",
  "🎁 Amazing Deals Daily",
];

const Skeleton = ({ w = "100%", h = 16, r = 8 }) => (
  <div style={{ width: w, height: h, borderRadius: r, background: "linear-gradient(90deg,#e5e7eb 25%,#f3f4f6 50%,#e5e7eb 75%)", backgroundSize: "400% 100%", animation: "shimmer 1.4s ease infinite" }} />
);

export default function UserDashboard() {
  const navigate    = useNavigate();
  const [stores, setStores]         = useState([]);
  const [featured, setFeatured]     = useState([]);
  const [categories, setCategories] = useState([]); // real categories from DB
  const [cartOpen, setCartOpen]     = useState(false);
  const [cartCount, setCartCount]   = useState(0);
  const [location, setLocation]     = useState("Detecting...");
  const [search, setSearch]         = useState("");
  const [loading, setLoading]       = useState({ stores: true, featured: true });
  const [favorites, setFavorites]   = useState([]);
  const [countdown, setCountdown]   = useState(3 * 3600 + 44 * 60 + 57);
  const [isMobile, setIsMobile]     = useState(window.innerWidth < 768);
  const searchRef = useRef();

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const formatCountdown = s => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  };

  const loadCartCount = useCallback(() => {
    try { setCartCount(JSON.parse(localStorage.getItem("cart") || "[]").reduce((s, i) => s + (i.quantity || 0), 0)); }
    catch { setCartCount(0); }
  }, []);

  const loadFavorites = useCallback(() => {
    try { setFavorites(JSON.parse(localStorage.getItem("favorites") || "[]")); } catch {}
  }, []);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) { setLocation("Location unavailable"); return; }
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const r = await fetch(`http://localhost:5000/api/users/geocode?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
          const d = await r.json();
          setLocation(d.address?.city || d.address?.town || d.address?.village || "Your City");
        } catch { setLocation("Location found"); }
      },
      () => setLocation("Location denied"),
      { timeout: 10000 }
    );
  }, []);

  const getUserInitial = () => {
    try { return (JSON.parse(localStorage.getItem("user") || "{}")?.name || "U")[0].toUpperCase(); }
    catch { return "U"; }
  };

  useEffect(() => {
    (async () => {
      try {
        const r = await PUBLIC.get("/stores/public");
        const d = r.data;
        const storeList = Array.isArray(d) ? d : d?.stores || d?.data || [];
        setStores(storeList);
        // Extract unique real categories from stores
        const cats = [...new Set(storeList.flatMap(s => s.categories || []).filter(Boolean))];
        setCategories(cats);
      } catch { setStores([]); }
      finally { setLoading(p => ({ ...p, stores: false })); }
    })();
    (async () => {
      try {
        const r = await PUBLIC.get("/inventory/public?featured=true");
        const d = r.data;
        setFeatured(Array.isArray(d) ? d : d?.products || d?.data || []);
      } catch { setFeatured([]); }
      finally { setLoading(p => ({ ...p, featured: false })); }
    })();
    loadCartCount(); loadFavorites(); getLocation();
    const onCart = () => loadCartCount();
    const onOpen = () => setCartOpen(true);
    window.addEventListener("cartUpdated", onCart);
    window.addEventListener("openCartDrawer", onOpen);
    return () => {
      window.removeEventListener("cartUpdated", onCart);
      window.removeEventListener("openCartDrawer", onOpen);
    };
  }, [loadCartCount, loadFavorites, getLocation]);

  const handleSearch = e => {
    if (e.key === "Enter" && search.trim()) navigate(`/category/${encodeURIComponent(search.trim())}`);
  };

  /* ── Shared blocks ── */
  const PromoBanner = () => (
    <div style={{ borderRadius: isMobile ? 20 : 24, overflow: "hidden" }}>
      <div style={{ background: "linear-gradient(135deg,#1a9c3e 0%,#0d5c24 100%)", padding: isMobile ? "28px 24px 24px" : "36px 40px 32px", position: "relative", overflow: "hidden", display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: "center", gap: isMobile ? 0 : 40, textAlign: isMobile ? "center" : "left" }}>
        {[...Array(16)].map((_, i) => (
          <div key={i} style={{ position: "absolute", top: "50%", left: "50%", width: 1, height: "80%", background: "rgba(255,255,255,0.05)", transformOrigin: "0 0", transform: `rotate(${i * 22.5}deg) translateX(-50%)` }} />
        ))}
        {["top:16px;left:18px", "top:20px;right:28px", "bottom:24px;left:32px", "bottom:16px;right:18px"].map((p, i) => (
          <div key={i} style={{ position: "absolute", ...Object.fromEntries(p.split(";").map(s => s.split(":"))), color: "rgba(255,255,255,0.35)", fontSize: [18,13,11,15][i] }}>✦</div>
        ))}
        <div style={{ position: "relative", zIndex: 1, flex: 1 }}>
          <div style={{ fontWeight: 900, fontSize: isMobile ? 44 : 58, color: "#facc15", letterSpacing: "-1px", lineHeight: 1, textShadow: "0 3px 16px rgba(0,0,0,0.3)" }}>50% OFF</div>
          <div style={{ fontWeight: 900, fontSize: isMobile ? 28 : 36, color: "white", letterSpacing: "2px", marginTop: -4, textShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>UNLOCKED 🔓</div>
          <div style={{ color: "rgba(255,255,255,0.85)", fontSize: isMobile ? 13 : 14, fontWeight: 600, marginTop: 8, letterSpacing: "1px" }}>~ FREE DELIVERY ~</div>
          <div style={{ marginTop: 16, display: "inline-block", background: "white", borderRadius: 50, padding: isMobile ? "8px 24px" : "10px 28px" }}>
            <span style={{ fontWeight: 800, fontSize: isMobile ? 14 : 15, color: "#1a9c3e" }}>Use Code: TRY50</span>
          </div>
        </div>
        {!isMobile && <div style={{ fontSize: 90, position: "relative", zIndex: 1, flexShrink: 0, animation: "pulse2 2.5s infinite" }}>🎉</div>}
      </div>
    </div>
  );

  const WelcomeGift = () => (
    <div style={{ background: "#fffde7", borderRadius: isMobile ? 18 : 20, padding: isMobile ? "16px 18px" : "20px 24px", border: "1px solid #fde68a", display: "flex", gap: 14, alignItems: "flex-start" }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: 12, color: "#92400e", letterSpacing: "0.5px", marginBottom: 4 }}>LIMITED-TIME WELCOME GIFT</div>
        <div style={{ fontSize: 12, color: "#78350f", lineHeight: 1.5 }}>Place first order above ₹199 and get a special gift for FREE</div>
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#1a9c3e", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "white", fontSize: 10 }}>✓</span>
            </div>
            <span style={{ fontSize: 9, color: "#1a9c3e", fontWeight: 700, whiteSpace: "nowrap" }}>Signed up</span>
          </div>
          <div style={{ flex: 1, height: 4, background: "#d1fae5", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: "60%", background: "#1a9c3e", borderRadius: 4 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 10 }}>🔒</span>
            </div>
            <span style={{ fontSize: 9, color: "#6b7280", fontWeight: 700, whiteSpace: "nowrap" }}>First order</span>
          </div>
        </div>
        <div style={{ marginTop: 8, fontWeight: 900, fontSize: isMobile ? 22 : 26, color: "#b45309", letterSpacing: "2px" }}>
          {formatCountdown(countdown)}
        </div>
      </div>
      <div style={{ fontSize: isMobile ? 50 : 60, flexShrink: 0 }}>☕</div>
    </div>
  );

  // Category pills — uses only real categories from DB
  const CategoryPills = ({ horizontal = true }) => {
    if (categories.length === 0) return null;
    return (
      <div style={horizontal ? { display: "flex", gap: 10, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 4 } : { display: "flex", flexDirection: "column", gap: 8 }}>
        {categories.map(cat => {
          const meta = CATEGORY_EMOJI[cat] || { emoji: "🏷️", bg: "#f3f4f6" };
          return (
            <div key={cat} onClick={() => navigate(`/category/${encodeURIComponent(cat)}`)}
              style={{ flexShrink: 0, display: "flex", flexDirection: horizontal ? "column" : "row", alignItems: "center", gap: horizontal ? 6 : 12, cursor: "pointer", padding: horizontal ? 0 : "10px 14px", borderRadius: horizontal ? 0 : 14, background: horizontal ? "transparent" : "white", border: horizontal ? "none" : "1px solid #f3f4f6", transition: "all 0.18s" }}
              onMouseEnter={e => !horizontal && (e.currentTarget.style.background = "#f0fdf4")}
              onMouseLeave={e => !horizontal && (e.currentTarget.style.background = "white")}>
              <div style={{ width: horizontal ? 72 : 44, height: horizontal ? 72 : 44, borderRadius: horizontal ? 18 : 12, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: horizontal ? 30 : 20, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", flexShrink: 0 }}>
                {meta.emoji}
              </div>
              <span style={{ fontSize: horizontal ? 11 : 13, fontWeight: 700, color: "#374151", textAlign: horizontal ? "center" : "left", maxWidth: horizontal ? 72 : "none", lineHeight: 1.2 }}>{cat}</span>
              {!horizontal && <FaArrowRight size={10} color="#9ca3af" style={{ marginLeft: "auto" }} />}
            </div>
          );
        })}
      </div>
    );
  };

  /* ══════════════ MOBILE LAYOUT ══════════════ */
  if (isMobile) {
    return (
      <div style={{ fontFamily: "'DM Sans',sans-serif", background: "white", minHeight: "100vh" }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <style>{`
          @keyframes shimmer { 0%{background-position:100% 0} 100%{background-position:-100% 0} }
          @keyframes marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
          @keyframes pulse2  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
          * { -webkit-tap-highlight-color:transparent; box-sizing:border-box; }
        `}</style>

        {/* STICKY GREEN HEADER */}
        <div style={{ background: "#1a9c3e", position: "sticky", top: 0, zIndex: 50 }}>
          <div style={{ padding: "14px 16px 10px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontWeight: 900, fontSize: 22, color: "white", letterSpacing: "-0.5px" }}>10 Minutes</span>
                <IoFlash color="#facc15" size={20} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                <FaMapMarkerAlt color="rgba(255,255,255,0.85)" size={11} />
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: 500, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{location}</span>
                <FaChevronDown color="rgba(255,255,255,0.85)" size={10} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div onClick={() => setCartOpen(true)} style={{ position: "relative", background: "rgba(255,255,255,0.18)", borderRadius: "50%", width: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <FaShoppingCart color="white" size={18} />
                {cartCount > 0 && <span style={{ position: "absolute", top: -4, right: -4, background: "#ef4444", color: "white", fontSize: 10, fontWeight: 800, borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #1a9c3e" }}>{cartCount}</span>}
              </div>
              <div onClick={() => navigate("/profile")} style={{ background: "rgba(255,255,255,0.2)", borderRadius: "50%", width: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontWeight: 900, color: "white", fontSize: 17 }}>
                {getUserInitial()}
              </div>
            </div>
          </div>
          {/* Search bleeds into white */}
          <div style={{ margin: "0 14px", background: "white", borderRadius: "18px 18px 0 0", padding: "11px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <FaSearch color="#9ca3af" size={15} />
            <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} onKeyDown={handleSearch}
              placeholder='Search products, stores...'
              style={{ flex: 1, border: "none", outline: "none", fontSize: 15, color: "#374151", background: "transparent", fontFamily: "'DM Sans',sans-serif", fontWeight: 500 }} />
            {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 16, cursor: "pointer" }}>✕</button>}
          </div>
        </div>

        <div style={{ background: "white", paddingBottom: 90 }}>
          {/* Marquee */}
          <div style={{ background: "#f0fdf4", borderBottom: "1px solid #dcfce7", overflow: "hidden", padding: "8px 0" }}>
            <div style={{ display: "flex", animation: "marquee 20s linear infinite", width: "max-content" }}>
              {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
                <span key={i} style={{ fontSize: 12, fontWeight: 600, color: "#1a9c3e", paddingRight: 32, whiteSpace: "nowrap" }}>{item}</span>
              ))}
            </div>
          </div>

          {/* Promo */}
          <div style={{ margin: "16px 14px" }}><PromoBanner /></div>

          {/* Welcome gift */}
          <div style={{ margin: "0 14px 20px" }}><WelcomeGift /></div>

          {/* Real categories — horizontal scroll, single row */}
          {categories.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ padding: "0 16px", marginBottom: 12 }}>
                <div style={{ fontWeight: 900, fontSize: 18, color: "#111827" }}>Shop by Category</div>
              </div>
              <div style={{ paddingLeft: 16, overflowX: "auto", scrollbarWidth: "none" }}>
                <div style={{ display: "flex", gap: 12, paddingRight: 16, paddingBottom: 4 }}>
                  {categories.map(cat => {
                    const meta = CATEGORY_EMOJI[cat] || { emoji: "🏷️", bg: "#f3f4f6" };
                    return (
                      <div key={cat} onClick={() => navigate(`/category/${encodeURIComponent(cat)}`)}
                        style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" }}>
                        <div style={{ width: 72, height: 72, borderRadius: 18, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, boxShadow: "0 2px 10px rgba(0,0,0,0.09)" }}>
                          {meta.emoji}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#374151", textAlign: "center", maxWidth: 72, lineHeight: 1.2 }}>{cat}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Stores */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 16px", marginBottom: 14 }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 18, color: "#111827" }}>Stores Near You</div>
                <div style={{ fontSize: 12, color: "#f59e0b", fontWeight: 700, marginTop: 2 }}>Trending near you ◆</div>
              </div>
              <span onClick={() => navigate("/stores")} style={{ color: "#1a9c3e", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>View all &gt;</span>
            </div>
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingLeft: 16, paddingBottom: 6, scrollbarWidth: "none" }}>
              {loading.stores ? [1,2,3].map(i => (
                <div key={i} style={{ flexShrink: 0, width: 150 }}>
                  <Skeleton w={150} h={100} r={16} />
                  <div style={{ marginTop: 8 }}><Skeleton w="70%" h={13} /></div>
                  <div style={{ marginTop: 6 }}><Skeleton w="50%" h={10} /></div>
                </div>
              )) : stores.map(store => (
                <div key={store._id} onClick={() => navigate(`/shop/${store._id}`)}
                  style={{ flexShrink: 0, width: 155, cursor: "pointer" }}>
                  <div style={{ height: 100, background: "linear-gradient(135deg,#1a9c3e,#0d5c24)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, position: "relative" }}>
                    🏪
                    <div style={{ position: "absolute", bottom: 6, right: 8, background: "rgba(0,0,0,0.5)", padding: "2px 7px", borderRadius: 20, fontSize: 10, color: "white", fontWeight: 600 }}>15 min</div>
                  </div>
                  <div style={{ marginTop: 8, padding: "0 2px" }}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: "#111827", marginBottom: 4 }}>{store.name}</div>
                    <div style={{ display: "flex", gap: 4, marginBottom: 5, flexWrap: "wrap" }}>
                      {(store.categories || []).map(c => (
                        <span key={c} style={{ background: "#e8f5e9", color: "#1a9c3e", fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>{c}</span>
                      ))}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <FaStar color="#facc15" size={11} />
                      <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>4.5 • 15 min</span>
                    </div>
                  </div>
                </div>
              ))}
              <div style={{ width: 14, flexShrink: 0 }} />
            </div>
          </div>

          {/* Featured products */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ padding: "0 16px", marginBottom: 14 }}>
              <div style={{ fontWeight: 900, fontSize: 18, color: "#111827" }}>Featured Products</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Handpicked for you</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "0 14px" }}>
              {loading.featured ? [1,2,3,4].map(i => (
                <div key={i} style={{ background: "#f9fafb", borderRadius: 18, overflow: "hidden" }}>
                  <Skeleton w="100%" h={140} r={0} />
                  <div style={{ padding: 12 }}><Skeleton w="80%" h={13} /><div style={{ marginTop: 8 }}><Skeleton w="40%" h={16} /></div></div>
                </div>
              )) : featured.slice(0, 6).map(product => (
                <ProductCard key={product._id} product={product} favorites={favorites} loadFavorites={loadFavorites} isMobile={true} />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom offer bar */}
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "white", borderTop: "1px solid #e5e7eb", padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, zIndex: 40, boxShadow: "0 -4px 20px rgba(0,0,0,0.1)" }}>
          <div style={{ width: 38, height: 38, background: "#1a9c3e", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ color: "white", fontWeight: 900, fontSize: 16 }}>%</span>
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 13, color: "#1a9c3e" }}>50% upto ₹150 off</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>USE TRY50 | ABOVE ₹99</div>
          </div>
        </div>

        <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
      </div>
    );
  }

  /* ══════════════ LAPTOP LAYOUT ══════════════ */
  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", background: "#f5f5f0", minHeight: "100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes shimmer { 0%{background-position:100% 0} 100%{background-position:-100% 0} }
        @keyframes marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes pulse2  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
        .store-card:hover { transform:translateY(-4px); box-shadow:0 12px 28px rgba(0,0,0,0.13) !important; }
        .prod-card:hover  { transform:translateY(-3px); box-shadow:0 10px 24px rgba(0,0,0,0.1) !important; }
        * { box-sizing:border-box; }
      `}</style>

      {/* TOP NAVBAR */}
      <div style={{ background: "#1a9c3e", position: "sticky", top: 0, zIndex: 50, boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "14px 32px", display: "flex", alignItems: "center", gap: 20 }}>
          {/* Brand */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <IoFlash color="#facc15" size={24} />
              <span style={{ fontWeight: 900, fontSize: 22, color: "white", letterSpacing: "-0.5px" }}>10 Minutes</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
              <FaMapMarkerAlt color="rgba(255,255,255,0.8)" size={11} />
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", fontWeight: 500, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{location}</span>
              <FaChevronDown color="rgba(255,255,255,0.8)" size={9} />
            </div>
          </div>

          {/* Search */}
          <div style={{ flex: 1, background: "white", borderRadius: 14, padding: "10px 18px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <FaSearch color="#9ca3af" size={16} />
            <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} onKeyDown={handleSearch}
              placeholder="Search products, stores, categories..."
              style={{ flex: 1, border: "none", outline: "none", fontSize: 15, color: "#374151", background: "transparent", fontFamily: "'DM Sans',sans-serif", fontWeight: 500 }} />
            {search && <button onClick={() => setSearch("")} style={{ background: "#f3f4f6", border: "none", borderRadius: "50%", width: 24, height: 24, cursor: "pointer", color: "#6b7280" }}>✕</button>}
          </div>

          {/* Right actions */}
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexShrink: 0 }}>
            <div onClick={() => setCartOpen(true)} style={{ position: "relative", background: "rgba(255,255,255,0.15)", borderRadius: 12, padding: "8px 18px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", border: "1px solid rgba(255,255,255,0.2)", transition: "background 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.25)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}>
              <FaShoppingCart color="white" size={18} />
              <span style={{ color: "white", fontWeight: 700, fontSize: 14 }}>Cart</span>
              {cartCount > 0 && <span style={{ background: "#ef4444", color: "white", fontSize: 11, fontWeight: 800, borderRadius: 20, padding: "1px 7px" }}>{cartCount}</span>}
            </div>
            <div onClick={() => navigate("/profile")} style={{ background: "rgba(255,255,255,0.2)", borderRadius: 12, padding: "8px 16px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", border: "1px solid rgba(255,255,255,0.2)", transition: "background 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.3)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "white", fontSize: 14 }}>{getUserInitial()}</div>
              <span style={{ color: "white", fontWeight: 600, fontSize: 14 }}>Profile</span>
            </div>
          </div>
        </div>

        {/* Marquee */}
        <div style={{ background: "rgba(0,0,0,0.15)", borderTop: "1px solid rgba(255,255,255,0.1)", overflow: "hidden", padding: "6px 0" }}>
          <div style={{ display: "flex", animation: "marquee 24s linear infinite", width: "max-content" }}>
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
              <span key={i} style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.9)", paddingRight: 40, whiteSpace: "nowrap" }}>{item}</span>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN: sidebar + content */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 32px", display: "grid", gridTemplateColumns: "240px 1fr", gap: 28 }}>

        {/* ── LEFT SIDEBAR ── stores + deals, NO category list */}
        <aside style={{ position: "sticky", top: 110, height: "fit-content", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Stores quick access */}
          <div style={{ background: "white", borderRadius: 20, overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
            <div style={{ background: "linear-gradient(135deg,#1a9c3e,#0d5c24)", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: "white" }}>Stores</div>
              <span onClick={() => navigate("/stores")} style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", cursor: "pointer", fontWeight: 600 }}>View all</span>
            </div>
            {loading.stores ? [1,2,3].map(i => (
              <div key={i} style={{ padding: "12px 18px", borderBottom: "1px solid #f5f5f5", display: "flex", alignItems: "center", gap: 10 }}>
                <Skeleton w={36} h={36} r={10} />
                <div style={{ flex: 1 }}><Skeleton w="70%" h={12} /><div style={{ marginTop: 6 }}><Skeleton w="50%" h={10} /></div></div>
              </div>
            )) : stores.map((store, i) => (
              <div key={store._id} onClick={() => navigate(`/shop/${store._id}`)}
                style={{ padding: "12px 18px", borderBottom: i < stores.length - 1 ? "1px solid #f5f5f5" : "none", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", transition: "background 0.18s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#f0fdf4"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg,#1a9c3e,#0d5c24)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🏪</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{store.name}</div>
                  <div style={{ fontSize: 11, color: "#1a9c3e", fontWeight: 600, marginTop: 2 }}>{(store.categories || []).join(", ")}</div>
                </div>
                <FaArrowRight size={10} color="#d1d5db" />
              </div>
            ))}
          </div>

          {/* Offer card */}
          <div style={{ background: "linear-gradient(135deg,#1a9c3e,#0d5c24)", borderRadius: 20, padding: "20px 18px", textAlign: "center", boxShadow: "0 4px 20px rgba(26,156,62,0.25)" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🎁</div>
            <div style={{ fontWeight: 900, fontSize: 20, color: "#facc15", letterSpacing: "-0.3px" }}>50% OFF</div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "white", marginTop: 4 }}>Use code TRY50</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 4 }}>Min order ₹99 • Free delivery</div>
            <div style={{ marginTop: 14, background: "white", borderRadius: 50, padding: "8px 16px" }}>
              <span style={{ fontWeight: 800, fontSize: 13, color: "#1a9c3e" }}>TRY50</span>
            </div>
          </div>

          {/* Trust badges */}
          <div style={{ background: "white", borderRadius: 20, padding: "16px 18px", boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
            {[
              { emoji: "⚡", label: "10 Min Delivery", sub: "Super fast" },
              { emoji: "🔒", label: "Secure Payment", sub: "100% safe" },
              { emoji: "↩️", label: "Easy Returns",   sub: "No hassle" },
            ].map((b, i) => (
              <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < 2 ? "1px solid #f5f5f5" : "none" }}>
                <div style={{ fontSize: 22, width: 36, textAlign: "center", flexShrink: 0 }}>{b.emoji}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>{b.label}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>{b.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* ── RIGHT CONTENT ── */}
        <main style={{ minWidth: 0 }}>

          {/* Promo */}
          <div style={{ marginBottom: 20 }}><PromoBanner /></div>

          {/* Welcome gift */}
          <div style={{ marginBottom: 24 }}><WelcomeGift /></div>

          {/* Real categories — pill row */}
          {categories.length > 0 && (
            <section style={{ marginBottom: 28 }}>
              <div style={{ fontWeight: 900, fontSize: 20, color: "#111827", marginBottom: 14 }}>Shop by Category</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {categories.map(cat => {
                  const meta = CATEGORY_EMOJI[cat] || { emoji: "🏷️", bg: "#f3f4f6" };
                  return (
                    <div key={cat} onClick={() => navigate(`/category/${encodeURIComponent(cat)}`)}
                      style={{ display: "flex", alignItems: "center", gap: 10, background: "white", border: "2px solid #e5e7eb", borderRadius: 50, padding: "10px 20px 10px 12px", cursor: "pointer", transition: "all 0.18s", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#1a9c3e"; e.currentTarget.style.background = "#f0fdf4"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.background = "white"; }}>
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{meta.emoji}</div>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "#374151" }}>{cat}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Stores grid */}
          <section style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 20, color: "#111827" }}>Stores Near You</div>
                <div style={{ fontSize: 13, color: "#f59e0b", fontWeight: 700, marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
                  <FaFire size={11} /> Trending • Fast delivery
                </div>
              </div>
              <span onClick={() => navigate("/stores")} style={{ color: "#1a9c3e", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                View all <FaArrowRight size={10} />
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 16 }}>
              {loading.stores ? [1,2,3].map(i => (
                <div key={i} style={{ background: "white", borderRadius: 20, overflow: "hidden" }}>
                  <Skeleton w="100%" h={110} r={0} />
                  <div style={{ padding: 14 }}><Skeleton w="70%" h={14} /><div style={{ marginTop: 8 }}><Skeleton w="50%" h={11} /></div></div>
                </div>
              )) : stores.map(store => (
                <div key={store._id} className="store-card" onClick={() => navigate(`/shop/${store._id}`)}
                  style={{ background: "white", borderRadius: 20, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.07)", cursor: "pointer", transition: "all 0.25s" }}>
                  <div style={{ height: 110, background: "linear-gradient(135deg,#1a9c3e,#0d5c24)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, position: "relative" }}>
                    🏪
                    <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)", padding: "3px 9px", borderRadius: 20, fontSize: 10, color: "white", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                      <FaClock size={9} /> 15 min
                    </div>
                  </div>
                  <div style={{ padding: "14px 16px" }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: "#111827", marginBottom: 6 }}>{store.name}</div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                      {(store.categories || []).map(c => (
                        <span key={c} style={{ background: "#e8f5e9", color: "#1a9c3e", fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 20 }}>{c}</span>
                      ))}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <FaStar color="#facc15" size={12} />
                      <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>4.5 • 15 min</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Featured products */}
          <section style={{ marginBottom: 60 }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 900, fontSize: 20, color: "#111827" }}>Featured Products</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 3 }}>Handpicked deals just for you</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 18 }}>
              {loading.featured ? [1,2,3,4,5,6].map(i => (
                <div key={i} style={{ background: "white", borderRadius: 20, overflow: "hidden" }}>
                  <Skeleton w="100%" h={160} r={0} />
                  <div style={{ padding: 14 }}><Skeleton w="80%" h={14} /><div style={{ marginTop: 8 }}><Skeleton w="40%" h={18} /></div></div>
                </div>
              )) : featured.slice(0, 8).map(product => (
                <ProductCard key={product._id} product={product} favorites={favorites} loadFavorites={loadFavorites} isMobile={false} />
              ))}
            </div>
          </section>
        </main>
      </div>

      {/* Bottom offer bar */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "white", borderTop: "1px solid #e5e7eb", padding: "12px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 40, boxShadow: "0 -4px 24px rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, background: "linear-gradient(135deg,#1a9c3e,#0d5c24)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(26,156,62,0.3)" }}>
            <FaPercent color="white" size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#1a9c3e" }}>FLAT 50% OFF + FREE DELIVERY</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 1 }}>Use code: TRY50 • Min order ₹99</div>
          </div>
        </div>
        <div style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0", padding: "8px 20px", borderRadius: 50, fontSize: 13, fontWeight: 700, color: "#1a9c3e", cursor: "pointer" }}>
          Apply Code
        </div>
      </div>

      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}

/* ── Product Card ── */
function ProductCard({ product, favorites, loadFavorites, isMobile }) {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);
  const [qty, setQty] = useState(0);
  const isFav = favorites.includes(product._id);

  useEffect(() => {
    const syncQty = () => {
      try { setQty(JSON.parse(localStorage.getItem("cart")||"[]").find(p=>p._id===product._id)?.quantity||0); } catch {}
    };
    syncQty(); // load on mount
    window.addEventListener("cartUpdated", syncQty);
    return () => window.removeEventListener("cartUpdated", syncQty);
  }, [product._id]);

  const discount = product.discount_price && product.price
    ? Math.round(((product.price - product.discount_price) / product.price) * 100) : 0;

  const addToCart = e => {
    e.stopPropagation();
    try {
      const cart = JSON.parse(localStorage.getItem("cart")||"[]");
      const pid = product._id, price = product.discount_price || product.price;
      const existing = cart.find(p => p._id === pid);
      const newCart = existing ? cart.map(p => p._id===pid?{...p,quantity:p.quantity+1}:p) : [...cart,{...product,_id:pid,price,quantity:1}];
      localStorage.setItem("cart", JSON.stringify(newCart));
      setQty(q => q + 1);
      window.dispatchEvent(new Event("cartUpdated"));
      setTimeout(() => window.dispatchEvent(new Event("openCartDrawer")), 100);
    } catch {}
  };

  const removeFromCart = e => {
    e.stopPropagation();
    try {
      const cart = JSON.parse(localStorage.getItem("cart")||"[]");
      const newCart = cart.map(p=>p._id===product._id?{...p,quantity:p.quantity-1}:p).filter(p=>p.quantity>0);
      localStorage.setItem("cart", JSON.stringify(newCart));
      setQty(q => Math.max(0, q - 1));
      window.dispatchEvent(new Event("cartUpdated"));
    } catch {}
  };

  const toggleFav = e => {
    e.stopPropagation();
    try {
      let favs = JSON.parse(localStorage.getItem("favorites")||"[]");
      favs = isFav ? favs.filter(id=>id!==product._id) : [...favs, product._id];
      localStorage.setItem("favorites", JSON.stringify(favs));
      loadFavorites();
    } catch {}
  };

  const imgH = isMobile ? 140 : 160;

  return (
    <div className="prod-card" onClick={() => navigate(`/product/${product._id}`)}
      style={{ background: "white", borderRadius: isMobile?18:20, overflow: "hidden", boxShadow: "0 3px 14px rgba(0,0,0,0.07)", cursor: "pointer", transition: "all 0.22s", border: "1px solid #f3f4f6", position: "relative", display: "flex", flexDirection: "column" }}>

      {discount > 0 && <div style={{ position:"absolute", top:8, left:8, background:"#ef4444", color:"white", fontSize:9, fontWeight:800, padding:"3px 7px", borderRadius:20, zIndex:2 }}>{discount}% OFF</div>}
      {product.is_featured && <div style={{ position:"absolute", top:8, left:discount>0?58:8, background:"#1a9c3e", color:"white", fontSize:9, fontWeight:700, padding:"3px 7px", borderRadius:20, zIndex:2 }}>⭐ Bestseller</div>}

      <button onClick={toggleFav} style={{ position:"absolute", top:8, right:8, background:"white", border:"none", borderRadius:"50%", width:28, height:28, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", boxShadow:"0 2px 6px rgba(0,0,0,0.1)", zIndex:2 }}>
        {isFav ? <FaHeart color="#ef4444" size={13} /> : <FaRegHeart color="#9ca3af" size={13} />}
      </button>

      <div style={{ height: imgH, background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", padding: 10 }}>
        {product.image_url && !imageError
          ? <img src={product.image_url} alt={product.name} style={{ width:"100%", height:imgH-20, objectFit:"contain" }} onError={()=>setImageError(true)} />
          : <span style={{ fontSize: isMobile?52:58 }}>📦</span>
        }
      </div>

      <div style={{ padding: isMobile?"10px 12px 14px":"12px 14px 16px", display:"flex", flexDirection:"column", flex:1 }}>
        <div style={{ fontWeight:600, fontSize:isMobile?13:14, color:"#111827", lineHeight:1.3, marginBottom:8, minHeight:isMobile?34:38, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
          {product.name}
        </div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:"auto" }}>
          <div>
            <div style={{ fontWeight:900, fontSize:isMobile?16:18, color:"#111827" }}>₹{product.discount_price||product.price}</div>
            {product.discount_price && <div style={{ fontSize:11, color:"#9ca3af", textDecoration:"line-through" }}>₹{product.price}</div>}
          </div>
          {qty === 0 ? (
            <button onClick={addToCart} style={{ background:"white", border:"2px solid #1a9c3e", color:"#1a9c3e", borderRadius:12, width:isMobile?38:42, height:isMobile?38:42, fontSize:24, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s", flexShrink:0 }}>+</button>
          ) : (
            <div onClick={e=>e.stopPropagation()} style={{ display:"flex", alignItems:"center", background:"#1a9c3e", borderRadius:12, overflow:"hidden", flexShrink:0 }}>
              <button onClick={removeFromCart} style={{ background:"none", border:"none", color:"white", fontWeight:800, fontSize:20, padding:isMobile?"4px 10px":"5px 12px", cursor:"pointer", lineHeight:1 }}>−</button>
              <span style={{ color:"white", fontWeight:800, fontSize:14, minWidth:18, textAlign:"center" }}>{qty}</span>
              <button onClick={addToCart} style={{ background:"none", border:"none", color:"white", fontWeight:800, fontSize:20, padding:isMobile?"4px 10px":"5px 12px", cursor:"pointer", lineHeight:1 }}>+</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}