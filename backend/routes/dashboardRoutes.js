const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const allowRole = require("../middleware/roleMiddleware");
const dashboardController = require("../controllers/dashboardController");

/* ==============================
   Dashboard Main Stats
   (ADMIN + STAFF)
============================== */
router.get(
  "/stats",
  verifyToken,
  allowRole(["admin", "staff", "super_admin"]),
  dashboardController.getStats
);

/* ==============================
   Weekly Revenue
   (ADMIN + STAFF)
============================== */
router.get(
  "/weekly-revenue",
  verifyToken,
  allowRole(["admin", "staff", "super_admin"]),
  dashboardController.getWeeklyRevenue
);

/* ==============================
   Payment Preference
   (ADMIN + STAFF)
============================== */
router.get(
  "/payment-chart",
  verifyToken,
  allowRole(["admin", "staff", "super_admin"]),
  dashboardController.getPaymentChart
);

/* ==============================
   Recent Transactions
   (ADMIN + STAFF)
============================== */
router.get(
  "/recent-transactions",
  verifyToken,
  allowRole(["admin", "staff", "super_admin"]),
  dashboardController.getRecentTransactions
);

/* ==============================
   LOW STOCK ALERTS
   (ADMIN + STAFF)
============================== */
router.get(
  "/low-stock",
  verifyToken,
  allowRole(["admin", "staff", "super_admin"]),
  dashboardController.getLowStock
);

module.exports = router;