import { useState, useEffect, useCallback } from 'react';
import { ordersAPI } from '../../api/orders';
import { useNavigate } from 'react-router-dom';

export default function TakeawayOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchOrders = useCallback(async () => {
        try {
            // Fetch takeaway and delivery orders
            const { data } = await ordersAPI.list({ include_closed: 0, types: 'takeaway,delivery' });
            setOrders(data);
        } catch (e) {
            console.error('Error fetching takeaway orders', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 30000); // Polling every 30s
        return () => clearInterval(interval);
    }, [fetchOrders]);

    const getStatusLabel = (s) => {
        switch (s) {
            case 'confirmed': return 'En Cocina';
            case 'ready': return 'Listo para entregar';
            case 'delivered': return 'Entregado';
            default: return s;
        }
    };

    const getStatusStyle = (s) => {
        switch (s) {
            case 'confirmed': return 'bg-orange-500/15 text-orange-400 border-orange-500/20';
            case 'ready': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20';
            case 'delivered': return 'bg-blue-500/15 text-blue-400 border-blue-500/20';
            default: return 'bg-gray-800/50 text-gray-400 border-gray-700/50';
        }
    };

    const handleDeleteOrder = async (orderId) => {
        if (!window.confirm("¿Estás seguro de eliminar (cancelar) este pedido? Esta acción es irreversible.")) return;
        try {
            await ordersAPI.cancel(orderId);
            setOrders(prev => prev.filter(o => o.id !== orderId));
        } catch (e) {
            console.error(e);
            alert("Error al eliminar pedido.");
        }
    };

    const handleDeliverOrder = async (orderId) => {
        if (!window.confirm("¿Marcar este pedido como entregado?")) return;
        try {
            await ordersAPI.updateStatus(orderId, 'delivered');
            setOrders(prev => prev.filter(o => o.id !== orderId));
        } catch (e) {
            console.error(e);
            alert("Error al actualizar estatus.");
        }
    };

    if (loading && orders.length === 0) {
        return (
            <div className="flex h-full p-6 items-center justify-center">
                <svg className="w-8 h-8 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto py-4 md:py-6 h-full flex flex-col px-4 sm:px-6">
            <header className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-5">
                   <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                       <span className="text-4xl">🛍️</span>
                   </div>
                   <div>
                       <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Órdenes Para Llevar</h1>
                       <p className="text-gray-400 mt-2 text-base font-medium">Visualización de pedidos de mostrador y domicilio</p>
                   </div>
                </div>
            </header>

            {orders.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-gray-900/40 rounded-3xl border border-gray-700/50">
                    <div className="w-24 h-24 bg-gray-800/80 rounded-3xl flex items-center justify-center mb-6 border border-gray-700/50 shadow-inner">
                        <span className="text-5xl opacity-80">📭</span>
                    </div>
                    <p className="text-gray-300 text-lg font-black uppercase tracking-wider mb-2">Sin órdenes pendientes</p>
                    <p className="text-gray-500 text-sm font-medium">Las órdenes nuevas aparecerán aquí automáticamente</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20 sm:pb-6">
                    {orders.map(order => (
                        <div key={order.id} className="bg-gray-800/80 border border-gray-700/80 rounded-3xl p-6 flex flex-col h-full hover:border-indigo-400/50 transition-all shadow-lg shadow-black/20">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-3xl font-black text-white">#{order.order_number}</h3>
                                    <div className={`text-sm mt-2 font-black uppercase tracking-widest ${order.type === 'delivery' ? 'text-purple-300' : 'text-indigo-300'}`}>
                                        {order.type === 'delivery' ? '🛵 A Domicilio' : '🏪 Mostrador'}
                                    </div>
                                </div>
                                <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border ${getStatusStyle(order.status)}`}>
                                    {getStatusLabel(order.status)}
                                </span>
                            </div>

                            {(order.customer_name || order.delivery_address) && (
                                <div className="mb-5 bg-gray-900/80 rounded-2xl p-4 border border-gray-700/50 shadow-inner">
                                    {order.customer_name && (
                                        <div className="flex items-center gap-3 text-base font-bold text-gray-200">
                                            <span className="text-xl">👤</span> {order.customer_name}
                                        </div>
                                    )}
                                    {order.delivery_address && (
                                        <div className="flex items-start gap-3 text-sm font-semibold text-gray-300 mt-3">
                                            <span className="text-lg mt-0.5">📍</span>
                                            <span className="flex-1 leading-snug">{order.delivery_address}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex-1 overflow-y-auto mb-5 space-y-4">
                                {order.items?.map(item => (
                                    <div key={item.id} className="flex justify-between items-start text-base border-b border-gray-700/30 pb-3 last:border-0 last:pb-0">
                                        <div className="flex gap-3 text-gray-200">
                                            <span className="font-black text-indigo-300 text-lg">{item.quantity}x</span>
                                            <div className="leading-snug mt-0.5">
                                                <p className="font-bold text-white text-lg">{item.product?.name || 'Producto'}</p>
                                                {item.variant && <p className="text-sm text-gray-400 font-bold mt-1">— {item.variant.name}</p>}
                                                {item.extras?.map(e => (
                                                    <p key={e.id} className="text-sm text-gray-400 font-bold mt-0.5">+ {e.name}</p>
                                                ))}
                                                {item.notes && <p className="text-sm text-orange-300 italic font-medium mt-1">"{item.notes}"</p>}
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0 ml-4">
                                            <p className="font-black text-white text-lg">${item.subtotal?.toFixed(2)}</p>
                                            <p className={`text-[11px] uppercase font-black uppercase mt-1.5 ${item.status === 'ready' ? 'text-emerald-400' : 'text-orange-400'}`}>
                                                {item.status === 'ready' ? '✅ Listo' : '⏳ Cocina'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-5 border-t-2 border-gray-700/50 flex justify-between items-center mt-auto mb-5">
                                <span className="text-gray-400 text-sm font-black uppercase tracking-widest">Total Orden</span>
                                <span className="text-3xl font-black text-white">${order.total?.toFixed(2)}</span>
                            </div>

                            {/* Acciones del Mesero */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-auto">
                                <button 
                                    onClick={() => navigate(`/mesero/orden?order_id=${order.id}`)}
                                    className="bg-gray-700/50 hover:bg-indigo-600 border border-gray-600/50 hover:border-indigo-500 text-white font-bold py-3 rounded-2xl transition-colors shadow-sm"
                                >
                                    ✏️ Editar
                                </button>
                                <button 
                                    onClick={() => handleDeleteOrder(order.id)}
                                    className="bg-gray-700/50 hover:bg-red-600 border border-gray-600/50 hover:border-red-500 text-red-300 hover:text-white font-bold py-3 rounded-2xl transition-colors shadow-sm"
                                >
                                    🗑️ Eliminar
                                </button>
                                <div className="col-span-2 md:col-span-1">
                                    <button 
                                        onClick={() => handleDeliverOrder(order.id)}
                                        className="w-full bg-emerald-600/20 hover:bg-emerald-500 border border-emerald-500/30 hover:border-emerald-400 text-emerald-400 hover:text-white font-bold py-3 rounded-2xl transition-colors shadow-sm"
                                    >
                                        ✅ Entregar
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
