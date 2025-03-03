const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  fullname: { type: String},
  phone: { type: String},
  address: { type: String},
  cart: { type: Array}, // Storing products added to cart
  totalPrice: { type: Number },
  email: { type: String},
  orderDate: { type: Date, default: Date.now }
});

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
