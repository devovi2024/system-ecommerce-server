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
    const coupon = await Coupon.findOne({
      userId: req.user._id,
      code,
      isActive: true,
    });

    if (!coupon) {
      return res.status(400).json({ success: false, message: "Invalid coupon code" });
    }

    if (coupon.expirationDate < Date.now()) {
      coupon.isActive = false;
      await coupon.save();
      return res.status(400).json({ success: false, message: "Coupon has expired" });
    }

    res.json({
      success: true,
      message: "Coupon is valid",
      code: coupon.code,
      discountPercentage: coupon.discountPercentage,
    });
  } catch (error) {
    console.error("Error in validateCoupon:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
