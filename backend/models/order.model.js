import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
          min: 1,
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    stripeSessionId: {
      type: String,
      unique: true,
    },
    status: {
      type: String,
      enum: [
        "PROCESSING",
        "APPROVED",
        "ON_SHIPPING",
        "SHIPPED",
        "COMPLETED",
        "CANCELLED",
        "RETURNED",
      ],
      default: "PROCESSING",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Order", orderSchema);
