import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConvexProvider, ConvexReactClient } from "convex/react";
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Reports from './pages/Reports';
import AdminUsers from './pages/AdminUsers';
import Sidebar from './components/Sidebar';

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL || "https://cool-giraffe-985.convex.cloud");

function App() {
  const [user, setUser] = useState<any>(null);

  return (
    <ConvexProvider client={convex}>
      <BrowserRouter>
        <div className="flex min-h-screen bg-gray-100">
          {user && <Sidebar user={user} onLogout={() => setUser(null)} />}
          <main className="flex-1">
            <Routes>
              <Route path="/login" element={!user ? <Login onLogin={setUser} /> : <Navigate to="/" />} />
              <Route path="/" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
              <Route path="/inventory" element={user ? <Inventory user={user} /> : <Navigate to="/login" />} />
              <Route path="/sales" element={user ? <Sales user={user} /> : <Navigate to="/login" />} />
              <Route path="/reports" element={user ? <Reports user={user} /> : <Navigate to="/login" />} />
              <Route path="/admin" element={user?.role === 'admin' ? <AdminUsers user={user} /> : <Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ConvexProvider>
  );
}

export default App;
