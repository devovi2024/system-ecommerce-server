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
    const { title, description, price, images, category, discount, stock } = req.body;

    // Validate category
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({ message: "Invalid category ID" });
    }

    // Validate images
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ message: "Please provide at least one image" });
    }
    if (images.length > 4) {
      return res.status(400).json({ message: "Maximum 4 images allowed" });
    }

    // Validate stock
    if (stock == null || isNaN(stock) || stock < 0) {
      return res.status(400).json({ message: "Stock must be a non-negative number" });
    }

    // Upload images to Cloudinary
    const uploadedImages = [];
    for (const img of images) {
      const uploadResult = await cloudinary.uploader.upload(img, { folder: "products" });
      uploadedImages.push(uploadResult.secure_url);
    }

    const newProduct = await Product.create({
      title,
      description,
      price,
      discount: discount || 0,
      stock,
      images: uploadedImages,
      category,
    });

    res.status(201).json(newProduct);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { title, description, price, images, category, discount, stock } = req.body;

    let uploadedImages;
    if (images && Array.isArray(images)) {
      uploadedImages = [];
      for (const img of images) {
        const uploadResult = await cloudinary.uploader.upload(img, { folder: "products" });
        uploadedImages.push(uploadResult.secure_url);
      }
    }

    if (stock !== undefined && (isNaN(stock) || stock < 0)) {
      return res.status(400).json({ message: "Stock must be a non-negative number" });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      {
        ...(title && { title }),
        ...(description && { description }),
        ...(price && { price }),
        ...(category && { category }),
        ...(discount !== undefined && { discount }),
        ...(stock !== undefined && { stock }),
        ...(uploadedImages && { images: uploadedImages }),
      },
      { new: true }
    );

    if (!updatedProduct) return res.status(404).json({ message: "Product not found" });

    res.status(200).json(updatedProduct);
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Delete images from Cloudinary
    for (const url of product.images) {
      const publicId = url.split("/").pop().split(".")[0];
      try {
        await cloudinary.uploader.destroy(`products/${publicId}`);
      } catch (err) {
        // ignore cloudinary deletion errors
      }
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getDiscountedProducts = async (req, res) => {
  try {
    const discountedProducts = await Product.find({ discount: { $gt: 0 } }).populate("category");
    res.status(200).json({ products: discountedProducts });
  } catch (error) {
    console.error("Failed to fetch discounted products", error);
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
          images: 1,
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
      .select("_id title description price images")
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
