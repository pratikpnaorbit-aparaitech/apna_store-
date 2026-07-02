import { useState } from "react";
import { API } from "../../services/api";
import { Upload, FileText, CheckCircle, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

function BulkUploadInventory() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a CSV file");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      const res = await API.post(
        "/bulk-upload/inventory",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      alert(
        `Bulk Upload Successful ✅\n\nInserted: ${res.data.inserted}\nFailed: ${res.data.failed}`
      );

      // Redirect to inventory after success
      navigate("/inventory");
    } catch {
      alert("Bulk upload failed ❌");
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
            <li>Category must match predefined categories</li>
            <li>Expiry format: YYYY-MM-DD</li>
          </ul>
        </div>

        {/* File Upload */}
        <div className="border-2 border-dashed rounded-xl p-6 text-center hover:border-blue-400 transition">
          <input
            type="file"
            accept=".csv"
            onChange={e => setFile(e.target.files[0])}
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
            disabled={loading}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold transition
              ${loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            {loading ? "Uploading..." : <><CheckCircle size={18} /> Upload</>}
          </button>

          <button
            onClick={() => navigate("/inventory")}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-100 transition"
          >
            <X size={18} /> Cancel
          </button>
        </div>

      </div>
    </div>
  );
}

export default BulkUploadInventory;
