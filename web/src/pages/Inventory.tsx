import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Plus, Search, AlertTriangle } from 'lucide-react';

export default function Inventory({ user }: { user: any }) {
  const products = useQuery(api.products.getProductsForShop, { shopId: user.shopId });

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Inventory Management</h1>
          <p className="text-gray-500">Managing stock for {user.shopCode}</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700">
          <Plus size={20} />
          <span>Add Product</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search products by SKU or name..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 border-b text-gray-600 uppercase text-xs font-semibold">
              <th className="px-6 py-4">SKU</th>
              <th className="px-6 py-4">Product Name</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4 text-right">Price (KSh)</th>
              <th className="px-6 py-4 text-center">Stock</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products?.map((product) => (
              <tr key={product._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-mono text-sm">{product.sku}</td>
                <td className="px-6 py-4 font-medium">{product.name}</td>
                <td className="px-6 py-4 text-gray-500">{product.category || 'N/A'}</td>
                <td className="px-6 py-4 text-right">{product.price.toLocaleString()}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`font-semibold ${product.stock < 5 ? 'text-red-600' : 'text-gray-900'}`}>
                    {product.stock}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {product.stock < 5 ? (
                    <span className="flex items-center space-x-1 text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-bold">
                      <AlertTriangle size={12} />
                      <span>LOW STOCK</span>
                    </span>
                  ) : (
                    <span className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-bold">IN STOCK</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
