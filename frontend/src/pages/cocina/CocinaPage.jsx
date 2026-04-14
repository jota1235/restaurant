import { useState, useEffect, useCallback, useRef } from 'react';
import { ordersAPI } from '../../api/orders';
import echo from '../../api/echo';
import useAuthStore from '../../store/authStore';

export default function CocinaPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuthStore();

    // Helper: determine if current user is a cook (roles can be string[] or object[])
    const isCook = (() => {
        if (!user?.roles) return false;
        return user.roles.some(r => (typeof r === 'string' ? r : r?.name) === 'cocina');
    })();

    const fetchOrders = useCallback(async () => {
        try {
            const res = await ordersAPI.list({ status: 'confirmed' });
            setOrders(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    // Keep a stable ref so WS handlers can call fetch without re-subscribing
    const fetchRef = useRef(fetchOrders);
    useEffect(() => { fetchRef.current = fetchOrders; }, [fetchOrders]);

    useEffect(() => {
        fetchOrders();
        const pollInterval = setInterval(fetchOrders, 10000);

        if (user?.id && echo) {
            const cookChannel = echo.private(`cook.${user.id}`);

            // New order → re-fetch so the server filters items for this cook
            cookChannel.listen('.order.created', () => {
                fetchRef.current();
            });

            // Order updated → patch only the items that changed within this cook's view
            // to avoid showing all items momentarily. We merge item statuses from the
            // broadcast into our existing filtered state.
            cookChannel.listen('.order.updated', (data) => {
                const updatedOrder = data.order;
                setOrders(prev => {
                    // If order is no longer active, remove it only if ALL items in
                    // this cook's slice are done (the fetch will confirm the truth).
                    if (updatedOrder.status !== 'confirmed') {
                        return prev.filter(o => o.id !== updatedOrder.id);
                    }

                    const index = prev.findIndex(o => o.id === updatedOrder.id);
                    if (index === -1) {
                        // Unknown order — trigger a fetch to let the server decide
                        fetchRef.current();
                        return prev;
                    }

                    // Merge item statuses into the existing (pre-filtered) order
                    const existingOrder = prev[index];
                    const updatedItems = existingOrder.items.map(existingItem => {
                        const freshItem = (updatedOrder.items || []).find(i => i.id === existingItem.id);
                        return freshItem ? { ...existingItem, status: freshItem.status } : existingItem;
                    });

                    // Check if all of THIS cook's items are done
                    const allDone = updatedItems.every(i => i.status === 'ready' || i.status === 'delivered');
                    if (allDone) {
                        return prev.filter(o => o.id !== updatedOrder.id);
                    }

                    const newOrders = [...prev];
                    newOrders[index] = { ...existingOrder, items: updatedItems };
                    return newOrders;
                });
            });

            return () => {
                clearInterval(pollInterval);
                cookChannel.stopListening('.order.created');
                cookChannel.stopListening('.order.updated');
            };
        }

        return () => clearInterval(pollInterval);
    }, [fetchOrders, user?.id]);

    // Optimistic update: change item status locally immediately + send to server
    const handleUpdateItemStatus = async (orderId, itemId, currentStatus) => {
        const nextStatus = currentStatus === 'pending' ? 'preparing' : 'ready';

        // Optimistically update state immediately (no flicker)
        setOrders(prev => prev.map(order => {
            if (order.id !== orderId) return order;
            const updatedItems = order.items.map(item =>
                item.id === itemId ? { ...item, status: nextStatus } : item
            );
            // Check if all of this cook's items are done after update
            const allDone = updatedItems.every(i => i.status === 'ready' || i.status === 'delivered');
            if (allDone) return null; // will be filtered out
            return { ...order, items: updatedItems };
        }).filter(Boolean));

        try {
            await ordersAPI.updateItemStatus(orderId, itemId, nextStatus);
        } catch (e) {
            console.error(e);
            // Revert on error
            fetchOrders();
        }
    };

    // Dispatch: mark only this cook's items as ready
    const handleMarkReady = async (orderId) => {
        // Optimistically remove this order card
        setOrders(prev => prev.filter(o => o.id !== orderId));
        try {
            if (isCook) {
                await ordersAPI.markCookItemsReady(orderId);
            } else {
                await ordersAPI.updateStatus(orderId, 'ready');
            }
        } catch (e) {
            console.error(e);
            // Revert on error
            fetchOrders();
        }
    };

    if (loading && orders.length === 0) return (
        <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <svg className="w-8 h-8 animate-spin text-emerald-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Cargando pedidos...</p>
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 md:mb-4 flex-shrink-0">
                <div>
                    <h1 className="text-lg md:text-2xl font-black text-white tracking-tight">Cocina (KDS)</h1>
                    <p className="text-gray-500 text-xs md:text-sm font-medium">{orders.length} pedidos en preparación</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchOrders}
                        className="p-2 bg-gray-900/50 rounded-xl text-gray-500 hover:text-white transition-colors border border-gray-800/50 hover:border-gray-700/50"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                    <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        VIVO
                    </span>
                </div>
            </div>

            {/* Horizontal scroll of order cards */}
            <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden flex gap-3 md:gap-4 items-stretch scrollbar-none -mx-2 px-2 md:mx-0 md:px-0">
                {orders.length === 0 ? (
                    <div className="w-full h-full flex flex-col items-center justify-center opacity-30">
                        <div className="text-5xl md:text-7xl mb-3">😌</div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Sin pedidos pendientes</p>
                    </div>
                ) : (
                    orders.map(order => (
                        <div key={order.id} className="w-64 sm:w-72 md:w-80 flex-shrink-0 bg-gray-900/40 border border-gray-800/50 rounded-2xl overflow-hidden flex flex-col max-h-full">
                            {/* Card Header */}
                            <div className="p-3 md:p-4 bg-gray-900/50 border-b border-gray-800/50 flex-shrink-0">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-2xl md:text-3xl font-black text-white leading-none tracking-tighter">#{order.order_number}</span>
                                    <div className="text-right">
                                        <p className="text-[8px] font-black text-gray-600 uppercase leading-none mb-0.5">Hora</p>
                                        <span className="text-[10px] font-black text-emerald-400 leading-none">
                                            {order.created_at || '—'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <div className="px-2 py-0.5 rounded-lg bg-white/5 text-white text-[9px] font-black uppercase tracking-widest border border-white/5">
                                        Mesa {order.table?.name || 'Llevar'}
                                    </div>
                                    {order.user?.name && (
                                        <div className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-300 text-[9px] font-black uppercase tracking-widest border border-blue-500/10 flex items-center gap-1">
                                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            {order.user.name.split(' ')[0]}
                                        </div>
                                    )}
                                    {order.notes && (
                                        <div className="animate-pulse w-2 h-2 rounded-full bg-yellow-500" title="Tiene notas" />
                                    )}
                                </div>
                            </div>

                            {/* Items — independent scroll */}
                            <div className="flex-1 min-h-0 overflow-y-auto p-3 md:p-4 space-y-3 scrollbar-none">
                                {order.items.map(item => (
                                    <div key={item.id} className="border-b border-gray-800/30 pb-4 last:border-0 last:pb-0">
                                        <div className="flex gap-3 mb-3">
                                            <div className="flex-shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white text-black flex items-center justify-center font-black text-sm md:text-base shadow-lg shadow-white/5">
                                                {item.quantity}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-black text-white text-sm md:text-base leading-tight uppercase tracking-tight">{item.product.name}</h4>
                                                {item.product?.category?.name && (
                                                    <span className="inline-block text-[10px] font-black uppercase tracking-widest text-orange-400 bg-orange-500/10 border border-orange-500/15 px-1.5 py-0.5 rounded mt-0.5">
                                                        {item.product.category.name}
                                                    </span>
                                                )}
                                                {item.variant && <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mt-0.5">{item.variant.name}</p>}
                                                {item.extras?.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {item.extras.map(e => (
                                                            <span key={e.id} className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/10">
                                                                + {e.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                {item.notes && (
                                                    <div className="mt-1.5 p-2 bg-yellow-500/5 border border-yellow-500/15 rounded-lg">
                                                        <p className="text-[11px] text-yellow-500 font-bold italic leading-snug">"{item.notes}"</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Item Status Toggle */}
                                        <button
                                            onClick={() => handleUpdateItemStatus(order.id, item.id, item.status)}
                                            disabled={item.status === 'ready' || item.status === 'delivered'}
                                            className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-[0.12em] transition-all border active:scale-[0.97]
                                                ${item.status === 'pending' ? 'bg-gray-800/50 border-gray-700/50 text-gray-400 hover:text-white hover:border-emerald-500/30' :
                                                    item.status === 'preparing' ? 'bg-orange-500 border-orange-400 text-white animate-pulse' :
                                                        'bg-emerald-500 border-emerald-400 text-white'
                                                }`}
                                        >
                                            {item.status === 'pending' ? 'Comenzar' :
                                                item.status === 'preparing' ? 'Preparando...' : 'Completado'}
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Card Footer */}
                            <div className="p-3 md:p-4 bg-gray-950/50 border-t border-gray-800/50 flex-shrink-0">
                                <button
                                    onClick={() => handleMarkReady(order.id)}
                                    className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-black text-xs py-3.5 md:py-4 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] uppercase tracking-widest"
                                >
                                    DESPACHAR TODO
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
