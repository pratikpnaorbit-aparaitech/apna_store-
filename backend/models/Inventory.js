const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
    id: {
        type: Number,
        unique: true
    },
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true
    },
    sku: {
        type: String,
        required: [true, 'SKU is required'],
        unique: true,
        trim: true
    },
    category: {
        type: String,
        trim: true
    },
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [0, 'Quantity cannot be negative'],
        default: 0
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative']
    },
    reorder_level: {
        type: Number,
        default: 5,
        min: 0
    },
    is_active: {
        type: Number,
        default: 1,
        enum: [0, 1]
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Update status based on quantity (optional)
inventorySchema.methods.isLowStock = function() {
    return this.quantity <= this.reorder_level;
};

module.exports = mongoose.model('Inventory', inventorySchema);