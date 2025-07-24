import Product from "../models/product.model.js";
import Category from "../models/category.model.js";
import redis from "../lib/redis.js";
import cloudinary from "../lib/cloudinary.js";

/**
 * Get all products with populated category data.
 */
export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({}).populate("category");
    res.json({ products });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get featured products either from Redis cache or database.
 */
export const getFeaturedProducts = async (req, res) => {
  try {
    let featuredProducts = await redis.get("featured_products");
    if (featuredProducts) {
      return res.json(JSON.parse(featuredProducts));
    }
    featuredProducts = await Product.find({ isFeatured: true })
      .populate("category", "name")
      .lean();

    if (!featuredProducts) {
      return res.status(404).json({ message: "No featured products found" });
    }

    await redis.set("featured_products", JSON.stringify(featuredProducts));
    res.json(featuredProducts);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Get a single product by its ID, including category name.
 */
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category", "name");
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Create a new product with optional image upload to Cloudinary.
 */
export const createProduct = async (req, res) => {
  try {
    const { title, description, price, image, category } = req.body;

    // Validate category existence
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({ message: "Invalid category ID" });
    }

    // Upload image to Cloudinary if provided
    let cloudinaryResponse = null;
    if (image) {
      cloudinaryResponse = await cloudinary.uploader.upload(image, { folder: "products" });
    }

    // Create product document
    const product = await Product.create({
      title,
      description,
      price,
      image: cloudinaryResponse?.secure_url || "",
      category,
    });

    res.status(201).json(product);
  } catch (error) {
    console.error("❌ Product creation failed:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Delete a product by ID, including its Cloudinary image.
 */
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Delete image from Cloudinary if exists
    if (product.image) {
      const publicId = product.image.split("/").pop().split(".")[0];
      try {
        await cloudinary.uploader.destroy(`products/${publicId}`);
      } catch {
        // Ignore errors during image deletion
      }
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Get 4 random recommended products.
 */
export const getRecommendedProducts = async (req, res) => {
  try {
    const products = await Product.aggregate([
      { $sample: { size: 4 } },
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          image: 1,
          price: 1,
        },
      },
    ]);
    res.json(products);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Get products by category name (case-insensitive).
 */
export const getProductsByCategory = async (req, res) => {
  const categoryParam = req.params.category;

  try {
    // Find category by name ignoring case
    const category = await Category.findOne({ name: new RegExp(`^${categoryParam}$`, "i") });
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Find products belonging to the category
    const products = await Product.find({ category: category._id }).populate("category", "name");

    res.status(200).json({ products });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Toggle the 'isFeatured' status of a product by ID.
 */
export const toggleFeaturedProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    product.isFeatured = !product.isFeatured;
    const updatedProduct = await product.save();

    // Update cached featured products in Redis
    await updateFeaturedProductsCache();

    res.json(updatedProduct);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Internal helper to update Redis cache of featured products.
 */
async function updateFeaturedProductsCache() {
  try {
    const featuredProducts = await Product.find({ isFeatured: true })
      .populate("category", "name")
      .lean();
    await redis.set("featured_products", JSON.stringify(featuredProducts));
  } catch {
  }
}
