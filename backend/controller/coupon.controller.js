import Coupon from "../models/coupon.model.js";

export const getCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findOne({
      userId: req.user._id,
      isActive: true,
    });

    res.json(coupon || null);
  } catch (error) {
    console.error("Error in getCoupon:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const validateCoupon = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: "Coupon code is required" });
    }

    const coupon = await Coupon.findOne({
      userId: req.user._id,
      code,
      isActive: true,
    });

    if (!coupon) {
      return res.status(400).json({ success: false, message: "Invalid coupon code" });
    }

    // Check expiration
    const now = new Date();
    if (coupon.expirationDate && now > new Date(coupon.expirationDate)) {
      coupon.isActive = false;
      await coupon.save();
      return res.status(400).json({ success: false, message: "Coupon has expired" });
    }

    return res.json({
      code: coupon.code,
      discountPercentage: coupon.discountPercentage,
    });
  } catch (error) {
    console.error("Error in validateCoupon:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
