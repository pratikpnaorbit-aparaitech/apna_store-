const requireStoreContext = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized - No authenticated user",
    });
  }

  if (req.user.role === "super_admin" || req.user.storeId) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Forbidden - No store is assigned to this account",
  });
};

module.exports = requireStoreContext;
