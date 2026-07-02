const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
    company_name: {
        type: String,
        required: [true, 'Company name is required'],
        trim: true
    },
    category: {
        type: String,
        trim: true
    },
    contact_person: {
        type: String,
        trim: true
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
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
    account_manager: {
        type: String,
        trim: true
    },
    payment_due: {
        type: Number,
        default: 0,
        min: 0
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'INACTIVE'],
        default: 'ACTIVE'
    },
    address: {
        type: String,
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true // This adds created_at and updated_at automatically
});

module.exports = mongoose.model('Vendor', vendorSchema);