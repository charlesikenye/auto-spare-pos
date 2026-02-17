import { mutation } from "./_generated/server";

export const backfillRegion = mutation({
    handler: async (ctx) => {
        const shops = await ctx.db.query("shops").collect();
        for (const shop of shops) {
            if (!shop.region && shop.location) {
                // Simple mapping: Use location as region for now
                await ctx.db.patch(shop._id, { region: shop.location });
            }
        }
    },
});
