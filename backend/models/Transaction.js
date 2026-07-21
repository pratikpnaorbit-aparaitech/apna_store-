const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  bill_no: { type: String, required: true, unique: true },
  customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' }, 
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', default: null, index: true },
  subtotal: { type: Number, required: true, min: 0 },
  gst: { type: Number, required: true, min: 0 },
  payment_provider: { type: String, default: 'POS' },
  total: { type: Number, required: true },
  payment_mode: { type: String, enum: ['CASH', 'UPI', 'CARD', 'WALLET'], required: true },
  cash_received: { type: Number, default: null, min: 0 },
  change_returned: { type: Number, default: null, min: 0 },
  status: { type: String, enum: ['SUCCESS', 'REVERSED'], default: 'SUCCESS', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  refundedAt: { type: Date, default: null },
  refundedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  refundReason: { type: String, default: null, maxlength: 500 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);
