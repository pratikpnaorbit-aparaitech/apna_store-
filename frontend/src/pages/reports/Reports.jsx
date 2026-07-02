import { useEffect, useState } from "react";
import { API } from "../../services/api";

function Reports() {
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({ totalOrders: 0, totalRevenue: 0 });
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    loadReports();
    loadStats();
  }, []);

  const loadReports = async () => {
    try {
      const res = await API.get("/reports");
      setTransactions(res.data || []);
    } catch (err) {
      console.error("Failed to load reports:", err);
    }
  };

  const loadStats = async () => {
    try {
      const res = await API.get("/reports/stats");
      setStats(res.data || { totalOrders: 0, totalRevenue: 0 });
    } catch (err) {
      console.error("Failed to load report stats:", err);
    }
  };

  /* ===============================
     FILTER LOGIC (SAFE)
  ================================ */
  const filtered = transactions.filter(t => {
    const bill = (t.bill_number || "").toLowerCase();
    const customer = (t.customer_name || "").toLowerCase();
    const matchesSearch =
      bill.includes(search.toLowerCase()) ||
      customer.includes(search.toLowerCase());

    const txDate = new Date(t.created_at);
    const fromOk = fromDate ? txDate >= new Date(fromDate) : true;
    const toOk = toDate ? txDate <= new Date(toDate + "T23:59:59") : true;

    return matchesSearch && fromOk && toOk;
  });

  const formatDateTime = (date) =>
    new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="p-8">

      <h1 className="text-3xl font-bold mb-2">Transaction Audit & Reporting</h1>
      <p className="text-gray-500 mb-6">
        Manage financial records and authorize reversals.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Stat label="Total Revenue" value={`₹${stats.totalRevenue}`} />
        <Stat label="Orders Audited" value={stats.totalOrders} />
        <Stat label="Bill Dispatches" value={stats.totalOrders} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <input
          className="border px-4 py-3 rounded-xl w-[300px]"
          placeholder="Search Bill # or Customer..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <input
          type="date"
          className="border px-4 py-3 rounded-xl"
          value={fromDate}
          onChange={e => setFromDate(e.target.value)}
        />

        <input
          type="date"
          className="border px-4 py-3 rounded-xl"
          value={toDate}
          onChange={e => setToDate(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 text-left">Bill #</th>
              <th className="p-4 text-left">Customer</th>
              <th className="p-4 text-left">Date & Time</th>
              <th className="p-4">Payment</th>
              <th className="p-4">Total</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map(t => (
              <tr key={t.id} className="border-t">
                <td className="p-4 font-mono">{t.bill_number}</td>
                <td className="p-4">{t.customer_name}</td>
                <td className="p-4 text-gray-600">
                  {formatDateTime(t.created_at)}
                </td>
                <td className="p-4">{t.payment_mode}</td>
                <td className="p-4 font-bold">₹{t.total}</td>
                <td className="p-4">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                    {t.audit_status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}

/* Small Stat Card */
function Stat({ label, value }) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <p className="text-gray-500">{label}</p>
      <h2 className="text-3xl font-bold">{value}</h2>
    </div>
  );
}

export default Reports;
