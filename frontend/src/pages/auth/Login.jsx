import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaEye, FaEyeSlash, FaStore, FaUser, FaMotorcycle, FaMapMarkerAlt, FaLocationArrow } from "react-icons/fa";
import { IoFlash } from "react-icons/io5";

const API_BASE = axios.create({ baseURL: "http://localhost:5000/api" });

/* ─────────────────────────────────────────
   BARAMATI SERVICE AREA CONFIG
   Center: Baramati, Maharashtra 413102
   Radius: 15km — covers all of Baramati city + nearby villages
───────────────────────────────────────── */
const SERVICE_CENTER = { lat: 18.1518, lng: 74.5815 }; // Baramati city center
const SERVICE_RADIUS_KM = 15;

// Valid pincodes in and around Baramati
const VALID_PINCODES = [
  "413102", // Baramati city
  // "413104", // Baramati rural
  // "413105", // Morgaon
  // "413115", // Pargaon
  // "413801", // Jejuri (border)
];

// Haversine formula — distance between two lat/lng points in km
function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isInServiceArea(lat, lng) {
  return getDistanceKm(lat, lng, SERVICE_CENTER.lat, SERVICE_CENTER.lng) <= SERVICE_RADIUS_KM;
}

function isPincodeValid(pincode) {
  return VALID_PINCODES.includes(pincode.trim());
}

/* ─────────────────────────────────────────
   LOCATION CHECK SCREEN (shown after login)
───────────────────────────────────────── */
function LocationCheck({ onSuccess, onBack }) {
  const [step, setStep]           = useState("ask");     // ask | detecting | pincode | outside | success
  const [pincode, setPincode]     = useState("");
  const [pincodeError, setPincodeError] = useState("");
  const [detectedCity, setDetectedCity] = useState("");

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setStep("pincode");
      return;
    }
    setStep("detecting");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        // Try to get city name
        try {
          const r = await fetch(`http://localhost:5000/api/users/geocode?lat=${latitude}&lon=${longitude}`);
          const d = await r.json();
          const city = d.address?.city || d.address?.town || d.address?.village || "";
          setDetectedCity(city);
        } catch {}

        if (isInServiceArea(latitude, longitude)) {
          localStorage.setItem("userLocation", JSON.stringify({ lat: latitude, lng: longitude, source: "gps" }));
          setStep("success");
          setTimeout(onSuccess, 1800);
        } else {
          setStep("outside");
        }
      },
      () => {
        // User denied GPS → ask for pincode
        setStep("pincode");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const checkPincode = () => {
    setPincodeError("");
    if (pincode.length !== 6 || !/^\d+$/.test(pincode)) {
      setPincodeError("Please enter a valid 6-digit pincode");
      return;
    }
    if (isPincodeValid(pincode)) {
      localStorage.setItem("userLocation", JSON.stringify({ pincode, source: "manual" }));
      setStep("success");
      setTimeout(onSuccess, 1800);
    } else {
      setStep("outside");
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "white", zIndex: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif", padding: 24 }}>
      <style>{`
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.15);opacity:0.7} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes popIn { 0%{transform:scale(0.5);opacity:0} 70%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
      `}</style>

      {/* ── ASK PERMISSION ── */}
      {step === "ask" && (
        <div style={{ textAlign: "center", maxWidth: 380, animation: "fadeUp 0.4s ease" }}>
          <div style={{ width: 100, height: 100, borderRadius: "50%", background: "linear-gradient(135deg,#1a9c3e,#0d5c24)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", boxShadow: "0 8px 32px rgba(26,156,62,0.3)", animation: "pulse 2s ease infinite" }}>
            <FaMapMarkerAlt color="white" size={40} />
          </div>
          <h2 style={{ fontWeight: 900, fontSize: 26, color: "#111", marginBottom: 8, letterSpacing: "-0.5px" }}>Where are you? 📍</h2>
          <p style={{ color: "#6b7280", fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
            We need your location to check if we deliver to your area. We currently serve <strong style={{ color: "#1a9c3e" }}>Baramati</strong> and nearby areas.
          </p>

          <button onClick={detectLocation}
            style={{ width: "100%", background: "linear-gradient(135deg,#1a9c3e,#0d5c24)", color: "white", border: "none", borderRadius: 16, padding: "16px", fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: "0 6px 24px rgba(26,156,62,0.35)", marginBottom: 12 }}>
            <FaLocationArrow size={16} /> Detect My Location
          </button>

          <button onClick={() => setStep("pincode")}
            style={{ width: "100%", background: "white", color: "#374151", border: "2px solid #e5e7eb", borderRadius: 16, padding: "14px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", marginBottom: 16 }}>
            Enter Pincode Instead
          </button>

          <button onClick={onBack} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
            ← Back to login
          </button>
        </div>
      )}

      {/* ── DETECTING ── */}
      {step === "detecting" && (
        <div style={{ textAlign: "center", animation: "fadeUp 0.3s ease" }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#f0fdf4", border: "3px solid #1a9c3e", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <div style={{ width: 40, height: 40, border: "4px solid #e5e7eb", borderTop: "4px solid #1a9c3e", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          </div>
          <h2 style={{ fontWeight: 800, fontSize: 22, color: "#111", marginBottom: 8 }}>Detecting location...</h2>
          <p style={{ color: "#9ca3af", fontSize: 14 }}>Please allow location access in your browser</p>
        </div>
      )}

      {/* ── PINCODE INPUT ── */}
      {step === "pincode" && (
        <div style={{ textAlign: "center", maxWidth: 380, width: "100%", animation: "fadeUp 0.4s ease" }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: 36 }}>
            📮
          </div>
          <h2 style={{ fontWeight: 900, fontSize: 24, color: "#111", marginBottom: 8 }}>Enter your pincode</h2>
          <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
            We'll check if we deliver to your area
          </p>

          <input
            value={pincode}
            onChange={e => { setPincode(e.target.value.replace(/\D/g, "").slice(0, 6)); setPincodeError(""); }}
            onKeyDown={e => e.key === "Enter" && checkPincode()}
            placeholder="Enter 6-digit pincode"
            maxLength={6}
            style={{ width: "100%", padding: "16px 18px", borderRadius: 14, border: `2px solid ${pincodeError ? "#ef4444" : "#e5e7eb"}`, fontSize: 18, fontWeight: 700, textAlign: "center", outline: "none", letterSpacing: "4px", marginBottom: 8, boxSizing: "border-box", fontFamily: "'DM Sans',sans-serif", color: "#111" }}
            autoFocus
          />

          {pincodeError && (
            <div style={{ color: "#ef4444", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>⚠️ {pincodeError}</div>
          )}

          <button onClick={checkPincode}
            style={{ width: "100%", background: pincode.length === 6 ? "linear-gradient(135deg,#1a9c3e,#0d5c24)" : "#e5e7eb", color: pincode.length === 6 ? "white" : "#9ca3af", border: "none", borderRadius: 14, padding: "15px", fontSize: 16, fontWeight: 800, cursor: pincode.length === 6 ? "pointer" : "not-allowed", fontFamily: "'DM Sans',sans-serif", marginBottom: 12, transition: "all 0.2s", boxShadow: pincode.length === 6 ? "0 4px 16px rgba(26,156,62,0.3)" : "none" }}>
            Check Availability
          </button>

          <button onClick={() => setStep("ask")} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
            ← Try GPS instead
          </button>
        </div>
      )}

      {/* ── OUTSIDE SERVICE AREA ── */}
      {step === "outside" && (
        <div style={{ textAlign: "center", maxWidth: 380, animation: "fadeUp 0.4s ease" }}>
          <div style={{ fontSize: 80, marginBottom: 20 }}>😔</div>
          <h2 style={{ fontWeight: 900, fontSize: 24, color: "#111", marginBottom: 8 }}>Not available yet</h2>
          <p style={{ color: "#6b7280", fontSize: 14, lineHeight: 1.7, marginBottom: 8 }}>
            Sorry, we don't deliver to your area yet. We currently serve
          </p>
          <div style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 14, padding: "14px 20px", marginBottom: 24, display: "inline-block" }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#1a9c3e" }}>📍 Baramati & surrounding areas</div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Pincode: 413102 and nearby</div>
          </div>
          <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 24 }}>
            We're expanding soon! Stay tuned 🚀
          </p>

          <button onClick={() => setStep("pincode")}
            style={{ width: "100%", background: "linear-gradient(135deg,#1a9c3e,#0d5c24)", color: "white", border: "none", borderRadius: 14, padding: "14px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", marginBottom: 10, boxShadow: "0 4px 16px rgba(26,156,62,0.3)" }}>
            Try a Different Pincode
          </button>
          <button onClick={onBack}
            style={{ width: "100%", background: "white", color: "#6b7280", border: "2px solid #e5e7eb", borderRadius: 14, padding: "13px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
            Back to Login
          </button>
        </div>
      )}

      {/* ── SUCCESS ── */}
      {step === "success" && (
        <div style={{ textAlign: "center", animation: "fadeUp 0.4s ease" }}>
          <div style={{ width: 100, height: 100, borderRadius: "50%", background: "linear-gradient(135deg,#1a9c3e,#0d5c24)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", animation: "popIn 0.5s ease", boxShadow: "0 8px 32px rgba(26,156,62,0.4)", fontSize: 44 }}>
            ✓
          </div>
          <h2 style={{ fontWeight: 900, fontSize: 24, color: "#111", marginBottom: 8 }}>
            {detectedCity ? `Delivering to ${detectedCity}! 🎉` : "Great news! We deliver here 🎉"}
          </h2>
          <p style={{ color: "#6b7280", fontSize: 14 }}>Taking you to the store...</p>
          <div style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#1a9c3e", animation: "pulse 0.6s ease infinite" }} />
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#1a9c3e", animation: "pulse 0.6s ease 0.2s infinite" }} />
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#1a9c3e", animation: "pulse 0.6s ease 0.4s infinite" }} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN LOGIN PAGE
───────────────────────────────────────── */
export default function Login() {
  const navigate = useNavigate();
  const [tab, setTab]           = useState("user");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone]       = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [showLocation, setShowLocation] = useState(false); // show location check screen

  const handleLogin = async () => {
    setError("");
    if (tab === "delivery") {
      if (!phone || !password) { setError("Enter phone and password"); return; }
    } else {
      if (!email || !password) { setError("Enter email and password"); return; }
    }
    try {
      setLoading(true);
      if (tab === "delivery") {
        const res = await API_BASE.post("/delivery-partners/login", { phone, password });
        localStorage.setItem("dp_token", res.data.token);
        localStorage.setItem("dp_user", JSON.stringify(res.data.partner));
        navigate("/delivery-dashboard");
      } else {
        const res = await API_BASE.post("/auth/login", { email, password });
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        const role = res.data.user?.role;

        if (role === "user") {
          // Check if location already verified this session
          const savedLocation = localStorage.getItem("userLocation");
          if (savedLocation) {
            navigate("/user-dashboard");
          } else {
            // Show location check before entering dashboard
            setShowLocation(true);
          }
        } else if (role === "super_admin") {
          navigate("/super-admin-dashboard");
        } else {
          navigate("/dashboard");
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const TABS = [
    { id: "user",     label: "User",     icon: <FaUser size={13} /> },
    { id: "store",    label: "Store",    icon: <FaStore size={13} /> },
    { id: "delivery", label: "Delivery", icon: <FaMotorcycle size={13} /> },
  ];

  return (
    <>
      {/* Location check screen — shown over login after user login */}
      {showLocation && (
        <LocationCheck
          onSuccess={() => navigate("/user-dashboard")}
          onBack={() => {
            setShowLocation(false);
            // Clear auth so they're back to login state
            localStorage.removeItem("token");
            localStorage.removeItem("user");
          }}
        />
      )}

      <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: "100vh", background: "#f5f5f0", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <div style={{ width: "100%", maxWidth: 400 }}>

          {/* LOGO */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: "linear-gradient(135deg,#1a9c3e,#0d5c24)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", boxShadow: "0 8px 24px rgba(26,156,62,0.3)" }}>
              <IoFlash color="#facc15" size={32} />
            </div>
            <h1 style={{ fontWeight: 900, fontSize: 28, color: "#111", margin: 0 }}>SmartStore</h1>
            <p style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>10 minute delivery ⚡</p>
          </div>

          {/* CARD */}
          <div style={{ background: "white", borderRadius: 24, padding: 28, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
            <h2 style={{ fontWeight: 800, fontSize: 22, color: "#111", marginBottom: 4, marginTop: 0 }}>Welcome back 👋</h2>
            <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 20, marginTop: 0 }}>Sign in to continue</p>

            {/* TABS */}
            <div style={{ display: "flex", background: "#f5f5f5", borderRadius: 12, padding: 4, marginBottom: 20, gap: 4 }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => { setTab(t.id); setError(""); setEmail(""); setPassword(""); setPhone(""); }}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px", borderRadius: 9, border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", background: tab === t.id ? "white" : "transparent", color: tab === t.id ? "#1a9c3e" : "#6b7280", boxShadow: tab === t.id ? "0 2px 8px rgba(0,0,0,0.08)" : "none", transition: "all 0.2s" }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* FIELDS */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
              {tab === "delivery" ? (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 6 }}>Phone Number</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="10 digit phone" type="tel"
                    style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1.5px solid #e5e7eb", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif" }}
                    onFocus={e => e.target.style.borderColor = "#1a9c3e"} onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                    onKeyDown={e => e.key === "Enter" && handleLogin()} />
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 6 }}>Email Address</label>
                  <input value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" type="email"
                    style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1.5px solid #e5e7eb", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif" }}
                    onFocus={e => e.target.style.borderColor = "#1a9c3e"} onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                    onKeyDown={e => e.key === "Enter" && handleLogin()} />
                </div>
              )}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 6 }}>Password</label>
                <div style={{ position: "relative" }}>
                  <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" type={showPass ? "text" : "password"}
                    style={{ width: "100%", padding: "12px 44px 12px 14px", borderRadius: 12, border: "1.5px solid #e5e7eb", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif" }}
                    onFocus={e => e.target.style.borderColor = "#1a9c3e"} onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                    onKeyDown={e => e.key === "Enter" && handleLogin()} />
                  <button onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}>
                    {showPass ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                  </button>
                </div>
                {tab !== "delivery" && (
                  <div style={{ textAlign: "right", marginTop: 7 }}>
                    <span onClick={() => navigate("/forgot-password")} style={{ color: "#1a9c3e", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                      Forgot password?
                    </span>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#ef4444", fontWeight: 600 }}>
                ⚠️ {error}
              </div>
            )}

            <button onClick={handleLogin} disabled={loading}
              style={{ width: "100%", background: loading ? "#9ca3af" : "linear-gradient(135deg,#1a9c3e,#0d5c24)", color: "white", border: "none", borderRadius: 14, padding: "14px", fontSize: 16, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", boxShadow: "0 4px 16px rgba(26,156,62,0.3)", marginBottom: 16 }}>
              {loading ? "Signing in..." : "Sign In →"}
            </button>

            {tab === "user" && (
              <div style={{ textAlign: "center", fontSize: 13, color: "#6b7280" }}>
                New to SmartStore?{" "}
                <span onClick={() => navigate("/register")} style={{ color: "#1a9c3e", fontWeight: 700, cursor: "pointer" }}>Create Account</span>
              </div>
            )}
          </div>

          <div style={{ marginTop: 20, background: "white", borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <div style={{ background: "#1a9c3e", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 14, flexShrink: 0, fontWeight: 700 }}>%</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#1a9c3e" }}>50% upto ₹150 off on first order</div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>USE TRY50 | Above ₹99</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
