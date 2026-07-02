const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Offer title is required'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    discount_type: {
        type: String,
        enum: ['percentage', 'fixed'],
        required: true
    },
    discount_value: {
        type: Number,
        required: true,
        min: 0
    },
    start_date: {
        type: Date,
        required: true
    },
    end_date: {
        type: Date,
        required: true
    },
    min_purchase: {
        type: Number,
        default: 0,
        min: 0
    },
    applicable_products: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    applicable_categories: [{
        type: String,
        trim: true
    }],
    status: {
        type: String,
        enum: ['active', 'inactive', 'expired'],
        default: 'active'
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

// Index for date range queries
offerSchema.index({ start_date: 1, end_date: 1, status: 1 });

module.exports = mongoose.model('Offer', offerSchema);