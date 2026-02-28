import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/convex/_generated/api";
import { Search, ShoppingCart, Trash2, Plus, Minus, CheckCircle, Package, Clock } from 'lucide-react';

export default function Sales({ user, activeShopId }: { user: any, activeShopId: string }) {
  const queryArgs = activeShopId ? { shopId: activeShopId as NonNullable<any> } : { shopId: user.shopId };
  const products = useQuery(api.products.getProductsForShop, queryArgs);
  const salesHistory = useQuery(api.sales.getSalesForShop, queryArgs);
  const createSale = useMutation(api.sales.createSale);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [mpesaCode, setMpesaCode] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stockError, setStockError] = useState<{ name: string, requested: number, available: number } | null>(null);
  const location = useLocation();

  useEffect(() => {
    if (location.state?.sellProduct) {
      addToCart(location.state.sellProduct);
      // Clean up state so refreshing won't keep adding it
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const filteredProducts = products?.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (product: any) => {
    const existing = cart.find(item => item.productId === product._id);
    if (existing) {
      setCart(cart.map(item =>
        item.productId === product._id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, {
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: 1,
        maxStock: product.stock
      }]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(1, Math.min(item.maxStock, item.quantity + delta));
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setStockError(null);
    if (paymentMethod === "M-Pesa") {
      if (!mpesaCode || mpesaCode.length < 10) {
        alert("Please enter a valid 10-character M-Pesa transaction code.");
        return;
      }
      if (!proofUrl) {
        alert("Please upload a screenshot/photo of the M-Pesa payment confirmation.");
        return;
      }
    }

    setIsProcessing(true);
    try {
      let finalPhotoUrl = "";
      if (paymentMethod === "M-Pesa" && selectedFile) {
        // 1. Get upload URL
        const postUrl = await generateUploadUrl();
        // 2. POST the file
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": selectedFile.type },
          body: selectedFile,
        });
        const { storageId } = await result.json();
        finalPhotoUrl = storageId;
      }

      await createSale({
        callerId: user._id,
        shopId: activeShopId || user.shopId,
        userId: user._id,
        items: cart.map(i => ({ productId: i.productId, quantity: i.quantity, price: i.price })),
        total,
        paymentMethod,
        mpesaCode: paymentMethod === "M-Pesa" ? mpesaCode : undefined,
        paymentProofUrl: paymentMethod === "M-Pesa" ? finalPhotoUrl : undefined,
      });
      setCart([]);
      setMpesaCode("");
      setProofUrl("");
      setSelectedFile(null);
      alert("Sale completed successfully!");
    } catch (error: any) {
      console.error("Checkout error:", error);
      if (error.message.includes("Insufficient stock")) {
        const match = error.message.match(/Insufficient stock for (.*)\. Requested: (\d+), Available: (\d+)/);
        if (match) {
          setStockError({ name: match[1], requested: parseInt(match[2]), available: parseInt(match[3]) });
        } else {
          alert("Checkout failed: " + error.message);
        }
      } else {
        alert("Checkout failed: " + error.message);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Left Column: Product Selection */}
      <div className="flex-1 flex flex-col p-8 border-r bg-white">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">New Sale</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name or SKU..."
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts?.map(product => (
              <button
                key={product._id}
                onClick={() => addToCart(product)}
                disabled={product.stock <= 0}
                className={`p-4 rounded-2xl border text-left transition-all ${product.stock > 0
                  ? 'hover:border-blue-500 hover:shadow-lg bg-white'
                  : 'bg-gray-50 opacity-60 cursor-not-allowed'
                  }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-gray-400 font-mono tracking-tighter uppercase">{product.sku}</span>
                  <span className={`text-xs px-2 py-0.5 rounded font-bold ${product.stock < 5 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                    }`}>
                    {product.stock} in stock
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 mb-1 line-clamp-1">{product.name}</h3>
                <div className="text-blue-600 font-black">KSh {product.price.toLocaleString()}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Checkout */}
      <div className="w-96 flex flex-col bg-gray-50 p-8">
        <div className="flex items-center space-x-2 mb-8">
          <div className="p-2 bg-blue-600 rounded-lg text-white">
            <ShoppingCart size={20} />
          </div>
          <h2 className="text-xl font-bold">Shopping Cart</h2>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 mb-8">
          {cart.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Package className="mx-auto mb-4 opacity-20" size={48} />
              <p>No items in cart</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.productId} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-sm line-clamp-1 flex-1 pr-2">{item.name}</h4>
                  <button onClick={() => removeFromCart(item.productId)} className="text-gray-400 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2 border rounded-lg bg-gray-50">
                    <button onClick={() => updateQuantity(item.productId, -1)} className="p-1 hover:text-blue-600"><Minus size={14} /></button>
                    <span className="w-4 text-center text-xs font-bold">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.productId, 1)} className="p-1 hover:text-blue-600"><Plus size={14} /></button>
                  </div>
                  <div className="text-sm font-bold text-gray-900">KSh {(item.price * item.quantity).toLocaleString()}</div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-4 pt-6 border-t">
          <div className="flex justify-between items-center text-gray-500">
            <span>Items</span>
            <span>{cart.length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold">Total</span>
            <span className="text-3xl font-black text-blue-600">KSh {total.toLocaleString()}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-4">
            {['Cash', 'M-Pesa'].map(method => (
              <button
                key={method}
                onClick={() => setPaymentMethod(method)}
                className={`py-3 rounded-xl font-bold border-2 transition-all ${paymentMethod === method
                  ? 'border-blue-600 bg-blue-50 text-blue-600'
                  : 'border-transparent bg-white text-gray-400 hover:border-gray-200'
                  }`}
              >
                {method}
              </button>
            ))}
          </div>

          {paymentMethod === 'M-Pesa' && (
            <div className="mt-6 p-4 bg-white rounded-xl border-2 border-dashed border-blue-200 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">M-Pesa Transaction Code</label>
                <input
                  type="text"
                  placeholder="e.g. SBL1234567"
                  maxLength={10}
                  className="w-full px-4 py-2 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  value={mpesaCode}
                  onChange={(e) => setMpesaCode(e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Payment Proof (SMS Screenshot)</label>
                <input
                  type="file"
                  accept="image/*"
                  className="text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedFile(file);
                      setProofUrl(URL.createObjectURL(file));
                    }
                  }}
                />
                {proofUrl && <div className="mt-2 text-[10px] text-green-600 font-bold italic">✓ File attached</div>}
              </div>
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || isProcessing || (paymentMethod === 'M-Pesa' && (!mpesaCode || !proofUrl))}
            className={`w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center space-x-2 shadow-lg transition-all ${cart.length === 0 || isProcessing || (paymentMethod === 'M-Pesa' && (!mpesaCode || !proofUrl))
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
              }`}
          >
            {isProcessing ? (
              <span>PROCESSING...</span>
            ) : (
              <>
                <CheckCircle size={24} />
                <span>CHECKOUT</span>
              </>
            )}
          </button>
        </div>
      </div>

      {stockError && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Package size={40} />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">Stock Recount Required</h2>
              <p className="text-gray-500 mb-8 px-4">
                The database shows that <strong>{stockError.name}</strong> does not have enough items for this sale.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-gray-50 p-4 rounded-2xl border-2 border-dashed border-gray-200">
                  <div className="text-xs font-bold text-gray-400 uppercase mb-1">Requested</div>
                  <div className="text-3xl font-black text-gray-900">{stockError.requested}</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-100">
                  <div className="text-xs font-bold text-blue-400 uppercase mb-1">Available</div>
                  <div className="text-3xl font-black text-blue-600">{stockError.available}</div>
                </div>
              </div>

              <button
                onClick={() => setStockError(null)}
                className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-xl shadow-gray-200"
              >
                ADJUST QUANTITY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sales History */}
      <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b bg-gray-50 flex items-center">
          <Clock size={20} className="mr-2 text-gray-600" />
          <h2 className="text-lg font-bold text-gray-900">Recent Sales History</h2>
          <span className="ml-auto text-sm text-gray-400">{salesHistory?.length || 0} total transactions</span>
        </div>
        {!salesHistory || salesHistory.length === 0 ? (
          <div className="p-12 text-center text-gray-400 italic">No sales recorded yet.</div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b text-xs text-gray-500 uppercase font-semibold">
                <th className="px-6 py-3">Date & Time</th>
                <th className="px-6 py-3">Items</th>
                <th className="px-6 py-3">Payment</th>
                <th className="px-6 py-3">M-Pesa Code</th>
                <th className="px-6 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {salesHistory.slice(0, 20).map(sale => (
                <tr key={sale._id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm">{new Date(sale.timestamp).toLocaleString()}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">
                    {sale.items.length} item{sale.items.length !== 1 ? 's' : ''}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded ${sale.paymentMethod === 'M-Pesa' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {sale.paymentMethod}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm font-mono text-gray-400">{sale.mpesaCode || '—'}</td>
                  <td className="px-6 py-3 text-right font-bold text-gray-900">KSh {sale.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
