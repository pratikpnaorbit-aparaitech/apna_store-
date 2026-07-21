const startOfTomorrow = (now = new Date()) => {
  const value = new Date(now);
  value.setHours(0, 0, 0, 0);
  value.setDate(value.getDate() + 1);
  return value;
};

const sellableExpiryFilter = (now = new Date()) => ({
  $or: [
    { expiry_date: null },
    { expiry_date: { $exists: false } },
    { expiry_date: { $gte: startOfTomorrow(now) } },
  ],
});

const isSellableByExpiry = (expiryDate, now = new Date()) => (
  !expiryDate || new Date(expiryDate).getTime() >= startOfTomorrow(now).getTime()
);

module.exports = { isSellableByExpiry, sellableExpiryFilter, startOfTomorrow };
