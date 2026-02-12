import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  shops: defineTable({
    code: v.string(), // JA, JC, E1, E2, E3, E4
    name: v.string(),
    location: v.string(),
  }).index("by_code", ["code"]),

  users: defineTable({
    email: v.string(),
    password: v.string(), // In production, use Convex Auth/hashed passwords
    role: v.union(v.literal("admin"), v.literal("manager"), v.literal("sales")),
    shopId: v.optional(v.id("shops")),
    shopCode: v.optional(v.string()),
    name: v.string(),
    mustChangeCredentials: v.boolean(),
  }).index("by_email", ["email"]),

  products: defineTable({
    sku: v.string(),
    name: v.string(),
    price: v.number(),
    cost: v.number(),
    stock: v.number(),
    supplier: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    ProductGroup: v.string(), // Shop code
    shopId: v.optional(v.id("shops")),
  }).index("by_shop", ["shopId"])
    .index("by_product_group", ["ProductGroup"])
    .index("by_sku_shop", ["sku", "shopId"]),

  sales: defineTable({
    shopId: v.id("shops"),
    userId: v.id("users"),
    items: v.array(v.object({
      productId: v.id("products"),
      quantity: v.number(),
      price: v.number(),
    })),
    total: v.number(),
    paymentMethod: v.string(), // Cash, M-Pesa, etc.
    timestamp: v.number(),
    photoUrl: v.optional(v.string()),
  }).index("by_shop", ["shopId"]),

  inventory: defineTable({
    productId: v.id("products"),
    shopId: v.id("shops"),
    quantity: v.number(),
    lastUpdated: v.number(),
  }).index("by_product", ["productId"]),

  stockMovements: defineTable({
    productId: v.id("products"),
    shopId: v.id("shops"),
    type: v.union(v.literal("sale"), v.literal("restock"), v.literal("adjustment")),
    quantity: v.number(),
    timestamp: v.number(),
    note: v.optional(v.string()),
  }).index("by_product", ["productId"]),

  fileImports: defineTable({
    fileName: v.string(),
    status: v.string(), // pending, completed, failed
    type: v.string(), // products, inventory
    timestamp: v.number(),
  }),
});
