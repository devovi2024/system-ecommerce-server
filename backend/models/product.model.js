import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },

  discount: {
    type: Number,
    default: 0, // Percentage (0–100)
    min: 0,
    max: 100,
  },

  images: {
    type: [String],
    required: true,
    validate: {
      validator: (arr) => arr.length <= 4,
      message: "You can upload up to 4 images only",
    },
  },

  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },

  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },

  isFeatured: { type: Boolean, default: false },

  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],
  averageRating: { type: Number, default: 0 },
  numOfReviews: { type: Number, default: 0 },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for discounted price calculation
productSchema.virtual("discountedPrice").get(function () {
  if (this.discount && this.discount > 0) {
    return +(this.price * (1 - this.discount / 100)).toFixed(2);
  }
  return this.price;
});

const Product = mongoose.model("Product", productSchema);
export default Product;
