import Product from "../models/product.model.js";
import User from "../models/user.model.js";
import Order from "../models/order.model.js";

export const getAnalyticsData = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();

    const salesData = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totalAmount" },
          totalRevenue: { $sum: "$totalAmount" }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    const { totalSales, totalRevenue } = salesData[0] || { totalSales: 0, totalRevenue: 0 };

    return {
      users: totalUsers,
      products: totalProducts,
      sales: totalSales,
      revenue: totalRevenue
    };
  } catch (error) {
    console.error("Error in getAnalyticsData:", error.message);
    return {
      users: 0,
      products: 0,
      sales: 0,
      revenue: 0
    };
  }
};

export const getDailySalesData = async (startDate, endDate) => {
  try {
    const dailySalesData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalSales: { $sum: "$totalAmount" },
          totalRevenue: { $sum: "$totalAmount" }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    const dateArray = getDateInRange(startDate, endDate);

    return dateArray.map(date => {
      const foundData = dailySalesData.find(item => item._id === date);
      return {
        date,
        totalSales: foundData ? foundData.totalSales : 0,
        totalRevenue: foundData ? foundData.totalRevenue : 0
      };
    });
  } catch (error) {
    console.error("Error in getDailySalesData:", error.message);
    return [];
  }
};

function getDateInRange(startDate, endDate) {
  const dates = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split("T")[0]; 
    dates.push(dateStr);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}
