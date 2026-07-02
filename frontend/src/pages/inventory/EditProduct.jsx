import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API } from "../../services/api";
import toast from "react-hot-toast";

export default function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProduct();
  }, []);

  const loadProduct = async () => {
    try {
      const res = await API.get(`/inventory/${id}`);
      setProduct(res.data);
    } catch {
      toast.error("Failed to load product");
      navigate("/inventory");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await API.put(`/inventory/${id}`, product);
      toast.success("Product updated successfully");
      navigate("/inventory");
    } catch {
      toast.error("Update failed");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-pulse text-gray-500">Loading product...</div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-6 sm:p-8">

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Edit Product</h2>
          <p className="text-sm text-gray-500 mt-1">Update product details and inventory information</p>
        </div>

        {/* Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Name */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-600 mb-1">Product Name</label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              value={product.name}
              onChange={e => setProduct({ ...product, name: e.target.value })}
            />
          </div>

          {/* SKU */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">SKU</label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              value={product.sku}
              onChange={e => setProduct({ ...product, sku: e.target.value })}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Category</label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              value={product.category}
              onChange={e => setProduct({ ...product, category: e.target.value })}
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Price (₹)</label>
            <input
              type="number"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              value={product.price}
              onChange={e => setProduct({ ...product, price: e.target.value })}
            />
          </div>

          {/* Stock */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Stock Quantity</label>
            <input
              type="number"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              value={product.stock}
              onChange={e => setProduct({ ...product, stock: e.target.value })}
            />
          </div>

          {/* Expiry */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-600 mb-1">Expiry Date</label>
            <input
              type="date"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              value={product.expiryDate?.slice(0, 10) || ""}
              onChange={e => setProduct({ ...product, expiryDate: e.target.value })}
            />
          </div>

          {/* IMAGE URL — paste a link */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-600 mb-1">Product Image URL</label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Paste any image URL, e.g. https://example.com/product.jpg"
              value={product.image_url || ""}
              onChange={e => setProduct({ ...product, image_url: e.target.value })}
            />
            {/* Live preview */}
            {product.image_url && (
              <img
                src={product.image_url}
                alt="preview"
                className="mt-2 w-full h-40 object-cover rounded-lg border border-gray-200"
                onError={e => { e.target.style.display = "none"; }}
              />
            )}
            <p className="text-xs text-gray-400 mt-1">
              💡 Right-click any image on Google → "Copy image address" and paste here
            </p>
          </div>

        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8">
          <button
            onClick={() => navigate("/inventory")}
            className="px-5 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition shadow-md">
            Save Changes
          </button>
        </div>

      </div>
    </div>
  );
}