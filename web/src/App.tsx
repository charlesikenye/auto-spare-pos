import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConvexProvider, ConvexReactClient } from "convex/react";
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Reports from './pages/Reports';
import AdminUsers from './pages/AdminUsers';
import Transfers from './pages/Transfers';
import Sidebar from './components/Sidebar';

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL || "https://wandering-hyena-904.convex.cloud");

function App() {
  const [user, setUser] = useState<any>(null);
  const [activeShopId, setActiveShopId] = useState<string>("");

  useEffect(() => {
    if (user && !activeShopId) {
      setActiveShopId(user.shopId || "");
    }
  }, [user]);

  return (
    <ConvexProvider client={convex}>
      <BrowserRouter>
        <div className="flex min-h-screen bg-gray-100">
          {user && <Sidebar user={user} onLogout={() => setUser(null)} activeShopId={activeShopId} setActiveShopId={setActiveShopId} />}
          <main className="flex-1">
            <Routes>
              <Route path="/login" element={!user ? <Login onLogin={setUser} /> : <Navigate to="/" />} />
              <Route path="/" element={user && (!user.allowedTabs ? true : user.allowedTabs.includes('dashboard')) ? <Dashboard user={user} activeShopId={activeShopId} /> : user ? <Navigate to="/sales" /> : <Navigate to="/login" />} />
              <Route path="/inventory" element={user && (!user.allowedTabs ? ['admin', 'manager'].includes(user.role) : user.allowedTabs.includes('inventory')) ? <Inventory user={user} activeShopId={activeShopId} /> : <Navigate to="/" />} />
              <Route path="/sales" element={user && (!user.allowedTabs ? true : user.allowedTabs.includes('sales')) ? <Sales user={user} activeShopId={activeShopId} /> : <Navigate to="/" />} />
              <Route path="/reports" element={user && (!user.allowedTabs ? ['admin', 'manager'].includes(user.role) : user.allowedTabs.includes('reports')) ? <Reports user={user} activeShopId={activeShopId} /> : <Navigate to="/" />} />
              <Route path="/admin" element={user && (!user.allowedTabs ? user.role === 'admin' : user.allowedTabs.includes('admin')) ? <AdminUsers user={user} /> : <Navigate to="/" />} />
              <Route path="/transfers" element={user && (!user.allowedTabs ? ['admin', 'manager'].includes(user.role) : user.allowedTabs.includes('transfers')) ? <Transfers user={user} activeShopId={activeShopId} /> : <Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ConvexProvider>
  );
}

export default App;
