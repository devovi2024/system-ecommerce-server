import Review from "../models/review.model.js";
import Product from "../models/product.model.js";

export const createReview = async (req, res) => {
  const { productId, rating, comment } = req.body;

  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const existingReview = await Review.findOne({
      product: productId,
      user: req.user._id,
    });
    if (existingReview) {
      return res.status(400).json({ success: false, message: "You already reviewed this product" });
    }

    const review = await Review.create({
      product: productId,
      user: req.user._id,
      rating,
      comment,
    });

    const allReviews = await Review.find({ product: productId });
    const averageRating = allReviews.reduce((acc, curr) => acc + curr.rating, 0) / allReviews.length;

    product.reviews.push(review._id);
    product.averageRating = averageRating;
    product.numOfReviews = allReviews.length;
    await product.save();

    const populatedReview = await review.populate("user", "name email");

    res.status(201).json({ success: true, review: populatedReview });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getProductReviews = async (req, res) => {
  const { productId } = req.params;

  try {
    const reviews = await Review.find({ product: productId })
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, reviews });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch reviews" });
  }
};

export const markReviewHelpful = async (req, res) => {
  const { reviewId } = req.params;
  const { type } = req.body;

  try {
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    if (type === "helpful") {
      review.helpful = (review.helpful || 0) + 1;
    } else if (type === "notHelpful") {
      review.notHelpful = (review.notHelpful || 0) + 1;
    } else {
      return res.status(400).json({ success: false, message: "Invalid type" });
    }

    await review.save();
    res.status(200).json({ success: true, message: "Vote recorded", review });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to vote" });
  }
};
