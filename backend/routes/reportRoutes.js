const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const allowRole = require("../middleware/roleMiddleware");
const reportController = require("../controllers/reportController");

router.get("/", verifyToken, allowRole(["admin", "super_admin"]), reportController.getTransactions);
router.get("/stats", verifyToken, allowRole(["admin", "super_admin"]), reportController.getStats);

module.exports = router;
