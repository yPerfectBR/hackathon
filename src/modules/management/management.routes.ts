import { FastifyPluginAsync } from "fastify";
import { FinanceModel } from "../finance/finance.model";
import { OrderModel } from "../order/order.model";
import { ProductModel } from "../product/product.model";

export const managementRoutes: FastifyPluginAsync = async (app) => {
  app.get("/dashboard", async () => {
    const [ordersTotal, revenueData, pendingFinance, lowStockProducts] = await Promise.all([
      OrderModel.countDocuments(),
      OrderModel.aggregate([
        { $match: { status: "paid" } },
        { $group: { _id: null, total: { $sum: "$total" } } }
      ]),
      FinanceModel.countDocuments({ status: { $in: ["pending", "overdue"] } }),
      ProductModel.countDocuments({ stock: { $lte: 5 } })
    ]);

    return {
      ordersTotal,
      revenue: revenueData[0]?.total ?? 0,
      pendingFinance,
      lowStockProducts
    };
  });

  app.get("/reports/sales", async () => {
    const sales = await OrderModel.aggregate([
      { $match: { status: "paid" } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          totalAmount: { $sum: "$total" },
          orders: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);
    return sales;
  });

  app.get("/reports/delinquency", async () => {
    const now = new Date();
    const overdue = await FinanceModel.find({
      status: { $in: ["pending", "overdue"] },
      dueDate: { $lt: now }
    }).sort({ dueDate: 1 });
    return overdue;
  });

  app.get("/reports/products", async () => {
    const productReport = await OrderModel.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          name: { $first: "$items.name" },
          quantitySold: { $sum: "$items.quantity" },
          grossRevenue: { $sum: { $multiply: ["$items.quantity", "$items.unitPrice"] } }
        }
      },
      { $sort: { quantitySold: -1 } }
    ]);
    return productReport;
  });
};
