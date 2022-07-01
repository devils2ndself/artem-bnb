// ADMIN LOGIN AND PASSWORD: artem@artembnb.com    aRTEMbNb
// REGULAR USER LOGIN AND PASSWORD: example@artembnb.com     exampleuser
const express = require('express');
const bodyParser = require('body-parser');
const exphbs = require('express-handlebars');
const path = require('path');
const Sequelize = require('sequelize');
const clientSessions = require("client-sessions");
const bcrypt = require('bcryptjs');
const multer = require('multer');

require('dotenv').config();

const storage = multer.diskStorage({
    destination: "./public/images/",
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({storage: storage});
const app = express();
const sequelize = new Sequelize(process.env.DATABASE, process.env.DB_USER, process.env.DB_PASS, {
    host: process.env.DB_HOST,
    dialect: 'postgres',
    port: 5432,
    dialectOptions: {
        ssl: { rejectUnauthorized: false }
    }
});
const User = sequelize.define('User', {
    username: {
        type: Sequelize.STRING,
        allowNull: false,
        notEmpty: true
    },
    name: {
        type: Sequelize.STRING,
        allowNull: false,
        notEmpty: true
    },
    email: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
        notEmpty: true
    },
    admin: {
        type: Sequelize.BOOLEAN,
        allowNull: false
    },
    hashedPassword: {
        type: Sequelize.STRING,
        allowNull: false,
        notEmpty: true
    }
}, {
    createdAt: false,
    updatedAt: false
});
//All existing rooms were created earlier via admin dashboard
const Room = sequelize.define('Room', {
    title: {
        type: Sequelize.STRING,
        allowNull: false,
        notEmpty: true
    },
    price: {
        type: Sequelize.DOUBLE,
        allowNull: false
    },
    description: {
        type: Sequelize.STRING,
        allowNull: false,
        notEmpty: true
    },
    location: {
        type: Sequelize.STRING,
        allowNull: false,
        notEmpty: true
    },
    photoFile: {
        type: Sequelize.STRING,
        allowNull: false,
        notEmpty: true
    }
}, {
    createdAt: false,
    updatedAt: false
});
const HTTP_PORT = process.env.PORT || 8080;

app.use(bodyParser.urlencoded({extended:false}));
app.use(express.static(__dirname + "/public/"));
app.use(clientSessions({
    cookieName: "session",
    secret: "artembnb-session",
    duration: 1000 * 60 * 5,
    activeDuration: 1000 * 60
}));

app.engine('.hbs', exphbs({ 
    extname: '.hbs', 
    partialsDir: path.join(__dirname, 'views/partials'),
    defaultLayout: false
 }));

app.set('view engine', 'hbs');

function ensureLogin(req, res, next) {
    if (!req.session.user) {
        res.redirect("/login");
    } else {
        next();
    }
}

const getHashedPassword = _email =>
User.findOne({ where: { email: _email} })
  .then(token => {if (token !== null) return token.hashedPassword});

const getUsername = _email =>
User.findOne({ where: { email: _email} })
  .then(token => {if (token !== null) return token.username});

const getName = _email =>
User.findOne({ where: { email: _email} })
  .then(token => {if (token !== null) return token.name});

const getAdmin = _email =>
User.findOne({ where: { email: _email} })
  .then(token => {if (token !== null) return token.admin});

const emailExists = _email =>
  User.findOne({ where: { email: _email} })
    .then(token => token !== null)
    .then(exists => exists);

function onHttpStart() {
    console.log("Listening on port " + HTTP_PORT);
    sequelize.sync();/*.then(function() {
        bcrypt.hash("aRTEMbNb", 10).then(hash=>{
            User.create({
                username: "ArtemBnB",
                name: "Artem Tanyhin", // hardcoded info for admin user
                email: "artem@artembnb.com",
                admin: true,
                hashedPassword: hash
            }).then(function() {
                console.log("Admin ArtemBnB created.");
            });
        })
    });*/
};

let passwordRegex = /^[a-zA-Z0-9]{6,16}$/;
let usernameRegex = /^[a-zA-Z0-9]{2,20}$/;

function checkRegex(input, regex){
    if (regex.test(input)) return true;
    else return false;
}

app.get("/", (req, res) => {
    res.render('index', {user: req.session.user});
});

app.get("/dashboard", ensureLogin, (req, res) => {
    res.render("dashboard", {user: req.session.user});
});

app.get("/admin-dashboard", ensureLogin, (req, res) => {
    if (req.session.user.admin) res.render("admin-dashboard", {user: req.session.user});
    else res.redirect("/dashboard");
});

app.get("/register", (req, res) => {
    res.render('register', {user: req.session.user});
});

app.get("/rooms", (req, res) => {
    Room.findAll().then( rooms => {
        let data = [];
        rooms.forEach(room => {
            data.push({id: room.id, title: room.title, price: room.price, description: room.description, location: room.location, photoFile: room.photoFile});
        });
        res.render('rooms', {rooms: data, user: req.session.user});
    });
});

app.get("/room", (req, res) => {
    if (req.query.id) {
        Room.findOne({where: {id: req.query.id}}).then( room => {
            let data= {id: room.id, title: room.title, price: room.price, description: room.description, location: room.location, photoFile: room.photoFile};
            res.render('room', {room: data, user: req.session.user})
        });
    }
    else res.redirect("/404");
});

app.get("/logout", function(req, res) {
    req.session.reset();
    res.redirect("/login");
});

app.get("/login", (req, res) => {
    if (!req.session.user) res.render('login');
    else res.redirect("/logout");
});

app.post("/book", (req, res) => {
    if (!req.session.user) res.render('login');
    else {
        Room.findOne({where: {id: req.body.id}}).then( room => {
            let data= {id: room.id, title: room.title, price: room.price, description: room.description, location: room.location, photoFile: room.photoFile};
            res.render('book', {room: data, user: req.session.user, days: req.body.days, amount: req.body.amount, checkin: req.body.checkin, checkout: req.body.checkout})
        });
    }
});

app.post("/find", (req, res) => {
    Room.findAll({where: {location: req.body.city}}).then( rooms => {
        let data = [];
        rooms.forEach(room => {
            data.push({id: room.id, title: room.title, price: room.price, description: room.description, location: room.location, photoFile: room.photoFile});
        });
        res.render('rooms', {city: req.body.city, rooms: data, user: req.session.user})
    });
});

app.post("/addroom", upload.single("photo"), (req,res) => {
    Room.create({
        title: req.body.title,
        price: req.body.price,
        description: req.body.description,
        location: req.body.location,
        photoFile: req.file.filename
    }).then(() => {
        res.render("admin-dashboard", {user: req.session.user, message: "Room created. You can view it at 'Rooms' section."})
    });
});

app.post("/login", (req, res) => {
    let email = req.body.email.trim();
    if (email === '' || req.body.password === '') {
        res.render("login", {message: "Fields are empty."});
    }
    else
    { 
        emailExists(email).then(result =>  {
        if (result) {
            const currentPassword = req.body.password;
            getHashedPassword(email).then(userPassword => {
                bcrypt.compare(currentPassword, userPassword).then((result)=> {
                    if (result == true) {
                        getUsername(email).then(usrnm => {
                            getName(email).then(nm => {
                                getAdmin(email).then(adm => { //making sure all data is set before setting the session
                                    req.session.user = {
                                        email: email,
                                        username: usrnm,
                                        name: nm,
                                        admin: adm
                                    };
                                    if (adm) res.redirect("/admin-dashboard");
                                    else res.redirect("/dashboard");
                                });
                            });
                        });
                    }
                    else res.render("login", {message: "Incorrect email and/or password."});
                });
            });
        }
        else {
            res.render("login", {message: "Incorrect email and/or password."});
        }});
    }
});

app.post("/register", (req, res) => {
    const email = req.body.email.trim();
    emailExists(email).then(result => {
        if (!result && checkRegex(req.body.username, usernameRegex)
        && checkRegex(req.body.password, passwordRegex) 
        && req.body.name.trim() !== ''
        && email !== '') 
        // If all good
        {
            bcrypt.hash(req.body.password, 10).then(hash=>{
                User.create({
                    username: req.body.username,
                    name: req.body.name.trim(),
                    email: email,
                    admin: false,
                    hashedPassword: hash
                }).then(function() {
                    console.log(req.body.username + " created.");
                });
            }).then(function() {
                req.session.user = {
                    username: req.body.username,
                    name: req.body.name.trim(),
                    email: email,
                    admin: false
                };
                res.redirect("/dashboard");
            });
        }
        // If all bad (?)
        else {
            var errors = "";
            if (!checkRegex(req.body.username, usernameRegex)) errors += "Username is only letters and numbers, 2-20 characters.";
            if (req.body.name.trim() == '')  {
                if (errors != "") errors += " | ";
                errors += "Please, enter your real name.";
            }
            if (req.body.email.trim() == '')  {
                if (errors != "") errors += " | ";
                errors += "Email is required.";
            }
            if (result) {
                if (errors != "") errors += " | ";
                errors += "Email already taken!";
            }

            if (!checkRegex(req.body.password, passwordRegex)) {
                if (errors != "") errors += " | ";
                errors += "Password has to be only letters and numbers, 6-16 characters.";
            }
            var myData = {
                errors: errors
            }
            res.render("register", {
                data: myData,
                user: req.session.user
            });
        }
    });
});

app.use((req, res) => {
    res.status(404).render('404');
});

app.listen(HTTP_PORT, onHttpStart());