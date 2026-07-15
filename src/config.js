const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB Connection with better error handling
const mongoURL = process.env.MONGODB_URI || "mongodb://localhost:27017/login-inf";

mongoose.connect(mongoURL, {
    serverSelectionTimeoutMS: 5000,
    retryWrites: true,
    w: 'majority'
})
.then(() => {
    console.log("✅ Connected to MongoDB successfully!");
})
.catch((err) => {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
});

// Handle connection events
mongoose.connection.on('disconnected', () => {
    console.warn("⚠️ MongoDB disconnected");
});

mongoose.connection.on('error', (err) => {
    console.error("❌ MongoDB error:", err);
});

// User Schema with improved structure
const loginSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters'],
        maxlength: [30, 'Username must not exceed 30 characters']
    },

    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },

    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters']
    },

    otp: {
        type: String,
        default: null
    },

    otpExpiry: {
        type: Date,
        default: null
    },

    isVerified: {
        type: Boolean,
        default: false
    },

    createdAt: {
        type: Date,
        default: Date.now
    },

    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// // Indexes for better query performance
// loginSchema.index({ email: 1 });
// loginSchema.index({ username: 1 });

// Create collection with proper naming
const collection = mongoose.model("user", loginSchema);

module.exports = collection;