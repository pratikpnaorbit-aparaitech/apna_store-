const Vendor = require("../models/Vendor");
const { text, email, phone, money } = require("../utils/managementInput");

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
  try {
    if (!hasStore(req)) return res.status(403).json({ success: false, message: "No store is assigned to this account" });
    if (req.user.role === "super_admin" && req.body.storeId) return res.status(400).json({ success: false, message: "Choose a store through its assigned admin; global vendors are not supported." });
    // Create new vendor
    const vendor = await Vendor.create({
      company_name: text(req.body.company_name, "Company name", { required: true }),
      category: text(req.body.category, "Category") || null,
      contact_person: text(req.body.contact_person, "Contact person") || null,
      phone: phone(req.body.phone, { required: true }),
      email: email(req.body.email) || null,
      account_manager: text(req.body.account_manager, "Account manager") || null,
      payment_due: req.body.payment_due === undefined ? 0 : money(req.body.payment_due, "Payment due"),
      address: text(req.body.address, "Address", { max: 500 }) || null,
      createdBy: req.user?.id,
      storeId: req.user.storeId,
    });

    res.status(201).json({
      success: true,
      message: "Vendor added successfully",
      data: vendor
    });

  } catch (err) {
    if (err.status || err.name === "ValidationError") return res.status(err.status || 400).json({ success: false, message: err.message });
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
  try {
    if (!hasStore(req)) return res.status(403).json({ success: false, message: "No store is assigned to this account" });
    const updateData = {};
    if (req.body.company_name !== undefined) updateData.company_name = text(req.body.company_name, "Company name", { required: true });
    if (req.body.category !== undefined) updateData.category = text(req.body.category, "Category") || null;
    if (req.body.contact_person !== undefined) updateData.contact_person = text(req.body.contact_person, "Contact person") || null;
    if (req.body.phone !== undefined) updateData.phone = phone(req.body.phone, { required: true });
    if (req.body.email !== undefined) updateData.email = email(req.body.email) || null;
    if (req.body.account_manager !== undefined) updateData.account_manager = text(req.body.account_manager, "Account manager") || null;
    if (req.body.payment_due !== undefined) updateData.payment_due = money(req.body.payment_due, "Payment due");
    if (req.body.address !== undefined) updateData.address = text(req.body.address, "Address", { max: 500 }) || null;
    if (req.body.status !== undefined && !["ACTIVE", "INACTIVE"].includes(req.body.status)) return res.status(400).json({ success: false, message: "Invalid vendor status" });
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (!Object.keys(updateData).length) return res.status(400).json({ success: false, message: "No supported fields supplied" });
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
    if (err.status || err.name === "ValidationError") return res.status(err.status || 400).json({ success: false, message: err.message });
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
