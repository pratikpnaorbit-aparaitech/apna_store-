const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    loyalty_id: {
        type: String,
        unique: true
    },
    name: {
        type: String,
        required: [true, 'Customer name is required'],
        trim: true
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        unique: true,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    address: {
        type: String,
        trim: true
    },
    gst_number: {
        type: String,
        trim: true
    },
    points: {
        type: Number,
        default: 0,
        min: 0
    },
    total_spent: {
        type: Number,
        default: 0,
        min: 0
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'INACTIVE'],
        default: 'ACTIVE'
    }
}, {
    timestamps: { 
        createdAt: 'created_at', 
        updatedAt: 'updated_at' 
    }
});

module.exports = mongoose.model('Customer', customerSchema);