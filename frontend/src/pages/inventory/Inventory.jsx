import { useEffect, useState } from "react";
import { API } from "../../services/api";
import { Plus, Upload, Search, Star, AlertTriangle, X, Save, PackageOpen, Link, ImagePlus } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Store types that require expiry dates on products
const EXPIRY_STORE_TYPES = ["General / Grocery Store", "Pharmacy / Medical"];

// Store type → emoji badge
const STORE_TYPE_META = {
  "Restaurant / Food Court":  { emoji: "🍽️", color: "orange" },
  "General / Grocery Store":  { emoji: "🛒", color: "green"  },
  "Clothing & Fashion":       { emoji: "👗", color: "pink"   },
  "Pharmacy / Medical":       { emoji: "💊", color: "red"    },
  "Sports & Fitness":         { emoji: "🏋️", color: "blue"   },
  "Electronics":              { emoji: "💻", color: "indigo" },
};

function Inventory() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const isSuperAdmin = user?.role === "super_admin";

  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [storeFilter, setStoreFilter] = useState("");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editProduct, setEditProduct] = useState(null);

  // Current store's type — determines whether expiry field is visible
  const [currentStoreType, setCurrentStoreType] = useState(null);

  const emptyForm = {
    name: "", sku: "", category: "", price: "", discount_price: "",
    stock: "", reorder_level: "5", expiryDate: "", is_featured: false, image_url: ""
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    loadProducts();
    if (isSuperAdmin) loadStores();
    else loadCurrentStoreType();
  }, [storeFilter]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const url = storeFilter ? `/inventory?storeId=${storeFilter}` : "/inventory";
      const res = await API.get(url);
      setProducts(res.data.map(p => ({ ...p, price: Number(p.price), stock: Number(p.stock) })));
    } catch {
      alert("Failed to load inventory ❌");
    } finally {
      setLoading(false);
    }
  };

  const loadStores = async () => {
    try {
      const res = await API.get("/stores");
      setStores(res.data.data || []);
    } catch { console.error("Failed to load stores"); }
  };

  // For regular admins — fetch their store's type once
  const loadCurrentStoreType = async () => {
    try {
      const res = await API.get("/stores/my-store");
      setCurrentStoreType(res.data?.data?.storeType || null);
    } catch { setCurrentStoreType(null); }
  };

  // When super admin switches store filter, look up that store's type
  const getStoreTypeForFilter = () => {
    if (!storeFilter) return null;
    const found = stores.find(s => s._id === storeFilter);
    return found?.storeType || null;
  };

  const activeStoreType = isSuperAdmin ? getStoreTypeForFilter() : currentStoreType;
  const showExpiry = EXPIRY_STORE_TYPES.includes(activeStoreType);

  const allCategories = ["All", ...new Set(products.map(p => p.category).filter(Boolean))];
  const lowStockCount = products.filter(p => p.isLowStock).length;

  const filtered = products.filter(p => {
    const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "All" || p.category === categoryFilter;
    const matchLow = !showLowStockOnly || p.isLowStock;
    return matchSearch && matchCat && matchLow;
  });

  const handleAdd = async () => {
    try {
      if (!form.name || !form.sku || !form.category || !form.price || !form.stock) {
        alert("Please fill all required fields"); return;
      }
      await API.post("/inventory", {
        ...form,
        price: Number(form.price),
        discount_price: form.discount_price ? Number(form.discount_price) : null,
        stock: Number(form.stock),
        reorder_level: Number(form.reorder_level) || 5,
        // Only send expiryDate if this store type actually uses it
        expiryDate: showExpiry ? (form.expiryDate || null) : null,
      });
      setShowAdd(false);
      setForm(emptyForm);
      loadProducts();
    } catch (err) {
      alert(err.response?.data?.message || "Add product failed ❌");
    }
  };

  const handleUpdate = async () => {
    try {
      await API.put(`/inventory/${editProduct.id}`, {
        ...editProduct,
        price: Number(editProduct.price),
        discount_price: editProduct.discount_price ? Number(editProduct.discount_price) : null,
        stock: Number(editProduct.stock),
        reorder_level: Number(editProduct.reorder_level) || 5,
        expiryDate: showExpiry ? (editProduct.expiryDate || null) : null,
      });
      setShowEdit(false);
      loadProducts();
    } catch (err) {
      alert(err.response?.data?.message || "Update failed ❌");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Archive this product?")) return;
    try {
      await API.delete(`/inventory/${id}`);
      loadProducts();
    } catch { alert("Delete failed ❌"); }
  };

  const handleToggleFeatured = async (p) => {
    try {
      await API.put(`/inventory/${p.id}`, {
        name: p.name, sku: p.sku, category: p.category,
        price: p.price, stock: p.stock, is_featured: !p.is_featured
      });
      loadProducts();
    } catch { alert("Failed to update featured status"); }
  };

  const storeTypeMeta = activeStoreType ? STORE_TYPE_META[activeStoreType] : null;

  return (
    <div className="space-y-6 p-2">

      {/* HEADER */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Inventory</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-sm text-slate-500">
              {isSuperAdmin ? "All stores' products" : "Your store's products"}
            </p>
            {/* Store type badge */}
            {storeTypeMeta && (
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full
                ${storeTypeMeta.color === "orange" ? "bg-orange-50 text-orange-600" : ""}
                ${storeTypeMeta.color === "green"  ? "bg-green-50 text-green-700"  : ""}
                ${storeTypeMeta.color === "pink"   ? "bg-pink-50 text-pink-600"    : ""}
                ${storeTypeMeta.color === "red"    ? "bg-red-50 text-red-600"      : ""}
                ${storeTypeMeta.color === "blue"   ? "bg-blue-50 text-blue-600"    : ""}
                ${storeTypeMeta.color === "indigo" ? "bg-indigo-50 text-indigo-600": ""}
              `}>
                {storeTypeMeta.emoji} {activeStoreType}
              </span>
            )}
            {/* Expiry hint badge */}
            {activeStoreType && (
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border
                ${showExpiry
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-slate-50 text-slate-400 border-slate-200"}
              `}>
                {showExpiry ? "⏳ Expiry tracking on" : "⏳ No expiry tracking"}
              </span>
            )}
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-3">
            <button onClick={() => navigate("/inventory/bulk-upload")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition">
              <Upload size={16} /> Bulk Upload
            </button>
            <button onClick={() => { setForm(emptyForm); setShowAdd(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition">
              <Plus size={16} /> Add Product
            </button>
          </div>
        )}
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Products" value={products.length} color="indigo" />
        <StatCard label="Categories" value={allCategories.length - 1} color="purple" />
        <StatCard label="Low Stock" value={lowStockCount} color="red"
          onClick={() => setShowLowStockOnly(!showLowStockOnly)} active={showLowStockOnly} />
        <StatCard label="Featured" value={products.filter(p => p.is_featured).length} color="yellow" />
      </div>

      {/* FILTERS */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 flex items-center gap-2 flex-1 min-w-48">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input type="text" placeholder="Search by name or SKU..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="outline-none text-sm flex-1 text-slate-700 placeholder:text-slate-400" />
          {search && <button onClick={() => setSearch("")}><X className="w-4 h-4 text-slate-400" /></button>}
        </div>
        <div className="flex gap-2 flex-wrap">
          {allCategories.map(cat => (
            <button key={cat} onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                categoryFilter === cat ? "bg-green-600 text-white border-green-600" : "bg-white text-slate-500 border-slate-200 hover:border-green-300"
              }`}>
              {cat}
            </button>
          ))}
        </div>
        {isSuperAdmin && (
          <select value={storeFilter} onChange={e => setStoreFilter(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="">All Stores</option>
            {stores.map(s => (
              <option key={s._id} value={s._id}>
                {s.name} — {s.admin?.name || "No admin"}
                {s.storeType ? ` (${s.storeType})` : ""}
              </option>
            ))}
          </select>
        )}
        {lowStockCount > 0 && (
          <button onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              showLowStockOnly ? "bg-red-500 text-white border-red-500" : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
            }`}>
            <AlertTriangle className="w-3.5 h-3.5" /> {lowStockCount} Low Stock
          </button>
        )}
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <PackageOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No products found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="p-4 text-left">Image</th>
                <th className="p-4 text-left">Product</th>
                <th className="p-4 text-left">Category</th>
                <th className="p-4 text-right">Price</th>
                <th className="p-4 text-right">Disc. Price</th>
                <th className="p-4 text-center">Stock</th>
                {/* Only show Expiry column if this store type tracks expiry */}
                {showExpiry && <th className="p-4 text-center">Expiry</th>}
                {isSuperAdmin && <th className="p-4 text-left">Store</th>}
                {isAdmin && <th className="p-4 text-center">Featured</th>}
                {isAdmin && <th className="p-4 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className={`border-t hover:bg-slate-50 transition ${p.isLowStock ? "bg-red-50/50" : ""}`}>
                  <td className="p-4">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name}
                        className="w-12 h-12 object-cover rounded-lg border"
                        onError={e => { e.target.onerror = null; e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }} />
                    ) : null}
                    <div className={`w-12 h-12 items-center justify-center bg-slate-100 rounded-lg text-xl ${p.image_url ? "hidden" : "flex"}`}>
                      📦
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-semibold text-slate-800 flex items-center gap-2">
                      {p.name}
                      {p.isLowStock && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                    </div>
                    <div className="text-xs text-slate-400">{p.sku}</div>
                  </td>
                  <td className="p-4">
                    <span className="bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-full font-medium">{p.category}</span>
                  </td>
                  <td className="p-4 text-right font-semibold">₹{Number(p.price).toFixed(2)}</td>
                  <td className="p-4 text-right text-green-600 font-semibold">
                    {p.discount_price ? `₹${Number(p.discount_price).toFixed(2)}` : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`font-bold text-sm ${p.isLowStock ? "text-red-600" : "text-slate-700"}`}>{p.stock}</span>
                    {p.isLowStock && <div className="text-xs text-red-400">Min: {p.reorder_level}</div>}
                  </td>
                  {showExpiry && (
                    <td className="p-4 text-center"><ExpiryBadge expiryDate={p.expiryDate} /></td>
                  )}
                  {isSuperAdmin && (
                    <td className="p-4 text-sm text-slate-500">
                      <div>{p.storeId?.name || <span className="text-slate-300">—</span>}</div>
                      {p.storeId?.storeType && (
                        <div className="text-xs text-slate-400">{STORE_TYPE_META[p.storeId.storeType]?.emoji} {p.storeId.storeType}</div>
                      )}
                    </td>
                  )}
                  {isAdmin && (
                    <td className="p-4 text-center">
                      <button onClick={() => handleToggleFeatured(p)}
                        className={`transition ${p.is_featured ? "text-yellow-500" : "text-slate-300 hover:text-yellow-400"}`}>
                        <Star className="w-5 h-5" fill={p.is_featured ? "currentColor" : "none"} />
                      </button>
                    </td>
                  )}
                  {isAdmin && (
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => { setEditProduct(p); setShowEdit(true); }}
                          className="text-xs font-medium text-indigo-600 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg transition">
                          ✏️ Edit
                        </button>
                        <button onClick={() => handleDelete(p.id)}
                          className="text-xs font-medium text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition">
                          🗑 Archive
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <ProductModal title="Add Product" onClose={() => setShowAdd(false)}>
          <ProductForm
            product={form}
            setProduct={setForm}
            onSubmit={handleAdd}
            submitLabel="Add Product"
            showExpiry={showExpiry}
            storeType={activeStoreType}
          />
        </ProductModal>
      )}
      {showEdit && editProduct && (
        <ProductModal title="Edit Product" onClose={() => setShowEdit(false)}>
          <ProductForm
            product={editProduct}
            setProduct={setEditProduct}
            onSubmit={handleUpdate}
            submitLabel="Save Changes"
            showExpiry={showExpiry}
            storeType={activeStoreType}
          />
        </ProductModal>
      )}
    </div>
  );
}

/* ─────────────── Sub-components ─────────────── */

function StatCard({ label, value, color, onClick, active }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600", purple: "bg-purple-50 text-purple-600",
    red: "bg-red-50 text-red-600", yellow: "bg-yellow-50 text-yellow-600"
  };
  return (
    <div onClick={onClick}
      className={`bg-white rounded-xl border p-4 flex items-center gap-4 ${onClick ? "cursor-pointer hover:shadow-md transition" : ""} ${active ? "ring-2 ring-red-400" : "border-slate-200"}`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
        <span className="text-xl font-bold">{value}</span>
      </div>
      <p className="text-xs text-slate-400 font-medium">{label}</p>
    </div>
  );
}

function ExpiryBadge({ expiryDate }) {
  if (!expiryDate) return <span className="text-slate-300 text-xs">—</span>;
  const days = Math.ceil((new Date(expiryDate) - new Date()) / 86400000);
  if (days <= 0)  return <span className="px-2.5 py-1 text-xs rounded-full bg-red-100 text-red-600 font-semibold">Expired</span>;
  if (days <= 7)  return <span className="px-2.5 py-1 text-xs rounded-full bg-orange-100 text-orange-600 font-semibold">Near Expiry</span>;
  if (days <= 30) return <span className="px-2.5 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700 font-semibold">{days}d left</span>;
  return <span className="px-2.5 py-1 text-xs rounded-full bg-green-100 text-green-600 font-semibold">Safe</span>;
}

function ProductModal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function ProductForm({ product, setProduct, onSubmit, submitLabel, showExpiry, storeType }) {
  const user = JSON.parse(localStorage.getItem("user"));
  const [storeCategories, setStoreCategories] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [imageTab, setImageTab] = useState("url");

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        if (user?.role === "admin") {
          const res = await API.get("/stores/my-store");
          setStoreCategories(res.data?.data?.categories || []);
        } else if (user?.role === "super_admin") {
          const res = await API.get("/stores");
          const cats = [...new Set((res.data.data || []).flatMap(s => s.categories || []))];
          setStoreCategories(cats);
        }
      } catch { setStoreCategories([]); }
    };
    fetchCategories();
  }, []);

  const FALLBACK_CATEGORIES = [
    "Fruits", "Vegetables", "Dairy", "Bakery", "Pantry",
    "Beverages", "Snacks", "Frozen", "Stationery", "Personal Care"
  ];
  const categories = storeCategories.length > 0 ? storeCategories : FALLBACK_CATEGORIES;

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("image", file);
    try {
      setUploading(true);
      const res = await API.post("/inventory/upload-image", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setProduct({ ...product, image_url: res.data.imageUrl });
    } catch {
      alert("Image upload failed ❌");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">

      {/* Store type hint banner */}
      {storeType && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
          ${showExpiry
            ? "bg-amber-50 border border-amber-200 text-amber-700"
            : "bg-slate-50 border border-slate-200 text-slate-500"}
        `}>
          <span>{STORE_TYPE_META[storeType]?.emoji}</span>
          <span>{storeType}</span>
          <span className="ml-auto opacity-70">
            {showExpiry ? "Expiry date required" : "No expiry tracking"}
          </span>
        </div>
      )}

      {[
        { label: "Product Name *", key: "name", placeholder: "e.g. Basmati Rice 1kg" },
        { label: "SKU *", key: "sku", placeholder: "e.g. RICE-BAS-1KG" },
      ].map(f => (
        <div key={f.key}>
          <label className="block text-xs font-semibold text-slate-600 mb-1">{f.label}</label>
          <input className="border border-slate-200 p-2.5 w-full rounded-lg text-sm focus:ring-2 focus:ring-green-400 outline-none"
            placeholder={f.placeholder} value={product[f.key]}
            onChange={e => setProduct({ ...product, [f.key]: e.target.value })} />
        </div>
      ))}

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Category *</label>
        <input list="cat-options"
          className="border border-slate-200 p-2.5 w-full rounded-lg text-sm focus:ring-2 focus:ring-green-400 outline-none"
          placeholder="Select or type category" value={product.category}
          onChange={e => setProduct({ ...product, category: e.target.value })} />
        <datalist id="cat-options">
          {categories.map(c => <option key={c} value={c} />)}
        </datalist>
      </div>

      {/* IMAGE — URL paste OR file upload */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Product Image</label>
        <div className="flex gap-2 mb-2">
          <button type="button" onClick={() => setImageTab("url")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              imageTab === "url" ? "bg-green-600 text-white border-green-600" : "bg-white text-slate-500 border-slate-200"
            }`}>
            <Link size={12} /> Paste URL
          </button>
          <button type="button" onClick={() => setImageTab("upload")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              imageTab === "upload" ? "bg-green-600 text-white border-green-600" : "bg-white text-slate-500 border-slate-200"
            }`}>
            <ImagePlus size={12} /> Upload File
          </button>
        </div>

        {imageTab === "url" && (
          <div>
            <input
              className="border border-slate-200 p-2.5 w-full rounded-lg text-sm focus:ring-2 focus:ring-green-400 outline-none"
              placeholder="https://example.com/product.jpg"
              value={product.image_url || ""}
              onChange={e => setProduct({ ...product, image_url: e.target.value })} />
            <p className="text-xs text-slate-400 mt-1">
              💡 Right-click any image on Google → "Copy image address" → paste here
            </p>
          </div>
        )}

        {imageTab === "upload" && (
          <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center">
            <input type="file" accept="image/*" onChange={handleFileUpload}
              className="hidden" id="img-upload" />
            <label htmlFor="img-upload" className="cursor-pointer block">
              {uploading ? (
                <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600" />
                  Uploading...
                </div>
              ) : (
                <div>
                  <ImagePlus className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500 font-medium">Click to choose image</p>
                  <p className="text-xs text-slate-400 mt-1">JPG, PNG, WebP — max 5MB</p>
                </div>
              )}
            </label>
          </div>
        )}

        {product.image_url && (
          <div className="relative mt-2">
            <img src={product.image_url} alt="preview"
              className="w-full h-32 object-cover rounded-lg border border-slate-200"
              onError={e => { e.target.style.display = "none"; }} />
            <button type="button"
              onClick={() => setProduct({ ...product, image_url: "" })}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
              ✕
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Price (₹) *", key: "price", placeholder: "0.00" },
          { label: "Discount Price (₹)", key: "discount_price", placeholder: "optional" },
          { label: "Stock *", key: "stock", placeholder: "0" },
          { label: "Low Stock Alert at", key: "reorder_level", placeholder: "5" },
        ].map(f => (
          <div key={f.key}>
            <label className="block text-xs font-semibold text-slate-600 mb-1">{f.label}</label>
            <input type="number" min="0"
              className="border border-slate-200 p-2.5 w-full rounded-lg text-sm focus:ring-2 focus:ring-green-400 outline-none"
              placeholder={f.placeholder} value={product[f.key] ?? ""}
              onChange={e => setProduct({ ...product, [f.key]: e.target.value })} />
          </div>
        ))}
      </div>

      {/* ── EXPIRY DATE — only shown for General / Pharmacy stores ── */}
      {showExpiry && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <label className="block text-xs font-semibold text-amber-700 mb-1.5 flex items-center gap-1.5">
            ⏳ Expiry Date
            <span className="text-amber-500 font-normal">(required for this store type)</span>
          </label>
          <input type="date"
            className="border border-amber-300 bg-white p-2.5 w-full rounded-lg text-sm focus:ring-2 focus:ring-amber-400 outline-none"
            value={product.expiryDate ? product.expiryDate.substring(0, 10) : ""}
            onChange={e => setProduct({ ...product, expiryDate: e.target.value })} />
          {product.expiryDate && (
            <p className="text-xs text-amber-600 mt-1.5">
              {Math.ceil((new Date(product.expiryDate) - new Date()) / 86400000)} days until expiry
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
        <input type="checkbox" id="featured" checked={product.is_featured || false}
          onChange={e => setProduct({ ...product, is_featured: e.target.checked })}
          className="w-4 h-4 accent-yellow-500" />
        <label htmlFor="featured" className="text-sm font-medium text-yellow-700 flex items-center gap-1.5 cursor-pointer">
          <Star className="w-4 h-4" fill="currentColor" /> Mark as Featured Product
        </label>
      </div>

      <button onClick={onSubmit}
        className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold transition">
        <Save className="w-4 h-4" /> {submitLabel}
      </button>
    </div>
  );
}

export default Inventory;