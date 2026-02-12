import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const createSale = mutation({
  args: {
    shopId: v.id("shops"),
    userId: v.id("users"),
    items: v.array(v.object({
      productId: v.id("products"),
      quantity: v.number(),
      price: v.number(),
    })),
    total: v.number(),
    paymentMethod: v.string(),
    photoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Check stock and deduct
    for (const item of args.items) {
      const product = await ctx.db.get(item.productId);
      if (!product || product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product?.name || 'unknown product'}`);
      }
      
      await ctx.db.patch(item.productId, {
        stock: product.stock - item.quantity,
      });

      await ctx.db.insert("stockMovements", {
        productId: item.productId,
        shopId: args.shopId,
        type: "sale",
        quantity: -item.quantity,
        timestamp: Date.now(),
      });
    }

    // 2. Record sale
    const saleId = await ctx.db.insert("sales", {
      ...args,
      timestamp: Date.now(),
    });

    return saleId;
  },
});

export const getSalesForShop = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sales")
      .withIndex("by_shop", (q) => q.eq("shopId", args.shopId))
      .order("desc")
      .collect();
  },
});

export const getReports = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, args) => {
    const sales = await ctx.db
      .query("sales")
      .withIndex("by_shop", (q) => q.eq("shopId", args.shopId))
      .collect();
    
    // Simple daily sales aggregation
    const dailySales: Record<string, number> = {};
    sales.forEach(s => {
      const date = new Date(s.timestamp).toLocaleDateString();
      dailySales[date] = (dailySales[date] || 0) + s.total;
    });

    return {
      dailySales,
      totalSales: sales.length,
      revenue: sales.reduce((acc, s) => acc + s.total, 0),
    };
  },
});
