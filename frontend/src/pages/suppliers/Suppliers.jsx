import { useEffect, useState, useMemo } from "react";
import { API } from "../../services/api";

function Suppliers() {
  const [vendors, setVendors] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal control
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);

  const emptyForm = {
    company_name: "",
    category: "",
    contact_person: "",
    phone: "",
    email: "",
    account_manager: "",
    payment_due: "",
    address: ""
  };

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    try {
      const res = await API.get("/vendors");
      setVendors(res.data || []);
    } catch (err) {
      console.error("Failed to load vendors:", err);
      alert("Failed to load vendors");
    }
  };

  // Search filter
  const filteredVendors = useMemo(() => {
    return vendors.filter(v =>
      v.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.phone.includes(searchTerm)
    );
  }, [vendors, searchTerm]);

  /* ======================
     ADD / UPDATE
  ====================== */
  const handleSubmit = async () => {
    try {
      if (editingVendor) {
        await API.put(`/vendors/${editingVendor.id}`, form);
        alert("Vendor updated successfully ✏️");
      } else {
        await API.post("/vendors", form);
        alert("Vendor added successfully ✅");
      }

      setShowModal(false);
      setEditingVendor(null);
      setForm(emptyForm);
      loadVendors();
    } catch {
      alert("Operation failed ❌");
    }
  };

  /* ======================
     EDIT
  ====================== */
  const handleEdit = (vendor) => {
    setEditingVendor(vendor);
    setForm(vendor);
    setShowModal(true);
  };

  /* ======================
     DELETE
  ====================== */
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete vendor "${name}"?`)) return;

    try {
      await API.delete(`/vendors/${id}`);
      alert("Vendor deleted 🗑️");
      loadVendors();
    } catch {
      alert("Cannot delete vendor (linked data)");
    }
  };

  return (
    <div className="p-8">

      {/* Header */}
      <h1 className="text-4xl font-extrabold mb-2">Suppliers</h1>
      <p className="text-gray-500 mb-8">
        Manage vendors, payments and supply chain
      </p>

      {/* Search + Add */}
      <div className="flex flex-col md:flex-row gap-4 mb-10">
        <input
          placeholder="Search vendors..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="border rounded-2xl px-6 py-4 w-full focus:ring-2 focus:ring-green-500"
        />

        <button
          onClick={() => {
            setEditingVendor(null);
            setForm(emptyForm);
            setShowModal(true);
          }}
          className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold"
        >
          + Add Vendor
        </button>
      </div>

      {/* Vendor Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filteredVendors.map(v => (
          <div key={v.id} className="bg-white p-7 rounded-3xl shadow-lg border">

            <div className="flex justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold">{v.company_name}</h3>
                <p className="text-sm text-gray-500">{v.category}</p>
              </div>

              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                ACTIVE
              </span>
            </div>

            <div className="text-sm space-y-1 text-gray-600">
              <p><b>Contact:</b> {v.contact_person}</p>
              <p><b>Phone:</b> {v.phone}</p>
              <p><b>Email:</b> {v.email}</p>
              <p><b>Manager:</b> {v.account_manager}</p>
              <p><b>Address:</b> {v.address}</p>
            </div>

            <div className="flex justify-between items-center mt-6 border-t pt-4">
              <span className={`font-bold text-lg ${v.payment_due > 0 ? "text-red-600" : "text-green-600"}`}>
                ₹{v.payment_due}
              </span>

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(v)}
                  className="px-4 py-2 bg-blue-100 text-blue-600 rounded-xl font-semibold"
                >
                  Edit
                </button>

                <button
                  onClick={() => handleDelete(v.id, v.company_name)}
                  className="px-4 py-2 bg-red-100 text-red-600 rounded-xl font-semibold"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {showModal && (
        <Modal
          title={editingVendor ? "Edit Vendor" : "Add Vendor"}
          form={form}
          setForm={setForm}
          onClose={() => {
            setShowModal(false);
            setEditingVendor(null);
          }}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

export default Suppliers;

/* ======================
   MODAL COMPONENT
====================== */
function Modal({ title, form, setForm, onClose, onSubmit }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50">
      <div className="bg-white rounded-3xl w-full max-w-2xl p-8">

        <h2 className="text-2xl font-bold mb-6">{title}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {Object.keys(form).map(key => (
            <Input
              key={key}
              label={key.replace("_", " ").toUpperCase()}
              value={form[key]}
              onChange={e => setForm({ ...form, [key]: e.target.value })}
            />
          ))}
        </div>

        <div className="flex justify-end gap-4 mt-8">
          <button onClick={onClose} className="px-6 py-2 border rounded-xl">
            Cancel
          </button>

          <button
            onClick={onSubmit}
            className="px-8 py-2 bg-green-600 text-white rounded-xl font-bold"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ======================
   INPUT
====================== */
function Input({ label, value, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-semibold text-gray-600">{label}</label>
      <input
        value={value}
        onChange={onChange}
        className="border rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
      />
    </div>
  );
}
