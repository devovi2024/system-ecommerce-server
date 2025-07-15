import express from "express";
import { getAllProducts , getFeaturedProducts, createProduct, deleteProduct, getProductsByCategory, getRecommendedProducts , toggleFeaturedProduct } from "../controller/product.controller.js";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.route("/").get(protectRoute, adminRoute, getAllProducts);
router.route("/featured").get(getFeaturedProducts);
router.route("/category/:category").get(getProductsByCategory);
router.route("/recommendation").get(getRecommendedProducts);
router.route('/').post(protectRoute, adminRoute, createProduct);
router.route("/:id").patch(protectRoute, adminRoute, toggleFeaturedProduct);
router.route('/:id', protectRoute, adminRoute, deleteProduct);

export default router;
