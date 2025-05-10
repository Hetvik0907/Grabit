const express = require("express");
const app = express();
const port = 8083;
const path = require("path");
const mongoose = require("mongoose");
const Product = require("./models/Product");
const User = require("./models/User");
const Order = require("./models/Order")
const passport = require("passport");
const localstrategy = require("passport-local");
const session = require("express-session");
const randomstring = require("randomstring");
const nodemailer = require("nodemailer");

app.use(express.urlencoded({ extended: true }));
app.use(express.json()); //  Middleware for handling JSON requests
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

const otpCache = {};

// 🚀 Generate OTP
function generateotp() {
  return randomstring.generate({ length: 4, charset: 'numeric' });
}

//  Send OTP Email
function sendOTP(email, otp) {
  const mailoptions = {
    from: 'hetvikpatel0907@gmail.com',
    to: email,
    subject: 'OTP Verification',
    text: `Your OTP for Verification is: ${otp}`
  };

  let transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: 'hetvikpatel0907@gmail.com',
      pass: 'gfuh tqql mkfb bdqz',
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  transporter.sendMail(mailoptions, (error, info) => {
    if (error) {
      console.log('Error occurred:', error);
    } else {
      console.log('OTP email sent successfully:', info.response);
    }
  });
}

//  Connect to MongoDB
const URL = "mongodb://127.0.0.1:27017/grabit";
async function main() {
  await mongoose.connect(URL);
}
main()
  .then(() => console.log("Connected to the database"))
  .catch((err) => console.error("Database connection error:", err));

//  Session Middleware
app.use(
  session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: false
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//  **Routes** 

app.get("/", async (req, res) => {
  const Products = await Product.find();
  res.render("landing.ejs", { Products });
});

//  Login Page
app.get("/login", (req, res) => {
  res.render("login.ejs");
});

//  Generate OTP & Reset Session on New Login
app.post("/getotp", (req, res) => {
  const { email } = req.body;
  const otp = generateotp();
  otpCache[email] = otp;

  sendOTP(email, otp);

  //  Reset session correctly
  req.session.regenerate((err) => {
    if (err) {
      console.error("Error regenerating session:", err);
      return res.status(500).json({ message: "Session error" });
    }

    req.session.email = email; // Store new email in session
    req.session.cart = []; // Reset cart for new login

    console.log(" New session started for:", email);
    res.cookie('otpCache', otpCache, { maxAge: 30000, httpOnly: true });
    res.status(200).json({ message: 'OTP sent successfully' });
  });
});


//  Verify OTP & Reset Session
app.post("/verifyotp", (req, res) => {
  const { email, otp } = req.body;

  if (!otpCache.hasOwnProperty(email)) {
      return res.status(400).json({ message: "Email not Found" });
  }

  if (otpCache[email] == otp.trim()) {
      delete otpCache[email];

      //  Reset session completely for new login
      req.session.regenerate((err) => {
          if (err) {
              return res.status(500).json({ message: "Session reset error" });
          }

          req.session.email = email;
          req.session.cart = []; //  Ensure cart is empty for new user

          return res.status(200).json({ message: "OTP verified successfully" });
      });
  } else {
      return res.status(400).json({ message: "Invalid OTP" });
  }
});

//  Render Zepto Main Page
app.get("/zepto", async (req, res) => {
  const email = req.session.email;
  if (!email) {
      return res.redirect("/login"); // Ensure user is logged in
  }

  const Products = await Product.find();
  res.render("main.ejs", { 
      email, 
      Products, 
      cart: req.session.cart || [] // Send session-based cart
  });
});


//  Store Cart Items in Session
app.post("/payment", (req, res) => {
  const email = req.session.email;
  if (!req.session.cart) req.session.cart = [];
  if (!req.session.totalPrice) req.session.totalPrice = 0;

  let items = Array.isArray(req.body.itemNames) ? req.body.itemNames : [req.body.itemNames];
  let prices = Array.isArray(req.body.itemPrices) ? req.body.itemPrices.map(parseFloat) : [parseFloat(req.body.itemPrices)];

  req.session.cart.push(...items);
  req.session.totalPrice += prices.reduce((sum, price) => sum + price, 0); // ✅ Add item prices

  res.redirect("/order");
});



//  Render Second Page
app.get("/order", (req, res) => {
  res.render("Secondpage.ejs", { cart: req.session.cart || [] });
  console.log("Update Cart:", req.session.cart);
  console.log("updated price",req.session.totalPrice);
  console.log(req.session.email);  
});

app.post("/order",async (req,res)=>{
  const {fullname,phone,address} = req.body
  const email  = req.session.email
  try {
    const newOrder = new Order({
      fullname,
      phone,
      address,
      cart: req.session.cart, 
      totalPrice: req.session.totalPrice,
      email,
    });

    await newOrder.save(); // Save order to the database

    console.log(" Order Saved:", newOrder);

    // Clear session after saving order
    req.session.cart = [];
    req.session.totalPrice = 0;

    res.redirect("/order-confirmation"); // Redirect to a confirmation page
  } catch (error) {
    console.error(" Error Saving Order:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
})

app.get("/order-confirmation",(req,res)=>{
  const email  = req.session.email
  res.render("confirm.ejs",email);

})


//  Logout Route (Clears Session)
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

//  Start Server
app.listen(port, () => {
  console.log(`Website is live on port ${port}`);
});
