import Product from "../models/product.model.js";

/**
 * Get all products from user's cart with their quantities and full product details,
 * including discount and discounted price.
 */
export const getCartProducts = async (req, res) => {
  try {
    const user = req.user;

    if (!user?.cartItems || user.cartItems.length === 0) {
      return res.json({ success: true, cartItems: [] });
    }

    const productIds = user.cartItems.map(item => item.product);
    const products = await Product.find({ _id: { $in: productIds } });

    const cartItems = products.map(product => {
      const item = user.cartItems.find(
        ci => ci.product && ci.product.toString() === product._id.toString()
      );

      const discount = product.discount || 0; // discount percent or 0
      const discountedPrice = discount > 0
        ? product.price * (1 - discount / 100)
        : product.price;

      return {
        ...product.toJSON(),
        quantity: item?.quantity || 1,
        discount,
        discountedPrice: +discountedPrice.toFixed(2),
        stock: product.stock || 0, // include stock info for frontend use
      };
    });

    res.json({ success: true, cartItems });
  } catch (error) {
    console.error("Error in getCartProducts:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Add a product to user's cart or increase its quantity if already present,
 * with stock availability check.
 */
export const addToCart = async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, message: "productId is required" });
    }

    const user = req.user;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (product.stock <= 0) {
      return res.status(400).json({ success: false, message: "Product is out of stock" });
    }

    const existingItem = user.cartItems.find(
      item => item.product && item.product.toString() === productId
    );

    if (existingItem) {
      if (existingItem.quantity + 1 > product.stock) {
        return res.status(400).json({ success: false, message: "Insufficient stock available" });
      }
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

/**
 * Remove a product from user's cart by its product ID.
 */
export const removeFromCart = async (req, res) => {
  try {
    const productId = req.params.id;
    if (!productId) {
      return res.status(400).json({ success: false, message: "productId is required" });
    }

    const user = req.user;

    const prevCount = user.cartItems.length;
    user.cartItems = user.cartItems.filter(
      item => item.product && item.product.toString() !== productId
    );

    if (user.cartItems.length === prevCount) {
      return res.status(404).json({ success: false, message: "Product not found in cart" });
    }

    await user.save();
    res.json({ success: true, cartItems: user.cartItems });
  } catch (error) {
    console.error("Error in removeFromCart:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Update quantity of a product in user's cart or remove it if quantity is zero or less,
 * with stock check.
 */
export const updateQuantity = async (req, res) => {
  try {
    const productId = req.params.id;
    const { quantity } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: "productId is required" });
    }

    if (quantity == null || isNaN(quantity)) {
      return res.status(400).json({ success: false, message: "Valid quantity is required" });
    }

    const user = req.user;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (quantity > product.stock) {
      return res.status(400).json({ success: false, message: "Insufficient stock available" });
    }

    const item = user.cartItems.find(
      item => item.product && item.product.toString() === productId
    );

    if (!item) {
      return res.status(404).json({ success: false, message: "Product not in cart" });
    }

    if (quantity <= 0) {
      user.cartItems = user.cartItems.filter(
        item => item.product && item.product.toString() !== productId
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

/**
 * Remove all items from user's cart.
 */
export const removeAllFromCart = async (req, res) => {
  try {
    const user = req.user;
    user.cartItems = [];
    await user.save();
    res.json({ success: true, cartItems: [] });
  } catch (error) {
    console.error("Error in removeAllFromCart:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
