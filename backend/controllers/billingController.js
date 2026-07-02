const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Transaction = require("../models/Transaction");
const TransactionItem = require("../models/TransactionItem");
const LoyaltyHistory = require("../models/LoyaltyHistory");
const mongoose = require('mongoose');
const { sendWhatsApp } = require("../utils/notificationService");

exports.createBill = async (req, res) => {
  const {
    paymentMode,
    items,
    phone,
    joinLoyalty,
    newCustomer,
    cashReceived
  } = req.body;

  /* ======================
     BASIC VALIDATION
  ====================== */
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Cart is empty" });
  }

  // Start MongoDB session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let customerId = null;
    let loyaltyId = null;
    let customerName = null;
    let customerPoints = 0;
    let customerPhone = phone || null;
    let isNewLoyaltyCustomer = false;

    /* ======================
       1️⃣ FIND EXISTING CUSTOMER
    ====================== */
    if (phone) {
      const existing = await Customer.findOne({ phone }).session(session);

      if (existing) {
        customerId = existing._id;
        loyaltyId = existing.loyalty_id;
        customerName = existing.name;
        customerPoints = existing.points || 0;
      }
    }

    /* ======================
       2️⃣ CREATE CUSTOMER IF JOINING
    ====================== */
    if (!customerId && joinLoyalty && newCustomer?.name && phone) {
      loyaltyId = "LOY" + Date.now();

      const customer = await Customer.create([{
        loyalty_id: loyaltyId,
        name: newCustomer.name,
        phone: phone,
        email: newCustomer.email || null,
        points: 0,
        total_spent: 0,
        status: 'ACTIVE'
      }], { session });

      customerId = customer[0]._id;
      customerName = newCustomer.name;
      customerPoints = 0;
      isNewLoyaltyCustomer = true;
    }

    /* ======================
       3️⃣ VALIDATE ITEMS + EXPIRY DISCOUNT
    ====================== */
    let subtotal = 0;
    const billItems = [];

    for (const i of items) {
      if (!i.productId || !i.qty || i.qty <= 0) {
        throw new Error("Invalid cart data");
      }

      // Find product with stock lock (using session)
      const product = await Product.findOne({ 
        _id: i.productId,
        is_active: 1 
      }).session(session);

      if (!product) throw new Error("Product not found");
      
      // Check stock
      if (product.stock < i.qty) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }

      // Calculate expiry days
      let daysLeft = 999;
      if (product.expiry_date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiryDate = new Date(product.expiry_date);
        expiryDate.setHours(0, 0, 0, 0);
        
        daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
      }

      let discountPercent = 0;

      if (daysLeft < 0) {
        throw new Error(`${product.name} is expired`);
      } else if (daysLeft === 0) {
        throw new Error(`${product.name} expires today`);
      } else if (daysLeft <= 1) {
        discountPercent = 50;
      } else if (daysLeft <= 3) {
        discountPercent = 30;
      } else if (daysLeft <= 7) {
        discountPercent = 15;
      }

      const mrp = Number(product.price);
      let finalPrice = mrp;

      if (discountPercent > 0) {
        finalPrice = mrp * (1 - discountPercent / 100);
      }

      finalPrice = Number(finalPrice.toFixed(2));
      const lineTotal = Number((finalPrice * i.qty).toFixed(2));

      subtotal += lineTotal;

      billItems.push({
        name: product.name,
        qty: i.qty,
        mrp,
        discountPercent,
        total: lineTotal,
        productId: product._id
      });

      i._validatedPrice = finalPrice;
      i._lineTotal = lineTotal;
    }

    subtotal = Number(subtotal.toFixed(2));
    const gst = Number((subtotal * 0.18).toFixed(2));
    const total = Number((subtotal + gst).toFixed(2));

    /* ======================
       4️⃣ CREATE TRANSACTION
    ====================== */
    const billNo = "SS-" + Date.now();

    const [transaction] = await Transaction.create([{
      bill_no: billNo,
      customer_id: customerId,
      subtotal: subtotal,
      gst: gst,
      total: total,
      payment_mode: paymentMode,
      payment_provider: 'POS',
      status: 'SUCCESS'
    }], { session });

    const transactionId = transaction._id;

    /* ======================
       5️⃣ INSERT ITEMS + UPDATE STOCK
    ====================== */
    for (const i of items) {
      // Create transaction item
      await TransactionItem.create([{
        transaction_id: transactionId,
        product_id: i.productId,
        price: i._validatedPrice,
        quantity: i.qty,
        total: i._lineTotal
      }], { session });

      // Update product stock
      await Product.updateOne(
        { _id: i.productId },
        { $inc: { stock: -i.qty } }
      ).session(session);
    }

    /* ======================
       6️⃣ LOYALTY POINTS
    ====================== */
    let pointsAdded = 0;

    if (customerId) {
      pointsAdded = Math.floor(total / 100);

      // Update customer points and total spent
      await Customer.updateOne(
        { _id: customerId },
        { 
          $inc: { 
            points: pointsAdded,
            total_spent: total 
          } 
        }
      ).session(session);

      // Create loyalty history
      await LoyaltyHistory.create([{
        customer_id: customerId,
        transaction_id: transactionId,
        points: pointsAdded,
        type: 'EARNED'
      }], { session });

      customerPoints += pointsAdded;
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    /* ======================
       7️⃣ WHATSAPP RECEIPT WITH PAYMENT DETAILS
    ====================== */
    if (customerPhone) {
      const billDate = new Date().toLocaleString("en-IN");

      let paymentText = "";

      if (paymentMode === "CASH") {
        const change = Number(cashReceived) - total;
        paymentText = `
Payment Mode: CASH
Cash Given: ₹${cashReceived}
Bill Amount: ₹${total}
Change Returned: ₹${change.toFixed(2)}
`;
      } else if (paymentMode === "UPI") {
        paymentText = `
Payment Mode: UPI
Paid via UPI
Amount: ₹${total}
`;
      } else if (paymentMode === "CARD") {
        paymentText = `
Payment Mode: CARD
Paid via Credit/Debit Card
Amount: ₹${total}
`;
      } else if (paymentMode === "WALLET") {
        paymentText = `
Payment Mode: WALLET
Paid via Wallet
Amount: ₹${total}
`;
      }

      const itemText = billItems
        .map(
          (i, idx) =>
            `${idx + 1}. ${i.name}
Qty: ${i.qty} | MRP: ₹${i.mrp}
${i.discountPercent ? `Discount: ${i.discountPercent}%` : "No Discount"}
Amount: ₹${i.total}`
        )
        .join("\n\n");

      const whatsappMsg = `
🧾 SmartStore Receipt

Bill No: ${billNo}
Date: ${billDate}

${paymentText}
------------------------
${itemText}
------------------------

Subtotal: ₹${subtotal}
GST (18%): ₹${gst}
TOTAL: ₹${total}

Thank you for shopping with us 🧡
Visit Again!
`;

      sendWhatsApp(`+91${customerPhone}`, whatsappMsg).catch(() => {});
    }

    /* ======================
       8️⃣ RESPONSE
    ====================== */
    res.json({
      success: true,
      billNo,
      total,
      pointsAdded
    });

  } catch (err) {
    // Rollback transaction on error
    await session.abortTransaction();
    session.endSession();
    
    console.error("CREATE BILL ERROR:", err);
    res.status(400).json({ message: err.message });
  }
};