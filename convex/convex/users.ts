// Forced re-sync of user mutations
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const verifyRole = async (ctx: any, userId: any, allowedRoles: string[]) => {
  const user = await ctx.db.get(userId);
  if (!user || !allowedRoles.includes(user.role)) {
    throw new Error("Unauthorized: You do not have permission to perform this action.");
  }
  return user;
};

export const authenticate = mutation({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (user && user.password === args.password) {
      return user;
    }
    throw new Error("Invalid email or password");
  },
});

export const createUser = mutation({
  args: {
    callerId: v.id("users"),
    email: v.string(),
    password: v.string(),
    role: v.union(v.literal("admin"), v.literal("manager"), v.literal("sales")),
    shopId: v.optional(v.id("shops")),
    shopCode: v.optional(v.string()),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyRole(ctx, args.callerId, ["admin"]);
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

export const updateUser = mutation({
  args: {
    callerId: v.id("users"),
    userId: v.id("users"),
    name: v.optional(v.string()),
    role: v.optional(v.union(v.literal("admin"), v.literal("manager"), v.literal("sales"))),
    shopId: v.optional(v.id("shops")),
    shopCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await verifyRole(ctx, args.callerId, ["admin"]);
    const { userId, callerId, ...updates } = args;
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const patch: any = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.role !== undefined) patch.role = updates.role;
    if (updates.shopId !== undefined) patch.shopId = updates.shopId;
    if (updates.shopCode !== undefined) patch.shopCode = updates.shopCode;

    await ctx.db.patch(userId, patch);
  },
});

export const getUsers = query({
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

export const deleteUser = mutation({
  args: { callerId: v.id("users"), userId: v.id("users") },
  handler: async (ctx, args) => {
    await verifyRole(ctx, args.callerId, ["admin"]);
    await ctx.db.delete(args.userId);
  },
});

export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const getShops = query({
  handler: async (ctx) => {
    return await ctx.db.query("shops").collect();
  },
});
