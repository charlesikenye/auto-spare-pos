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

export const checkOrphanedProducts = query({
    handler: async (ctx) => {
        const products = await ctx.db.query("products").collect();
        const shops = await ctx.db.query("shops").collect();
        const validShopIds = new Set(shops.map(s => s._id as string));

        const invalidProducts = products.filter(p => p.shopId && !validShopIds.has(p.shopId as string));

        // Group by the invalid shopId -> ProductGroup
        const details: Record<string, { productGroup: string, count: number, sampleSku: string }> = {};
        for (const p of invalidProducts) {
            const sid = p.shopId as string;
            if (!details[sid]) {
                details[sid] = { productGroup: p.ProductGroup, count: 0, sampleSku: p.sku };
            }
            details[sid].count += 1;
        }

        return details;
    }
});

export const getPilotProducts = query({
    handler: async (ctx) => {
        const all = await ctx.db.query("products").collect();
        return all
            .filter(p => !p.imageUrl)
            .slice(0, 20)
            .map(p => ({
                id: p._id,
                sku: p.sku,
                name: p.name,
                supplier: p.supplier,
                category: p.category,
                description: p.description,
            }));
    }
});
