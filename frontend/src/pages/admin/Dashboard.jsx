import { useState, useEffect } from 'react';
import useAuthStore from '../../store/authStore';
import { statsAPI } from '../../api/stats';

export default function AdminDashboard() {
    const { user } = useAuthStore();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchStats(); }, []);

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
                <svg className="w-7 h-7 animate-spin text-orange-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
            </div>
        );
    }

    return (
        <div className="space-y-5 md:space-y-8">
            {/* Greeting */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg md:text-2xl font-black text-white tracking-tight">
                        Buen día, {user?.name?.split(' ')[0]} 👋
                    </h1>
                    <p className="text-gray-500 text-xs md:text-sm mt-0.5 font-medium">
                        {user?.restaurant?.name} · Vista general del negocio
                    </p>
                </div>
                <button
                    onClick={fetchStats}
                    className="p-2 text-gray-500 hover:text-white transition-colors rounded-xl hover:bg-gray-800/50"
                    title="Actualizar datos"
                >
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>

            {/* Stats grid — 2 cols on mobile, 4 on desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
                {statsConfig.map((stat) => (
                    <div
                        key={stat.label}
                        className="bg-gray-900/40 border border-gray-800/50 rounded-2xl p-3 md:p-5 flex items-center gap-3 md:gap-4"
                    >
                        <div className="text-xl md:text-3xl bg-gray-950/50 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl flex-shrink-0">
                            {stat.icon}
                        </div>
                        <div className="min-w-0">
                            <p className="text-gray-500 text-[10px] md:text-xs font-bold uppercase tracking-wider truncate">{stat.label}</p>
                            <p className="text-lg md:text-2xl font-black text-white">
                                {stat.isCurrency ? `$${parseFloat(data?.[stat.key] || 0).toLocaleString()}` : (data?.[stat.key] || 0)}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
                {/* Top Products */}
                <div className="lg:col-span-2 bg-gray-900/30 border border-gray-800/50 rounded-2xl p-4 md:p-6">
                    <h3 className="text-sm md:text-lg font-black text-white mb-4 md:mb-6 flex items-center gap-2">
                        <span className="w-1 h-5 bg-orange-500 rounded-full" />
                        Productos más vendidos hoy
                    </h3>

                    <div className="space-y-2.5 md:space-y-4">
                        {data?.top_products?.length > 0 ? (
                            data.top_products.map((prod, i) => (
                                <div key={i} className="flex items-center justify-between p-3 md:p-4 bg-gray-950/40 rounded-xl md:rounded-2xl border border-gray-800/30">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 md:w-10 md:h-10 bg-gray-800 rounded-xl flex items-center justify-center text-xs md:text-sm font-black text-gray-500 flex-shrink-0">
                                            {i + 1}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-white font-bold text-xs md:text-sm truncate">{prod.name}</p>
                                            <p className="text-gray-500 text-[10px] md:text-xs">{prod.qty} uds.</p>
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-2">
                                        <p className="text-orange-400 font-black text-xs md:text-sm">${parseFloat(prod.total).toLocaleString()}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-8 md:py-12 text-center text-gray-600 text-xs font-medium">
                                Aún no hay ventas registradas para hoy.
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick info */}
                <div className="bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/15 rounded-2xl p-5 md:p-8 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 mb-4 md:mb-6">
                        <svg className="w-6 h-6 md:w-8 md:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h4 className="text-base md:text-xl font-black text-white mb-2">Resumen Operativo</h4>
                    <p className="text-gray-400 text-xs leading-relaxed mb-4 md:mb-6">
                        Las estadísticas se actualizan automáticamente.
                    </p>
                    <div className="w-full space-y-2">
                        <div className="flex justify-between text-xs py-2 border-b border-gray-700/30">
                            <span className="text-gray-500">Sistema</span>
                            <span className="text-emerald-400 font-bold">Online</span>
                        </div>
                        <div className="flex justify-between text-xs py-2">
                            <span className="text-gray-500">Corte de Caja</span>
                            <span className="text-gray-400">No iniciado</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
