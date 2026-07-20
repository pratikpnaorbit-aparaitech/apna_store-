const jwt = require("jsonwebtoken");
const User = require("../models/User");
const DeliveryPartner = require("../models/DeliveryPartner");

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized - No token provided"
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const role = String(decoded.role || "").toLowerCase();
    const account = role === "delivery_partner"
      ? await DeliveryPartner.findById(decoded.id).select("storeId isActive").lean()
      : await User.findById(decoded.id).select("storeId isActive role").lean();

    if (!account || !account.isActive) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Account is inactive or no longer exists"
      });
    }

    if (role !== "delivery_partner" && String(account.role).toLowerCase() !== role) {
      return res.status(403).json({
        success: false,
        message: "Forbidden - Account role changed. Please login again"
      });
    }

    req.user = {
      id: decoded.id,
      role,
      storeId: account.storeId || null,
    };

    next();
  } catch (err) {
    console.error("❌ TOKEN ERROR:", err.message);
    return res.status(403).json({
      success: false,
      message: "Forbidden - Invalid or expired token"
    });
  }
};

module.exports = verifyToken;
