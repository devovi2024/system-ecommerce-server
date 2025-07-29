import express from "express";
import {
  getAllProducts,
  getFeaturedProducts,
  getProductsByCategory,
  getRecommendedProducts,
  getProductById,
  createProduct,
  updateProduct,           // <-- added update controller
  deleteProduct,
  toggleFeaturedProduct,
  getRelatedProducts,
  getPeopleAlsoBought,
  getTopRatedProducts,
  getDiscountedProducts,   // <-- added get discounted products controller
} from "../controller/product.controller.js";

import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";
import upload from "../middleware/multer.middleware.js";

const router = express.Router();

// Public GET routes
router.get("/featured", getFeaturedProducts);
router.get("/discounted", getDiscountedProducts);     // <--- discounted products
router.get("/category/:category", getProductsByCategory);
router.get("/recommendation", getRecommendedProducts);
router.get("/related/:id", getRelatedProducts);
router.get("/people-also-bought/:id", getPeopleAlsoBought);
router.get("/top-rated", getTopRatedProducts);

router.get("/", getAllProducts);
router.get("/:id", getProductById);

// Admin protected routes for create, update, delete
router.post("/", protectRoute, adminRoute, upload.single("image"), createProduct);
router.patch("/:id", protectRoute, adminRoute, upload.single("image"), updateProduct);  // <--- PATCH for update
router.patch("/toggle-featured/:id", protectRoute, adminRoute, toggleFeaturedProduct); // optional separate route for toggleFeatured
router.delete("/:id", protectRoute, adminRoute, deleteProduct);

export default router;
