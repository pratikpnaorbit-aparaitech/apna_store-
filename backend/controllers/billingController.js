const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Transaction = require("../models/Transaction");
const TransactionItem = require("../models/TransactionItem");
const LoyaltyHistory = require("../models/LoyaltyHistory");
const Store = require("../models/Store");
const mongoose = require('mongoose');
const crypto = require("crypto");
const { sendWhatsApp } = require("../utils/notificationService");
const { validateBillingInput } = require("../utils/billingInput");

const billingError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

exports.createBill = async (req, res) => {
  let input;
  try {
    input = validateBillingInput(req.body);
  } catch (error) {
    return res.status(error.statusCode || 400).json({ message: error.message });
  }
  const { paymentMode, items, phone, joinLoyalty, newCustomer, cashReceived, storeId } = input;
  if (req.user.role !== "super_admin" && !req.user.storeId) {
    return res.status(403).json({ message: "No store is assigned to this account" });
  }

  let billingStoreId = req.user.role === "super_admin" ? (storeId || null) : req.user.storeId;

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
        status: 'ACTIVE',
        storeIds: billingStoreId ? [billingStoreId] : [],
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
      // Find product with stock lock (using session)
      const product = await Product.findOne({ 
        _id: i.productId,
        is_active: 1,
        ...(req.user.role === "super_admin" ? {} : { storeId: billingStoreId }),
      }).session(session);

      if (!product) throw billingError("Product not found");
      if (!product.storeId) throw billingError(`${product.name} is not assigned to a store`);
      if (!billingStoreId) billingStoreId = product.storeId;
      if (String(product.storeId) !== String(billingStoreId)) {
        throw billingError("All billed products must belong to the same store");
      }
      
      // Check stock
      if (product.stock < i.qty) {
        throw billingError(`Insufficient stock for ${product.name}`, 409);
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
        throw billingError(`${product.name} is expired`, 409);
      } else if (daysLeft === 0) {
        throw billingError(`${product.name} expires today`, 409);
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

      i.validatedPrice = finalPrice;
      i.lineTotal = lineTotal;
    }

    if (!billingStoreId || !(await Store.exists({ _id: billingStoreId, isActive: true }).session(session)))
      throw billingError("Choose a valid active store");

    subtotal = Number(subtotal.toFixed(2));
    const gst = Number((subtotal * 0.18).toFixed(2));
    const total = Number((subtotal + gst).toFixed(2));

    if (paymentMode === "CASH" && (!Number.isFinite(Number(cashReceived)) || Number(cashReceived) < total)) {
      throw billingError(`Cash received must be at least ₹${total.toFixed(2)}`);
    }

    if (customerId && billingStoreId) {
      await Customer.updateOne(
        { _id: customerId },
        { $addToSet: { storeIds: billingStoreId }, $set: { status: 'ACTIVE' } },
      ).session(session);
    }

    /* ======================
       4️⃣ CREATE TRANSACTION
    ====================== */
    const billNo = `SS-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    const [transaction] = await Transaction.create([{
      bill_no: billNo,
      customer_id: customerId,
      subtotal: subtotal,
      gst: gst,
      total: total,
      payment_mode: paymentMode,
      payment_provider: 'POS',
      storeId: billingStoreId,
      status: 'SUCCESS',
      createdBy: req.user.id,
      cash_received: paymentMode === "CASH" ? cashReceived : null,
      change_returned: paymentMode === "CASH" ? Number((cashReceived - total).toFixed(2)) : null,
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
        price: i.validatedPrice,
        quantity: i.qty,
        total: i.lineTotal
      }], { session });

      // Conditional decrement protects against stale carts and concurrent bills.
      const stockUpdate = await Product.updateOne(
        { _id: i.productId, storeId: billingStoreId, is_active: 1, stock: { $gte: i.qty } },
        { $inc: { stock: -i.qty } }
      ).session(session);
      if (stockUpdate.matchedCount !== 1)
        throw billingError("Stock changed while billing. Refresh products and try again", 409);
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
      transactionId,
      subtotal,
      gst,
      total,
      paymentMode,
      cashReceived: paymentMode === "CASH" ? cashReceived : null,
      changeReturned: paymentMode === "CASH" ? Number((cashReceived - total).toFixed(2)) : null,
      pointsAdded,
      items: billItems,
    });

  } catch (err) {
    // Rollback transaction on error
    if (session.inTransaction()) await session.abortTransaction();
    
    const conflict = err.code === 112 || err.hasErrorLabel?.("TransientTransactionError");
    if (!err.statusCode && !conflict && err.name !== "ValidationError" && err.name !== "CastError")
      console.error("CREATE BILL ERROR:", err);
    res.status(err.statusCode || (conflict ? 409 : err.name === "ValidationError" || err.name === "CastError" ? 400 : 500)).json({
      message: err.statusCode || conflict || err.name === "ValidationError" || err.name === "CastError" ? err.message : "Billing failed. Please try again",
    });
  } finally {
    await session.endSession();
  }
};
