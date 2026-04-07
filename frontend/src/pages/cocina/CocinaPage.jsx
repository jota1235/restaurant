import { useState, useEffect, useCallback } from 'react';
import { ordersAPI } from '../../api/orders';
import echo from '../../api/echo';
import useAuthStore from '../../store/authStore';

export default function CocinaPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuthStore();

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

    useEffect(() => {
        fetchOrders();
        const pollInterval = setInterval(fetchOrders, 5000);

        if (user?.id && echo) {
            // Subscribe to cook-specific channel (only receives items for this cook)
            const cookChannel = echo.private(`cook.${user.id}`);

            cookChannel.listen('.order.created', (data) => {
                if (data.order.status === 'confirmed' && data.order.items?.length > 0) {
                    setOrders(prev => {
                        if (prev.find(o => o.id === data.order.id)) return prev;
                        return [data.order, ...prev];
                    });
                }
            });

            cookChannel.listen('.order.updated', (data) => {
                const updatedOrder = data.order;
                setOrders(prev => {
                    if (updatedOrder.status !== 'confirmed' || !updatedOrder.items?.length) {
                        return prev.filter(o => o.id !== updatedOrder.id);
                    }
                    const index = prev.findIndex(o => o.id === updatedOrder.id);
                    if (index !== -1) {
                        const newOrders = [...prev];
                        newOrders[index] = updatedOrder;
                        return newOrders;
                    } else {
                        return [updatedOrder, ...prev];
                    }
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

    const handleUpdateItemStatus = async (orderId, itemId, currentStatus) => {
        const nextStatus = currentStatus === 'pending' ? 'preparing' : 'ready';
        try {
            await ordersAPI.updateItemStatus(orderId, itemId, nextStatus);
        } catch (e) {
            console.error(e);
        }
    };

    const handleMarkReady = async (orderId) => {
        try {
            await ordersAPI.updateStatus(orderId, 'ready');
        } catch (e) {
            console.error(e);
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
                                            {order.created_at.split(' ')[1]}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="px-2 py-0.5 rounded-lg bg-white/5 text-white text-[9px] font-black uppercase tracking-widest border border-white/5">
                                        Mesa {order.table?.name || 'Llevar'}
                                    </div>
                                    {order.notes && (
                                        <div className="animate-pulse w-2 h-2 rounded-full bg-yellow-500" title="Tiene notas" />
                                    )}
                                </div>
                            </div>

                            {/* Items — independent scroll */}
                            <div className="flex-1 min-h-0 overflow-y-auto p-3 md:p-4 space-y-3 scrollbar-none">
                                {order.items.map(item => (
                                    <div key={item.id} className="border-b border-gray-800/30 pb-3 last:border-0 last:pb-0">
                                        <div className="flex gap-2.5 mb-2">
                                            <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-xl bg-white text-black flex items-center justify-center font-black text-xs md:text-sm shadow-lg shadow-white/5">
                                                {item.quantity}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-black text-white text-xs md:text-sm leading-tight uppercase tracking-tight">{item.product.name}</h4>
                                                {/* Category tag */}
                                                {item.product?.category?.name && (
                                                    <span className="inline-block text-[8px] font-black uppercase tracking-widest text-orange-400 bg-orange-500/10 border border-orange-500/15 px-1.5 py-0.5 rounded mt-0.5">
                                                        {item.product.category.name}
                                                    </span>
                                                )}
                                                {item.variant && <p className="text-[8px] text-emerald-400 font-black uppercase tracking-widest mt-0.5">{item.variant.name}</p>}
                                                {item.extras?.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {item.extras.map(e => (
                                                            <span key={e.id} className="text-[7px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/10">
                                                                + {e.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                {item.notes && (
                                                    <div className="mt-1.5 p-1.5 bg-yellow-500/5 border border-yellow-500/15 rounded-lg">
                                                        <p className="text-[9px] text-yellow-500 font-bold italic leading-snug">"{item.notes}"</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Item Status Toggle */}
                                        <button
                                            onClick={() => handleUpdateItemStatus(order.id, item.id, item.status)}
                                            disabled={item.status === 'ready' || item.status === 'delivered'}
                                            className={`w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.12em] transition-all border active:scale-[0.97]
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
                                    className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-black text-[10px] py-3 md:py-4 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] uppercase tracking-widest"
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
