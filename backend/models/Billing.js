const mongoose = require('mongoose');

const billingItemSchema = new mongoose.Schema({
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    name: String,
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    discount_percent: { type: Number, default: 0 },
    total: { type: Number, required: true, min: 0 }
});

const billingSchema = new mongoose.Schema({
    bill_no: {
        type: String,
        required: true,
        unique: true
    },
    customer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer'
    },
    customer_name: String,
    customer_phone: String,
    items: [billingItemSchema],
    subtotal: { type: Number, required: true, min: 0 },
    gst: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    payment_mode: {
        type: String,
        enum: ['CASH', 'UPI', 'CARD', 'WALLET'],
        required: true
    },
    cash_received: Number,
    change_returned: Number,
    status: {
        type: String,
        enum: ['PAID', 'PENDING', 'CANCELLED'],
        default: 'PAID'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: { 
        createdAt: 'created_at', 
        updatedAt: 'updated_at' 
    }
});

module.exports = mongoose.model('Billing', billingSchema);