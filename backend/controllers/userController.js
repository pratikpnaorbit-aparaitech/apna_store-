const User = require("../models/User");
const Store = require("../models/Store");
const bcrypt = require("bcryptjs");

// @desc    Get all users (super_admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
};

// @desc    Create new user (super_admin only)
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, permissions } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ success: false, message: "User already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = await User.create({ name, email, password: hashedPassword, role: role || 'staff', permissions: permissions || [], createdBy: req.user.id, isActive: true });

    res.status(201).json({ success: true, message: "User created successfully", data: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to create user" });
  }
};

// @desc    Update user (super_admin only)
exports.updateUser = async (req, res) => {
  try {
    const { name, email, role, isActive, permissions } = req.body;
    const { id } = req.params;
    const targetUser = await User.findById(id);
    if (targetUser?.role === 'super_admin' && req.user.role !== 'super_admin')
      return res.status(403).json({ success: false, message: "Cannot modify super admin" });

    const user = await User.findByIdAndUpdate(id, { name, email, role, isActive, permissions }, { new: true, runValidators: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, message: "User updated successfully", data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update user" });
  }
};

// @desc    Delete user (super_admin only)
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (user?.role === 'super_admin') return res.status(403).json({ success: false, message: "Cannot delete super admin" });
    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete user" });
  }
};

// @desc    Get current user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch profile" });
  }
};

// @desc    Update own profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findByIdAndUpdate(req.user.id, { name, email }, { new: true, runValidators: true }).select('-password');
    res.json({ success: true, message: "Profile updated successfully", data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update profile" });
  }
};

// ==================== ADMIN SELF-SERVICE STAFF ====================

// @desc    Admin gets their own staff list
// @route   GET /api/users/my-staff
exports.getMyStaff = async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    if (!admin.storeId) {
      return res.json({ success: true, count: 0, data: [], noStore: true });
    }
    const staff = await User.find({ storeId: admin.storeId, role: "staff" }).select("-password").sort({ createdAt: -1 });
    res.json({ success: true, count: staff.length, data: staff });
  } catch (err) {
    console.error("GET MY STAFF ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to fetch staff" });
  }
};

// @desc    Admin creates staff under their store
// @route   POST /api/users/my-staff
exports.createMyStaff = async (req, res) => {
  try {
    const { name, email, password, mobile } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: "Name, email and password are required" });

    const admin = await User.findById(req.user.id);
    if (!admin.storeId)
      return res.status(400).json({ success: false, message: "No store assigned to your account. Contact super admin." });

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ success: false, message: "A user with this email already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const staff = await User.create({
      name, email,
      mobile: mobile || undefined,
      password: hashedPassword,
      role: "staff",
      storeId: admin.storeId,  // ✅ linked to admin's store
      createdBy: req.user.id,  // ✅ track creator
      isActive: true,
      permissions: []
    });

    res.status(201).json({
      success: true,
      message: "Staff member created successfully",
      data: { id: staff._id, name: staff.name, email: staff.email, role: staff.role }
    });
  } catch (err) {
    console.error("CREATE MY STAFF ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to create staff member" });
  }
};

// @desc    Admin updates their staff member
// @route   PUT /api/users/my-staff/:id
exports.updateMyStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, isActive } = req.body;
    const admin = await User.findById(req.user.id);

    const staffMember = await User.findOne({ _id: id, role: "staff", storeId: admin.storeId });
    if (!staffMember) return res.status(404).json({ success: false, message: "Staff not found in your store" });

    const updated = await User.findByIdAndUpdate(id, { name, email, isActive }, { new: true }).select("-password");
    res.json({ success: true, message: "Staff updated", data: updated });
  } catch (err) {
    console.error("UPDATE MY STAFF ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to update staff" });
  }
};

// @desc    Admin deletes their staff member
// @route   DELETE /api/users/my-staff/:id
exports.deleteMyStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await User.findById(req.user.id);

    const staffMember = await User.findOne({ _id: id, role: "staff", storeId: admin.storeId });
    if (!staffMember) return res.status(404).json({ success: false, message: "Staff not found in your store" });

    await User.findByIdAndDelete(id);
    res.json({ success: true, message: "Staff member removed successfully" });
  } catch (err) {
    console.error("DELETE MY STAFF ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to delete staff member" });
  }
};

// ==================== ADMIN-SPECIFIC (super_admin only) ====================

exports.getStoreAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" }).select("-password").populate("storeId", "name address phone email isActive").sort({ createdAt: -1 });
    res.json({ success: true, count: admins.length, data: admins });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch store admins" });
  }
};

exports.getAdminById = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await User.findOne({ _id: id, role: "admin" }).select("-password").populate("storeId");
    if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });

    const staff = admin.storeId
      ? await User.find({ storeId: admin.storeId._id, role: "staff" }).select("-password").sort({ createdAt: -1 })
      : [];

    res.json({ success: true, data: { admin, store: admin.storeId || null, staff } });
  } catch (err) {
    console.error("GET ADMIN BY ID ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to fetch admin details" });
  }
};

exports.createAdmin = async (req, res) => {
  try {
    const { name, email, password, permissions } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ success: false, message: "User with this email already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const admin = await User.create({ name, email, password: hashedPassword, role: "admin", permissions: permissions || [], createdBy: req.user.id, isActive: true });

    res.status(201).json({ success: true, message: "Admin created successfully", data: { id: admin._id, name: admin.name, email: admin.email, role: admin.role } });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to create admin" });
  }
};

exports.updateAdmin = async (req, res) => {
  try {
    const { name, email, isActive, permissions } = req.body;
    const { id } = req.params;
    const targetAdmin = await User.findOne({ _id: id, role: "admin" });
    if (!targetAdmin) return res.status(404).json({ success: false, message: "Admin not found" });

    const updatedAdmin = await User.findByIdAndUpdate(id, { name, email, isActive, permissions }, { new: true, runValidators: true }).select("-password");
    res.json({ success: true, message: "Admin updated successfully", data: updatedAdmin });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update admin" });
  }
};

exports.deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await User.findOne({ _id: id, role: "admin" });
    if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });
    await User.findByIdAndDelete(id);
    res.json({ success: true, message: "Admin deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete admin" });
  }
};

exports.getRegisteredUsers = async (req, res) => {
  try {

    const users = await User.find({
      role: "user",
      storeId: null,
      isActive: true
    })
    .select("-password")
    .sort({ createdAt: -1 });

    res.json(users);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};