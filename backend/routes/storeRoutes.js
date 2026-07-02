const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const allowRole = require("../middleware/roleMiddleware");
const Store = require("../models/Store");
const User = require("../models/User");

// Pull helpers from the model file (no separate util file needed)
const { detectStoreType, STORE_TYPES } = Store;

// @desc  Get all active stores (PUBLIC - no auth required)
// @route GET /api/stores/public
router.get("/public", async (req, res) => {
  try {
    const stores = await Store.find({ isActive: true })
      .select("name categories storeType address phone isActive")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: stores });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch stores" });
  }
});

// @desc  Create a store and link it to an admin
// @route POST /api/stores
router.post("/", verifyToken, allowRole(["super_admin"]), async (req, res) => {
  try {
    const { name, categories, address, phone, email, adminId, storeType } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "Store name is required" });
    }
    if (!adminId || !mongoose.isValidObjectId(adminId)) {
      return res.status(400).json({ success: false, message: "A valid admin is required" });
    }
    if (categories !== undefined && !Array.isArray(categories)) {
      return res.status(400).json({ success: false, message: "Categories must be an array" });
    }
    if (storeType !== undefined && storeType !== null && !STORE_TYPES.includes(storeType)) {
      return res.status(400).json({ success: false, message: "Invalid store type" });
    }

    const admin = await User.findOne({ _id: adminId, role: "admin" });
    if (!admin)
      return res.status(404).json({ success: false, message: "Admin not found" });

    const assignedStore = await Store.findOne({ admin: adminId }).select("_id");
    if (admin.storeId || assignedStore) {
      return res.status(409).json({ success: false, message: "Admin is already assigned to a store" });
    }

    // Prefer explicit storeType; fall back to auto-detect from categories
    const resolvedStoreType = storeType || detectStoreType(categories);

    const store = await Store.create({
      name: name.trim(),
      categories: categories || [],
      storeType: resolvedStoreType,
      address,
      phone,
      email,
      admin: adminId,
      createdBy: req.user.id,
    });

    await User.findByIdAndUpdate(adminId, { storeId: store._id });
    res.status(201).json({ success: true, message: "Store created", data: store, store });
  } catch (err) {
    console.error("CREATE STORE ERROR:", err);
    if (err.name === "ValidationError") {
      const message = Object.values(err.errors).map((error) => error.message).join(", ");
      return res.status(400).json({ success: false, message });
    }
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === "development" ? err.message : "Failed to create store",
    });
  }
});

// @desc  Get all stores
// @route GET /api/stores
router.get("/", verifyToken, allowRole(["super_admin"]), async (req, res) => {
  try {
    const stores = await Store.find()
      .populate("admin", "name email")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });
    res.json({ success: true, count: stores.length, data: stores });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch stores" });
  }
});

// @desc  Get current admin's own store (admin only)
//        Now includes storeType so the frontend can decide expiry visibility
// @route GET /api/stores/my-store
router.get("/my-store", verifyToken, allowRole(["admin"]), async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("storeId");
    if (!user?.storeId) return res.json({ success: true, data: null });

    const store = await Store.findById(user.storeId).select("name categories storeType");
    res.json({ success: true, data: store });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch store" });
  }
});

// @desc  Get available store types (for dropdowns in frontend)
// @route GET /api/stores/types
router.get("/types", (req, res) => {
  res.json({ success: true, data: STORE_TYPES });
});

// @desc  Get single store with staff
// @route GET /api/stores/:id
router.get("/:id", verifyToken, allowRole(["super_admin"]), async (req, res) => {
  try {
    const store = await Store.findById(req.params.id)
      .populate("admin", "name email mobile")
      .populate("createdBy", "name");
    if (!store)
      return res.status(404).json({ success: false, message: "Store not found" });

    const staff = await User.find({ storeId: store._id, role: "staff" })
      .select("-password")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: { store, staff } });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch store" });
  }
});

// @desc  Update store (including changing admin or storeType)
// @route PUT /api/stores/:id
router.put("/:id", verifyToken, allowRole(["super_admin"]), async (req, res) => {
  try {
    const { adminId, storeType, categories, ...rest } = req.body;

    const currentStore = await Store.findById(req.params.id);
    if (!currentStore)
      return res.status(404).json({ success: false, message: "Store not found" });

    // Handle admin change
    if (adminId && adminId !== String(currentStore.admin)) {
      const newAdmin = await User.findOne({ _id: adminId, role: "admin" });
      if (!newAdmin)
        return res.status(404).json({ success: false, message: "New admin not found" });

      if (currentStore.admin) {
        await User.findByIdAndUpdate(currentStore.admin, { $unset: { storeId: "" } });
      }
      await User.findByIdAndUpdate(adminId, { storeId: currentStore._id });
      rest.admin = adminId;
    }

    // Prefer explicit storeType; if categories changed and storeType not set, re-detect
    const resolvedStoreType =
      storeType || detectStoreType(categories || currentStore.categories);

    const store = await Store.findByIdAndUpdate(
      req.params.id,
      { ...rest, categories, storeType: resolvedStoreType },
      { new: true, runValidators: true }
    ).populate("admin", "name email");

    res.json({ success: true, message: "Store updated", data: store });
  } catch (err) {
    console.error("UPDATE STORE ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to update store" });
  }
});

// @desc  Delete store permanently
// @route DELETE /api/stores/:id
router.delete("/:id", verifyToken, allowRole(["super_admin"]), async (req, res) => {
  try {
    const store = await Store.findById(req.params.id);
    if (!store)
      return res.status(404).json({ success: false, message: "Store not found" });

    if (store.admin) {
      await User.findByIdAndUpdate(store.admin, { $unset: { storeId: "" } });
    }
    await User.updateMany({ storeId: store._id }, { $unset: { storeId: "" } });
    await Store.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: "Store deleted successfully" });
  } catch (err) {
    console.error("DELETE STORE ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to delete store" });
  }
});

module.exports = router;
