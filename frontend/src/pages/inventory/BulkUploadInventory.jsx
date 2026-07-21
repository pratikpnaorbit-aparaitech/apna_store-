import { useEffect, useState } from "react";
import { API } from "../../services/api";
import { Upload, FileText, CheckCircle, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

function BulkUploadInventory() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const navigate = useNavigate();
  const role = (() => { try { return JSON.parse(localStorage.getItem("user") || "{}").role; } catch { return ""; } })();
  const isSuperAdmin = role === "super_admin";

  useEffect(() => {
    if (!isSuperAdmin) return;
    API.get("/stores").then(({ data }) => setStores((data.data || []).filter(store => store.isActive))).catch(() => setStores([]));
  }, [isSuperAdmin]);

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a CSV file.");
      return;
    }
    if (isSuperAdmin && !storeId) {
      setError("Please select the owning store.");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Only CSV files are supported.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("CSV file must be 5 MB or smaller.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    if (isSuperAdmin) formData.append("storeId", storeId);

    try {
      setLoading(true);
      setError("");
      setResult(null);
      const res = await API.post(
        "/bulk-upload/inventory",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setResult(res.data);
      setFile(null);
      const input = document.getElementById("csvUpload");
      if (input) input.value = "";
    } catch (uploadError) {
      setError(uploadError.response?.data?.message || "The inventory CSV could not be imported.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-start min-h-screen bg-gray-100 p-6">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-lg p-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-full bg-blue-100 text-blue-600">
            <Upload size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Bulk Upload Inventory</h1>
            <p className="text-sm text-gray-500">
              Upload multiple products at once using a CSV file
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-gray-50 border rounded-xl p-4 mb-6 text-sm">
          <p className="font-semibold mb-2 flex items-center gap-2">
            <FileText size={16} /> CSV Format Required
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-1">
            <li>name, sku, category, price, stock, expiry</li>
            <li>Optional: discount_price, unit, reorder_level, description, image_url, is_featured</li>
            <li>Expiry format: YYYY-MM-DD • maximum 1,000 rows / 5 MB</li>
          </ul>
          <a
            href={'data:text/csv;charset=utf-8,name%2Csku%2Ccategory%2Cprice%2Cstock%2Cexpiry%2Cdiscount_price%2Cunit%2Creorder_level%2Cdescription%2Cimage_url%2Cis_featured%0ASample%20Product%2CSAMPLE-001%2CGrocery%2C10%2C5%2C%2C8%2Cpiece%2C2%2C%2C%2Cfalse'}
            download="inventory-sample.csv"
            className="mt-3 inline-flex font-semibold text-blue-600 hover:text-blue-700"
          >
            Download sample CSV
          </a>
        </div>

        {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {result && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            <p className="font-bold">Bulk upload completed</p>
            <p className="mt-1">Inserted: {result.inserted} • Failed: {result.failed} • Total: {result.total}</p>
            {result.errors?.length > 0 && <ul className="mt-2 list-disc pl-5">{result.errors.map(item => <li key={`${item.row}-${item.sku}`}>Row {item.row}{item.sku ? ` (${item.sku})` : ""}: {item.message}</li>)}</ul>}
          </div>
        )}

        {/* File Upload */}
        {isSuperAdmin && (
          <div className="mb-6">
            <label className="mb-2 block text-sm font-semibold text-gray-700">Owning store</label>
            <select value={storeId} onChange={event => setStoreId(event.target.value)} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3">
              <option value="">Select a store</option>
              {stores.map(store => <option key={store._id} value={store._id}>{store.name}</option>)}
            </select>
          </div>
        )}
        <div className="border-2 border-dashed rounded-xl p-6 text-center hover:border-blue-400 transition">
          <input
            type="file"
            accept=".csv"
            onChange={e => { setFile(e.target.files[0] || null); setError(""); setResult(null); }}
            className="hidden"
            id="csvUpload"
          />

          <label
            htmlFor="csvUpload"
            className="cursor-pointer flex flex-col items-center gap-3"
          >
            <Upload size={32} className="text-blue-600" />
            <p className="font-medium">
              {file ? file.name : "Click to select CSV file"}
            </p>
            <p className="text-xs text-gray-500">
              Only .csv files are supported
            </p>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={handleUpload}
            disabled={loading || !file || (isSuperAdmin && !storeId)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold transition
              ${loading || !file || (isSuperAdmin && !storeId) ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            {loading ? "Uploading..." : <><CheckCircle size={18} /> Upload</>}
          </button>

          <button
            onClick={() => navigate("/inventory")}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-100 transition"
          >
            <X size={18} /> {result ? "View Inventory" : "Cancel"}
          </button>
        </div>

      </div>
    </div>
  );
}

export default BulkUploadInventory;
