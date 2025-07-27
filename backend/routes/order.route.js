import express from "express";
import {
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  cancelOwnOrder,
} from "../controller/order.controller.js";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/create", protectRoute, createOrder);
router.get("/my-orders", protectRoute, getMyOrders);
router.put("/cancel/:orderId", protectRoute, cancelOwnOrder);  

router.get("/all", protectRoute, adminRoute, getAllOrders);
router.put("/update/:orderId", protectRoute, adminRoute, updateOrderStatus);

export default router;
