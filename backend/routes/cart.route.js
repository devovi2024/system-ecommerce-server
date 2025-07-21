import express from "express";
import {
  getCartProducts,
  updateQuantity,
  removeFromCart,
  addToCart,
} from "../controller/cart.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", protectRoute, getCartProducts);
router.post("/", protectRoute, addToCart);
router.delete("/:id", protectRoute, removeFromCart);  
router.put("/:id", protectRoute, updateQuantity);

export default router;
