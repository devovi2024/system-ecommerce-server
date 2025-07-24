import express from "express";
import dotenv from "dotenv";
import cors from "cors";  
import authRoutes from "./routes/auth.route.js";
import productRoutes from "./routes/product.route.js";
import cartRoutes from "./routes/cart.route.js";
import couponRoutes from "./routes/coupon.route.js";
import paymentRoutes from "./routes/payment.route.js";
import analyticsRoutes from "./routes/analytics.route.js";
import { connectDB } from "./lib/db.js";
import cookieParser from "cookie-parser";
import categoryRoutes from './routes/category.routes.js'

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cookieParser());

// CORS setup to allow frontend requests
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

// Increase payload size limit to handle large base64 image data
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);

app.use("/api/cart", cartRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/analytics", analyticsRoutes);

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}/api/auth`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
  }
};

startServer();
