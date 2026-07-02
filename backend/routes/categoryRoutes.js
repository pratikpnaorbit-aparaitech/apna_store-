const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const allowRole = require("../middleware/roleMiddleware");
const Category = require("../models/Category");

router.get("/", verifyToken, allowRole(["admin", "staff", "super_admin"]), async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    console.error("CATEGORY FETCH ERROR:", err);
    res.status(500).json({ message: "Failed to fetch categories" });
  }
});

module.exports = router;