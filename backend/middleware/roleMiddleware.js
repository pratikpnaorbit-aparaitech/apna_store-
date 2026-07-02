/**
 * Role-based access control middleware.
 * Must be used AFTER verifyToken.
 * @param {string[]} allowedRoles - Array of allowed roles (e.g., ['admin', 'staff'])
 */
module.exports = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - No user found (auth middleware missing?)"
      });
    }

    const userRole = String(req.user.role).toLowerCase();
    const allowed = allowedRoles.map(r => r.toLowerCase());

    if (!allowed.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden - You do not have permission"
      });
    }

    next();
  };
};