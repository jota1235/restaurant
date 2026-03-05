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
            // Fetch only confirmed orders for dashboard (KDS)
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

        // Polling fallback every 5 seconds in case WebSocket events are missed
        const pollInterval = setInterval(fetchOrders, 5000);

        if (user?.restaurant_id && echo) {
            const channel = echo.private(`restaurant.${user.restaurant_id}`);

            channel.listen('.order.created', (data) => {
                console.log('Order created received:', data);
                if (data.order.status === 'confirmed') {
                    setOrders(prev => {
                        // Avoid duplicates
                        if (prev.find(o => o.id === data.order.id)) return prev;
                        return [data.order, ...prev];
                    });
                }
            });

            channel.listen('.order.updated', (data) => {
                console.log('Order updated received:', data);
                const updatedOrder = data.order;

                setOrders(prev => {
                    if (updatedOrder.status !== 'confirmed') {
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
                channel.stopListening('.order.created');
                channel.stopListening('.order.updated');
            };
        }

        return () => clearInterval(pollInterval);
    }, [fetchOrders, user?.restaurant_id]);

    const handleUpdateItemStatus = async (orderId, itemId, currentStatus) => {
        const nextStatus = currentStatus === 'pending' ? 'preparing' : 'ready';
        try {
            // This will trigger the OrderStatusUpdated event on the backend
            await ordersAPI.updateItemStatus(orderId, itemId, nextStatus);
            // We don't strictly need fetchOrders() here anymore because we'll receive the event,
            // but keeping it or a local update for snappiness is okay.
            // Let's rely on the socket for consistency.
        } catch (e) {
            console.error(e);
        }
    };

    const handleMarkReady = async (orderId) => {
        try {
            // This will trigger the OrderStatusUpdated event on the backend
            await ordersAPI.updateStatus(orderId, 'ready');
        } catch (e) {
            console.error(e);
        }
    };

    if (loading && orders.length === 0) return <div className="p-10 text-center text-gray-400">Cargando pedidos...</div>;

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-black text-white">Cocina (KDS)</h1>
                    <p className="text-gray-400 font-medium">{orders.length} pedidos en preparación</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        VIVO
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-hidden flex gap-4 pb-4 items-start -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
                {orders.length === 0 ? (
                    <div className="w-full h-full flex flex-col items-center justify-center opacity-20 mt-[-5vh]">
                        <div className="text-7xl mb-4">😌</div>
                        <p className="text-xs font-black uppercase tracking-[0.2em]">Sin pedidos pendientes</p>
                    </div>
                ) : (
                    orders.map(order => (
                        <div key={order.id} className="w-72 sm:w-80 flex-shrink-0 bg-gray-900 border border-gray-800 rounded-[2rem] overflow-hidden flex flex-col max-h-full shadow-2xl relative">
                            {/* Header */}
                            <div className="p-4 bg-gray-800/50 border-b border-gray-800 backdrop-blur-md">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-3xl font-black text-white leading-none tracking-tighter">#{order.order_number}</span>
                                    <div className="text-right">
                                        <p className="text-[9px] font-black text-gray-500 uppercase leading-none mb-1">Hace</p>
                                        <span className="text-xs font-black text-orange-500 leading-none">
                                            {order.created_at.split(' ')[1]}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="px-2 py-0.5 rounded-lg bg-white/10 text-white text-[10px] font-black uppercase tracking-widest border border-white/5">
                                        Mesa {order.table?.name || 'Llevar'}
                                    </div>
                                    {order.notes && (
                                        <div className="animate-pulse w-2 h-2 rounded-full bg-yellow-500" title="Tiene notas" />
                                    )}
                                </div>
                            </div>

                            {/* Items */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none">
                                {order.items.map(item => (
                                    <div key={item.id} className="group border-b border-gray-800/50 pb-4 last:border-0 last:pb-0">
                                        <div className="flex gap-3 mb-3">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-white text-black flex items-center justify-center font-black text-sm shadow-lg shadow-white/5">
                                                {item.quantity}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-black text-white text-sm leading-tight uppercase tracking-tight">{item.product.name}</h4>
                                                {item.variant && <p className="text-[9px] text-orange-500 font-black uppercase tracking-widest mt-0.5">{item.variant.name}</p>}
                                                {item.extras?.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                                        {item.extras.map(e => (
                                                            <span key={e.id} className="text-[8px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/10">
                                                                + {e.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                {item.notes && (
                                                    <div className="mt-2 p-2 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
                                                        <p className="text-[10px] text-yellow-500 font-bold italic leading-snug">"{item.notes}"</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Item Status Toggle */}
                                        <button
                                            onClick={() => handleUpdateItemStatus(order.id, item.id, item.status)}
                                            disabled={item.status === 'ready' || item.status === 'delivered'}
                                            className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] transition-all border shadow-sm
                                                ${item.status === 'pending' ? 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-orange-500/40' :
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

                            {/* Footer */}
                            <div className="p-4 bg-gray-950 border-t border-gray-800 mt-auto">
                                <button
                                    onClick={() => handleMarkReady(order.id)}
                                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-[0.98] uppercase tracking-widest"
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
