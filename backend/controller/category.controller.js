import Category from "../models/category.model.js";
import redis from "../lib/redis.js";

/**
 * Get all categories, using Redis cache for faster response.
 */
export const getAllCategories = async (req, res) => {
  try {
    let categories = await redis.get("all_categories");

    if (categories) {
      return res.json({ categories: JSON.parse(categories) });
    }

    categories = await Category.find({});
    await redis.set("all_categories", JSON.stringify(categories));
    res.json({ categories });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Get a single category by its ID.
 */
export const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    res.json(category);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Create a new category if it doesn't already exist.
 */
export const createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const existing = await Category.findOne({ name });
    if (existing) {
      return res.status(400).json({ message: "Category already exists" });
    }

    const newCategory = await Category.create({ name });
    await updateCategoryCache();
    res.status(201).json(newCategory);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Update an existing category by ID.
 */
export const updateCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    category.name = name || category.name;
    const updatedCategory = await category.save();

    await updateCategoryCache();
    res.json(updatedCategory);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Delete a category by ID.
 */
export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    await Category.findByIdAndDelete(req.params.id);
    await updateCategoryCache();
    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Internal helper to update cached category list in Redis.
 */
async function updateCategoryCache() {
  try {
    const categories = await Category.find({});
    await redis.set("all_categories", JSON.stringify(categories));
  } catch {
  }
}
