import Order from "../models/order.model.js";

// Create a new order
export const createOrder = async (req, res) => {
  try {
    const { products, totalAmount, stripeSessionId } = req.body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No products provided",
      });
    }

    const newOrder = new Order({
      user: req.user._id,
      products,
      totalAmount,
      stripeSessionId,
    });

    const savedOrder = await newOrder.save();
    res.status(201).json({ success: true, order: savedOrder });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create order",
    });
  }
};

// Get logged-in user's orders
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate("products.product", "title image price")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Admin: get all orders
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .populate("products.product", "title image")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Admin: update order status
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const validStatuses = [
      "PROCESSING",
      "APPROVED",
      "ON_SHIPPING",
      "SHIPPED",
      "COMPLETED",
      "CANCELLED",
      "RETURNED",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const order = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.status(200).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update order" });
  }
};

// User cancels their own order (new)
export const cancelOwnOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.user.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Forbidden - Not your order" });
    }

    if (order.status !== "PROCESSING") {
      return res.status(400).json({ success: false, message: "Cannot cancel order at this stage" });
    }

    order.status = "CANCELLED";
    await order.save();

    res.status(200).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to cancel order" });
  }
};
