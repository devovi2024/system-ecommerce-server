import express from "express";
import {
  getAllProducts,
  getFeaturedProducts,
  getProductsByCategory,
  getRecommendedProducts,
  createProduct,
  deleteProduct,
  toggleFeaturedProduct,
} from "../controller/product.controller.js";

import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";
import upload from "../middleware/multer.middleware.js";

const router = express.Router();

router.get("/featured", getFeaturedProducts);
router.get("/category/:category", getProductsByCategory);
router.get("/recommendation", getRecommendedProducts);

router.get("/", protectRoute, adminRoute, getAllProducts);
router.post("/", protectRoute, adminRoute, upload.single("image"), createProduct);
router.patch("/:id", protectRoute, adminRoute, toggleFeaturedProduct);
router.delete("/:id", protectRoute, adminRoute, deleteProduct);

export default router;
