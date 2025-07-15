import Product from "../models/product.model";
import User from "../models/user.model";
import Order from "../models/order.model.js";

export const getAnalyticsData = async (req, res) =>{
    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();

    const salesData = await Order.aggregate([
        {
            $group : {
                _id : null,
                totalSales : { $sum : "$totalAmount" },
                totalRevenue : { $sum : "$totalAmount" }
            }
        }
    ])

    const {totalSales, totalRevenue} = salesData(0) || {totalSales:0, totalRevenue:0};
    return {
        users: totalUsers,
        products: totalProducts,
        sales: totalSales,
        revenue: totalRevenue
    }
}