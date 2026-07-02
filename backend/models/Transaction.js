const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  bill_no: { type: String, required: true, unique: true },
  customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' }, 
  subtotal: { type: Number, required: true, min: 0 },
  gst: { type: Number, required: true, min: 0 },
  payment_provider: { type: String, default: 'POS' },
  total: { type: Number, required: true },
  payment_mode: { type: String, required: true },
  status: { type: String, default: 'SUCCESS' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);