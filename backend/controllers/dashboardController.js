const Product = require("../models/Product");
const Transaction = require("../models/Transaction");
const Order = require("../models/Order");

/* ==============================
   Dashboard Main Stats
============================== */
exports.getStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const storeId = req.user.storeId;

    const [
      totalProducts,
      totalStock,
      totalRevenue,
      todaySales,
      todayRevenue,
      totalOrders,
      todayOrders
    ] = await Promise.all([
      // Total products count
      Product.countDocuments({ is_active: 1, ...(storeId ? { storeId } : {}) }),

      // Total stock sum
      Product.aggregate([
        { $match: { is_active: 1, ...(storeId ? { storeId } : {}) } },
        { $group: { _id: null, total: { $sum: "$stock" } } }
      ]).then(result => result[0]?.total || 0),

      // Total revenue from successful transactions
      Transaction.aggregate([
        { $match: { status: "SUCCESS" } },
        { $group: { _id: null, total: { $sum: "$total" } } }
      ]).then(result => result[0]?.total || 0),

      // Today's sales count
      Transaction.countDocuments({
        status: "SUCCESS",
        created_at: { $gte: today, $lt: tomorrow }
      }),

      // Today's revenue
      Transaction.aggregate([
        {
          $match: {
            status: "SUCCESS",
            created_at: { $gte: today, $lt: tomorrow }
          }
        },
        { $group: { _id: null, total: { $sum: "$total" } } }
      ]).then(result => result[0]?.total || 0),

      // Total online orders for this store
      Order.countDocuments({ ...(storeId ? { storeId } : {}) }),

      // Today's online orders
      Order.countDocuments({
        ...(storeId ? { storeId } : {}),
        createdAt: { $gte: today, $lt: tomorrow }
      })
    ]);

    const stats = {
      totalProducts,
      totalStock,
      totalRevenue,
      todaySales,
      todayRevenue,
      totalOrders,
      todayOrders
    };

    res.json({ success: true, stats });
  } catch (err) {
    console.error("DASHBOARD STATS ERROR:", err);
    res.status(500).json({ message: "Failed to load dashboard stats" });
  }
};

/* ==============================
   Weekly Revenue
============================== */
exports.getWeeklyRevenue = async (req, res) => {
  try {
    const sixDaysAgo = new Date();
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
    sixDaysAgo.setHours(0, 0, 0, 0);

    const weeklyRevenue = await Transaction.aggregate([
      {
        $match: {
          status: "SUCCESS",
          created_at: { $gte: sixDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            day: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } }
          },
          revenue: { $sum: "$total" }
        }
      },
      {
        $project: {
          _id: 0,
          day: "$_id.day",
          revenue: 1
        }
      },
      { $sort: { day: 1 } }
    ]);

    res.json(weeklyRevenue);
  } catch (err) {
    console.error("WEEKLY REVENUE ERROR:", err);
    res.status(500).json({ message: "Failed to load weekly revenue" });
  }
};

/* ==============================
   Payment Preference Chart
============================== */
exports.getPaymentChart = async (req, res) => {
  try {
    const paymentChart = await Transaction.aggregate([
      {
        $group: {
          _id: "$payment_mode",
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          payment_mode: "$_id",
          count: 1
        }
      }
    ]);

    res.json(paymentChart);
  } catch (err) {
    console.error("PAYMENT CHART ERROR:", err);
    res.status(500).json({ message: "Failed to load payment chart" });
  }
};

/* ==============================
   Recent Transactions
============================== */
exports.getRecentTransactions = async (req, res) => {
  try {
    const recentTransactions = await Transaction.find()
      .select("bill_no total payment_mode created_at")
      .sort({ created_at: -1 })
      .limit(5);

    res.json(recentTransactions);
  } catch (err) {
    console.error("RECENT TX ERROR:", err);
    res.status(500).json({ message: "Failed to load recent transactions" });
  }
};

/* ==============================
   LOW STOCK ALERTS
============================== */
exports.getLowStock = async (req, res) => {
  try {
    const storeId = req.user.storeId;
    const lowStockItems = await Product.find({
      is_active: 1,
      stock: { $lte: 5 },
      ...(storeId ? { storeId } : {})
    })
      .select("id name sku stock")
      .sort({ stock: 1 });

    res.json({
      count: lowStockItems.length,
      items: lowStockItems
    });
  } catch (err) {
    console.error("LOW STOCK ERROR:", err);
    res.status(500).json({ message: "Failed to fetch low stock" });
  }
};