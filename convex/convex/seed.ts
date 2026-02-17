import { mutation } from "./_generated/server";

export const seed = mutation({
  handler: async (ctx) => {
    // 1. Create Shops
    const shops = [
      { code: "JA", name: "JA Shop", location: "Nyeri", region: "Nyeri" },
      { code: "JC", name: "JC Shop", location: "Nyeri", region: "Nyeri" },
      { code: "E1", name: "E1 Shop", location: "Nakuru", region: "Nakuru" },
      { code: "E2", name: "E2 Shop", location: "Nakuru", region: "Nakuru" },
      { code: "E3", name: "E3 Shop", location: "Nakuru", region: "Nakuru" },
      { code: "E4", name: "E4 Shop", location: "Nakuru", region: "Nakuru" },
    ];
    const shopIds: Record<string, any> = {};
    for (const s of shops) {
      const id = await ctx.db.insert("shops", s);
      shopIds[s.code] = id;
    }

    // 2. Create Admin User
    await ctx.db.insert("users", {
      email: "admin@autospare.com",
      password: "password123",
      role: "admin",
      name: "Main Admin",
      mustChangeCredentials: true,
    });

    // 3. Create Shop User
    await ctx.db.insert("users", {
      email: "ja@autospare.com",
      password: "password123",
      role: "sales",
      shopId: shopIds["JA"],
      shopCode: "JA",
      name: "JA Sales",
      mustChangeCredentials: false,
    });

    // 4. Create Sample Products
    const products = [
      { sku: "BRK-001", name: "Brake Pads - Front", price: 2500, cost: 1800, stock: 10, ProductGroup: "JA", shopId: shopIds["JA"], category: "Brakes" },
      { sku: "OIL-002", name: "Engine Oil 5W30", price: 4500, cost: 3200, stock: 3, ProductGroup: "JA", shopId: shopIds["JA"], category: "Lubricants" },
      { sku: "FLT-003", name: "Air Filter", price: 1200, cost: 800, stock: 20, ProductGroup: "JA", shopId: shopIds["JA"], category: "Filters" },
    ];
    for (const p of products) {
      await ctx.db.insert("products", p);
    }
  },
});
