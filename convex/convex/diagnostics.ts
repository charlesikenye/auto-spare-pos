import { query } from "./_generated/server";

export const checkDataDistribution = query({
    handler: async (ctx) => {
        const products = await ctx.db.query("products").collect();
        const shops = await ctx.db.query("shops").collect();
        const shopMap = new Map(shops.map(s => [s._id as string, s.code]));

        const distribution: Record<string, number> = {};
        for (const p of products) {
            const key = p.shopId ? (shopMap.get(p.shopId as string) || "UnknownID") : "NoShopID";
            distribution[key] = (distribution[key] || 0) + 1;
        }

        return {
            totalProducts: products.length,
            distribution,
            shops: shops.map(s => ({ id: s._id, code: s.code, name: s.name }))
        };
    }
});
