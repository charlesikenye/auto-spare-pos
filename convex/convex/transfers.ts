import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { verifyRole } from "./users";

export const createRequest = mutation({
    args: {
        callerId: v.id("users"),
        productId: v.id("products"),
        toShopId: v.id("shops"),
        fromShopId: v.optional(v.id("shops")), // Explicit if inter-region
        region: v.optional(v.string()), // Broadcast to this region if intra-region
        quantity: v.number(),
        type: v.union(v.literal("intra_region"), v.literal("inter_region")),
        requestedBy: v.id("users"),
    },
    handler: async (ctx, args) => {
        const user = await verifyRole(ctx, args.callerId, ["sales", "manager", "admin"]);
        const isAdmin = user.role === "admin";

        return await ctx.db.insert("transfers", {
            productId: args.productId,
            fromShopId: args.fromShopId,
            toShopId: args.toShopId,
            region: args.region,
            quantity: args.quantity,
            type: args.type,
            // Admin bypasses the payment lock
            status: (args.type === "inter_region" && !isAdmin) ? "awaiting_payment" : "pending",
            requestedBy: args.requestedBy,
            timestamp: Date.now(),
        });
    },
});

export const getRegionalBroadcasts = query({
    args: { region: v.string(), targetShopId: v.optional(v.id("shops")) },
    handler: async (ctx, args) => {
        const requests = await ctx.db
            .query("transfers")
            .withIndex("by_region", (q) => q.eq("region", args.region))
            .filter((q) => q.eq(q.field("status"), "pending"))
            .collect();

        // 1. Filter out requests made by the current shop (if provided)
        // 2. Check stock levels for fulfillment button
        return await Promise.all(
            requests.filter(r => args.targetShopId ? r.toShopId !== args.targetShopId : true).map(async (r) => {
                const product = await ctx.db.get(r.productId);
                const requester = await ctx.db.get(r.requestedBy);
                const destShop = await ctx.db.get(r.toShopId);

                // Find this product in the target shop to check stock (Admins see global or skip check)
                const myProduct = args.targetShopId ? await ctx.db
                    .query("products")
                    .withIndex("by_sku_shop", (q) => q.eq("sku", product!.sku).eq("shopId", args.targetShopId!))
                    .first() : null;

                const isLowStock = myProduct ? myProduct.stock <= (myProduct.reorderPoint || 0) : true;

                return {
                    ...r,
                    productName: product?.name,
                    requesterName: requester?.name,
                    toShopName: destShop?.name,
                    myStock: myProduct?.stock || 0,
                    isLowStock
                };
            })
        );
    },
});

export const getPendingRequests = query({
    args: { targetShopId: v.optional(v.id("shops")) },
    handler: async (ctx, args) => {
        let baseQuery = ctx.db.query("transfers");

        if (args.targetShopId) {
            baseQuery = baseQuery.filter((q) =>
                q.or(
                    q.eq(q.field("fromShopId"), args.targetShopId),
                    q.eq(q.field("toShopId"), args.targetShopId)
                )
            );
        }

        return await baseQuery
            .filter((innerQ) =>
                innerQ.or(
                    innerQ.eq(innerQ.field("status"), "pending"),
                    innerQ.eq(innerQ.field("status"), "awaiting_payment")
                )
            )
            .collect()
            .then(async (requests) => {
                return await Promise.all(
                    requests.map(async (r) => {
                        const product = await ctx.db.get(r.productId);
                        const requester = await ctx.db.get(r.requestedBy);
                        const toShop = await ctx.db.get(r.toShopId);
                        return { ...r, productName: product?.name, requesterName: requester?.name, toShopName: toShop?.name };
                    })
                );
            });
    },
});

export const getOutgoingInTransit = query({
    args: { targetShopId: v.optional(v.id("shops")) },
    handler: async (ctx, args) => {
        const query = args.targetShopId
            ? ctx.db.query("transfers").withIndex("by_from_shop", (q) => q.eq("fromShopId", args.targetShopId!))
            : ctx.db.query("transfers");

        return await query
            .filter((innerQ) => innerQ.eq(innerQ.field("status"), "in_transit"))
            .collect()
            .then(async (requests) => {
                return await Promise.all(
                    requests.map(async (r) => {
                        const product = await ctx.db.get(r.productId);
                        const toShop = await ctx.db.get(r.toShopId);
                        return { ...r, productName: product?.name, toShopName: toShop?.name };
                    })
                );
            });
    },
});

export const getIncomingTransfers = query({
    args: { targetShopId: v.optional(v.id("shops")) },
    handler: async (ctx, args) => {
        const query = args.targetShopId
            ? ctx.db.query("transfers").withIndex("by_to_shop", (q) => q.eq("toShopId", args.targetShopId!))
            : ctx.db.query("transfers");

        return await query
            .filter((q) => q.eq(q.field("status"), "in_transit"))
            .collect()
            .then(async (requests) => {
                return await Promise.all(
                    requests.map(async (r) => {
                        const product = await ctx.db.get(r.productId);
                        const sender = r.approvedBy ? await ctx.db.get(r.approvedBy) : null;
                        const fromShop = r.fromShopId ? await ctx.db.get(r.fromShopId) : null;
                        return {
                            ...r,
                            productName: product?.name,
                            senderName: sender?.name,
                            fromShopName: fromShop?.name
                        };
                    })
                );
            });
    },
});

export const uploadTransferPayment = mutation({
    args: {
        callerId: v.id("users"),
        transferId: v.id("transfers"),
        paymentProofUrl: v.string(),
    },
    handler: async (ctx, args) => {
        await verifyRole(ctx, args.callerId, ["sales", "manager", "admin"]);
        const transfer = await ctx.db.get(args.transferId);
        if (!transfer) throw new Error("Transfer not found");
        if (transfer.status !== "awaiting_payment") throw new Error("Payment can only be uploaded for inter-region transfers in 'awaiting_payment' status.");

        await ctx.db.patch(args.transferId, {
            paymentProofUrl: args.paymentProofUrl,
            status: "pending" // Now that it's paid, it becomes pending for the source shop to dispatch
        });
    },
});

export const dispatchTransfer = mutation({
    args: {
        callerId: v.id("users"),
        transferId: v.id("transfers"),
        approvedBy: v.id("users"),
        fromShopId: v.optional(v.id("shops")) // Required for regional 'claiming'
    },
    handler: async (ctx, args) => {
        const user = await verifyRole(ctx, args.callerId, ["manager", "admin"]);
        const isAdmin = user.role === "admin";
        const transfer = await ctx.db.get(args.transferId);
        if (!transfer) throw new Error("Transfer not found");
        if (transfer.status !== "pending") throw new Error("Transfer is not in a dispatchable state (must be 'pending').");

        // Enforce payment check for inter-region (Admins bypass)
        if (transfer.type === "inter_region" && !transfer.paymentProofUrl && !isAdmin) {
            throw new Error("Inter-region transfers require customer payment proof before dispatch.");
        }

        const sourceShopId = transfer.fromShopId || args.fromShopId;
        if (!sourceShopId) throw new Error("Source shop must be specified for dispatch.");

        const sourceProduct = await ctx.db.get(transfer.productId);
        if (!sourceProduct) throw new Error("Source product not found");

        const shopProduct = await ctx.db
            .query("products")
            .withIndex("by_sku_shop", q => q.eq("sku", sourceProduct.sku).eq("shopId", sourceShopId))
            .first();

        if (!shopProduct) throw new Error("Product not found in dispatching shop.");
        if (shopProduct.stock < transfer.quantity) throw new Error("Insufficient stock in source shop.");

        // 1. Deduct from source immediately
        await ctx.db.patch(shopProduct._id, { stock: shopProduct.stock - transfer.quantity });

        // 2. Record movement
        await ctx.db.insert("stockMovements", {
            productId: shopProduct._id,
            shopId: sourceShopId,
            type: "adjustment",
            quantity: -transfer.quantity,
            timestamp: Date.now(),
            note: `Regional Dispatch to ${transfer.toShopId}`,
        });

        // 3. Update transfer record
        await ctx.db.patch(transfer._id, {
            status: "in_transit",
            approvedBy: args.approvedBy,
            fromShopId: sourceShopId, // Claim the request if it was a broadcast
        });
    },
});

export const receiveTransfer = mutation({
    args: {
        callerId: v.id("users"),
        transferId: v.id("transfers"),
        receivedBy: v.id("users"),
        photoUrl: v.string()
    },
    handler: async (ctx, args) => {
        await verifyRole(ctx, args.callerId, ["sales", "manager", "admin"]);
        const transfer = await ctx.db.get(args.transferId);
        if (!transfer) throw new Error("Transfer not found");
        if (transfer.status !== "in_transit") throw new Error("Transfer is not in transit");
        if (!args.photoUrl) throw new Error("A photo of the delivery note is required.");

        const sourceProduct = await ctx.db.get(transfer.productId);
        if (!sourceProduct) throw new Error("Product metadata not found");

        // Find the corresponding product in the destination shop
        const destProduct = await ctx.db
            .query("products")
            .withIndex("by_sku_shop", (q) =>
                q.eq("sku", sourceProduct.sku).eq("shopId", transfer.toShopId)
            )
            .first();

        if (!destProduct) throw new Error("Product not found in receiving shop.");

        // 1. Add to destination
        await ctx.db.patch(destProduct._id, { stock: destProduct.stock + transfer.quantity });

        // 2. Record movement
        await ctx.db.insert("stockMovements", {
            productId: destProduct._id,
            shopId: transfer.toShopId,
            type: "restock",
            quantity: transfer.quantity,
            timestamp: Date.now(),
            note: `Received from ${transfer.fromShopId}`,
        });

        // 3. Complete transfer
        await ctx.db.patch(transfer._id, {
            status: "completed",
            receivedBy: args.receivedBy,
            deliveryPhotoUrl: args.photoUrl,
        });
    },
});
