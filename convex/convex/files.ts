import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const trackFileUpload = mutation({
    args: {
        fileName: v.string(),
        fileUrl: v.string(),
        shopId: v.id("shops"),
        status: v.string(),
        uploadedAt: v.number(),
        uploadedBy: v.id("users"),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("fileUploads", {
            fileName: args.fileName,
            fileUrl: args.fileUrl,
            shopId: args.shopId,
            status: args.status,
            uploadedAt: args.uploadedAt,
            uploadedBy: args.uploadedBy,
        });
    },
});

export const getFileUploads = query({
    args: { shopId: v.id("shops") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("fileUploads")
            .withIndex("by_shop", (q) => q.eq("shopId", args.shopId))
            .order("desc")
            .collect();
    },
});

export const generateUploadUrl = mutation(async (ctx) => {
    return await ctx.storage.generateUploadUrl();
});
