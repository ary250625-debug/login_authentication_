const mongoose = require('mongoose');

mongoose.connect("mongodb://localhost:27017/login-inf")
.then(() => {
    console.log("Connected to MongoDB successfully!");
})
.catch((err) => {
    console.log("MongoDB Connection Error:", err);
});

const loginSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true,
        unique: true
    },

    email: {
        type: String,
        required: true,
        unique: true
    },

    password: {
        type: String,
        required: true
    },

    otp: {
        type: String,
        default: null
    },

    otpExpiry: {
        type: Date,
        default: null
    }

});

const collection = mongoose.model("user", loginSchema);

module.exports = collection;