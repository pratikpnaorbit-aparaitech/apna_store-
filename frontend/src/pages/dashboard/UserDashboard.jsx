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

const PUBLIC = axios.create({ baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api" });

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
  const [categories, setCategories] = useState([]); // real categories from DB
  const [products, setProducts]     = useState([]);
  const [cartOpen, setCartOpen]     = useState(false);
  const [cartCount, setCartCount]   = useState(0);
  const [location, setLocation]     = useState("Detecting...");
  const [search, setSearch]         = useState("");
  const [loading, setLoading]       = useState({ stores: true });
  const [isMobile, setIsMobile]     = useState(window.innerWidth < 768);
  const searchRef = useRef();

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const loadCartCount = useCallback(() => {
    try { setCartCount(JSON.parse(localStorage.getItem("cart") || "[]").reduce((s, i) => s + (i.quantity || 0), 0)); }
    catch { setCartCount(0); }
  }, []);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) { setLocation("Location unavailable"); return; }
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const { data: d } = await PUBLIC.get(`/users/geocode?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
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
        const [r, productResponse] = await Promise.all([
          PUBLIC.get("/stores/public"),
          PUBLIC.get("/inventory/public")
        ]);
        const d = r.data;
        const storeList = Array.isArray(d) ? d : d?.stores || d?.data || [];
        setStores(storeList);
        // Extract unique real categories from stores
        const cats = [...new Set(storeList.flatMap(s => s.categories || []).filter(Boolean))];
        setCategories(cats);
        setProducts((Array.isArray(productResponse.data) ? productResponse.data : productResponse.data?.products || []).slice(0, 8));
      } catch { setStores([]); }
      finally { setLoading(p => ({ ...p, stores: false })); }
    })();
    loadCartCount(); getLocation();
    const onCart = () => loadCartCount();
    const onOpen = () => setCartOpen(true);
    window.addEventListener("cartUpdated", onCart);
    window.addEventListener("openCartDrawer", onOpen);
    return () => {
      window.removeEventListener("cartUpdated", onCart);
      window.removeEventListener("openCartDrawer", onOpen);
    };
  }, [loadCartCount, getLocation]);

  const handleSearch = e => {
    if (e.key === "Enter" && search.trim()) navigate(`/browse-stores?q=${encodeURIComponent(search.trim())}`);
  };

  const addDashboardProduct = (event, product) => {
    event.stopPropagation();
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const existing = cart.find((item) => item._id === product._id);
    const price = product.discount_price || product.price;
    const next = existing
      ? cart.map((item) => item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item)
      : [...cart, { ...product, price, quantity: 1 }];
    localStorage.setItem("cart", JSON.stringify(next));
    window.dispatchEvent(new Event("cartUpdated"));
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
            <div key={cat} onClick={() => navigate(`/browse-stores?q=${encodeURIComponent(cat)}`)}
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
              placeholder='Search stores or categories...'
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
                      <div key={cat} onClick={() => navigate(`/browse-stores?q=${encodeURIComponent(cat)}`)}
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
              <span onClick={() => navigate("/browse-stores")} style={{ color: "#1a9c3e", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>View all &gt;</span>
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
                    {store.coverImage ? <img src={store.coverImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 16 }} /> : "🏪"}
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
  const cartItems = JSON.parse(localStorage.getItem("cart") || "[]");
  const cartTotal = cartItems.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);
  const displayCategories = ["All", ...categories].slice(0, 9);
  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:"#f8faf8",minHeight:"100vh",color:"#17201a"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`*{box-sizing:border-box}.dash-card{transition:.2s}.dash-card:hover{transform:translateY(-3px);box-shadow:0 12px 30px rgba(21,78,37,.12)!important}.dash-scroll::-webkit-scrollbar{display:none}`}</style>
      <header style={{height:86,background:"white",borderBottom:"1px solid #e8eee9",display:"flex",alignItems:"center",padding:"0 3%",gap:36,position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",gap:10,minWidth:210}}><div style={{width:38,height:38,borderRadius:10,background:"linear-gradient(135deg,#188f3a,#086126)",display:"flex",alignItems:"center",justifyContent:"center"}}><IoFlash color="#ffd83d" size={23}/></div><strong style={{fontSize:24}}>SmartStore</strong></div>
        <div style={{display:"flex",alignItems:"center",flex:1,maxWidth:760,border:"1px solid #dfe6e0",borderRadius:14,overflow:"hidden",background:"#fbfcfb"}}><FaSearch color="#9aa39c" style={{marginLeft:18}}/><input ref={searchRef} value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={handleSearch} placeholder='Search for "rice", "milk", "grocery"...' style={{flex:1,border:0,outline:0,padding:"15px",fontSize:15,background:"transparent"}}/><button onClick={()=>search.trim()&&navigate(`/browse-stores?q=${encodeURIComponent(search.trim())}`)} style={{border:0,background:"linear-gradient(135deg,#20a443,#0f7c30)",color:"white",fontWeight:800,fontSize:15,padding:"15px 32px",cursor:"pointer"}}>Search</button></div>
        <button onClick={()=>setCartOpen(true)} style={{border:0,background:"transparent",display:"flex",alignItems:"center",gap:9,fontSize:16,fontWeight:700,cursor:"pointer",position:"relative"}}><FaShoppingCart size={20}/> Cart {cartCount>0&&<span style={{position:"absolute",top:-13,right:-12,background:"#15923a",color:"white",width:22,height:22,borderRadius:"50%",display:"grid",placeItems:"center",fontSize:11}}>{cartCount}</span>}</button>
        <button onClick={()=>navigate("/profile")} style={{border:0,borderLeft:"1px solid #e6ebe7",background:"transparent",paddingLeft:28,display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}><span style={{width:38,height:38,borderRadius:"50%",background:"#e5f4e8",display:"grid",placeItems:"center",fontWeight:900,color:"#15873a"}}>{getUserInitial()}</span><strong>Profile</strong><FaChevronDown size={11}/></button>
      </header>

      <div className="dash-scroll" style={{background:"white",padding:"18px 3% 15px",display:"flex",gap:24,overflowX:"auto",borderBottom:"1px solid #edf1ed"}}>{displayCategories.map((cat,index)=>{const meta=index===0?{emoji:"▦",bg:"#15923a"}:CATEGORY_EMOJI[cat]||{emoji:"🏷️",bg:"#f4f7f4"};return <button key={cat} onClick={()=>index===0?navigate("/browse-stores"):navigate(`/browse-stores?q=${encodeURIComponent(cat)}`)} style={{border:0,background:"transparent",minWidth:78,cursor:"pointer"}}><span style={{width:58,height:52,borderRadius:13,background:meta.bg,color:index===0?"white":"inherit",display:"grid",placeItems:"center",fontSize:25,margin:"0 auto 7px",boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>{meta.emoji}</span><span style={{fontSize:12,fontWeight:700}}>{cat}</span></button>})}</div>

      <div style={{padding:"28px 3% 40px",display:"grid",gridTemplateColumns:"minmax(0,1fr) 315px",gap:28,maxWidth:1700,margin:"0 auto"}}>
        <main style={{minWidth:0}}>
          <section style={{height:360,borderRadius:24,overflow:"hidden",position:"relative",background:"#f5f8f5 url('/smartstore-login-bg.png') center 62%/cover no-repeat",border:"1px solid #edf1ed"}}><div style={{position:"absolute",inset:0,background:"linear-gradient(90deg,rgba(255,255,255,.96) 0%,rgba(255,255,255,.78) 40%,rgba(255,255,255,.05) 70%)"}}/><div style={{position:"relative",padding:"58px 48px",maxWidth:520}}><h1 style={{fontSize:38,lineHeight:1.25,margin:0,fontWeight:900,letterSpacing:"-1px"}}>Everything you need,<br/>delivered in 10 minutes</h1><p style={{fontSize:17,color:"#67716a",lineHeight:1.7,margin:"18px 0 28px"}}>Fresh products from your favorite stores near you in {location}.</p><button onClick={()=>navigate("/browse-stores")} style={{border:0,borderRadius:12,background:"linear-gradient(135deg,#1ca13f,#0d7a2d)",color:"white",fontWeight:800,padding:"14px 27px",fontSize:15,cursor:"pointer"}}>Shop Now &nbsp;→</button></div></section>

          <section style={{marginTop:28}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><h2 style={{fontSize:21,margin:0}}>Stores Near You</h2><button onClick={()=>navigate("/browse-stores")} style={{border:0,background:"transparent",color:"#178e39",fontWeight:800,cursor:"pointer"}}>View all →</button></div><div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:18}}>{loading.stores?[1,2,3].map(i=><Skeleton key={i} h={220} r={18}/>):stores.slice(0,3).map(store=><article className="dash-card" key={store._id} onClick={()=>navigate(`/shop/${store._id}`)} style={{background:"white",border:"1px solid #e5ebe6",borderRadius:18,overflow:"hidden",cursor:"pointer",boxShadow:"0 4px 14px rgba(25,65,34,.05)"}}><div style={{height:125,background:"linear-gradient(135deg,#174e2a,#2e9150)",position:"relative",display:"grid",placeItems:"center",fontSize:44}}>{store.coverImage?<img src={store.coverImage} alt={store.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:"🏪"}<span style={{position:"absolute",top:10,left:10,background:"white",color:"#16883a",borderRadius:20,padding:"5px 8px",fontSize:11,fontWeight:900}}>24 min</span><span style={{position:"absolute",top:10,right:10,width:34,height:34,borderRadius:"50%",background:"white",display:"grid",placeItems:"center"}}>♡</span></div><div style={{padding:15}}><strong style={{fontSize:16}}>{store.name}</strong><div style={{margin:"7px 0",color:"#188f3a",fontSize:11,fontWeight:700}}>{(store.categories||[]).join(" • ")||"General Store"}</div><div style={{fontSize:12,color:"#6f786f"}}><FaStar color="#ffc928"/> 4.5 &nbsp; · &nbsp; <FaMapMarkerAlt color="#1b9a40"/> Nearby</div></div></article>)}</div></section>

          {products.length>0&&<section style={{marginTop:30}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><h2 style={{fontSize:21,margin:0}}>Featured Products</h2><button onClick={()=>navigate("/browse-stores")} style={{border:0,background:"transparent",color:"#178e39",fontWeight:800,cursor:"pointer"}}>View all →</button></div><div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:15}}>{products.slice(0,8).map(product=><article className="dash-card" key={product._id} onClick={()=>navigate(`/product/${product._id}`)} style={{background:"white",border:"1px solid #e5ebe6",borderRadius:16,overflow:"hidden",cursor:"pointer"}}><div style={{height:150,background:"#f7f9f7",display:"grid",placeItems:"center",position:"relative"}}>{product.image_url?<img src={product.image_url} alt={product.name} style={{width:"100%",height:"100%",objectFit:"contain"}}/>:<span style={{fontSize:48}}>📦</span>}{product.is_featured&&<span style={{position:"absolute",top:9,left:9,background:"#16933b",color:"white",fontSize:10,padding:"4px 8px",borderRadius:6,fontWeight:800}}>Bestseller</span>}</div><div style={{padding:13}}><strong style={{fontSize:13,display:"block",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{product.name}</strong><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:12}}><strong>₹{product.discount_price||product.price}</strong><button onClick={event=>addDashboardProduct(event,product)} style={{border:0,borderRadius:8,background:"#15923a",color:"white",fontWeight:800,padding:"7px 14px",cursor:"pointer"}}>+ Add</button></div></div></article>)}</div></section>}

          <div style={{marginTop:30,display:"grid",gridTemplateColumns:"repeat(4,1fr)",background:"white",border:"1px solid #e5ebe6",borderRadius:18,padding:18}}>{[["⚡","10 Minute Delivery","Fast & reliable"],["🌿","Best Quality","Fresh & hygienic"],["🛡","Secure Payments","100% protected"],["↩","Easy Returns","No questions asked"]].map(([icon,title,sub])=><div key={title} style={{display:"flex",alignItems:"center",gap:12,padding:"0 18px"}}><span style={{width:42,height:42,borderRadius:"50%",background:"#ecf8ee",display:"grid",placeItems:"center",fontSize:20}}>{icon}</span><div><strong style={{fontSize:12}}>{title}</strong><div style={{fontSize:11,color:"#7a837c",marginTop:2}}>{sub}</div></div></div>)}</div>
        </main>

        <aside style={{display:"flex",flexDirection:"column",gap:24}}><section style={{background:"white",border:"1px solid #e4eae5",borderRadius:20,overflow:"hidden",boxShadow:"0 5px 18px rgba(20,70,31,.07)"}}><div style={{background:"linear-gradient(135deg,#1b9d3f,#0f7d2e)",color:"white",padding:"15px 18px",display:"flex",justifyContent:"space-between"}}><strong>Your Order</strong><span onClick={()=>setCartOpen(true)} style={{fontSize:12,cursor:"pointer"}}>View all →</span></div><div style={{padding:"14px 18px",color:"#188d39",fontWeight:800,borderBottom:"1px solid #edf1ed"}}>⚡ Delivery in 10 minutes</div><div style={{padding:16}}>{cartItems.length===0?<div style={{textAlign:"center",padding:"30px 10px",color:"#879087"}}><div style={{fontSize:38}}>🛒</div><div style={{fontWeight:700,marginTop:8}}>Your cart is empty</div></div>:cartItems.slice(0,4).map(item=><div key={item._id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid #f0f2f0"}}><div style={{width:42,height:42,borderRadius:8,background:"#f5f7f5",display:"grid",placeItems:"center",overflow:"hidden"}}>{item.image_url?<img src={item.image_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:"📦"}</div><div style={{flex:1}}><strong style={{fontSize:12}}>{item.name}</strong><div style={{fontWeight:800,fontSize:13,marginTop:3}}>₹{item.price}</div></div><span style={{border:"1px solid #dfe6e0",borderRadius:8,padding:"5px 9px",fontSize:12}}>× {item.quantity}</span></div>)}<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:14}}><div><div style={{fontSize:11,color:"#7b847c"}}>Total</div><strong style={{color:"#168c38",fontSize:19}}>₹{cartTotal.toFixed(0)}</strong></div><button onClick={()=>navigate("/checkout")} disabled={!cartItems.length} style={{border:0,borderRadius:10,background:cartItems.length?"#15923a":"#cbd5cc",color:"white",fontWeight:800,padding:"12px 24px",cursor:cartItems.length?"pointer":"default"}}>Checkout</button></div></div></section><section style={{minHeight:210,borderRadius:20,padding:26,background:"linear-gradient(135deg,#fff5bd,#ffd86b)",position:"relative",overflow:"hidden"}}><h3 style={{fontSize:25,margin:"8px 0"}}>50% OFF</h3><strong>On First Order</strong><div style={{marginTop:25}}>Use code: <b style={{color:"#15873a"}}>TRY50</b></div><div style={{position:"absolute",right:18,bottom:10,fontSize:72}}>🏷️</div></section><section style={{borderRadius:20,padding:24,background:"linear-gradient(135deg,#f4fbf4,#eaf5e9)"}}><h3 style={{color:"#168b38",margin:"0 0 12px"}}>Today's Best Deal</h3><div style={{fontWeight:900,fontSize:20,letterSpacing:4}}>02 : 24 : 36</div><p style={{fontWeight:800,marginTop:24}}>Fresh deals near you</p><button onClick={()=>navigate("/browse-stores")} style={{border:0,borderRadius:9,background:"#15923a",color:"white",fontWeight:800,padding:"10px 18px",cursor:"pointer"}}>Shop Now</button></section></aside>
      </div>
      <CartDrawer isOpen={cartOpen} onClose={()=>setCartOpen(false)}/>
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
