import { TrendingUp, Wallet, Users, AlertTriangle, CreditCard, BarChart2, Activity, Sparkles, ShoppingBag, RefreshCw } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useEffect, useState } from "react";
import { API } from "../../services/api";
import { useNavigate } from "react-router-dom";

const PIE_COLORS = ["#1a9c3e", "#6366f1", "#f59e0b", "#ef4444", "#3b82f6"];

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats]               = useState({});
  const [weeklyRevenue, setWeeklyRevenue] = useState([]);
  const [paymentData, setPaymentData]   = useState([]);
  const [recentTx, setRecentTx]         = useState([]);
  const [lowStock, setLowStock]         = useState({ count: 0, items: [] });
  const [showLowStock, setShowLowStock] = useState(false);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    await Promise.all([
      loadStats(), loadWeeklyRevenue(),
      loadPaymentChart(), loadRecentTransactions(), loadLowStock()
    ]);
    setLoading(false);
    setRefreshing(false);
  };

  const loadStats = async () => {
    try {
      const res = await API.get("/dashboard/stats");
      setStats(res.data.stats || res.data || {});
    } catch { console.error("Failed to load stats"); }
  };

  const loadWeeklyRevenue = async () => {
    try {
      const res = await API.get("/dashboard/weekly-revenue");
      setWeeklyRevenue(res.data || []);
    } catch {}
  };

  const loadPaymentChart = async () => {
    try {
      const res = await API.get("/dashboard/payment-chart");
      setPaymentData(res.data || []);
    } catch {}
  };

  const loadRecentTransactions = async () => {
    try {
      const res = await API.get("/dashboard/recent-transactions");
      setRecentTx(res.data || []);
    } catch {}
  };

  const loadLowStock = async () => {
    try {
      const res = await API.get("/dashboard/low-stock");
      setLowStock(res.data || { count: 0, items: [] });
    } catch {}
  };

  const getInsight = () => {
    if ((stats.todayRevenue || 0) > 5000)
      return "Great sales today! Consider promoting add-on items to boost average order value.";
    if (lowStock.count > 0)
      return `${lowStock.count} product(s) are running low. Restock soon to avoid lost sales.`;
    if (paymentData.find(p => p.payment_mode === "UPI"))
      return "UPI is your most popular payment. Consider UPI cashback offers to boost conversions.";
    return "Sales are below average today. Try a limited-time discount to drive more orders.";
  };

  const user = (() => { try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; } })();
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <div style={{ width: 40, height: 40, border: "3px solid #e5e7eb", borderTop: "3px solid #1a9c3e", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", maxWidth: 1200, margin: "0 auto" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* ── HEADER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>{greeting()},</div>
          <h1 style={{ fontWeight: 900, fontSize: 28, color: "#111827", letterSpacing: "-0.5px", margin: "2px 0 4px" }}>{user.name || "Admin"} 👋</h1>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>Here's your store performance for today</div>
        </div>
        <button onClick={() => loadAll(true)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 18px", borderRadius: 12, border: "1.5px solid #e5e7eb", background: "white", color: "#374151", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "#1a9c3e"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "#e5e7eb"}>
          <RefreshCw size={14} style={{ animation: refreshing ? "spin 0.8s linear infinite" : "none" }} />
          Refresh
        </button>
      </div>

      {/* ── STAT CARDS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 16, marginBottom: 28 }}>
        <StatCard title="Today's Revenue"  value={`₹${Number(stats.todayRevenue || 0).toFixed(2)}`} icon={<TrendingUp size={20} />}  color="#1a9c3e" bg="#f0fdf4" />
        <StatCard title="Total Revenue"    value={`₹${Number(stats.totalRevenue || 0).toFixed(2)}`}  icon={<Wallet size={20} />}      color="#6366f1" bg="#eef2ff" />
        {/* FIX: use only todayOrders, not todaySales + todayOrders (was double-counting) */}
        <StatCard title="Orders Today"     value={stats.todayOrders || stats.todaySales || 0}         icon={<ShoppingBag size={20} />} color="#f59e0b" bg="#fffbeb" />
        <StatCard title="Online Orders"    value={stats.totalOrders || 0}                              icon={<Activity size={20} />}   color="#3b82f6" bg="#eff6ff" />
        <StatCard title="Low Stock Items"  value={lowStock.count}                                      icon={<AlertTriangle size={20} />} color={lowStock.count > 0 ? "#ef4444" : "#1a9c3e"} bg={lowStock.count > 0 ? "#fef2f2" : "#f0fdf4"} onClick={() => setShowLowStock(true)} clickable />
      </div>

      {/* ── CHARTS ROW ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, marginBottom: 20 }}>

        {/* Revenue chart */}
        <div style={{ background: "white", borderRadius: 20, padding: "24px 24px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", cursor: "pointer" }} onClick={() => navigate("/reports")}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#111827" }}>Weekly Revenue</div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>Click to view full reports</div>
            </div>
            <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "6px 10px" }}>
              <BarChart2 size={18} color="#1a9c3e" />
            </div>
          </div>
          {weeklyRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={weeklyRevenue}>
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontFamily: "'DM Sans',sans-serif", fontSize: 13 }} />
                <Line type="monotone" dataKey="revenue" stroke="#1a9c3e" strokeWidth={3} dot={{ fill: "#1a9c3e", strokeWidth: 0, r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 14 }}>No revenue data yet</div>
          )}
        </div>

        {/* AI insight card */}
        <div style={{ background: "linear-gradient(135deg,#0b1220,#020617)", borderRadius: 20, padding: 24, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <div style={{ background: "rgba(26,156,62,0.2)", borderRadius: 10, padding: "6px 8px" }}>
              <Sparkles size={16} color="#1a9c3e" />
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "white" }}>AI Insight</div>
          </div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", lineHeight: 1.7, flex: 1 }}>{getInsight()}</div>
          <div style={{ marginTop: 20, background: "rgba(26,156,62,0.15)", border: "1px solid rgba(26,156,62,0.3)", borderRadius: 12, padding: "10px 14px" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 4, fontWeight: 600 }}>TODAY'S HIGHLIGHT</div>
            <div style={{ fontWeight: 800, fontSize: 20, color: "#1a9c3e" }}>₹{Number(stats.todayRevenue || 0).toFixed(0)}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>in revenue today</div>
          </div>
        </div>
      </div>

      {/* ── PAYMENT + TRANSACTIONS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>

        {/* Payment breakdown */}
        <div style={{ background: "white", borderRadius: 20, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <div style={{ background: "#eff6ff", borderRadius: 10, padding: "6px 8px" }}>
              <CreditCard size={16} color="#3b82f6" />
            </div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#111827" }}>Payment Methods</div>
          </div>
          {paymentData.length > 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={paymentData} dataKey="count" nameKey="payment_mode" outerRadius={60} innerRadius={30}>
                    {paymentData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12, fontFamily: "'DM Sans',sans-serif" }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1 }}>
                {paymentData.map((p, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: "#374151", fontWeight: 600, flex: 1 }}>{p.payment_mode || "Other"}</span>
                    <span style={{ fontSize: 12, color: "#9ca3af" }}>{p.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 13 }}>No payment data yet</div>
          )}
        </div>

        {/* Recent transactions */}
        <div style={{ background: "white", borderRadius: 20, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "6px 8px" }}>
              <Activity size={16} color="#1a9c3e" />
            </div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#111827" }}>Recent Transactions</div>
          </div>
          {recentTx.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {recentTx.slice(0, 6).map((tx, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#f9fafb", borderRadius: 10 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{tx.bill_no || `#TXN${i + 1}`}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>{tx.payment_mode || "—"}</div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "#1a9c3e" }}>₹{tx.total || 0}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 13 }}>No transactions yet today</div>
          )}
        </div>
      </div>

      {/* ── LOW STOCK MODAL ── */}
      {showLowStock && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <div style={{ background: "white", borderRadius: 24, width: "100%", maxWidth: 480, padding: 28, maxHeight: "80vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 18, color: "#ef4444" }}>🚨 Low Stock Alert</div>
                <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>{lowStock.count} item{lowStock.count !== 1 ? "s" : ""} need restocking</div>
              </div>
              <button onClick={() => setShowLowStock(false)} style={{ background: "#f5f5f5", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
            {lowStock.items.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "#1a9c3e", fontWeight: 700 }}>✅ All items are sufficiently stocked!</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {lowStock.items.map(p => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fef2f2", borderRadius: 12, padding: "12px 16px" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: "#9ca3af" }}>{p.sku}</div>
                    </div>
                    <div style={{ background: "#ef4444", color: "white", fontWeight: 800, fontSize: 13, padding: "4px 12px", borderRadius: 20 }}>{p.stock} left</div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => { setShowLowStock(false); navigate("/inventory"); }} style={{ width: "100%", marginTop: 16, background: "#1a9c3e", color: "white", border: "none", borderRadius: 14, padding: 14, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
              Go to Inventory →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Stat Card ── */
function StatCard({ title, value, icon, onClick, clickable, color, bg }) {
  return (
    <div onClick={onClick}
      style={{ background: "white", borderRadius: 20, padding: "20px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", cursor: clickable ? "pointer" : "default", transition: "transform 0.15s, box-shadow 0.15s" }}
      onMouseEnter={e => { if (clickable) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)"; } }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; }}>
      <div style={{ width: 46, height: 46, borderRadius: 14, background: bg, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600, marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#111827", letterSpacing: "-0.5px" }}>{value}</div>
      </div>
    </div>
  );
}

export default Dashboard;