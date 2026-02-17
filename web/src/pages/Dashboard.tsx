import { useQuery } from "convex/react";
import { api } from "../../../convex/convex/_generated/api";
import { Package, DollarSign, AlertTriangle, TrendingUp, ShoppingCart, Users, ArrowUpRight, ArrowDownRight, Zap, ChevronRight, Activity } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useNavigate } from "react-router-dom";

export default function Dashboard({ user }: { user: any }) {
  const navigate = useNavigate();
  // Admin sees all shops, others see their assigned shop
  const queryArgs = user.role === 'admin' ? {} : { shopId: user.shopId };
  const products = useQuery(api.products.getProductsForShop, queryArgs);
  const sales = useQuery(api.sales.getSalesForShop, queryArgs);
  const lowStock = useQuery(api.products.getLowStock, queryArgs);

  const totalProducts = products?.length || 0;
  const totalSales = sales?.length || 0;
  const totalRevenue = sales?.reduce((sum, s) => sum + s.total, 0) || 0;
  const lowStockCount = lowStock?.length || 0;

  // Stock Health Data for Donut Chart
  const stockHealthData = [
    { name: 'Healthy', value: Math.max(0, totalProducts - lowStockCount), color: '#10B981' },
    { name: 'Low Stock', value: lowStockCount, color: '#EF4444' }
  ];

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

  // Critical 5 (Sorted by Velocity)
  const critical5 = lowStock
    ? [...lowStock]
      .map(p => ({ ...p, velocity: productVelocity[p._id] || 0 }))
      .sort((a, b) => b.velocity - a.velocity)
      .slice(0, 5)
    : [];

  // Today's sales
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todaySales = sales?.filter(s => s.timestamp >= today.getTime()) || [];
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);
  const todayCount = todaySales.length;

  // Recent 10 sales
  const recentSales = sales?.slice(0, 10) || [];

  // Top products by quantity sold
  const productSalesMap: Record<string, { name: string, qty: number, revenue: number }> = {};
  sales?.forEach(s => {
    s.items.forEach((item: any) => {
      const prod = products?.find(p => p._id === item.productId);
      const name = prod?.name || "Unknown";
      if (!productSalesMap[item.productId]) {
        productSalesMap[item.productId] = { name, qty: 0, revenue: 0 };
      }
      productSalesMap[item.productId].qty += item.quantity;
      productSalesMap[item.productId].revenue += item.price * item.quantity;
    });
  });
  const topProducts = Object.values(productSalesMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // Hourly Sales Pulse (Last 24 Hours)
  const hourlyPulseData = (() => {
    const data = [];
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hour = d.getHours();
      const startTime = d.getTime() - (d.getTime() % (60 * 60 * 1000));
      const endTime = startTime + (60 * 60 * 1000);

      const hourSales = sales?.filter(s => s.timestamp >= startTime && s.timestamp < endTime) || [];
      const revenue = hourSales.reduce((sum, s) => sum + s.total, 0);

      data.push({
        time: `${hour}:00`,
        revenue
      });
    }
    return data;
  })();

  // Transaction Mix (Pie Chart)
  const paymentMixData = (() => {
    const mpesa = todaySales.filter(s => s.paymentMethod === 'M-Pesa').reduce((sum, s) => sum + s.total, 0);
    const cash = todaySales.filter(s => s.paymentMethod === 'Cash').reduce((sum, s) => sum + s.total, 0);
    return [
      { name: 'M-Pesa', value: mpesa, color: '#10B981' },
      { name: 'Cash', value: cash, color: '#3B82F6' }
    ];
  })();

  // Yesterday's Revenue (Same time window)
  const yesterdayRevenue = (() => {
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStart = new Date(yesterdayDate);
    yesterdayStart.setHours(0, 0, 0, 0);

    const yesterdaySales = sales?.filter(s => s.timestamp >= yesterdayStart.getTime() && s.timestamp <= yesterdayDate.getTime()) || [];
    return yesterdaySales.reduce((sum, s) => sum + s.total, 0);
  })();

  const performanceStatus = todayRevenue >= yesterdayRevenue ? 'ahead' : 'behind';
  const performanceGap = Math.abs(todayRevenue - yesterdayRevenue);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Welcome back, {user.name}. {user.role === 'admin' ? 'Viewing all shops.' : <>You are managing <strong>{user.shopCode}</strong>.</>}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-xl text-blue-600"><ShoppingCart size={24} /></div>
            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg flex items-center"><ArrowUpRight size={12} className="mr-1" />Today</span>
          </div>
          <div className="text-3xl font-black text-gray-900 mb-1">{todayCount}</div>
          <div className="text-sm text-gray-500">Sales Today</div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 rounded-xl text-green-600"><DollarSign size={24} /></div>
            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg flex items-center"><ArrowUpRight size={12} className="mr-1" />Today</span>
          </div>
          <div className="text-3xl font-black text-gray-900 mb-1">KSh {todayRevenue.toLocaleString()}</div>
          <div className="text-sm text-gray-500">Revenue Today</div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-50 rounded-xl text-purple-600"><Package size={24} /></div>
          </div>
          <div className="text-3xl font-black text-gray-900 mb-1">{totalProducts}</div>
          <div className="text-sm text-gray-500">Products in Stock</div>
        </div>

        <div className={`bg-white rounded-2xl p-6 shadow-sm border ${lowStockCount > 50 ? 'border-red-200' : 'border-gray-100'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-xl ${lowStockCount > 50 ? 'bg-red-600 text-white animate-pulse' : lowStockCount > 0 ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>
              <AlertTriangle size={24} />
            </div>
            {lowStockCount > 0 && (
              <span className={`text-xs font-bold ${lowStockCount > 50 ? 'text-red-700 bg-red-100' : 'text-orange-700 bg-orange-50'} px-2 py-1 rounded-lg flex items-center`}>
                <ArrowDownRight size={12} className="mr-1" />
                {lowStockCount > 50 ? 'URGENT' : 'Stock Alert'}
              </span>
            )}
          </div>
          <div className={`text-3xl font-black mb-1 ${lowStockCount > 50 ? 'text-red-600' : lowStockCount > 0 ? 'text-orange-600' : 'text-gray-900'}`}>{lowStockCount}</div>
          <div className="text-sm text-gray-500">Low Stock Items</div>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-200">
          <div className="flex items-center space-x-3 mb-4">
            <TrendingUp size={24} />
            <h2 className="text-lg font-bold">Total Performance</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-3xl font-black">{totalSales}</div>
              <div className="text-blue-200 text-sm">Total Sales</div>
            </div>
            <div>
              <div className="text-3xl font-black">KSh {totalRevenue.toLocaleString()}</div>
              <div className="text-blue-200 text-sm">Total Revenue</div>
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <Users size={20} className="mr-2 text-purple-600" />
            Top Selling Products
          </h2>
          {topProducts.length === 0 ? (
            <p className="text-gray-400 text-sm italic">No sales data yet.</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : 'bg-orange-400'}`}>{i + 1}</span>
                    <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{p.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-gray-900">{p.qty} sold</div>
                    <div className="text-xs text-gray-400">KSh {p.revenue.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Graphical Insights Room */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Stock Health Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 lg:col-span-1">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Stock Health</h2>
          <div className="h-[200px] w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stockHealthData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stockHealthData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-gray-900">{Math.round((stockHealthData[0].value / totalProducts) * 100) || 0}%</span>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Healthy</span>
            </div>
          </div>
          <div className="flex justify-center space-x-6 mt-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-[#10B981]" />
              <span className="text-xs text-gray-500 font-medium">Healthy ({stockHealthData[0].value})</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-[#EF4444]" />
              <span className="text-xs text-gray-500 font-medium">Low Stock ({stockHealthData[1].value})</span>
            </div>
          </div>
        </div>

        {/* Critical 5 Priority List */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-900 flex items-center">
              <Zap size={20} className="mr-2 text-orange-500 fill-orange-500" />
              Top 5 Urgent Replenishments (Velocity-First)
            </h2>
            <button
              onClick={() => navigate('/reports')}
              className="text-blue-600 text-xs font-bold hover:underline flex items-center group"
            >
              VIEW ALL {lowStockCount} ALERTS <ChevronRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {critical5.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-gray-400 italic text-sm">
              All stock levels are currently healthy!
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {critical5.map((p: any) => (
                <div key={p._id} className="group bg-gray-50 hover:bg-red-50 hover:border-red-100 transition-all rounded-xl p-4 border border-transparent flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg ${p.velocity > 0 ? 'bg-orange-100 text-orange-600' : 'bg-gray-200 text-gray-400'}`}>
                      < Zap size={16} className={p.velocity > 0 ? "fill-orange-600" : ""} />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-gray-900">{p.name}</div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] text-gray-400 font-mono">{p.sku}</span>
                        {p.velocity > 0 && <span className="text-[10px] font-black text-orange-600">🔥 {p.velocity} SOLD RECENTLY</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-black ${p.stock === 0 ? 'text-red-600' : 'text-orange-600'}`}>{p.stock}</div>
                    <div className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">In Stock</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Visual Pulse Section */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <div className="p-8 border-b bg-gray-50 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-gray-900 flex items-center">
              <Activity size={24} className="mr-3 text-blue-600" />
              Sales Pulse Center
            </h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">Real-time Performance & Payment Mix</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`px-4 py-2 rounded-2xl flex items-center space-x-2 ${performanceStatus === 'ahead' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {performanceStatus === 'ahead' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
              <div className="text-left">
                <div className="text-[10px] font-black uppercase">vs Yesterday</div>
                <div className="text-sm font-black">
                  {performanceStatus === 'ahead' ? '+' : '-'}KSh {performanceGap.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3">
          {/* Main Area Chart */}
          <div className="lg:col-span-2 p-8 border-r border-gray-100">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">24h Hourly Revenue Wave</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyPulseData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis
                    dataKey="time"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94A3B8' }}
                    interval={3}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: any) => [`KSh ${Number(val || 0).toLocaleString()}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Payment Donut & Live Feed */}
          <div className="lg:col-span-1 flex flex-col">
            <div className="p-8 border-b border-gray-100 flex-1">
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6 text-center">Payment Mix</h3>
              <div className="h-[180px] w-full flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMixData}
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {paymentMixData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="text-xs font-black text-gray-400 uppercase">Mix</div>
                </div>
              </div>
              <div className="flex justify-center space-x-6 mt-4">
                {paymentMixData.map(item => (
                  <div key={item.name} className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[10px] font-black text-gray-500 uppercase">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 bg-gray-50/50">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Latest Stream</h3>
              <div className="flex flex-wrap gap-2">
                {recentSales.slice(0, 4).map((sale) => (
                  <div key={sale._id} className="flex items-center space-x-2 bg-white px-3 py-2 rounded-xl border border-gray-100 shadow-sm">
                    <div className={`w-2 h-2 rounded-full ${sale.paymentMethod === 'M-Pesa' ? 'bg-green-500' : 'bg-blue-500'}`} />
                    <span className="text-[10px] font-bold text-gray-900">KSh {sale.total.toLocaleString()}</span>
                    <span className="text-[8px] font-black text-gray-300 uppercase">
                      {Math.floor((Date.now() - sale.timestamp) / 60000)}m ago
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
