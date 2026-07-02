const jwt = require("jsonwebtoken");

/**
 * Protected route middleware – verifies token and optionally checks role.
 * @param {string[]} roles - Allowed roles (empty array = no role check)
 */
const protectedRoute = (roles = []) => {
  return (req, res, next) => {
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

      // Role check (if roles specified)
      if (roles.length > 0) {
        const userRole = String(decoded.role).toLowerCase();
        const allowed = roles.map(r => r.toLowerCase());
        if (!allowed.includes(userRole)) {
          return res.status(403).json({
            success: false,
            message: "Forbidden - Insufficient permissions"
          });
        }
      }

      req.user = {
        id: decoded.id,
        role: decoded.role
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
};

module.exports = protectedRoute;