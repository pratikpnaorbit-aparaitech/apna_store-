const router = require("express").Router();
const verifyToken = require("../middleware/authMiddleware");
const allowRole = require("../middleware/roleMiddleware");
const { sendOfferToLoyalCustomers } = require("../controllers/offerController");

router.post("/send-offer", verifyToken, allowRole(["admin", "super_admin"]), sendOfferToLoyalCustomers);

module.exports = router;
