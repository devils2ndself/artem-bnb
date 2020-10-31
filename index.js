const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const exphbs = require('express-handlebars');
const path = require('path');

const HTTP_PORT = process.env.PORT || 8080;

app.use(bodyParser.urlencoded({extended:false}));

app.use(express.static(__dirname + "/public/"));

app.engine('.hbs', exphbs({ 
    extname: '.hbs', 
    partialsDir: path.join(__dirname, 'views/partials'),
    defaultLayout: false
 }));
app.set('view engine', 'hbs');

function onHttpStart() {
    console.log("Listening on port " + HTTP_PORT);
};

let passwordRegex = /^[a-zA-Z0-9]{6,16}$/;
let usernameRegex = /^[a-zA-Z0-9]{2,20}$/;

function checkRegex(input, regex){
    if (regex.test(input)) return true;
    else return false;
}

app.get("/", (req, res) => {
    res.render('index');
});

app.get("/register", (req, res) => {
    res.render('register');
});

app.get("/rooms", (req, res) => {
    res.render('rooms');
});

app.get("/login", (req, res) => {
    res.render('login');
});

app.post("/find", (req, res) => {
    var myData = {
        city: req.body.city
    };
    res.render('rooms', {
        data: myData
    });
});

app.post("/login", (req, res) => {
    if (req.body.username != null && req.body.password != null && req.body.username.trim() != '' && req.body.password.trim() != '') {
        var myData = {
            username: req.body.username
        };
        res.render("dashboard", {
            data:myData
        });
    }
    else {
        var errors = "";
        if (req.body.username == null || req.body.username.trim() == '')  errors += "Enter the username, please.";
        if (req.body.password == null || req.body.password.trim() == '')  errors += " | Password is required!";
        var myData = {
            errors: errors
        }
        res.render("login", {
            data: myData
        });
    }
});

app.post("/register", (req, res) => {
    if (req.body.username != null && req.body.username.trim() != ''
      && checkRegex(req.body.username, usernameRegex)
      && req.body.password != null && req.body.password.trim() != ''
      && checkRegex(req.body.password, passwordRegex) 
      && req.body.name != null && req.body.name.trim() != ''
       && req.body.email != null && req.body.email.trim() != '') {
        var myData = {
            username: req.body.username
        };
        res.render("dashboard", {
            data:myData
        });
    }
    else {
        var errors = "";
        if (!checkRegex(req.body.username, usernameRegex)) errors += "Username is only letters and numbers, 2-20 characters.";
        if (req.body.name == null || req.body.name.trim() == '')  errors += " | Please, enter your real name.";
        if (req.body.email == null || req.body.email.trim() == '')  errors += " | Email is required.";
        if (!checkRegex(req.body.password, passwordRegex)) errors += "Password has to be only letters and numbers, 6-16 characters.";
        var myData = {
            errors: errors
        }
        res.render("register", {
            data: myData
        });
    }
});

app.use((req, res) => {
    res.status(404).render('404');
});

app.listen(HTTP_PORT, onHttpStart());