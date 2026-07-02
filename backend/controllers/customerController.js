const Customer = require("../models/Customer");
const Transaction = require("../models/Transaction");

/* =========================
   GET CUSTOMER BY ID (DETAILS)
========================= */
exports.getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({ 
        success: false, 
        message: "Customer not found" 
      });
    }

    // Get transactions for this customer
    const transactions = await Transaction.find({ 
      customer_id: customer._id 
    }).sort({ created_at: -1 }).limit(10);

    // Calculate lifetime spent
    const lifetimeSpent = transactions.reduce(
      (sum, t) => sum + (t.total || 0), 
      0
    );

    res.json({
      success: true,
      data: {
        id: customer._id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email || '',
        points: customer.points || 0,
        loyalty_id: customer.loyalty_id,
        address: customer.address || '',
        gst_number: customer.gst_number || '',
        total_purchases: transactions.length,
        lifetime_spent: lifetimeSpent,
        recent_transactions: transactions.map(t => ({
          id: t._id,
          bill_no: t.bill_no,
          total: t.total,
          date: t.created_at
        })),
        created_at: customer.created_at,
        status: customer.status
      }
    });

  } catch (err) {
    console.error("GET CUSTOMER DETAILS ERROR:", err);
    if (err.name === 'CastError') {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid customer ID format" 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch customer details" 
    });
  }
};

/* =========================
   CHECK CUSTOMER BY PHONE
========================= */
exports.checkCustomerByPhone = async (req, res) => {
  try {
    const { phone } = req.query;

    if (!phone) {
      return res.json({ exists: false });
    }

    const customer = await Customer.findOne({ phone });

    if (!customer) {
      return res.json({ exists: false });
    }

    res.json({
      exists: true,
      customer: {
        id: customer._id,
        name: customer.name,
        phone: customer.phone,
        points: customer.points || 0,
        loyalty_id: customer.loyalty_id
      }
    });

  } catch (err) {
    console.error("CUSTOMER CHECK ERROR:", err);
    res.status(500).json({
      message: "Customer lookup failed"
    });
  }
};

/* =========================
   GET ALL CUSTOMERS (ACTIVE)
========================= */
exports.getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.find({ status: 'ACTIVE' }).sort({ created_at: -1 });

    const customersWithSpent = await Promise.all(
      customers.map(async (customer) => {
        const transactions = await Transaction.find({ 
          customer_id: customer._id 
        });
        
        const lifetimeSpent = transactions.reduce(
          (sum, t) => sum + (t.total || 0), 
          0
        );

        return {
          id: customer._id,
          name: customer.name,
          phone: customer.phone,
          points: customer.points || 0,
          loyalty_id: customer.loyalty_id,
          email: customer.email,
          lifetime_spent: lifetimeSpent
        };
      })
    );

    res.json(customersWithSpent);
  } catch (err) {
    console.error("CUSTOMER FETCH ERROR:", err);
    res.status(500).json({
      message: "Failed to load customers"
    });
  }
};

/* =========================
   ENROLL CUSTOMER
========================= */
exports.enrollCustomer = async (req, res) => {
  try {
    const { name, phone, email } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        message: "Name and phone are required"
      });
    }

    const existingCustomer = await Customer.findOne({ phone });
    if (existingCustomer) {
      return res.status(400).json({
        message: "Customer with this phone number already exists"
      });
    }

    const loyaltyId = "LOY" + Date.now();

    const customer = await Customer.create({
      loyalty_id: loyaltyId,
      name,
      phone,
      email: email || null,
      points: 0,
      total_spent: 0,
      status: 'ACTIVE'
    });

    res.json({
      success: true,
      id: customer._id,
      loyalty_id: loyaltyId
    });

  } catch (err) {
    console.error("CUSTOMER ENROLL ERROR:", err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({
      message: "Customer enrollment failed"
    });
  }
};

/* =========================
   DELETE CUSTOMER (SOFT DELETE)
========================= */
exports.deleteCustomer = async (req, res) => {
  try {
    const transactions = await Transaction.findOne({ 
      customer_id: req.params.id 
    });

    if (transactions) {
      return res.status(400).json({
        message: "Customer cannot be deleted (linked to transactions)"
      });
    }

    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { status: 'INACTIVE' },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json({ success: true });

  } catch (err) {
    console.error("DELETE CUSTOMER ERROR:", err);
    if (err.name === 'CastError') {
      return res.status(400).json({ message: "Invalid customer ID format" });
    }
    res.status(500).json({
      message: "Failed to delete customer"
    });
  }
};
