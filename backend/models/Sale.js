// models/Sale.js
const mongoose = require('mongoose');
const saleSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 },
  total: { type: Number, required: true, min: 0 },
  sale_date: { type: Date, default: Date.now }
}, { timestamps: true });
module.exports = mongoose.model('Sale', saleSchema);