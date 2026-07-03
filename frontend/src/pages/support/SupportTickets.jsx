import { useCallback, useEffect, useMemo, useState } from "react";
import { API } from "../../services/api";

const statusColors = { open:["#fff7ed", "#c2410c"], in_progress:["#eff6ff", "#1d4ed8"], resolved:["#f0fdf4", "#15803d"], closed:["#f3f4f6", "#4b5563"] };

export default function SupportTickets() {
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState("open");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/support-tickets", { params: { status: filter } });
      setTickets(data.tickets || []);
    } catch (error) { setMessage(error.response?.data?.message || "Could not load support tickets."); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { loadTickets(); }, [loadTickets]);
  const counts = useMemo(() => tickets.reduce((result, ticket) => ({ ...result, [ticket.status]:(result[ticket.status] || 0) + 1 }), {}), [tickets]);
  const openTicket = (ticket) => { setSelected(ticket); setStatus(ticket.status); setReply(ticket.adminReply || ""); setMessage(""); };
  const updateTicket = async () => {
    setSaving(true); setMessage("");
    try {
      const { data } = await API.patch(`/support-tickets/${selected._id}`, { status, adminReply:reply });
      setTickets((current) => current.map((item) => item._id === data.ticket._id ? data.ticket : item));
      setSelected(data.ticket); setMessage("Ticket updated successfully.");
    } catch (error) { setMessage(error.response?.data?.message || "Could not update ticket."); }
    finally { setSaving(false); }
  };

  return <div style={{ fontFamily:"'DM Sans',sans-serif", maxWidth:1400, margin:"0 auto" }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", gap:16, marginBottom:22 }}><div><h1 style={{ margin:0, fontSize:28, color:"#111827" }}>Support Tickets</h1><p style={{ margin:"6px 0 0", color:"#6b7280" }}>Review customer issues and keep every request accountable.</p></div><select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding:"10px 14px", border:"1px solid #d1d5db", borderRadius:10, background:"white" }}><option value="all">All tickets</option><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></div>
    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,minmax(0,1fr))", gap:12, marginBottom:18 }}>{["open","in_progress","resolved","closed"].map((item) => <div key={item} style={{ background:"white", borderRadius:14, padding:16, boxShadow:"0 2px 10px rgba(15,23,42,.06)" }}><div style={{ color:"#6b7280", fontSize:12, textTransform:"capitalize" }}>{item.replace("_", " ")}</div><div style={{ fontSize:25, fontWeight:900, marginTop:3 }}>{counts[item] || 0}</div></div>)}</div>
    {loading ? <div style={{ background:"white", padding:30, borderRadius:16, color:"#6b7280" }}>Loading tickets...</div> : tickets.length === 0 ? <div style={{ background:"white", padding:40, textAlign:"center", borderRadius:16, color:"#6b7280" }}>No support tickets in this view.</div> : <div style={{ background:"white", borderRadius:16, overflow:"hidden", boxShadow:"0 2px 14px rgba(15,23,42,.06)" }}><div style={{ overflowX:"auto" }}><table style={{ width:"100%", borderCollapse:"collapse", minWidth:850 }}><thead><tr style={{ background:"#f8fafc", textAlign:"left" }}>{["Ticket","Customer","Issue","Order","Created","Status"].map((heading) => <th key={heading} style={{ padding:14, fontSize:12, color:"#64748b" }}>{heading}</th>)}</tr></thead><tbody>{tickets.map((ticket) => { const colors = statusColors[ticket.status] || statusColors.open; return <tr key={ticket._id} onClick={() => openTicket(ticket)} style={{ borderTop:"1px solid #f1f5f9", cursor:"pointer" }}><td style={{ padding:14, fontWeight:800, color:"#4f46e5" }}>{ticket.ticketNumber}</td><td style={{ padding:14 }}><div style={{ fontWeight:700 }}>{ticket.user?.name || "Customer"}</div><div style={{ fontSize:12, color:"#6b7280" }}>{ticket.user?.mobile || ticket.user?.email}</div></td><td style={{ padding:14 }}><div style={{ fontWeight:700 }}>{ticket.subject}</div><div style={{ fontSize:12, color:"#6b7280", textTransform:"capitalize" }}>{ticket.category}</div></td><td style={{ padding:14 }}>{ticket.orderNumber || "—"}</td><td style={{ padding:14, color:"#6b7280", fontSize:13 }}>{new Date(ticket.createdAt).toLocaleString("en-IN")}</td><td style={{ padding:14 }}><span style={{ padding:"6px 9px", borderRadius:20, background:colors[0], color:colors[1], fontWeight:800, fontSize:11, textTransform:"capitalize" }}>{ticket.status.replace("_", " ")}</span></td></tr>})}</tbody></table></div></div>}
    {selected && <div onClick={() => setSelected(null)} style={{ position:"fixed", inset:0, background:"rgba(15,23,42,.45)", zIndex:100, display:"flex", justifyContent:"flex-end" }}><div onClick={(e) => e.stopPropagation()} style={{ width:"min(520px,100%)", height:"100%", background:"white", padding:24, boxSizing:"border-box", overflowY:"auto" }}><div style={{ display:"flex", justifyContent:"space-between" }}><div><div style={{ color:"#4f46e5", fontWeight:900 }}>{selected.ticketNumber}</div><h2 style={{ margin:"6px 0" }}>{selected.subject}</h2></div><button onClick={() => setSelected(null)} style={{ border:0, background:"#f3f4f6", width:36, height:36, borderRadius:"50%", cursor:"pointer" }}>✕</button></div><div style={{ marginTop:18, padding:14, background:"#f8fafc", borderRadius:12, lineHeight:1.6, whiteSpace:"pre-wrap" }}>{selected.description}</div><div style={{ marginTop:15, color:"#4b5563", fontSize:13 }}><strong>Customer:</strong> {selected.user?.name} · {selected.user?.mobile || selected.user?.email}<br/><strong>Order:</strong> {selected.orderNumber || "Not provided"}<br/><strong>Category:</strong> {selected.category}</div><label style={{ display:"block", marginTop:22, fontWeight:800, fontSize:13 }}>Status</label><select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width:"100%", marginTop:7, padding:12, border:"1px solid #d1d5db", borderRadius:10, background:"white" }}><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select><label style={{ display:"block", marginTop:15, fontWeight:800, fontSize:13 }}>Reply to customer</label><textarea value={reply} onChange={(e) => setReply(e.target.value)} maxLength={2000} placeholder="Write an update or resolution..." style={{ width:"100%", minHeight:130, marginTop:7, padding:12, boxSizing:"border-box", border:"1px solid #d1d5db", borderRadius:10, resize:"vertical", fontFamily:"inherit" }}/>{message && <div style={{ marginTop:10, color:message.includes("successfully") ? "#15803d" : "#b91c1c", fontSize:13 }}>{message}</div>}<button disabled={saving} onClick={updateTicket} style={{ width:"100%", marginTop:15, padding:13, border:0, borderRadius:11, background:"#4f46e5", color:"white", fontWeight:800, cursor:"pointer" }}>{saving ? "Saving..." : "Save & Notify Customer"}</button></div></div>}
  </div>;
}
