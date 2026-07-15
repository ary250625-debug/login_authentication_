const express = require("express");
const bcrypt = require("bcrypt");
const session = require("express-session");
const nodemailer = require("nodemailer");
require("dotenv").config();

const collection = require("./config");

const app = express();

// -------------------------
// Middleware
// -------------------------

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static("public"));

app.set("view engine", "ejs");

// -------------------------
// Session
// -------------------------

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false
    })
);

// -------------------------
// Nodemailer
// -------------------------

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Verify email connection

transporter.verify((error) => {
    if (error) {
        console.log("Email Error:", error);
    } else {
        console.log("Email Server Ready");
    }
});

// -------------------------
// Authentication Middleware
// -------------------------

const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        return next();
    }

    return res.redirect("/");
};

// -------------------------
// GET Routes
// -------------------------

app.get("/", (req, res) => {
    if (req.session.userId) {
        return res.redirect("/home");
    }

    res.render("login", {
        error: null
    });
});

app.get("/signup", (req, res) => {
    res.render("signup", {
        error: null
    });
});

app.get("/forgot-password", (req, res) => {
    res.render("forgot-password", {
        error: null
    });
});

app.get("/home", isAuthenticated, (req, res) => {
    res.set("Cache-Control", "no-store");
    res.render("home", {
        username: req.session.username
    });
});

app.post("/logout", isAuthenticated, (req, res, next) => {
    req.session.destroy((err) => {
        if (err) {
            return next(err);
        }

        res.clearCookie("connect.sid");
        return res.redirect("/");
    });
});

// -------------------------
// SIGNUP
// -------------------------

app.post("/signup", async (req, res) => {

    try {

        const username = req.body.username.trim();
        const email = req.body.email.trim().toLowerCase();
        const password = req.body.password;

        if (!username || !email || !password) {
            return res.render("signup", {
                error: "Please fill all fields."
            });
        }

        if (/\s/.test(username)) {
            return res.render("signup", {
                error: "Username cannot contain spaces."
            });
        }

        const existingUser = await collection.findOne({
            name: username
        });

        if (existingUser) {
            return res.render("signup", {
                error: "Username already exists."
            });
        }

        const existingEmail = await collection.findOne({
            email: email
        });

        if (existingEmail) {
            return res.render("signup", {
                error: "Email already registered."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await collection.create({

            name: username,
            email: email,
            password: hashedPassword

        });

        res.render("success");

    } catch (err) {

        console.error(err);

        res.status(500).send("Registration Failed");

    }

});

// -------------------------
// LOGIN
// -------------------------

app.post("/login", async (req, res) => {

    try {

        const username = req.body.username.trim();
        const password = req.body.password;

        const user = await collection.findOne({
            name: username
        });

        if (!user) {

            return res.render("login", {
                error: "User not found."
            });

        }

        const match = await bcrypt.compare(
            password,
            user.password
        );

        if (!match) {

            return res.render("login", {
                error: "Incorrect password."
            });

        }

        req.session.userId = user._id;
        req.session.username = user.name;

        res.redirect("/home");

    } catch (err) {

        console.error(err);

        res.status(500).send("Login Failed");

    }

});

// ------------------------------------
// SEND OTP
// ------------------------------------

app.post("/forgot-password", async (req, res) => {

    try {

        const email = req.body.email.trim().toLowerCase();

         const user = await collection.findOne({
            email: email
        });

        if (!user) {

            return res.render("forgot-password", {
                error: "Email not found."
            });

        }

        // Generate 6-digit OTP

        const otp = Math.floor(
            100000 + Math.random() * 900000
        ).toString();

        // OTP valid for 10 minutes

        const expiry = new Date(
            Date.now() + 10 * 60 * 1000
        );

        // Save OTP

        user.otp = otp;
        user.otpExpiry = expiry;

        await user.save();

        // Send Email

        await transporter.sendMail({

            from: process.env.EMAIL_USER,

            to: user.email,

            subject: "Password Reset OTP",

            html: `
                <h2>Password Reset</h2>

                <p>Hello ${user.name},</p>

                <p>Your OTP is:</p>

                <h1>${otp}</h1>

                <p>This OTP will expire in 10 minutes.</p>

                <p>If you didn't request this, ignore this email.</p>
            `
        });

        // Store username in session

        req.session.resetUser = user.name;

        res.redirect("/verify-otp");

    } catch (err) {

        console.log(err);

        res.status(500).send("Unable to send OTP.");

    }

});


// ------------------------------------
// VERIFY OTP PAGE
// ------------------------------------

app.get("/verify-otp", (req, res) => {

    if (!req.session.resetUser) {

        return res.redirect("/forgot-password");

    }

    res.render("verify-otp", {

        error: null

    });

});

// --------------------------------------
// VERIFY OTP
// --------------------------------------

app.post("/verify-otp", async (req, res) => {

    try {

        if (!req.session.resetUser) {

            return res.redirect("/forgot-password");

        }

        const otp = req.body.otp.trim();

        const user = await collection.findOne({

            name: req.session.resetUser

        });

        if (!user) {

            return res.redirect("/forgot-password");

        }

        // Check expiry

        if (!user.otpExpiry || user.otpExpiry < new Date()) {

            return res.render("verify-otp", {

                error: "OTP has expired."

            });

        }

        // Check OTP

        if (user.otp !== otp) {

            return res.render("verify-otp", {

                error: "Invalid OTP."

            });

        }

        // OTP verified

        req.session.verifiedUser = user.name;

        res.redirect("/reset-password");

    }

    catch(err){

        console.log(err);

        res.status(500).send("OTP Verification Failed");

    }

});


// --------------------------------------
// RESET PASSWORD PAGE
// --------------------------------------

app.get("/reset-password",(req,res)=>{

    if(!req.session.verifiedUser){

        return res.redirect("/forgot-password");

    }

    res.render("reset-password",{

        error:null

    });

});


// --------------------------------------
// RESET PASSWORD
// --------------------------------------

app.post("/reset-password", async (req, res) => {

    try {

        if (!req.session.verifiedUser) {
            return res.redirect("/forgot-password");
        }

        const { password, confirmPassword } = req.body;

        if (password !== confirmPassword) {

            return res.render("reset-password", {
                error: "Passwords do not match."
            });

        }

        if (password.length < 6) {

            return res.render("reset-password", {
                error: "Password must be at least 6 characters."
            });

        }

        const user = await collection.findOne({
            name: req.session.verifiedUser
        });

        if (!user) {

            return res.redirect("/forgot-password");

        }

        // Hash new password

        const hashedPassword = await bcrypt.hash(password, 10);

        // Update password

        user.password = hashedPassword;

        // Remove OTP

        user.otp = null;
        user.otpExpiry = null;

        await user.save();

        // Clear session

        delete req.session.resetUser;
        delete req.session.verifiedUser;

        res.render("login", {
            error: "Password updated successfully. Please login."
        });

    } catch (err) {

        console.log(err);

        res.status(500).send("Unable to reset password.");

    }

});


const port = 5000;

app.listen(port, () => {

    console.log(`Server Running : http://localhost:${port}`);

});
