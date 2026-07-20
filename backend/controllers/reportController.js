const Transaction = require("../models/Transaction");

exports.getTransactions = async (req, res) => {
  try {
    if (req.user.role !== "super_admin" && !req.user.storeId)
      return res.status(403).json({ success: false, message: "No store is assigned to this account" });
    const storeFilter = req.user.role === "super_admin" ? {} : { storeId: req.user.storeId };
    const transactions = await Transaction.aggregate([
      { $match: storeFilter },
      {
        $lookup: {
          from: "customers",
          localField: "customer_id",
          foreignField: "_id",
          as: "customer"
        }
      },
      {
        $unwind: { path: "$customer", preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          id: "$_id",
          bill_number: "$bill_no",
          customer_name: { $ifNull: ["$customer.name", "Walk-in"] },
          payment_mode: "$payment_mode",
          total: 1,
          audit_status: "$status",
          created_at: 1
        }
      },
      { $sort: { created_at: -1 } }
    ]);

    res.json(transactions);
  } catch (err) {
    console.error("REPORT FETCH ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to load reports" });
  }
};

exports.getStats = async (req, res) => {
  try {
    if (req.user.role !== "super_admin" && !req.user.storeId)
      return res.status(403).json({ success: false, message: "No store is assigned to this account" });
    const storeFilter = req.user.role === "super_admin" ? {} : { storeId: req.user.storeId };
    const stats = await Transaction.aggregate([
      { $match: storeFilter },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$total" }
        }
      },
      {
        $project: {
          _id: 0,
          totalOrders: 1,
          totalRevenue: 1
        }
      }
    ]);

    res.json(stats[0] || { totalOrders: 0, totalRevenue: 0 });
  } catch (err) {
    console.error("REPORT STATS ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to load stats" });
  }
};
