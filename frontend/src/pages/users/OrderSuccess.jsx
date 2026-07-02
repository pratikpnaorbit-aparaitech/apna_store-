import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function OrderSuccess() {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);

  useEffect(() => {
    setTimeout(() => setShow(true), 100);
  }, []);

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#f5f5f0", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes popIn { 0%{transform:scale(0.5);opacity:0} 70%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
        @keyframes fadeUp { from{transform:translateY(30px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>

      <div style={{ textAlign: "center", maxWidth: 400, width: "100%" }}>
        {/* Success circle */}
        <div style={{ width: 120, height: 120, borderRadius: "50%", background: "linear-gradient(135deg,#1a9c3e,#0d5c24)", margin: "0 auto 24px", display: "flex", alignItems: "center", justifyContent: "center", animation: show ? "popIn 0.6s ease forwards" : "none", opacity: show ? 1 : 0, boxShadow: "0 8px 32px rgba(26,156,62,0.4)" }}>
          <span style={{ fontSize: 52 }}>✓</span>
        </div>

        {/* Text */}
        <div style={{ animation: show ? "fadeUp 0.5s ease 0.3s forwards" : "none", opacity: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 28, color: "#111", marginBottom: 8 }}>Order Placed! 🎉</div>
          <div style={{ color: "#6b7280", fontSize: 15, marginBottom: 8, lineHeight: 1.6 }}>
            Your order has been placed successfully.<br />We'll notify you when it's confirmed!
          </div>

          {/* Delivery estimate */}
          <div style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 14, padding: "14px 20px", margin: "20px 0", display: "inline-flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>🛵</span>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#1a9c3e" }}>Estimated Delivery</div>
              <div style={{ fontSize: 13, color: "#374151" }}>15 - 30 minutes</div>
            </div>
          </div>

          {/* Offer strip */}
          <div style={{ background: "white", borderRadius: 12, padding: "10px 16px", marginBottom: 24, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <span style={{ fontSize: 18 }}>%</span>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#1a9c3e" }}>50% upto ₹150 off on next order</div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>USE TRY50 | Above ₹99</div>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={() => navigate("/my-orders")}
              style={{ width: "100%", background: "#1a9c3e", color: "white", border: "none", borderRadius: 14, padding: "14px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", boxShadow: "0 4px 16px rgba(26,156,62,0.3)" }}>
              Track My Order 📦
            </button>
            <button onClick={() => navigate("/user-dashboard")}
              style={{ width: "100%", background: "white", color: "#1a9c3e", border: "2px solid #1a9c3e", borderRadius: 14, padding: "13px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}