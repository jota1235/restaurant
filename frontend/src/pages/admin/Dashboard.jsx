import { useState, useEffect } from 'react';
import useAuthStore from '../../store/authStore';
import { statsAPI } from '../../api/stats';

export default function AdminDashboard() {
    const { user } = useAuthStore();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await statsAPI.dashboard();
            setData(res.data);
        } catch (err) {
            console.error('Error fetching stats:', err);
        } finally {
            setLoading(false);
        }
    };

    const statsConfig = [
        { label: 'Órdenes hoy', key: 'orders_today', icon: '🛒', color: 'orange' },
        { label: 'Ventas hoy', key: 'sales_today', icon: '💰', color: 'green', isCurrency: true },
        { label: 'Mesas activas', key: 'active_tables', icon: '🪑', color: 'blue' },
        { label: 'Pendiente cocina', key: 'kitchen_pending', icon: '🍳', color: 'yellow' },
    ];

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Greeting */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">
                        Buen día, {user?.name?.split(' ')[0]} 👋
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        {user?.restaurant?.name} · Vista general del negocio
                    </p>
                </div>
                <button
                    onClick={fetchStats}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                    title="Actualizar datos"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statsConfig.map((stat) => (
                    <div
                        key={stat.label}
                        className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-5 flex items-center gap-4 shadow-sm"
                    >
                        <div className="text-3xl bg-gray-900/50 w-12 h-12 flex items-center justify-center rounded-xl">
                            {stat.icon}
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs font-medium mb-0.5">{stat.label}</p>
                            <p className="text-2xl font-bold text-white">
                                {stat.isCurrency ? `$${parseFloat(data?.[stat.key] || 0).toLocaleString()}` : (data?.[stat.key] || 0)}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Top Products */}
                <div className="lg:col-span-2 bg-gray-800/40 border border-gray-700/40 rounded-3xl p-6">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-orange-500 rounded-full"></span>
                        Productos más vendidos hoy
                    </h3>

                    <div className="space-y-4">
                        {data?.top_products?.length > 0 ? (
                            data.top_products.map((prod, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-gray-900/40 rounded-2xl border border-gray-700/30 group hover:border-orange-500/30 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center text-sm font-bold text-gray-500">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <p className="text-white font-semibold">{prod.name}</p>
                                            <p className="text-gray-500 text-xs">{prod.qty} unidades vendidas</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-orange-400 font-bold">${parseFloat(prod.total).toLocaleString()}</p>
                                        <p className="text-[10px] text-gray-600 uppercase font-black">Ingresos</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-12 text-center text-gray-500 italic text-sm">
                                Aún no hay ventas registradas para hoy.
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick actions or info */}
                <div className="bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20 rounded-3xl p-8 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 mb-6">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h4 className="text-xl font-bold text-white mb-2">Resumen Operativo</h4>
                    <p className="text-gray-400 text-sm leading-relaxed mb-6">
                        Las estadísticas se actualizan automáticamente. Los datos de ventas consideran únicamente órdenes marcadas como <b>Pagadas</b>.
                    </p>
                    <div className="w-full space-y-3">
                        <div className="flex justify-between text-sm py-2 border-b border-gray-700/50">
                            <span className="text-gray-500">Estado del Sistema</span>
                            <span className="text-emerald-400 font-bold">Online</span>
                        </div>
                        <div className="flex justify-between text-sm py-2">
                            <span className="text-gray-500">Corte de Caja</span>
                            <span className="text-gray-400">No iniciado</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
