/**
 * Determines expiry state & discount for a product
 * @param {Object} product
 */
export function getExpiryInfo(product) {
  // If backend already calculated status, trust it
  if (product.expiryStatus) {
    if (product.expiryStatus === "EXPIRED") {
      return {
        blocked: true,
        discountPercent: 0,
        label: "Expired"
      };
    }

    if (product.expiryStatus === "NEAR_EXPIRY") {
      return {
        blocked: false,
        discountPercent: product.discountPercent || 15,
        label: "Near Expiry"
      };
    }

    return {
      blocked: false,
      discountPercent: 0,
      label: "Safe"
    };
  }

  // Fallback: calculate from expiryDate
  if (!product.expiryDate) {
    return {
      blocked: false,
      discountPercent: 0,
      label: "Safe"
    };
  }

  const today = new Date();
  const expiry = new Date(product.expiryDate);
  const daysLeft = Math.ceil(
    (expiry - today) / (1000 * 60 * 60 * 24)
  );

  if (daysLeft < 0) {
    return { blocked: true, discountPercent: 0, label: "Expired" };
  }

  if (daysLeft <= 1) {
    return { blocked: false, discountPercent: 50, label: "Near Expiry" };
  }

  if (daysLeft <= 3) {
    return { blocked: false, discountPercent: 30, label: "Near Expiry" };
  }

  if (daysLeft <= 7) {
    return { blocked: false, discountPercent: 15, label: "Near Expiry" };
  }

  return {
    blocked: false,
    discountPercent: 0,
    label: "Safe"
  };
}
