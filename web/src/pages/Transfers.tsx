import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/convex/_generated/api";
import { Clock, Truck, ArrowRight, Package } from 'lucide-react';

export default function Transfers({ user, activeShopId }: { user: any, activeShopId: string }) {
    const allShops = useQuery(api.users.getShops);
    const myShop = allShops?.find(s => s._id === (activeShopId || user.shopId));

    const pendingRequests = useQuery(api.transfers.getPendingRequests, { targetShopId: (activeShopId as any) || undefined });
    const regionalBroadcasts = useQuery(api.transfers.getRegionalBroadcasts,
        myShop ? { region: myShop.region, targetShopId: myShop._id } : "skip" as any
    ) || [];
    const inTransitOutgoing = useQuery(api.transfers.getOutgoingInTransit, { targetShopId: (activeShopId as any) || undefined });
    const incomingDeliveries = useQuery(api.transfers.getIncomingTransfers, { targetShopId: (activeShopId as any) || undefined });

    const dispatchTransfer = useMutation(api.transfers.dispatchTransfer);
    const receiveTransfer = useMutation(api.transfers.receiveTransfer);
    const uploadPayment = useMutation(api.transfers.uploadTransferPayment);
    const generateUploadUrl = useMutation(api.files.generateUploadUrl);

    const [receivingTransferId, setReceivingTransferId] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleDispatch = async (transferId: any, fromShopId?: any) => {
        const msg = fromShopId
            ? "Confirming this will claim this regional broadcast. Stock will be deducted from your inventory immediately. Proceed?"
            : "Dispatching will deduct stock from your inventory immediately. Proceed?";

        if (confirm(msg)) {
            try {
                await dispatchTransfer({
                    callerId: user._id,
                    transferId,
                    approvedBy: user._id,
                    fromShopId: fromShopId // Pass if claiming a broadcast
                });
                alert("Transfer dispatched! Stock has been deducted.");
            } catch (error: any) {
                alert("Error: " + error.message);
            }
        }
    };

    const handleUploadPayment = async (transferId: any, file: File) => {
        setIsProcessing(true);
        try {
            const postUrl = await generateUploadUrl();
            const result = await fetch(postUrl, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file,
            });
            const { storageId } = await result.json();

            await uploadPayment({
                callerId: user._id,
                transferId,
                paymentProofUrl: storageId
            });
            alert("Payment proof uploaded! The source shop can now dispatch the item.");
        } catch (error: any) {
            alert("Error: " + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirmReceipt = async () => {
        if (!receivingTransferId || !selectedFile) return;

        setIsProcessing(true);
        try {
            // 1. Get upload URL
            const postUrl = await generateUploadUrl();
            // 2. POST the file
            const result = await fetch(postUrl, {
                method: "POST",
                headers: { "Content-Type": selectedFile.type },
                body: selectedFile,
            });
            const { storageId } = await result.json();

            await receiveTransfer({
                callerId: user._id,
                transferId: receivingTransferId as any,
                receivedBy: user._id,
                photoUrl: storageId
            });
            alert("Stock received and inventory updated!");
            setReceivingTransferId(null);
            setSelectedFile(null);
        } catch (error: any) {
            alert("Error confirming receipt: " + error.message);
        } finally {
            setIsProcessing(false);
        }
    };
    return (
        <div className="p-8 pb-20 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-10">
                <div className="flex items-center space-x-6">
                    <div className="p-4 bg-black rounded-3xl shadow-xl shadow-black/20">
                        <Truck className="text-white" size={32} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Stock Transfers</h1>
                        <p className="text-gray-500 font-medium">Manage and track movements across {myShop?.name || 'your branches'}</p>
                    </div>
                </div>
            </div>

            {/* 1. Regional Broadcasts Section (For Sales/Managers to help others) */}
            {
                user.role !== 'admin' && regionalBroadcasts && regionalBroadcasts.length > 0 && (
                    <div className="mb-12">
                        <h2 className="text-xl font-bold mb-4 flex items-center text-orange-600">
                            <Truck className="mr-2" size={24} />
                            Regional Broadcasts (Help Other Shops)
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {regionalBroadcasts.map((r: any) => (
                                <div key={r._id} className="bg-white rounded-2xl shadow-sm border-2 border-orange-100 p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-lg font-bold">{r.productName}</h3>
                                            <p className="text-sm text-gray-500">Requested by <strong>{r.toShopName}</strong></p>
                                        </div>
                                        <div className="text-2xl font-black text-orange-600">{r.quantity}</div>
                                    </div>
                                    <div className="flex items-center justify-between mt-6">
                                        <div className={`text-xs font-bold px-3 py-1 rounded-full ${r.isLowStock ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                            {r.isLowStock ? "⚠️ LOW STOCK" : `✓ AVAILABLE (${r.myStock})`}
                                        </div>
                                        <button
                                            disabled={r.isLowStock || isProcessing}
                                            onClick={() => handleDispatch(r._id, user.shopId)}
                                            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${r.isLowStock
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                : 'bg-orange-600 text-white hover:bg-orange-700 shadow-md shadow-orange-100'}`}
                                        >
                                            CLAIM & DISPATCH
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }

            {/* 2. Pending Tasks (To Dispatch) */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold flex items-center text-gray-800">
                    <Clock className="mr-2 text-blue-600" size={24} />
                    {!activeShopId ? "All Active Requests" : "Requests to Dispatch"}
                </h2>
                {pendingRequests?.length === 0 ? (
                    <div className="bg-white rounded-xl p-12 text-center border border-dashed border-gray-300">
                        <Clock className="mx-auto text-gray-300 mb-4" size={48} />
                        <p className="text-gray-500 font-medium">No pending transfer requests at the moment.</p>
                    </div>
                ) : (
                    pendingRequests?.map((r: any) => (
                        <div key={r._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
                            <div className="flex items-center space-x-6">
                                <div className={`p-4 rounded-2xl ${r.status === 'awaiting_payment' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                    <Truck size={32} />
                                </div>
                                <div>
                                    <div className="flex items-center space-x-2 mb-1">
                                        <span className={`text-sm font-bold px-2 py-0.5 rounded ${r.status === 'awaiting_payment' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                            }`}>
                                            {r.status.toUpperCase().replace('_', ' ')}
                                        </span>
                                        <span className="text-xs text-gray-400">{new Date(r.timestamp).toLocaleString()}</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900">{r.productName}</h3>
                                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                                        <span>From: <strong>{r.fromShopId ? (allShops?.find(s => s._id === r.fromShopId)?.name || "External") : "ANY (Broadcast)"}</strong></span>
                                        <ArrowRight size={14} />
                                        <span>To: <strong>{r.toShopName}</strong></span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center space-x-8">
                                <div className="text-center">
                                    <div className="text-3xl font-black text-gray-900">{r.quantity}</div>
                                    <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Units</div>
                                </div>

                                {r.status === 'awaiting_payment' ? (
                                    <div className="flex flex-col items-end">
                                        <label className="bg-black text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer hover:bg-gray-800 transition-colors">
                                            ATTACH CUSTOMER PAYMENT
                                            <input
                                                type="file"
                                                className="hidden"
                                                onChange={(e) => e.target.files?.[0] && handleUploadPayment(r._id, e.target.files[0])}
                                            />
                                        </label>
                                        <p className="text-[10px] text-red-500 font-bold mt-1 uppercase">Dispatch Locked</p>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleDispatch(r._id)}
                                        className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center space-x-2 hover:bg-blue-700 transition-shadow shadow-lg shadow-blue-100"
                                    >
                                        <Truck size={20} />
                                        <span>Dispatch</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* 3. In Transit & Incoming */}
            <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                    <h2 className="text-xl font-bold mb-4 flex items-center text-blue-800">
                        <Truck className="mr-2" size={24} /> Outgoing In Transit
                    </h2>
                    <div className="space-y-4">
                        {!inTransitOutgoing?.length && (
                            <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-4 text-center text-gray-400 text-sm">
                                No outgoing deliveries.
                            </div>
                        )}
                        {inTransitOutgoing?.map((r: any) => (
                            <div key={r._id} className="bg-white rounded-xl border border-gray-100 p-4 flex justify-between items-center shadow-sm">
                                <div>
                                    <h4 className="font-bold">{r.productName}</h4>
                                    <p className="text-xs text-gray-500">Sent to {r.toShopName}</p>
                                </div>
                                <div className="text-xl font-black text-blue-600">{r.quantity}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h2 className="text-xl font-bold mb-4 flex items-center text-green-800">
                        <Package className="mr-2" size={24} /> Incoming Deliveries
                    </h2>
                    <div className="space-y-4">
                        {!incomingDeliveries?.length && (
                            <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-4 text-center text-gray-400 text-sm">
                                No incoming deliveries.
                            </div>
                        )}
                        {incomingDeliveries?.map((r: any) => (
                            <div key={r._id} className="bg-white rounded-2xl shadow-sm border-2 border-green-50 p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-lg">{r.productName}</h3>
                                        <p className="text-xs text-gray-500">From {r.fromShopName} via {r.senderName}</p>
                                    </div>
                                    <div className="text-2xl font-black text-green-600">{r.quantity}</div>
                                </div>
                                {receivingTransferId === r._id ? (
                                    <div className="flex items-center space-x-2">
                                        <label className="flex-1 bg-green-50 text-green-700 py-2 rounded-lg text-center font-bold text-xs cursor-pointer border border-green-200">
                                            {selectedFile ? "PHOTO ATTACHED" : "SELECT DELIVERY NOTE"}
                                            <input
                                                type="file"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const f = e.target.files?.[0];
                                                    if (f) { setSelectedFile(f); }
                                                }}
                                            />
                                        </label>
                                        <button
                                            onClick={handleConfirmReceipt}
                                            disabled={!selectedFile || isProcessing}
                                            className="bg-black text-white px-4 py-2 rounded-lg font-bold text-xs disabled:opacity-50"
                                        >
                                            {isProcessing ? "SAVING..." : "CONFIRM"}
                                        </button>
                                        <button onClick={() => setReceivingTransferId(null)} className="text-gray-400 text-xs font-bold">CANCEL</button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setReceivingTransferId(r._id)}
                                        className="w-full bg-green-600 text-white py-2 rounded-xl font-bold text-sm shadow-md shadow-green-100"
                                    >
                                        MARK AS RECEIVED
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
