import { stripe } from "../lib/stripe.js";
import Coupon from "../models/coupon.model.js";
import Order from "../models/order.model.js";

export const createCheckoutSession = async (req, res) => {
  try {
    const { products, couponCode } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid products" });
    }

    let totalAmount = 0;

    const lineItems = products.map((product) => {
      const amount = Math.round(product.price * 100);
      totalAmount += amount * product.quantity;

      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: product.name,
            images: [product.image],
          },
          unit_amount: amount,
        },
        quantity: product.quantity,
      };
    });

    let appliedCoupon = null;

    if (couponCode) {
      appliedCoupon = await Coupon.findOne({
        userId: req.user._id,
        code: couponCode,
        isActive: true,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
      discounts: appliedCoupon
        ? [
            {
              coupon: await createStripeCoupon(appliedCoupon.discountPercentage),
            },
          ]
        : [],
      metadata: {
        userId: req.user._id.toString(),
        couponCode: appliedCoupon ? appliedCoupon.code : null,
        products: JSON.stringify(
          products.map((product) => ({
            id: product._id,
            quantity: product.quantity,
            price: product.price,
          }))
        ),
      },
    });

    if (totalAmount >= 2000) {
      await createNewCoupon(req.user._id.toString());
    }

    res.status(200).json({ id: session.id, totalAmount: totalAmount / 100 });
  } catch (error) {
    console.error("Stripe session error:", error);
    res.status(500).json({ success: false, message: "Stripe session creation failed" });
  }
};

export const checkoutSuccess = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid") {
      if (session.metadata.couponCode) {
        await Coupon.findOneAndUpdate(
          {
            code: session.metadata.couponCode,
            userId: session.metadata.userId,
          },
          { isActive: false }
        );
      }

      const products = JSON.parse(session.metadata.products);
      const newOrder = new Order({
        user: session.metadata.userId,
        products: products.map((product) => ({
          product: product.id,
          quantity: product.quantity,
          price: product.price,
        })),
        totalAmount: session.amount_total / 100,
        stripeSessionId: session.id,
      });

      await newOrder.save();
      return res.status(200).json({ success: true, message: "Order created successfully" });
    }

    res.status(400).json({ success: false, message: "Payment not completed" });
  } catch (error) {
    console.error("Checkout success error:", error);
    res.status(500).json({ success: false, message: "Checkout failed" });
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
  const newCoupon = await Coupon.create({
    userId: userId,
    code: "NEWCOUPONCODE",
    discountPercentage: 10,
    expirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  await newCoupon.save();
  return newCoupon;
}
