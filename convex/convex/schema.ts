import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  shops: defineTable({
    code: v.string(), // JA, JC, E1, E2, E3, E4
    name: v.string(),
    location: v.optional(v.string()),
    region: v.optional(v.string()), // Nyeri, Nakuru, etc.
  }).index("by_code", ["code"])
    .index("by_region", ["region"]),

  users: defineTable({
    email: v.string(),
    password: v.string(), // In production, use Convex Auth/hashed passwords
    role: v.union(v.literal("admin"), v.literal("manager"), v.literal("sales")),
    shopId: v.optional(v.id("shops")),
    shopCode: v.optional(v.string()),
    name: v.string(),
    mustChangeCredentials: v.boolean(),
    allowedTabs: v.optional(v.array(v.string())),
  }).index("by_email", ["email"]),

  products: defineTable({
    sku: v.string(),
    name: v.string(),
    barcode: v.optional(v.string()),
    price: v.number(),
    cost: v.number(),
    stock: v.number(),
    supplier: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    ProductGroup: v.string(), // Shop code
    shopId: v.optional(v.id("shops")),
    measurementUnit: v.optional(v.string()),
    taxPercent: v.optional(v.number()),
    reorderPoint: v.optional(v.number()),
    isTaxInclusive: v.optional(v.boolean()),
    isPriceChangeAllowed: v.optional(v.boolean()),
    isService: v.optional(v.boolean()),
    isEnabled: v.optional(v.boolean()),
    preferredQuantity: v.optional(v.number()),
    warningQuantity: v.optional(v.number()),
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
    mpesaCode: v.optional(v.string()),
    paymentProofUrl: v.optional(v.string()),
    timestamp: v.number(),
    photoUrl: v.optional(v.string()), // Generic photo, keeping for compatibility
  }).index("by_shop", ["shopId"])
    .index("by_mpesa_code", ["mpesaCode"]),

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

  fileUploads: defineTable({
    fileName: v.string(),
    fileUrl: v.string(),
    shopId: v.id("shops"),
    status: v.string(), // e.g., "uploaded", "processing", "completed"
    uploadedAt: v.number(),
    uploadedBy: v.id("users"),
  }).index("by_shop", ["shopId"]),

  transfers: defineTable({
    productId: v.id("products"),
    fromShopId: v.optional(v.id("shops")), // Optional for regional broadcast
    toShopId: v.id("shops"),
    region: v.optional(v.string()), // The region this transfer is broadcast to
    quantity: v.number(),
    type: v.union(v.literal("intra_region"), v.literal("inter_region")),
    status: v.union(
      v.literal("pending"),
      v.literal("awaiting_payment"),
      v.literal("in_transit"),
      v.literal("approved"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    requestedBy: v.id("users"),
    approvedBy: v.optional(v.id("users")),
    receivedBy: v.optional(v.id("users")),
    paymentProofUrl: v.optional(v.string()), // Needed for inter-region before dispatch
    deliveryPhotoUrl: v.optional(v.string()),
    expectedArrival: v.optional(v.number()), // Timestamp for timeline
    timestamp: v.number(),
  }).index("by_from_shop", ["fromShopId"])
    .index("by_to_shop", ["toShopId"])
    .index("by_region", ["region"])
    .index("by_status", ["status"]),
});
