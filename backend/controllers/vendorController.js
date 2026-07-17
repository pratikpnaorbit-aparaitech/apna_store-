const Vendor = require("../models/Vendor");

const scopeFor = (req) => req.user.role === "super_admin" ? {} : { storeId: req.user.storeId };
const hasStore = (req) => req.user.role === "super_admin" || Boolean(req.user.storeId);

/* =========================
   GET ALL VENDORS
========================= */
exports.getVendors = async (req, res) => {
  try {
    if (!hasStore(req)) return res.status(403).json({ message: "No store is assigned to this account" });
    const vendors = await Vendor.find(scopeFor(req)).sort({ createdAt: -1 });

    // Convert MongoDB _id to id for frontend
    const vendorsList = vendors.map(v => ({
      id: v._id,                     // ✅ now frontend gets id
      company_name: v.company_name,
      category: v.category,
      contact_person: v.contact_person,
      phone: v.phone,
      email: v.email,
      account_manager: v.account_manager,
      payment_due: v.payment_due,
      status: v.status,
      address: v.address,
      createdBy: v.createdBy,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
      storeId: v.storeId,
    }));

    res.json(vendorsList);            // ✅ send array directly
  } catch (err) {
    console.error("FETCH VENDORS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch vendors" });
  }
};

/* =========================
   ADD VENDOR
========================= */
exports.addVendor = async (req, res) => {
  const {
    company_name,
    category,
    contact_person,
    phone,
    email,
    account_manager,
    payment_due,
    address
  } = req.body;

  if (!company_name || !phone) {
    return res.status(400).json({
      success: false,
      message: "Company name and phone are required"
    });
  }

  try {
    if (!hasStore(req)) return res.status(403).json({ success: false, message: "No store is assigned to this account" });
    // Create new vendor
    const vendor = await Vendor.create({
      company_name,
      category: category || null,
      contact_person: contact_person || null,
      phone,
      email: email || null,
      account_manager: account_manager || null,
      payment_due: payment_due || 0,
      address: address || null,
      createdBy: req.user?.id,
      storeId: req.user.role === "super_admin" ? (req.body.storeId || null) : req.user.storeId,
    });

    res.status(201).json({
      success: true,
      message: "Vendor added successfully",
      data: vendor
    });

  } catch (err) {
    console.error("ADD VENDOR ERROR:", err);
    
    // Handle duplicate key error (if email is unique)
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Vendor with this email already exists"
      });
    }

    res.status(500).json({ 
      success: false,
      message: "Failed to add vendor",
      error: err.message 
    });
  }
};

/* =========================
   UPDATE VENDOR
========================= */
exports.updateVendor = async (req, res) => {
  const { id } = req.params;
  const { storeId: _ignoredStoreId, createdBy: _ignoredCreatedBy, ...updateData } = req.body;

  try {
    if (!hasStore(req)) return res.status(403).json({ success: false, message: "No store is assigned to this account" });
    // Find vendor by ID and update
    const vendor = await Vendor.findOneAndUpdate(
      { _id: id, ...scopeFor(req) },
      updateData,
      { 
        returnDocument: "after", // Return the updated document
        runValidators: true // Run validation on update
      }
    );

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found"
      });
    }

    res.json({
      success: true,
      message: "Vendor updated successfully",
      data: vendor
    });

  } catch (err) {
    console.error("UPDATE VENDOR ERROR:", err);
    
    // Handle invalid ID format
    if (err.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor ID format"
      });
    }

    res.status(500).json({ 
      success: false,
      message: "Failed to update vendor",
      error: err.message 
    });
  }
};

/* =========================
   DELETE VENDOR
========================= */
exports.deleteVendor = async (req, res) => {
  const { id } = req.params;

  try {
    if (!hasStore(req)) return res.status(403).json({ success: false, message: "No store is assigned to this account" });
    const vendor = await Vendor.findOneAndDelete({ _id: id, ...scopeFor(req) });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found"
      });
    }

    res.json({
      success: true,
      message: "Vendor deleted successfully"
    });

  } catch (err) {
    console.error("DELETE VENDOR ERROR:", err);
    
    // Handle invalid ID format
    if (err.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor ID format"
      });
    }

    res.status(500).json({ 
      success: false,
      message: "Failed to delete vendor",
      error: err.message 
    });
  }
};
