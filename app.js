//jshint esversion:6
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const _ = require('lodash');
const session = require('express-session')
const passport = require('passport')
const passportLocalMongoose = require('passport-local-mongoose')
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const GitHubStrategy = require('passport-github2').Strategy;



const app = express();
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static("public"));

app.use(session({
  secret: 'This is a secret code.',
  resave: false,
  saveUninitialized: false,
}))

app.use(passport.initialize());
app.use(passport.session());



mongoose.connect('mongodb://localhost:27017/userDB', {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set("useCreateIndex",true)

//const encrypt = require('mongoose-encryption');


const userSchema=new mongoose.Schema({
    password:String,
    secret:String,
    googleId:String,
    githubId:String
})
userSchema.plugin(findOrCreate);
userSchema.plugin(passportLocalMongoose);
//for encryption
//userSchema.plugin(encrypt,{secret:process.env.SECRET, encryptedFields: ['password']});





const User=new mongoose.model("User",userSchema);
//
//const admin=User({
//    email:"admin@gmail.com",
//    password:"qwerty"
//})
//
//admin.save()


// use static authenticate method of model in LocalStrategy
passport.use(User.createStrategy());

// use static serialize and deserialize of model for passport session support
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

//Google Strategy

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile)
    User.findOrCreate({ googleId: profile.id}, function (err, user) {
      return cb(err, user);
    });
  }
));


//github strategy

passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: "http://127.0.0.1:3000/auth/github/secrets"
  },
  function(accessToken, refreshToken, profile, done) {
    console.log(profile)
    User.findOrCreate({ githubId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));




app.get("/",(req,res)=>{
    res.render("home");
})

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] }));

app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });

app.get('/auth/github',
  passport.authenticate('github', { scope: [ 'user:email' ] }));

app.get('/auth/github/secrets', 
  passport.authenticate('github', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get("/secrets",(req,res)=>{
    
    User.find({secret:{$ne:null}},(err,userWithSecrets)=>{
        res.render("secrets",{userWithSecrets:userWithSecrets});
    })
})


app.route("/register")

.get((req,res)=>{
    res.render("register");
})
.post((req,res)=>{
    console.log(req.body);
  User.register({username:req.body.username},req.body.password , (err,user)=>{
      if(err){
          console.log(err)
          res.redirect("/register")
      }else{
        console.log("err")
          passport.authenticate("local")(req,res,()=>{
              res.redirect("/secrets")
          })
      }
  })
    
})


app.route("/login")

.get((req,res)=>{
    res.render("login");
})
.post((req,res)=>{
    
    const user=new User({
        username:req.body.username,
        password:req.body.password
    });
    
    req.login(user,(err)=>{
        if(err){
            console.log(err);
        }else{
            passport.authenticate("local")(req,res,()=>{
              res.redirect("/secrets")
          })
        }
    })
    
});


app.get("/logout",(req,res)=>{
    req.logout();
    res.redirect("/")
})


app.get("/submit",(req,res)=>{
    if(req.isAuthenticated()){
        res.render("submit")
    }
    else{
        res.redirect("/login")
    }
})

app.post("/submit",(req,res)=>{
    if(req.isAuthenticated()){
        
        const content=_.capitalize(req.body.secret);
        const userId=req.user._id;
        User.updateOne({_id:userId},{secret:content},(err)=>{})
        res.redirect("/secrets")
    }
    else{
        res.redirect("/login")
    }
})


let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function () {
    console.log("Server started on port 3000");
});
