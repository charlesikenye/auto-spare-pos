import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";

export const getProductsForShop = query({
  args: { shopId: v.optional(v.id("shops")), shopCode: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.shopId) {
      return await ctx.db
        .query("products")
        .withIndex("by_shop", (q) => q.eq("shopId", args.shopId!))
        .collect();
    }
    if (args.shopCode) {
      return await ctx.db
        .query("products")
        .withIndex("by_product_group", (q) => q.eq("ProductGroup", args.shopCode!))
        .collect();
    }
    return [];
  },
});

export const getLowStock = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_shop", (q) => q.eq("shopId", args.shopId))
      .collect();
    return products.filter((p) => p.stock < 5);
  },
});

export const updateStock = mutation({
  args: { productId: v.id("products"), quantity: v.number(), type: v.string() },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");
    
    const newStock = product.stock + args.quantity;
    await ctx.db.patch(args.productId, { stock: newStock });
    
    await ctx.db.insert("stockMovements", {
      productId: args.productId,
      shopId: product.shopId!,
      type: args.type as any,
      quantity: args.quantity,
      timestamp: Date.now(),
    });
  },
});

export const bulkAssignShopIds = mutation({
  args: {},
  handler: async (ctx) => {
    const shops = await ctx.db.query("shops").collect();
    const shopMap = new Map(shops.map(s => [s.code, s._id]));
    
    const products = await ctx.db.query("products").collect();
    for (const product of products) {
      const shopId = shopMap.get(product.ProductGroup);
      if (shopId && product.shopId !== shopId) {
        await ctx.db.patch(product._id, { shopId });
      }
    }
  },
});
