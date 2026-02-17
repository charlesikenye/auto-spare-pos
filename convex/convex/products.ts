import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import { verifyRole } from "./users";

export const getProductsForShop = query({
  args: { shopId: v.optional(v.id("shops")), shopCode: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.shopId) {
      return await ctx.db
        .query("products")
        .withIndex("by_shop", (q) => q.eq("shopId", args.shopId!))
        .collect();
    }
    if (args.shopCode) {
      return await ctx.db
        .query("products")
        .withIndex("by_product_group", (q) => q.eq("ProductGroup", args.shopCode!))
        .collect();
    }
    // If no filter, return all (for admins)
    return await ctx.db.query("products").collect();
  },
});

export const getLowStock = query({
  args: { shopId: v.optional(v.id("shops")) },
  handler: async (ctx, args) => {
    let products;
    if (args.shopId) {
      products = await ctx.db
        .query("products")
        .withIndex("by_shop", (q) => q.eq("shopId", args.shopId!))
        .collect();
    } else {
      // No shopId = return all (admin view)
      products = await ctx.db.query("products").collect();
    }
    return products.filter((p) => p.stock < 5);
  },
});

export const updateStock = mutation({
  args: {
    callerId: v.id("users"),
    productId: v.id("products"),
    quantity: v.number(),
    type: v.string()
  },
  handler: async (ctx, args) => {
    await verifyRole(ctx, args.callerId, ["admin", "manager"]);
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");

    const newStock = product.stock + args.quantity;
    await ctx.db.patch(args.productId, { stock: newStock });

    await ctx.db.insert("stockMovements", {
      productId: args.productId,
      shopId: product.shopId!,
      type: args.type as any,
      quantity: args.quantity,
      timestamp: Date.now(),
    });
  },
});

export const createProduct = mutation({
  args: {
    callerId: v.id("users"),
    sku: v.string(),
    name: v.string(),
    price: v.number(),
    cost: v.number(),
    stock: v.number(),
    category: v.optional(v.string()),
    description: v.optional(v.string()),
    shopId: v.id("shops"),
    shopCode: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyRole(ctx, args.callerId, ["admin", "manager"]);
    return await ctx.db.insert("products", {
      sku: args.sku,
      name: args.name,
      price: args.price,
      cost: args.cost,
      stock: args.stock,
      category: args.category,
      description: args.description,
      shopId: args.shopId,
      ProductGroup: args.shopCode,
    });
  },
});

export const updateProduct = mutation({
  args: {
    callerId: v.id("users"),
    productId: v.id("products"),
    name: v.optional(v.string()),
    sku: v.optional(v.string()),
    price: v.optional(v.number()),
    cost: v.optional(v.number()),
    stock: v.optional(v.number()),
    category: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await verifyRole(ctx, args.callerId, ["admin", "manager"]);
    const { productId, callerId, ...updates } = args;
    const product = await ctx.db.get(productId);
    if (!product) throw new Error("Product not found");

    const patch: any = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.sku !== undefined) patch.sku = updates.sku;
    if (updates.price !== undefined) patch.price = updates.price;
    if (updates.cost !== undefined) patch.cost = updates.cost;
    if (updates.stock !== undefined) patch.stock = updates.stock;
    if (updates.category !== undefined) patch.category = updates.category;
    if (updates.description !== undefined) patch.description = updates.description;

    await ctx.db.patch(productId, patch);
  },
});

export const bulkAssignShopIds = mutation({
  args: {},
  handler: async (ctx) => {
    const shops = await ctx.db.query("shops").collect();
    const shopMap = new Map(shops.map(s => [s.code, s._id]));

    const products = await ctx.db.query("products").collect();
    for (const product of products) {
      const shopId = shopMap.get(product.ProductGroup);
      if (shopId && product.shopId !== shopId) {
        await ctx.db.patch(product._id, { shopId });
      }
    }
  },
});
export const importProducts = mutation({
  args: {
    callerId: v.id("users"),
    items: v.array(v.any()), // Using any for initial import to handle raw JSON
  },
  handler: async (ctx, args) => {
    await verifyRole(ctx, args.callerId, ["admin", "manager"]);
    const shops = await ctx.db.query("shops").collect();
    const shopMap = new Map(shops.map((s) => [s.code, s._id]));

    let count = 0;
    for (const item of args.items) {
      // Data Cleaning
      const shopCode = item.ProductGroup || "E1";
      const shopId = shopMap.get(shopCode);

      const cleanNumber = (val: any) => {
        if (typeof val === "number") return val;
        if (!val) return 0;
        return parseFloat(val.toString().replace(/,/g, ""));
      };

      const cleanBool = (val: any) => val === "1" || val === 1 || val === true;

      await ctx.db.insert("products", {
        sku: item.SKU || `SKU-${Date.now()}-${count}`,
        name: item.Name || "Unknown Product",
        barcode: item.Barcode || undefined,
        price: cleanNumber(item.Price),
        cost: cleanNumber(item.Cost),
        stock: 0, // Default to 0 stock on import
        supplier: item.Supplier || undefined,
        description: item.Description || undefined,
        category: undefined, // Could infer from name or description
        ProductGroup: shopCode,
        shopId: shopId,
        measurementUnit: item.MeasurementUnit || "pcs",
        taxPercent: cleanNumber(item.TaxPercent),
        reorderPoint: cleanNumber(item.ReorderPoint),
        isTaxInclusive: cleanBool(item.IsTaxInclusivePrice),
        isPriceChangeAllowed: cleanBool(item.IsPriceChangeAllowed),
        isService: cleanBool(item.IsService),
        isEnabled: cleanBool(item.IsEnabled),
        preferredQuantity: cleanNumber(item.PreferredQuantity),
        warningQuantity: cleanNumber(item.WarningQuantity),
      });
      count++;
    }
    return count;
  },
});

export const parseFileImport = action({
  args: {
    callerId: v.id("users"),
    csvContent: v.string(),
    shopId: v.id("shops"),
    shopCode: v.string(),
    fileName: v.string(),
  },
  handler: async (ctx, args): Promise<{ imported: number; errors: string[] }> => {
    const user = await ctx.runQuery(api.users.getUserById as any, { userId: args.callerId });
    if (!user || (user.role !== "admin" && user.role !== "manager")) {
      throw new Error("Unauthorized: Only Admins or Managers can import products.");
    }
    const errors: string[] = [];
    const lines = args.csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);

    if (lines.length < 2) {
      return { imported: 0, errors: ["File is empty or has no data rows."] };
    }

    // Parse CSV header
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseCSVLine(lines[0]).map(h => h.replace(/^["']|["']$/g, '').trim());

    // Map common header names to our schema fields
    const headerMap: Record<string, string> = {};
    headers.forEach((h, i) => {
      const lower = h.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (lower.includes('sku') || lower.includes('itemcode')) headerMap['sku'] = headers[i];
      else if (lower.includes('name') || lower.includes('description') || lower.includes('itemname')) headerMap['name'] = headers[i];
      else if (lower.includes('barcode')) headerMap['barcode'] = headers[i];
      else if (lower === 'price' || lower.includes('sellingprice') || lower.includes('retailprice')) headerMap['price'] = headers[i];
      else if (lower === 'cost' || lower.includes('costprice') || lower.includes('purchaseprice')) headerMap['cost'] = headers[i];
      else if (lower.includes('stock') || lower.includes('quantity') || lower.includes('onhand')) headerMap['stock'] = headers[i];
      else if (lower.includes('category') || lower.includes('group') || lower.includes('productgroup')) headerMap['category'] = headers[i];
      else if (lower.includes('supplier') || lower.includes('vendor')) headerMap['supplier'] = headers[i];
      else if (lower.includes('unit') || lower.includes('measurement')) headerMap['unit'] = headers[i];
    });

    // Parse rows
    const products: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);
        const row: Record<string, string> = {};
        headers.forEach((h, j) => {
          row[h] = (values[j] || '').replace(/^["']|["']$/g, '');
        });

        const cleanNum = (val: string | undefined) => {
          if (!val) return 0;
          const n = parseFloat(val.replace(/[^0-9.\-]/g, ''));
          return isNaN(n) ? 0 : n;
        };

        const product = {
          sku: row[headerMap['sku'] || 'SKU'] || `CSV-${Date.now()}-${i}`,
          name: row[headerMap['name'] || 'Name'] || `Product Row ${i}`,
          barcode: row[headerMap['barcode'] || 'Barcode'] || undefined,
          price: cleanNum(row[headerMap['price'] || 'Price']),
          cost: cleanNum(row[headerMap['cost'] || 'Cost']),
          stock: cleanNum(row[headerMap['stock'] || 'Stock']),
          category: row[headerMap['category'] || 'Category'] || undefined,
          supplier: row[headerMap['supplier'] || 'Supplier'] || undefined,
          measurementUnit: row[headerMap['unit'] || 'Unit'] || 'pcs',
          shopId: args.shopId,
          ProductGroup: args.shopCode,
        };

        products.push(product);
      } catch (err) {
        errors.push(`Row ${i + 1}: Parse error`);
      }
    }

    // Insert in batches
    let imported = 0;
    for (const product of products) {
      try {
        await ctx.runMutation(api.products.createProduct, {
          callerId: args.callerId,
          sku: product.sku,
          name: product.name,
          price: product.price,
          cost: product.cost,
          stock: product.stock,
          category: product.category,
          shopId: product.shopId,
          shopCode: args.shopCode,
        });
        imported++;
      } catch (err) {
        errors.push(`Failed to import: ${product.name}`);
      }
    }

    // Track the import
    await ctx.runMutation(api.files.trackFileUpload as any, {
      fileName: args.fileName,
      status: errors.length > 0 ? "partial" : "complete",
      recordCount: imported,
    });

    return { imported, errors };
  },
});
