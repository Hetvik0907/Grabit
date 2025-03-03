const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: String,
  volume: String,
  price: Number,
  original_price: Number,
  discount: Number,
  image: String,
  category:String,
});

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
