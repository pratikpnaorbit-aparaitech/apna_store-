const mongoose = require('mongoose');

const loyaltyHistorySchema = new mongoose.Schema({
    customer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    transaction_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction'
    },
    points: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        enum: ['EARNED', 'REDEEMED'],
        required: true
    }
}, {
    timestamps: { 
        createdAt: 'created_at', 
        updatedAt: 'updated_at' 
    }
});

module.exports = mongoose.model('LoyaltyHistory', loyaltyHistorySchema);