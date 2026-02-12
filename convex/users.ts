import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const login = query({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    
    if (user && user.password === args.password) {
      return user;
    }
    return null;
  },
});

export const createUser = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    role: v.union(v.literal("admin"), v.literal("manager"), v.literal("sales")),
    shopId: v.optional(v.id("shops")),
    shopCode: v.optional(v.string()),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // In a real app, check if the caller is an admin
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (existing) throw new Error("User already exists");

    return await ctx.db.insert("users", {
      ...args,
      mustChangeCredentials: true,
    });
  },
});

export const updateCredentials = mutation({
  args: { userId: v.id("users"), newPassword: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      password: args.newPassword,
      mustChangeCredentials: false,
    });
  },
});

export const getShops = query({
  handler: async (ctx) => {
    return await ctx.db.query("shops").collect();
  },
});
