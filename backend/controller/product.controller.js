import redis from "../lib/redis.js";
import Product from "../models/product.model.js";
import cloudinary from "../lib/cloudinary.js"; 
export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({});
    return res.status(200).json({ products }); 
  } catch (error) {
    console.error('Product fetch error:', error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};



export const getFeaturedProducts = async (req, res) =>{
  try {
    let featuredProducts = await redis.get("featured_products")
    if(featuredProducts){
      return res.status(200).json(JSON.parse(featuredProducts))
    }

    // if not to redis then to mongodb
    featuredProducts = await Product.find({isFeatured: true}).lean();
    if(!featuredProducts){
      return res.status(200).json({success: false, message: "No featured products found"})
    }
    
    await redis.set("featured_products", JSON.stringify(featuredProducts));
    return res.status(200).json(featuredProducts);
  } catch (error) {
    console.error('Product fetch error:', error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}



export const createProduct = async (req, res) => {
  try {
    const { title, description, price, category } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Image file is required" });
    }

    const streamUpload = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "products" },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        stream.end(req.file.buffer);
      });
    };

    const uploadResult = await streamUpload();

    const product = await Product.create({
      title,
      description,
      price,
      category,
      image: uploadResult.secure_url,
    });

    res.status(201).json({ success: true, product });
  } catch (error) {
    console.error("Product creation error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deleteProduct = async (req, res) =>{
  try {
    const product = await Product.findById(req.params.id);
    if(!product){
      return res.status(404).json({success: false, message: "Product not found"})
    }

    if(product.image){
      const publicId = product.image.split("/").pop().split(".")[0];
      try {
        await cloudinary.uploader.destroy(`products/${publicId}`)
        console.log("deleted from cloudinary");

      } catch (error) {
        console.error("Error deleting from cloudinary:", error.message);   
      }
    }

    await Product.findByIdAndDelete(req.params.id);
    return res.status(200).json({success: true, message: "Product deleted"})

  } catch (error) {
    console.error('Product deletion error:', error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export const getRecommendedProducts = async (req, res) => {
  try {
    const products = await Product.aggregate([
      {
        $sample: { size: 3 }
      },
      {
        $project: {
          _id:1,
          name:1,
          description:1,
          image:1,
          price:1
        }
      }
    ])

    res.json(products);

  } catch (error) {
    console.error('Product fetch error:', error.message);
    return res.status(500).json({ success: false, message: "Server error" });
    
  }
}




export const getProductsByCategory = async (req, res) => {
  const { category } = req.params;
  try {
    const products = await Product.find({ category: category.toLowerCase() });

    if (!products || products.length === 0) {
      return res.status(404).json({ message: "No products found in this category." });
    }

    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



export const toggleFeaturedProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      product.isFeatured = !product.isFeatured;
      const updatedProduct = await product.save();
      await updateProductCache();

      // ✅ Only return `featured` for frontend
      return res.status(200).json({ featured: updatedProduct.isFeatured });
    } else {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
  } catch (error) {
    console.error("Error in toggleFeaturedProduct controller:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};



async function updateProductCache() {
  try {
    const featuredProducts = await Product.find({isFeatured: true}).lean();
    await redis.set("featured_products", JSON.stringify(featuredProducts));
  } catch (error) {
    console.error('Error in updateProductCache:', error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}