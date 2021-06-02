//jshint esversion:6
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static("public"));


const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/userDB', {useNewUrlParser: true, useUnifiedTopology: true});

const encrypt = require('mongoose-encryption');


const userSchema=new mongoose.Schema({
    email:String,
    password:String
})

//for encryption
userSchema.plugin(encrypt,{secret:process.env.SECRET, encryptedFields: ['password']});



const User=new mongoose.model("User",userSchema);
//
//const admin=User({
//    email:"admin@gmail.com",
//    password:"qwerty"
//})
//
//admin.save()


app.get("/",(req,res)=>{
    res.render("home");
})

app.route("/register")

.get((req,res)=>{
    res.render("register");
})
.post((req,res)=>{
    const email=req.body.username;
    const password=req.body.password;
    const newUser=User({
        email:email,
        password:password
    })
    newUser.save()
    res.redirect("/login")
})





app.route("/login")

.get((req,res)=>{
    res.render("login");
})
.post((req,res)=>{
    const email=req.body.username;
    const password=req.body.password;
    
    User.findOne({email:email},(err,foundUser)=>{
        if(foundUser){
            if(foundUser.password==password){
                res.render("secrets");
            }else{
                res.send("<h1>Invalid Password</h1>")
            }
        }  else{
            res.send("<h1>Email not found</h1>");
        }
    })
})







let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function () {
    console.log("Server started on port 3000");
});
