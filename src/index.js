const express = require('express');
const bcrypt = require('bcrypt');
const collection = require('./config');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.set('view engine', 'ejs');
app.use(express.static("public"));

app.get('/', (req, res) => {
    res.render('login');
});

app.get('/signup', (req, res) => {
    res.render('signup', { error: null });
});

app.post('/signup', async (req, res) => {
    try {
        const username = req.body.username.trim();

        if (/\s/.test(username)) {
            return res.status(400).send("Username cannot contain spaces");
        }
        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        const data = {
            name: req.body.username,
            password: hashedPassword
        };
// check if the user already exists 

const existingUser = await collection.findOne({ name: data.name });

if (existingUser) {
    return res.render("signup", { error: "Username already taken" });  
}   





        const userdata = await collection.create(data);
        console.log(userdata);
          res.render("success");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error registering user");
    }
});


app.post('/login', async (req, res) => {
    try {
        const check = await collection.findOne({
            name: req.body.username
        });

        // User not found
        if (!check) {
            return res.send("User cannot be found");
        }

        // Compare password
        const isPasswordMatch = await bcrypt.compare(
            req.body.password,
            check.password
        );

        if (isPasswordMatch) {
            return res.render("home");
        } else {
            return res.send("Password is incorrect");
        }

    } catch (err) {
        console.error(err);
        return res.status(500).send("Internal Server Error");
    }
});


app.get('/forgot-password', async(req, res) => {
    res.render("forgot-password");
});

const port = 5000;
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});