import Product from "../models/product.model.js";

export const getCartProducts = async (req, res) => {
  try {
    const user = req.user;

    const productIds = user.cartItems.map(item => item.product);
    const products = await Product.find({ _id: { $in: productIds } });

    const cartItems = products.map(product => {
      const item = user.cartItems.find(ci => ci.product.toString() === product._id.toString());
      return {
        ...product.toJSON(),
        quantity: item?.quantity || 1
      };
    });

    res.json(cartItems);
  } catch (error) {
    console.error("Error in getCartProducts:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const addToCart = async (req, res) => {
  try {
    const { productId } = req.body;
    const user = req.user;

    const existingItem = user.cartItems.find(item => item.product.toString() === productId);

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      user.cartItems.push({ product: productId, quantity: 1 });
    }

    await user.save();
    res.json(user.cartItems);
  } catch (error) {
    console.error("Error in addToCart:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const removeAllFromCart = async (req, res) => {
  try {
    const { productId } = req.body;
    const user = req.user;

    user.cartItems = user.cartItems.filter(
      item => item.product.toString() !== productId
    );

    await user.save();
    res.json(user.cartItems);
  } catch (error) {
    console.error("Error in removeAllFromCart:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateQuantity = async (req, res) => {
  try {
    const { id: productId } = req.params;
    const { quantity } = req.body;
    const user = req.user;

    const item = user.cartItems.find(
      item => item.product.toString() === productId
    );

    if (!item) {
      return res.status(404).json({ success: false, message: "Product not in cart" });
    }

    if (quantity === 0) {
      user.cartItems = user.cartItems.filter(
        item => item.product.toString() !== productId
      );
    } else {
      item.quantity = quantity;
    }

    await user.save();
    res.json(user.cartItems);
  } catch (error) {
    console.error("Error in updateQuantity:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
