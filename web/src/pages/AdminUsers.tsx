import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/convex/_generated/api";
import { UserPlus, Trash2, X, Store, Mail, Shield, Pencil } from 'lucide-react';

export default function AdminUsers({ user }: { user: any }) {
  const users = useQuery(api.users.getUsers);
  const shops = useQuery(api.users.getShops);
  const createUser = useMutation(api.users.createUser);
  const deleteUser = useMutation(api.users.deleteUser);
  const updateUser = useMutation(api.users.updateUser);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "password123",
    role: "sales" as "admin" | "manager" | "sales",
    shopId: "" as any,
    allowedTabs: ["dashboard", "sales"] as string[],
  });

  const ALL_TABS = [
    { id: "dashboard", label: "Dashboard" },
    { id: "sales", label: "Sales (POS)" },
    { id: "inventory", label: "Inventory" },
    { id: "transfers", label: "Transfers" },
    { id: "reports", label: "Reports" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedShop = shops?.find(s => s._id === formData.shopId);
      await createUser({
        callerId: user._id,
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        shopId: formData.role !== 'admin' ? formData.shopId : undefined,
        shopCode: formData.role !== 'admin' ? selectedShop?.code : undefined,
        allowedTabs: formData.role === 'admin' ? ALL_TABS.map(t => t.id).concat(['admin']) : formData.allowedTabs,
      });
      setIsModalOpen(false);
      setFormData({ name: "", email: "", password: "password123", role: "sales", shopId: "", allowedTabs: ["dashboard", "sales"] });
    } catch (error: any) {
      console.error("Error creating user:", error);
      alert("Failed to create user: " + error.message);
    }
  };

  const handleDelete = async (userId: any) => {
    if (confirm("Are you sure you want to delete this user?")) {
      await deleteUser({ callerId: user._id, userId });
    }
  };

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editData) return;
    try {
      const selectedShop = shops?.find(s => s._id === editData.shopId);
      await updateUser({
        callerId: user._id,
        userId: editData._id,
        name: editData.name,
        role: editData.role,
        shopId: editData.role !== 'admin' ? editData.shopId : undefined,
        shopCode: editData.role !== 'admin' ? selectedShop?.code : undefined,
        allowedTabs: editData.role === 'admin' ? ALL_TABS.map(t => t.id).concat(['admin']) : editData.allowedTabs,
      });
      setIsEditModalOpen(false);
      setEditData(null);
    } catch (error: any) {
      console.error("Error updating user:", error);
      alert("Failed to update user: " + error.message);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-gray-500">Create and manage accounts across all shops</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
        >
          <UserPlus size={20} />
          <span>Add User</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users?.map((u) => (
          <div key={u._id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                  <Mail size={24} />
                </div>
                {u._id !== user._id && (
                  <div className="flex items-center space-x-2">
                    <button onClick={() => { setEditData({ ...u }); setIsEditModalOpen(true); }} className="text-gray-400 hover:text-blue-600 transition-colors" title="Edit user">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => handleDelete(u._id)} className="text-gray-400 hover:text-red-600 transition-colors" title="Delete user">
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
              <h3 className="text-lg font-bold text-gray-900">{u.name}</h3>
              <p className="text-sm text-gray-500 mb-4">{u.email}</p>

              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <Shield size={16} className="mr-2" />
                  <span className="capitalize">{u.role}</span>
                </div>
                {u.shopCode && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Store size={16} className="mr-2" />
                    <span>Shop: {u.shopCode}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 bg-gray-50 rounded-2xl p-8 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
          <Shield className="mr-2 text-blue-600" size={24} />
          Role Permissions Guide
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="font-bold text-blue-600 mb-2">System Admin</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• Full access to all shops</li>
              <li>• Manage all users & roles</li>
              <li>• View all reports & inventory</li>
              <li>• Access all system settings</li>
            </ul>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="font-bold text-green-600 mb-2">Shop Manager</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• Manage inventory for their shop</li>
              <li>• Process sales & view shop reports</li>
              <li>• Cannot manage users</li>
              <li>• Cannot access other shops</li>
            </ul>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="font-bold text-orange-600 mb-2">Sales Person</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• Process sales for their shop</li>
              <li>• View available stock</li>
              <li>• Cannot manage inventory items</li>
              <li>• Cannot view reports or users</li>
            </ul>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900">Add New User</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="john@autospare.com"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="sales">Sales Person</option>
                  <option value="manager">Shop Manager</option>
                  <option value="admin">System Admin</option>
                </select>
              </div>
              {formData.role !== 'admin' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Assign to Shop</label>
                    <select
                      required
                      value={formData.shopId}
                      onChange={(e) => setFormData({ ...formData, shopId: e.target.value as any })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Select a Shop</option>
                      {shops?.map(s => (
                        <option key={s._id} value={s._id}>{s.name} ({s.code})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Screen Access (Permissions)</label>
                    <div className="grid grid-cols-2 gap-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
                      {ALL_TABS.map(tab => (
                        <label key={tab.id} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.allowedTabs.includes(tab.id)}
                            onChange={(e) => {
                              const newTabs = e.target.checked
                                ? [...formData.allowedTabs, tab.id]
                                : formData.allowedTabs.filter(t => t !== tab.id);
                              setFormData({ ...formData, allowedTabs: newTabs });
                            }}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-700">{tab.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <div className="pt-4 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 border rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div >
      )
      }

      {/* Edit User Modal */}
      {
        isEditModalOpen && editData && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                <h2 className="text-xl font-bold text-gray-900">Edit User</h2>
                <button onClick={() => { setIsEditModalOpen(false); setEditData(null); }} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
                  <input type="text" required value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email (read-only)</label>
                  <input type="email" value={editData.email} disabled className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-400" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Role</label>
                  <select value={editData.role} onChange={(e) => setEditData({ ...editData, role: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="sales">Sales Person</option>
                    <option value="manager">Shop Manager</option>
                    <option value="admin">System Admin</option>
                  </select>
                </div>
                {editData.role !== 'admin' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Assign to Shop</label>
                      <select required value={editData.shopId || ''} onChange={(e) => setEditData({ ...editData, shopId: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="">Select a Shop</option>
                        {shops?.map(s => (
                          <option key={s._id} value={s._id}>{s.name} ({s.code})</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">Screen Access (Permissions)</label>
                      <div className="grid grid-cols-2 gap-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
                        {ALL_TABS.map(tab => (
                          <label key={tab.id} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={(editData.allowedTabs || []).includes(tab.id)}
                              onChange={(e) => {
                                const currentTabs = editData.allowedTabs || [];
                                const newTabs = e.target.checked
                                  ? [...currentTabs, tab.id]
                                  : currentTabs.filter((t: any) => t !== tab.id);
                                setEditData({ ...editData, allowedTabs: newTabs });
                              }}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700">{tab.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                <div className="pt-4 flex space-x-3">
                  <button type="button" onClick={() => { setIsEditModalOpen(false); setEditData(null); }} className="flex-1 px-4 py-3 border rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">Update User</button>
                </div>
              </form>
            </div >
          </div >
        )
      }
    </div >
  );
}
