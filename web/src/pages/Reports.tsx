import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/convex/_generated/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Package, AlertTriangle, DollarSign, Download, MessageSquare, ChevronDown, ChevronUp, Zap } from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export default function Reports({ user, activeShopId }: { user: any, activeShopId: string }) {
  const queryArgs = activeShopId ? { shopId: activeShopId as NonNullable<any> } : { shopId: user.shopId };
  const sales = useQuery(api.sales.getSalesForShop, queryArgs);
  const products = useQuery(api.products.getProductsForShop, queryArgs);
  const lowStock = useQuery(api.products.getLowStock, queryArgs);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    "Tyres": true, // Start Tyres collapsed due to large count
    "Batteries": true,
    "Lubricants": false,
    "Others": true
  });

  // Daily sales aggregation (last 14 days)
  const dailySalesData = (() => {
    if (!sales) return [];
    const dailyMap: Record<string, { date: string, revenue: number, count: number }> = {};
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dailyMap[key] = { date: label, revenue: 0, count: 0 };
    }
    sales.forEach(s => {
      const key = new Date(s.timestamp).toISOString().split('T')[0];
      if (dailyMap[key]) {
        dailyMap[key].revenue += s.total;
        dailyMap[key].count += 1;
      }
    });
    return Object.values(dailyMap);
  })();

  // Top selling products
  const topProducts = (() => {
    if (!sales || !products) return [];
    const map: Record<string, { name: string, qty: number, revenue: number }> = {};
    sales.forEach(s => {
      s.items.forEach((item: any) => {
        const prod = products.find(p => p._id === item.productId);
        const name = prod?.name || "Unknown";
        if (!map[item.productId]) map[item.productId] = { name, qty: 0, revenue: 0 };
        map[item.productId].qty += item.quantity;
        map[item.productId].revenue += item.price * item.quantity;
      });
    });
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 8);
  })();

  // Payment method breakdown
  const paymentBreakdown = (() => {
    if (!sales) return [];
    const map: Record<string, number> = {};
    sales.forEach(s => {
      map[s.paymentMethod] = (map[s.paymentMethod] || 0) + s.total;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  })();

  // Summary stats
  const totalRevenue = sales?.reduce((sum, s) => sum + s.total, 0) || 0;
  const totalSalesCount = sales?.length || 0;
  const avgSaleValue = totalSalesCount > 0 ? Math.round(totalRevenue / totalSalesCount) : 0;

  const handleExportCSV = (data: any[], filename: string) => {
    const headers = ["SKU", "Name", "Category", "Stock", "Price"];
    const rows = data.map(p => [
      p.sku,
      p.name.replace(/,/g, ''), // Remove commas to prevent CSV breakage
      p.category || "N/A",
      p.stock,
      p.price
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Velocity Mapping (Units sold per item in last 14 days)
  const productVelocity = (() => {
    if (!sales) return {};
    const map: Record<string, number> = {};
    sales.forEach(s => {
      s.items.forEach((item: any) => {
        map[item.productId] = (map[item.productId] || 0) + item.quantity;
      });
    });
    return map;
  })();

  const groupProducts = (items: any[]) => {
    const groups: Record<string, any[]> = {
      "Tyres": [],
      "Batteries": [],
      "Lubricants": [],
      "Others": []
    };

    items.forEach(p => {
      const name = p.name.toUpperCase();
      const sku = p.sku.toUpperCase();
      const velocity = productVelocity[p._id] || 0;
      const productWithVelocity = { ...p, velocity };

      if (name.includes("TYRE") || sku.includes("TYR")) groups["Tyres"].push(productWithVelocity);
      else if (name.includes("BATTERY") || sku.includes("BAT")) groups["Batteries"].push(productWithVelocity);
      else if (name.includes("OIL") || name.includes("LUBRICANT") || sku.includes("OIL")) groups["Lubricants"].push(productWithVelocity);
      else groups["Others"].push(productWithVelocity);
    });

    // Sort each group by velocity (highest first)
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => b.velocity - a.velocity);
    });

    return groups;
  };

  const groupedLowStock = lowStock ? groupProducts(lowStock) : {};

  const handleWhatsAppAlert = (category: string, items: any[]) => {
    const shopName = user.shopCode || "Main Hub";
    const itemCount = items.length;
    // Items are already sorted by velocity
    let message = `*LOW STOCK ALERT (Velocity-First) - ${shopName}*\n\nCategory: *${category}*\nTotal items low: ${itemCount}\n\n🔥 *Top Priority (Fastest Moving):*\n`;

    items.slice(0, 3).forEach(p => {
      message += `- ${p.sku}: ${p.name} (Stock: ${p.stock}, Sold ${p.velocity} recently)\n`;
    });

    message += `\n*Impact:* Out-of-stock items in this category are likely causing missed sales. Please prioritize delivery.`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Business Reports</h1>
        <p className="text-gray-500">Performance analytics for <strong>{user.role === 'admin' ? 'All Shops' : user.shopCode}</strong></p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><DollarSign size={20} /></div>
            <span className="text-sm font-semibold text-gray-500">Total Revenue</span>
          </div>
          <div className="text-2xl font-black text-gray-900">KSh {totalRevenue.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-green-50 rounded-lg text-green-600"><TrendingUp size={20} /></div>
            <span className="text-sm font-semibold text-gray-500">Total Sales</span>
          </div>
          <div className="text-2xl font-black text-gray-900">{totalSalesCount}</div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><Package size={20} /></div>
            <span className="text-sm font-semibold text-gray-500">Avg Sale Value</span>
          </div>
          <div className="text-2xl font-black text-gray-900">KSh {avgSaleValue.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-2">
            <div className={`p-2 rounded-lg ${(lowStock?.length || 0) > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}><AlertTriangle size={20} /></div>
            <span className="text-sm font-semibold text-gray-500">Low Stock Items</span>
          </div>
          <div className={`text-2xl font-black ${(lowStock?.length || 0) > 0 ? 'text-red-600' : 'text-gray-900'}`}>{lowStock?.length || 0}</div>
        </div>
      </div>

      {/* Daily Sales Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Daily Revenue (Last 14 Days)</h2>
        {dailySalesData.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={dailySalesData} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                formatter={(value: any) => [`KSh ${Number(value).toLocaleString()}`, 'Revenue']}
              />
              <Bar dataKey="revenue" fill="#3B82F6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12 text-gray-400 italic">No sales data available.</div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Top Selling Products */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-900">Top Selling Products</h2>
            <button
              onClick={() => handleExportCSV(topProducts, "fast_moving_products")}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center text-xs font-bold"
            >
              <Download size={16} className="mr-1" /> EXPORT
            </button>
          </div>
          {topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts} layout="vertical" barSize={18}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#374151' }} width={120} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }}
                  formatter={(value: any) => [Number(value), 'Units Sold']}
                />
                <Bar dataKey="qty" fill="#10B981" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-gray-400 italic">No sales data yet.</div>
          )}
        </div>

        {/* Payment Method Breakdown */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Payment Methods</h2>
          {paymentBreakdown.length > 0 ? (
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={paymentBreakdown}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={50}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {paymentBreakdown.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }}
                    formatter={(value: any) => [`KSh ${Number(value).toLocaleString()}`, 'Revenue']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400 italic">No payment data yet.</div>
          )}
          <div className="flex justify-center space-x-6 mt-4">
            {paymentBreakdown.map((entry, index) => (
              <div key={entry.name} className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-sm text-gray-600 font-medium">{entry.name}: KSh {entry.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sales Trend Line */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Sales Count Trend (Last 14 Days)</h2>
        {dailySalesData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dailySalesData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }} />
              <Line type="monotone" dataKey="count" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 5, fill: '#8B5CF6' }} name="No. of Sales" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12 text-gray-400 italic">No sales data available.</div>
        )}
      </div>

      {/* Low Stock Alerts (Categorized) */}
      {lowStock && lowStock.length > 0 && (
        <div className="space-y-8 mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-gray-900 flex items-center">
              <AlertTriangle className="mr-3 text-red-600" size={28} />
              Low Stock Replenishment List
            </h2>
            <button
              onClick={() => handleExportCSV(lowStock, "full_low_stock_report")}
              className="bg-black text-white px-6 py-2 rounded-xl text-sm font-bold flex items-center hover:bg-gray-800 transition-all shadow-lg shadow-black/10"
            >
              <Download size={18} className="mr-2" /> DOWNLOAD FULL REPORT
            </button>
          </div>

          <div className="grid grid-cols-1 gap-8">
            {Object.entries(groupedLowStock).map(([category, items]) => (
              items.length > 0 && (
                <div key={category} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-8 py-5 bg-gray-50 border-b flex justify-between items-center cursor-pointer hover:bg-gray-100/50 transition-all"
                    onClick={() => setCollapsedGroups(prev => ({ ...prev, [category]: !prev[category] }))}
                  >
                    <div className="flex items-center space-x-4">
                      {collapsedGroups[category] ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronUp size={20} className="text-gray-400" />}
                      <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-wider ${items[0].velocity > 0 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                          {items.length} {items[0].velocity > 0 ? "URGENT NEEDS" : "SHORTAGES"}
                        </span>
                        <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">{category}</h3>
                      </div>
                    </div>
                    <div className="flex space-x-2" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => handleWhatsAppAlert(category, items)}
                        className="p-2 text-green-700 hover:bg-green-50 rounded-xl transition-colors flex items-center text-xs font-bold"
                        title="Alert HQ via WhatsApp"
                      >
                        <MessageSquare size={18} className="mr-1" /> ALERT HQ
                      </button>
                      <button
                        onClick={() => handleExportCSV(items, `low_stock_${category.toLowerCase()}`)}
                        className="p-2 text-blue-700 hover:bg-blue-50 rounded-xl transition-colors flex items-center text-xs font-bold"
                        title="Download CSV"
                      >
                        <Download size={18} className="mr-1" /> CSV
                      </button>
                    </div>
                  </div>

                  {!collapsedGroups[category] && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b text-[10px] text-gray-400 uppercase font-black tracking-widest bg-white">
                            <th className="px-8 py-4">Status</th>
                            <th className="px-8 py-4 text-center">Velocity</th>
                            <th className="px-8 py-4">SKU Code</th>
                            <th className="px-8 py-4">Product Specification</th>
                            <th className="px-8 py-4 text-center">In Stock</th>
                            <th className="px-8 py-4 text-right">Unit Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {items.map(p => (
                            <tr key={p._id} className="hover:bg-red-50/30 transition-colors">
                              <td className="px-8 py-4">
                                {p.velocity > 0 ? (
                                  <div className="flex items-center text-orange-600 space-x-1">
                                    <Zap size={14} className="fill-orange-600" />
                                    <span className="text-[10px] font-black uppercase">FAST</span>
                                  </div>
                                ) : (
                                  <div className="text-gray-300">
                                    <TrendingUp size={14} />
                                  </div>
                                )}
                              </td>
                              <td className="px-8 py-4 text-center font-black text-blue-600 text-xs">
                                {p.velocity} sold
                              </td>
                              <td className="px-8 py-4 font-mono text-xs text-gray-500">{p.sku}</td>
                              <td className="px-8 py-4 font-bold text-gray-800 text-sm">{p.name}</td>
                              <td className="px-8 py-4 text-center">
                                <span className={`px-3 py-1 rounded-full font-black text-sm ${p.stock === 0 ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                                  {p.stock}
                                </span>
                              </td>
                              <td className="px-8 py-4 text-right text-sm font-medium text-gray-600">
                                KSh {p.price.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
