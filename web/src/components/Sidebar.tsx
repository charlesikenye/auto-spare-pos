import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Box, ShoppingCart, BarChart3, Users, LogOut, Truck } from 'lucide-react';

export default function Sidebar({ user, onLogout }: { user: any, onLogout: () => void }) {
  const location = useLocation();

  let menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Box, label: 'Inventory', path: '/inventory', roles: ['admin', 'manager'] },
    { icon: ShoppingCart, label: 'Sales', path: '/sales', roles: ['admin', 'manager', 'sales'] },
    { icon: Truck, label: 'Transfers', path: '/transfers', roles: ['admin', 'manager'] },
    { icon: BarChart3, label: 'Reports', path: '/reports', roles: ['admin', 'manager'] },
  ];

  // Filter items that current user has access to
  menuItems = menuItems.filter(item => !item.roles || item.roles.includes(user.role));

  if (user.role === 'admin') {
    menuItems.push({ icon: Users, label: 'Users', path: '/admin' } as any);
  }

  return (
    <div className="w-64 bg-white border-r min-h-screen flex flex-col">
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold text-blue-600">Auto Spares POS</h1>
        <p className="text-sm text-gray-500">{user.shopCode} Shop</p>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${location.pathname === item.path ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
              }`}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t">
        <button
          onClick={onLogout}
          className="flex items-center space-x-3 p-3 w-full text-left text-red-600 hover:bg-red-50 rounded-lg"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
