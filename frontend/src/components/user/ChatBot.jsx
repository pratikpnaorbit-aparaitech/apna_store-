import { useEffect, useRef, useState } from "react";
import { FaComments, FaPaperPlane, FaTimes, FaWhatsapp } from "react-icons/fa";

const QUICK_REPLIES = ["Track my order", "Delivery time", "Returns", "Payment help"];
const WHATSAPP_URL = "https://wa.me/919158852129?text=Hello%2C%20I%20need%20help%20with%20my%20order.";

const getReply = (message) => {
  const text = message.toLowerCase();
  if (text.includes("track") || text.includes("order")) return "You can see live order updates in My Orders. Open Profile → My Orders to check the latest status.";
  if (text.includes("deliver") || text.includes("time")) return "Most nearby orders are delivered in about 10–15 minutes. The exact estimate appears on the store and checkout pages.";
  if (text.includes("return") || text.includes("refund")) return "For a return or refund, open My Orders, select the order, and contact support with the order number.";
  if (text.includes("pay") || text.includes("card") || text.includes("upi")) return "You can pay securely at checkout. If a payment fails, retry from checkout; no order is confirmed until payment succeeds.";
  if (text.includes("cart")) return "Tap the Cart button at the top of the page to review items, change quantities, or continue to checkout.";
  if (text.includes("store") || text.includes("product")) return "Use the search box to find a product, category, or nearby store.";
  return "I can help with orders, delivery, returns, payments, the cart, and finding products. What would you like to know?";
};

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { from: "bot", text: "Hi! 👋 How can I help with your shopping today?" },
  ]);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = (value = input) => {
    const message = value.trim();
    if (!message) return;
    setMessages((current) => [
      ...current,
      { from: "user", text: message },
      { from: "bot", text: getReply(message) },
    ]);
    setInput("");
  };

  return (
    <div style={{ position: "fixed", right: 22, bottom: 22, zIndex: 1000, fontFamily: "'DM Sans', Arial, sans-serif" }}>
      {open && (
        <section aria-label="Shopping assistant" style={{ width: "min(360px, calc(100vw - 28px))", height: "min(520px, calc(100vh - 110px))", marginBottom: 14, background: "white", borderRadius: 20, overflow: "hidden", boxShadow: "0 18px 55px rgba(0,0,0,.22)", border: "1px solid #dcfce7", display: "flex", flexDirection: "column" }}>
          <header style={{ padding: "16px 18px", background: "linear-gradient(135deg,#1a9c3e,#0d6b2b)", color: "white", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,.2)", display: "grid", placeItems: "center", fontSize: 20 }}>🤖</span>
            <div style={{ flex: 1 }}><strong style={{ display: "block", fontSize: 15 }}>Shopping Assistant</strong><span style={{ fontSize: 11, opacity: .85 }}>Online • Replies instantly</span></div>
            <button aria-label="Close chat" onClick={() => setOpen(false)} style={{ border: 0, background: "transparent", color: "white", cursor: "pointer", padding: 6 }}><FaTimes /></button>
          </header>

          <div style={{ flex: 1, overflowY: "auto", padding: 16, background: "#f7faf7" }}>
            {messages.map((message, index) => (
              <div key={`${message.from}-${index}`} style={{ display: "flex", justifyContent: message.from === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
                <div style={{ maxWidth: "84%", padding: "10px 13px", borderRadius: message.from === "user" ? "15px 15px 3px 15px" : "15px 15px 15px 3px", background: message.from === "user" ? "#1a9c3e" : "white", color: message.from === "user" ? "white" : "#1f2937", boxShadow: "0 2px 8px rgba(0,0,0,.06)", fontSize: 13, lineHeight: 1.45 }}>{message.text}</div>
              </div>
            ))}
            {messages.length === 1 && <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 8 }}>{QUICK_REPLIES.map((reply) => <button key={reply} onClick={() => send(reply)} style={{ border: "1px solid #bbf7d0", color: "#15803d", background: "white", borderRadius: 20, padding: "7px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{reply}</button>)}</div>}
            <div ref={endRef} />
          </div>

          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" aria-label="Chat with support on WhatsApp" style={{ margin: "0 12px 10px", borderRadius: 12, padding: "10px 14px", background: "#25D366", color: "white", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 9, fontSize: 13, fontWeight: 800, boxShadow: "0 3px 10px rgba(37,211,102,.25)" }}>
            <FaWhatsapp size={19} /> Chat with us on WhatsApp
          </a>

          <form onSubmit={(event) => { event.preventDefault(); send(); }} style={{ display: "flex", gap: 9, padding: 12, borderTop: "1px solid #e5e7eb", background: "white" }}>
            <input aria-label="Chat message" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Type your question..." style={{ minWidth: 0, flex: 1, border: "1px solid #d1d5db", borderRadius: 12, padding: "10px 12px", outlineColor: "#1a9c3e", fontSize: 13 }} />
            <button aria-label="Send message" type="submit" style={{ width: 42, border: 0, borderRadius: 12, background: "#1a9c3e", color: "white", cursor: "pointer", display: "grid", placeItems: "center" }}><FaPaperPlane size={14} /></button>
          </form>
        </section>
      )}

      <button aria-label={open ? "Close shopping assistant" : "Open shopping assistant"} onClick={() => setOpen((value) => !value)} style={{ marginLeft: "auto", width: 58, height: 58, borderRadius: "50%", border: "3px solid white", background: "linear-gradient(135deg,#20ad47,#08732b)", color: "white", boxShadow: "0 8px 25px rgba(13,107,43,.4)", cursor: "pointer", display: "grid", placeItems: "center" }}>
        {open ? <FaTimes size={20} /> : <FaComments size={23} />}
      </button>
    </div>
  );
}
