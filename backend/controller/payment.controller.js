import Coupon from "../models/coupon.model.js";
import Order from "../models/order.model.js";
import { stripe } from "../lib/stripe.js";

export const createCheckoutSession = async (req, res) => {
  try {
    const { products, couponCode } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: "Invalid or empty products array" });
    }

    let totalAmount = 0;

    const lineItems = products.map((product) => {
      const amount = Math.round(product.price * 100);
      totalAmount += amount * (product.quantity || 1);

      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: product.name || "Product",
            images: product.image ? [product.image] : [],
          },
          unit_amount: amount,
        },
        quantity: product.quantity || 1,
      };
    });

    let coupon = null;
    if (couponCode) {
      coupon = await Coupon.findOne({
        code: couponCode,
        userId: req.user._id,
        isActive: true,
      });

      if (coupon) {
        totalAmount -= Math.round((totalAmount * coupon.discountPercentage) / 100);
      }
    }

    let discounts = [];
    if (coupon) {
      const stripeCouponId = await createStripeCoupon(coupon.discountPercentage);
      discounts = [{ coupon: stripeCouponId }];
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/purchase-cancel`,
      discounts,
      metadata: {
        userId: req.user._id.toString(),
        couponCode: couponCode || "",
        products: JSON.stringify(
          products.map((p) => ({
            id: p._id,
            quantity: p.quantity,
            price: p.price,
          }))
        ),
      },
    });

    if (totalAmount >= 20000) {
      await createNewCoupon(req.user._id);
    }

    res.status(200).json({ id: session.id, totalAmount: totalAmount / 100 });
  } catch (error) {
    console.error("Error in createCheckoutSession:", error);
    res.status(500).json({ message: "Error processing checkout", error: error.message });
  }
};

export const checkoutSuccess = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: "Missing sessionId" });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const userId = session.metadata.userId;

    let order = await Order.findOne({ stripeSessionId: session.id }).populate("products.product");

    if (!order) {
      const productsMeta = JSON.parse(session.metadata.products);

      const orderProducts = productsMeta.map((p) => ({
        product: p.id,
        quantity: p.quantity,
        price: p.price,
      }));

      order = new Order({
        user: userId,
        products: orderProducts,
        totalAmount: session.amount_total / 100,
        stripeSessionId: session.id,
      });

      await order.save();
      order = await Order.findById(order._id).populate("products.product");
    }

    const orderWithDetails = {
      ...order.toObject(),
      products: order.products.map((item) => ({
        name: item.product?.name || "Unknown",
        quantity: item.quantity,
        price: item.price,
        image: item.product?.image || null,
      })),
    };

    res.status(200).json({ order: orderWithDetails });
  } catch (error) {
    console.error("Error in checkoutSuccess:", error);
    res.status(500).json({ error: "Failed to process checkout success" });
  }
};

async function createStripeCoupon(discountPercentage) {
  const coupon = await stripe.coupons.create({
    percent_off: discountPercentage,
    duration: "once",
  });
  return coupon.id;
}

async function createNewCoupon(userId) {
  await Coupon.findOneAndDelete({ userId });

  const newCoupon = new Coupon({
    code: "GIFT" + Math.random().toString(36).substring(2, 8).toUpperCase(),
    discountPercentage: 10,
    expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    userId,
    isActive: true,
  });

  await newCoupon.save();
  return newCoupon;
}
