import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { verifyRole } from "./users";

export const createSale = mutation({
  args: {
    callerId: v.id("users"),
    shopId: v.id("shops"),
    userId: v.id("users"),
    items: v.array(v.object({
      productId: v.id("products"),
      quantity: v.number(),
      price: v.number(),
    })),
    total: v.number(),
    paymentMethod: v.string(),
    mpesaCode: v.optional(v.string()),
    paymentProofUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await verifyRole(ctx, args.callerId, ["sales", "manager"]);
    // 0. Check for duplicate M-Pesa code if provided
    if (args.mpesaCode) {
      const existing = await ctx.db
        .query("sales")
        .withIndex("by_mpesa_code", (q) => q.eq("mpesaCode", args.mpesaCode!))
        .first();
      if (existing) {
        throw new Error("This M-Pesa transaction code has already been used for another sale.");
      }
    }

    // 1. Check stock and deduct
    for (const item of args.items) {
      const product = await ctx.db.get(item.productId);
      if (!product || product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product?.name || 'unknown product'}. Requested: ${item.quantity}, Available: ${product?.stock || 0}`);
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
  args: { shopId: v.optional(v.id("shops")) },
  handler: async (ctx, args) => {
    if (args.shopId) {
      return await ctx.db
        .query("sales")
        .withIndex("by_shop", (q) => q.eq("shopId", args.shopId!))
        .order("desc")
        .collect();
    }
    // No shopId = return all sales (admin view)
    return await ctx.db.query("sales").order("desc").collect();
  },
});

export const getReports = query({
  args: { shopId: v.optional(v.id("shops")) },
  handler: async (ctx, args) => {
    let sales;
    if (args.shopId) {
      sales = await ctx.db
        .query("sales")
        .withIndex("by_shop", (q) => q.eq("shopId", args.shopId!))
        .collect();
    } else {
      sales = await ctx.db.query("sales").collect();
    }

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
