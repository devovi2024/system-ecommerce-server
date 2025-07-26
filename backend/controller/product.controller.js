import Product from "../models/product.model.js";
import Category from "../models/category.model.js";
import redis from "../lib/redis.js";
import cloudinary from "../lib/cloudinary.js";

export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({}).populate("category");
    res.json({ products });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
};

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

export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("reviews");
    if (!product) return res.status(404).json({ message: "Product not found" });

    res.status(200).json(product);
  } catch (error) {
    console.error("Get Product Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const createProduct = async (req, res) => {
  try {
    const { title, description, price, image, category } = req.body;

    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({ message: "Invalid category ID" });
    }

    let cloudinaryResponse = null;
    if (image) {
      cloudinaryResponse = await cloudinary.uploader.upload(image, { folder: "products" });
    }

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

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.image) {
      const publicId = product.image.split("/").pop().split(".")[0];
      try {
        await cloudinary.uploader.destroy(`products/${publicId}`);
      } catch {}
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

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

export const getProductsByCategory = async (req, res) => {
  const categoryParam = req.params.category;

  try {
    const category = await Category.findOne({ name: new RegExp(`^${categoryParam}$`, "i") });
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const products = await Product.find({ category: category._id }).populate("category", "name");
    res.status(200).json({ products });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const toggleFeaturedProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    product.isFeatured = !product.isFeatured;
    const updatedProduct = await product.save();

    await updateFeaturedProductsCache();

    res.json(updatedProduct);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

async function updateFeaturedProductsCache() {
  try {
    const featuredProducts = await Product.find({ isFeatured: true })
      .populate("category", "name")
      .lean();
    await redis.set("featured_products", JSON.stringify(featuredProducts));
  } catch {}
}

export const getRelatedProducts = async (req, res) => {
  const { id } = req.params;

  try {
    const currentProduct = await Product.findById(id);
    if (!currentProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    const related = await Product.find({
      _id: { $ne: currentProduct._id },
      category: currentProduct.category,
    })
      .limit(6)
      .lean();

    res.json({ relatedProducts: related });
  } catch (error) {
    console.error("Related product fetch error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getPeopleAlsoBought = async (req, res) => {
  const { id } = req.params;

  try {
    const currentProduct = await Product.findById(id);
    if (!currentProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    const peopleAlsoBought = await Product.find({
      _id: { $ne: currentProduct._id },
      category: currentProduct.category,
    })
      .limit(6)
      .select("_id title description price image")
      .lean();

    res.json({ peopleAlsoBought });
  } catch (error) {
    console.error("People Also Bought fetch error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getTopRatedProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .sort({ averageRating: -1 })
      .limit(20)
      .populate("reviews");

    res.status(200).json({ success: true, products });
  } catch (error) {
    console.error("Top Rated Products Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};