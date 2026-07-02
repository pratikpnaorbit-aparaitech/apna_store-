// models/Category.js
const mongoose = require('mongoose');
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  // add other fields as needed
}, { timestamps: true });
module.exports = mongoose.model('Category', categorySchema);