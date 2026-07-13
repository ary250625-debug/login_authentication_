const mongoose = require('mongoose');
const connect = mongoose.connect("mongodb://localhost:27017/login-inf");

// check if the connection is successful

connect.then(() => {
    console.log("Connected to MongoDB successfully!");
}).catch(() => {
    console.log("Error connecting to MongoDB:");
});   

// create a schema for the user data
const loginSchema = mongoose.Schema({
    name:{
        type: String,
        required: true      
    },

    password:{
        type: String,
        required: true
    } 
    
});

// collection name is login-info
const collection = new mongoose.model("user", loginSchema);

module.exports = collection;    