const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const verifyToken = require("../middleware/authMiddleware");
const allowRole = require("../middleware/roleMiddleware");
const { getRegisteredUsers } = require("../controllers/userController");
const axios = require("axios");
const User = require("../models/User");


router.get("/geocode", async (req, res) => {
    try {
      const { lat, lon } = req.query;
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
        { headers: { "User-Agent": "SmartStore/1.0" } }
      );
      res.json(response.data);
    } catch (err) {
      res.status(500).json({ error: "Geocode failed" });
    }
  });


// ==================== PROFILE ROUTES (any authenticated user) ====================
router.get("/profile", verifyToken, userController.getProfile);
router.put("/profile", verifyToken, userController.updateProfile);
router.put("/location", verifyToken, async (req, res, next) => {
  try {
    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return res.status(400).json({ message: "Valid latitude and longitude are required" });
    }
    const user = await User.findByIdAndUpdate(req.user.id, { location: { latitude, longitude, updatedAt: new Date() } }, { returnDocument: "after" }).select("location");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ success: true, location: user.location });
  } catch (error) { next(error); }
});

// ==================== ADMIN SELF-SERVICE STAFF ROUTES ====================
// Admin manages their own store's staff
router.get("/my-staff", verifyToken, allowRole(["admin"]), userController.getMyStaff);
router.post("/my-staff", verifyToken, allowRole(["admin"]), userController.createMyStaff);
router.put("/my-staff/:id", verifyToken, allowRole(["admin"]), userController.updateMyStaff);
router.delete("/my-staff/:id", verifyToken, allowRole(["admin"]), userController.deleteMyStaff);
router.post("/admin/:adminId/staff", verifyToken, allowRole(["super_admin"]), userController.createStaffForAdmin);

// ==================== GENERAL USER MANAGEMENT (super_admin only) ====================
// Static paths must be registered before /:id so Express does not treat
// "admins" or "registered-users" as a user id.
router.get("/admins", verifyToken, allowRole(["super_admin"]), userController.getStoreAdmins);
router.get("/admins/:id", verifyToken, allowRole(["super_admin"]), userController.getAdminById);
router.post("/admins", verifyToken, allowRole(["super_admin"]), userController.createAdmin);
router.put("/admins/:id", verifyToken, allowRole(["super_admin"]), userController.updateAdmin);
router.delete("/admins/:id", verifyToken, allowRole(["super_admin"]), userController.deleteAdmin);
router.get("/registered-users", verifyToken, allowRole(["super_admin"]), getRegisteredUsers);

router.get("/", verifyToken, allowRole(["super_admin"]), userController.getAllUsers);
router.post("/", verifyToken, allowRole(["super_admin"]), userController.createUser);
router.put("/:id", verifyToken, allowRole(["super_admin"]), userController.updateUser);
router.delete("/:id", verifyToken, allowRole(["super_admin"]), userController.deleteUser);

module.exports = router;
