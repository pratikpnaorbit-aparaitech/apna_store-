const express = require("express");
const router = express.Router();
const vendorController = require("../controllers/vendorController");
const verifyToken = require("../middleware/authMiddleware");
const allowRole = require("../middleware/roleMiddleware");

router.get("/", verifyToken, allowRole(["admin", "super_admin"]), vendorController.getVendors);
router.post("/", verifyToken, allowRole(["admin", "super_admin"]), vendorController.addVendor);
router.put("/:id", verifyToken, allowRole(["admin", "super_admin"]), vendorController.updateVendor);
router.delete("/:id", verifyToken, allowRole(["admin", "super_admin"]), vendorController.deleteVendor);

module.exports = router;