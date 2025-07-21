import Product from "../models/product.model.js";

// Get cart products with quantities from user's cart
export const getCartProducts = async (req, res) => {
  try {
    const user = req.user;

    const productIds = user.cartItems.map(item => item.product);
    const products = await Product.find({ _id: { $in: productIds } });

    const cartItems = products.map(product => {
      const item = user.cartItems.find(
        ci => ci.product.toString() === product._id.toString()
      );
      return {
        ...product.toJSON(),
        quantity: item?.quantity || 1
      };
    });

    res.json({ success: true, cartItems });
  } catch (error) {
    console.error("Error in getCartProducts:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Add a product to user's cart or increase quantity if exists
export const addToCart = async (req, res) => {
  try {
    const { productId } = req.body;
    const user = req.user;

    const existingItem = user.cartItems.find(
      item => item.product.toString() === productId
    );

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      user.cartItems.push({ product: productId, quantity: 1 });
    }

    await user.save();
    res.json({ success: true, cartItems: user.cartItems });
  } catch (error) {
    console.error("Error in addToCart:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Remove a product from user's cart by product ID
export const removeFromCart = async (req, res) => {
  try {
    const productId = req.params.id;
    const user = req.user;

    const prevCount = user.cartItems.length;
    user.cartItems = user.cartItems.filter(
      item => item.product.toString() !== productId
    );

    if (user.cartItems.length === prevCount) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found in cart" });
    }

    await user.save();
    res.json({ success: true, cartItems: user.cartItems });
  } catch (error) {
    console.error("Error in removeFromCart:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update quantity of a product in user's cart or remove if quantity <= 0
export const updateQuantity = async (req, res) => {
  try {
    const { id: productId } = req.params;
    const { quantity } = req.body;
    const user = req.user;

    const item = user.cartItems.find(
      item => item.product.toString() === productId
    );

    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Product not in cart" });
    }

    if (quantity <= 0) {
      user.cartItems = user.cartItems.filter(
        item => item.product.toString() !== productId
      );
    } else {
      item.quantity = quantity;
    }

    await user.save();
    res.json({ success: true, cartItems: user.cartItems });
  } catch (error) {
    console.error("Error in updateQuantity:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
