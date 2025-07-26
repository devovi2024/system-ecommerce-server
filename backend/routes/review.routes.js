import express from "express";
import {
  createReview,
  getProductReviews,
  markReviewHelpful,

  
} from "../controller/review.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protectRoute, createReview);
router.get("/:productId", getProductReviews);
router.put("/:reviewId/vote", protectRoute, markReviewHelpful);


export default router;
1