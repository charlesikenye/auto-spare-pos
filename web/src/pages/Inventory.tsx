import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/convex/_generated/api";
import { Plus, Search, AlertTriangle, X, Upload, Pencil, Package, ArrowRight } from 'lucide-react';

export default function Inventory({ user }: { user: any }) {
  const navigate = useNavigate();
  const [selectedShopId, setSelectedShopId] = useState(user.shopId || "");
  const shops = useQuery(api.users.getShops);

  const products = useQuery(api.products.getProductsForShop, {
    shopId: selectedShopId || undefined
  });
  const createProduct = useMutation(api.products.createProduct);
  const updateProduct = useMutation(api.products.updateProduct);
  const importProducts = useMutation(api.products.importProducts);
  const createTransfer = useMutation(api.transfers.createRequest);
  const restockProduct = useMutation(api.products.restockProduct);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedProductForTransfer, setSelectedProductForTransfer] = useState<any>(null);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [selectedProductForRestock, setSelectedProductForRestock] = useState<any>(null);
  const [restockQty, setRestockQty] = useState(1);
  const [restockCost, setRestockCost] = useState("");
  const [transferQuantity, setTransferQuantity] = useState(1);
  const [isImporting, setIsImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    price: "",
    cost: "",
    stock: "",
    category: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const targetShopId = selectedShopId || user.shopId;
      const targetShop = shops?.find(s => s._id === targetShopId);

      if (!targetShopId) {
        alert("Please select a shop first");
        return;
      }

      await createProduct({
        callerId: user._id,
        sku: formData.sku,
        name: formData.name,
        price: Number(formData.price),
        cost: Number(formData.cost),
        stock: Number(formData.stock),
        category: formData.category,
        description: formData.description,
        shopId: targetShopId,
        shopCode: targetShop?.code || user.shopCode || "UNK",
      });
      setIsModalOpen(false);
      setFormData({ sku: "", name: "", price: "", cost: "", stock: "", category: "", description: "" });
    } catch (error) {
      console.error("Error creating product:", error);
      alert("Failed to create product. Please check the values.");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      await updateProduct({
        callerId: user._id,
        productId: editingProduct._id,
        name: editingProduct.name,
        sku: editingProduct.sku,
        price: Number(editingProduct.price),
        cost: Number(editingProduct.cost),
        stock: Number(editingProduct.stock),
        category: editingProduct.category || undefined,
        description: editingProduct.description || undefined,
      });
      setIsEditModalOpen(false);
      setEditingProduct(null);
    } catch (error) {
      console.error("Error updating product:", error);
      alert("Failed to update product.");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const items = JSON.parse(content);
        const count = await importProducts({ callerId: user._id, items });
        alert(`Successfully imported ${count} products!`);
      } catch (error) {
        console.error("Import error:", error);
        alert("Failed to import. Ensure the file is a valid JSON array of products.");
      } finally {
        setIsImporting(false);
        if (e.target) e.target.value = ""; // Clear input
      }
    };
    reader.readAsText(file);
  };

  const handleTransferRequest = async (sourceShop?: any, type: "intra_region" | "inter_region" = "intra_region") => {
    const targetShopId = selectedShopId || user.shopId;
    const targetShop = shops?.find(s => s._id === targetShopId);
    if (!selectedProductForTransfer || !targetShop) return;
    try {
      await createTransfer({
        callerId: user._id,
        productId: selectedProductForTransfer._id,
        fromShopId: sourceShop?._id, // Explicit if inter-region or specific pick
        toShopId: targetShopId,
        region: type === "intra_region" ? targetShop.region : undefined,
        quantity: transferQuantity,
        type: type,
        requestedBy: user._id,
      });

      // Generate WhatsApp Link
      const shopName = sourceShop?.name || "the Regional Team";
      const message = `Hi ${shopName}, this is ${user.name} from ${targetShop.code}. I've raised a ${type.replace('_', ' ')} request for ${transferQuantity} units of ${selectedProductForTransfer.name} (SKU: ${selectedProductForTransfer.sku}). Please check the system.`;
      const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank');

      setIsTransferModalOpen(false);
      alert(`${type === "intra_region" ? "Regional broadcast" : "Inter-region request"} recorded!`);
    } catch (error: any) {
      console.error("Transfer error:", error);
      alert("Failed to record transfer: " + error.message);
    }
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForRestock) return;
    try {
      await restockProduct({
        callerId: user._id,
        productId: selectedProductForRestock._id,
        quantity: restockQty,
        cost: restockCost ? Number(restockCost) : undefined,
      });
      setIsRestockModalOpen(false);
      setSelectedProductForRestock(null);
      setRestockQty(1);
      setRestockCost("");
      alert("Stock updated successfully!");
    } catch (error: any) {
      console.error("Restock error:", error);
      alert("Failed to restock: " + error.message);
    }
  };

  const targetShopId = selectedShopId || user.shopId;
  const targetShop = shops?.find(s => s._id === targetShopId);
  const regionalShops = shops?.filter(s => s._id !== targetShopId && s.region === targetShop?.region);
  const otherRegionShops = shops?.filter(s => s.region !== targetShop?.region);

  const filteredProducts = products?.filter(p => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      p.name?.toLowerCase().includes(query) ||
      p.sku?.toLowerCase().includes(query) ||
      p.category?.toLowerCase().includes(query) ||
      p.barcode?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Inventory Management</h1>
          <p className="text-gray-500">Managing stock for {user.shopCode}</p>
        </div>
        <div className="flex space-x-3">
          {user.role === 'admin' && (
            <select
              value={selectedShopId}
              onChange={(e) => setSelectedShopId(e.target.value)}
              className="px-4 py-2 border rounded-lg bg-white text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Shops</option>
              {shops?.map(s => (
                <option key={s._id} value={s._id}>{s.name} ({s.code})</option>
              ))}
            </select>
          )}
          <label className={`cursor-pointer px-4 py-2 rounded-lg border flex items-center space-x-2 transition-colors ${isImporting ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'}`}>
            <Upload size={20} />
            <span>{isImporting ? "Importing..." : "Bulk Import"}</span>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
              disabled={isImporting}
            />
          </label>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900">Add New Product</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Product Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. Brake Pads"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">SKU</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="BRK-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Brakes"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Selling Price</label>
                  <input
                    type="number"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Cost Price</label>
                  <input
                    type="number"
                    required
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Initial Stock</label>
                  <input
                    type="number"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0"
                  />
                </div>
              </div>
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
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search products by SKU or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
            {filteredProducts?.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500 italic">
                  No products found matching "{searchQuery}"
                </td>
              </tr>
            ) : (
              filteredProducts?.map((product) => (
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
                    <div className="flex items-center space-x-2">
                      {product.stock < 5 ? (
                        <span className="flex items-center space-x-1 text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-bold">
                          <AlertTriangle size={12} />
                          <span>LOW STOCK</span>
                        </span>
                      ) : (
                        <span className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-bold">IN STOCK</span>
                      )}
                      <button
                        onClick={() => {
                          setEditingProduct({ ...product, price: product.price, cost: product.cost, stock: product.stock });
                          setIsEditModalOpen(true);
                        }}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit product"
                      >
                        <Pencil size={14} />
                      </button>
                      {user.role !== 'admin' && (
                        <button
                          onClick={() => {
                            setSelectedProductForTransfer(product);
                            setIsTransferModalOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-xs font-semibold underline"
                        >
                          Check Region
                        </button>
                      )}

                      {['manager', 'admin'].includes(user.role) && (
                        <button
                          onClick={() => {
                            setSelectedProductForRestock(product);
                            setRestockCost(product.cost?.toString() || "");
                            setIsRestockModalOpen(true);
                          }}
                          className="text-purple-600 hover:text-purple-800 text-xs font-semibold px-2 py-1 bg-purple-50 rounded"
                          title="Add new stock"
                        >
                          RESTOCK
                        </button>
                      )}
                      <button
                        onClick={() => navigate('/sales', { state: { sellProduct: product } })}
                        className="text-green-600 hover:text-green-800 text-xs font-bold px-2 py-1 bg-green-50 rounded"
                      >
                        SELL
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isTransferModalOpen && selectedProductForTransfer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50 uppercase tracking-widest text-xs font-black">
              <h2 className="text-xl font-bold text-gray-900">Request Stock</h2>
              <button onClick={() => setIsTransferModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-8 overflow-y-auto max-h-[80vh]">
              <div className="flex items-center space-x-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="p-3 bg-white rounded-xl shadow-sm text-blue-600">
                  <Package size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{selectedProductForTransfer.name}</h3>
                  <p className="text-sm text-gray-500 font-mono">{selectedProductForTransfer.sku}</p>
                </div>
                <div className="ml-auto flex items-center space-x-2">
                  <span className="text-xs font-bold text-gray-400">QTY:</span>
                  <input
                    type="number"
                    min="1"
                    value={transferQuantity}
                    onChange={(e) => setTransferQuantity(parseInt(e.target.value))}
                    className="w-20 p-2 border-2 border-blue-100 rounded-xl font-bold text-center focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* TIER 1: MY REGION (Visible to All) */}
              <div className="space-y-4">
                <h3 className="font-black text-sm text-gray-400 flex items-center uppercase">
                  <ArrowRight size={16} className="mr-2" /> Tier 1: {targetShop?.region} Shops
                </h3>

                {/* 1A: Specific Shops (Strict Filter: Same Region ONLY) */}
                <div className="grid grid-cols-1 gap-3">
                  {regionalShops?.filter(s => s.region?.toLowerCase() === targetShop?.region?.toLowerCase()).map(s => (
                    <div key={s._id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:border-blue-200 transition-all group">
                      <div>
                        <div className="font-bold text-gray-900">{s.name}</div>
                        <div className="text-xs text-gray-400 font-mono">{s.code}</div>
                      </div>
                      <button
                        onClick={() => handleTransferRequest(s, "intra_region")}
                        className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                      >
                        REQUEST
                      </button>
                    </div>
                  ))}
                  {regionalShops?.filter(s => s.region?.toLowerCase() === targetShop?.region?.toLowerCase()).length === 0 && (
                    <p className="text-sm text-gray-500 italic">No other shops found in this region.</p>
                  )}
                </div>

                {/* 1B: Broadcast (Manager Only) */}
                {['manager', 'admin'].includes(user.role) ? (
                  <div className="pt-4 mt-4 border-t border-dashed">
                    <button
                      onClick={() => handleTransferRequest(undefined, "intra_region")}
                      className="w-full bg-orange-50 text-orange-600 border border-orange-100 px-6 py-3 rounded-xl text-sm font-black hover:bg-orange-100 transition-all flex items-center justify-center space-x-2"
                    >
                      <span>📡 BROADCAST TO ENTIRE REGION</span>
                    </button>
                    <p className="text-[10px] text-center text-gray-400 mt-2">Alerts all shops in {targetShop?.region}. First to accept fulfills.</p>
                  </div>
                ) : (
                  <div className="pt-4 mt-4 border-t border-dashed text-center">
                    <p className="text-xs text-gray-400 font-medium bg-gray-50 p-2 rounded-lg">
                      Need to Broadcast? Ask your Manager.
                    </p>
                  </div>
                )}
              </div>

              {/* TIER 2: GLOBAL SEARCH (Manager Only Gatekeeper) */}
              <div className="space-y-4 pt-6 border-t-4 border-gray-50">
                <h3 className="font-black text-sm text-gray-400 flex items-center uppercase">
                  <ArrowRight size={16} className="mr-2" /> Tier 2: Global Search (Inter-Region)
                </h3>

                {/* VISIBILITY CONTROL */}
                {!['manager', 'admin'].includes(user.role) ? (
                  // Sales View: BLIND + WhatsApp Escalation
                  <div className="bg-gray-50 p-6 rounded-xl text-center space-y-4 border border-gray-100">
                    <div className="text-2xl">🔒</div>
                    <div>
                      <h4 className="font-bold text-gray-900">Global Search Locked</h4>
                      <p className="text-sm text-gray-500">Only Managers can unlock Global Search.</p>
                    </div>
                    <a
                      href={`https://wa.me/?text=Hi%20Manager,%20I%20have%20a%20customer%20for%20${encodeURIComponent(selectedProductForTransfer.name)}.%20We%20are%20out%20of%20stock.%20Please%20check%20Global%20Stock%20or%20Broadcast.%20-%20${user.name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl text-sm font-bold transition-colors shadow-lg shadow-green-100"
                    >
                      <span>WhatsApp Manager Request 🟢</span>
                    </a>
                  </div>
                ) : (
                  // Manager View: UNLOCKABLE
                  <GlobalSearchUnlock
                    otherRegionShops={otherRegionShops || []}
                    onRequest={(s) => handleTransferRequest(s, "inter_region")}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {isRestockModalOpen && selectedProductForRestock && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-purple-50">
              <h2 className="text-xl font-bold text-purple-900">Restock Product</h2>
              <button onClick={() => setIsRestockModalOpen(false)} className="text-purple-400 hover:text-purple-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleRestockSubmit} className="p-6 space-y-4">
              <div>
                <h3 className="font-bold text-gray-900">{selectedProductForRestock.name}</h3>
                <p className="text-xs text-gray-500 font-mono">{selectedProductForRestock.sku}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">New Quantity (Purchase)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={restockQty}
                  onChange={(e) => setRestockQty(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-bold text-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Cost Price (Optional Update)</label>
                <input
                  type="number"
                  value={restockCost}
                  onChange={(e) => setRestockCost(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder={selectedProductForRestock.cost}
                />
              </div>
              <button type="submit" className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold shadow-lg shadow-purple-200 hover:bg-purple-700 transition-colors">
                CONFIRM RESTOCK
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900">Edit Product</h2>
              <button onClick={() => { setIsEditModalOpen(false); setEditingProduct(null); }} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Product Name</label>
                  <input type="text" required value={editingProduct.name} onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">SKU</label>
                  <input type="text" required value={editingProduct.sku} onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                  <input type="text" value={editingProduct.category || ''} onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Selling Price</label>
                  <input type="number" required value={editingProduct.price} onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Cost Price</label>
                  <input type="number" required value={editingProduct.cost} onChange={(e) => setEditingProduct({ ...editingProduct, cost: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Stock</label>
                  <input type="number" required value={editingProduct.stock} onChange={(e) => setEditingProduct({ ...editingProduct, stock: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="pt-4 flex space-x-3">
                <button type="button" onClick={() => { setIsEditModalOpen(false); setEditingProduct(null); }} className="flex-1 px-4 py-3 border rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">Update Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


function GlobalSearchUnlock({ otherRegionShops, onRequest }: { otherRegionShops: any[], onRequest: (shop: any) => void }) {
  const [isUnlocked, setIsUnlocked] = useState(false);

  if (!isUnlocked) {
    return (
      <div className="bg-gray-900 text-white p-6 rounded-xl flex flex-col items-center text-center space-y-3">
        <div className="p-3 bg-white/10 rounded-full">
          <Search size={24} className="text-blue-400" />
        </div>
        <div>
          <h4 className="font-bold">Global Search Locked</h4>
          <p className="text-sm text-gray-400">Reveal shops in other regions?</p>
        </div>
        <button
          onClick={() => setIsUnlocked(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg text-sm font-bold transition-colors w-full"
        >
          UNLOCK GLOBAL LIST
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex justify-between items-center">
        <p className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">GLOBAL SEARCH ACTIVE</p>
        <button onClick={() => setIsUnlocked(false)} className="text-xs text-gray-400 hover:text-gray-600">Close</button>
      </div>

      {otherRegionShops?.map(s => (
        <div key={s._id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-500 transition-all shadow-sm">
          <div>
            <div className="font-bold text-gray-900">{s.name}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">{s.region}  {s.location}</div>
          </div>
          <button
            onClick={() => onRequest(s)}
            className="bg-black text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-gray-800 transition-transform active:scale-95"
          >
            REQUEST STOCK
          </button>
        </div>
      ))}

      {otherRegionShops?.length === 0 && (
        <p className="text-center text-gray-500 py-4 italic">No shops found in other regions.</p>
      )}
    </div>
  );
}
