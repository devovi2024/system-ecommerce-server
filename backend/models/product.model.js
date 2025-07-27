import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Title is required"],
  },
  description: {
    type: String,
    required: [true, "Description is required"],
  },
  price: {
    type: Number,
    required: [true, "Price is required"],
  },
  image: {
    type: String,
    required: [true, "Image is required"],
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: [true, "Category is required"],
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },

  //  New Fields for Review System
  reviews: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review"
    }
  ],
  averageRating: {
    type: Number,
    default: 0
  },
  numOfReviews: {
    type: Number,
    default: 0
  }

}, { timestamps: true });

const Product = mongoose.model("Product", productSchema);
export default Product;
