import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { tablesAPI } from '../../api/tables';
import { ordersAPI } from '../../api/orders';
import useAuthStore from '../../store/authStore';

export default function MeseroHome() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [stats, setStats] = useState({ tables: {}, orders: 0 });
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const [tablesRes, ordersRes] = await Promise.all([
                tablesAPI.list(),
                ordersAPI.list({ include_closed: 0 })
            ]);
            setStats({
                tables: tablesRes.stats || {},
                orders: ordersRes.data.length
            });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, [fetchData]);

    return (
        <div className="max-w-3xl mx-auto py-4 md:py-6 pb-8">
            <header className="mb-6 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">¡Hola, {user?.name?.split(' ')[0]}! 👋</h1>
                <p className="text-gray-500 mt-1 text-sm font-medium">Resumen de lo que está pasando ahora.</p>
            </header>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6 md:mb-8">
                <div className="bg-gray-900/40 border border-gray-800/50 p-4 md:p-6 rounded-2xl md:rounded-3xl hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                            <span className="text-emerald-400 text-sm">✓</span>
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Libres</p>
                    </div>
                    <div className="flex items-end gap-1">
                        <span className="text-3xl md:text-5xl font-black text-emerald-400 leading-none">{stats.tables.available || 0}</span>
                        <span className="text-gray-500 mb-0.5 font-bold text-sm">/ {stats.tables.total || 0}</span>
                    </div>
                </div>
                <div className="bg-gray-900/40 border border-gray-800/50 p-4 md:p-6 rounded-2xl md:rounded-3xl hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center">
                            <span className="text-orange-400 text-sm">📋</span>
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Órdenes</p>
                    </div>
                    <span className="text-3xl md:text-5xl font-black text-orange-400 leading-none">{stats.orders || 0}</span>
                </div>
                <div className="bg-gray-900/40 border border-gray-800/50 p-4 md:p-6 rounded-2xl md:rounded-3xl hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center">
                            <span className="text-red-400 text-sm">●</span>
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ocupadas</p>
                    </div>
                    <span className="text-3xl md:text-5xl font-black text-red-400 leading-none">{stats.tables.occupied || 0}</span>
                </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                <Link
                    to="/mesero/mesas"
                    className="group bg-gradient-to-br from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 p-6 md:p-8 rounded-2xl md:rounded-3xl flex flex-col justify-center items-center gap-4 transition-all duration-200 active:scale-[0.98] shadow-xl shadow-orange-500/10 text-center"
                >
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0">🪑</div>
                    <div>
                        <h3 className="text-xl md:text-2xl font-black text-white">Mapa de Mesas</h3>
                        <p className="text-orange-100/80 text-sm font-medium mt-1.5">Gestiona estado y atiende clientes</p>
                    </div>
                </Link>

                <Link
                    to="/mesero/orden"
                    className="group bg-gray-900/60 hover:bg-gray-800/80 border border-gray-700/50 hover:border-gray-600/50 p-6 md:p-8 rounded-2xl md:rounded-3xl flex flex-col justify-center items-center gap-4 transition-all duration-200 active:scale-[0.98] text-center"
                >
                    <div className="w-16 h-16 bg-gray-800/80 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0">📝</div>
                    <div>
                        <h3 className="text-xl md:text-2xl font-black text-white">Nueva Orden</h3>
                        <p className="text-gray-400 text-sm font-medium mt-1.5">Crea una orden desde el menú</p>
                    </div>
                </Link>

                <Link
                    to="/mesero/para-llevar"
                    className="group bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 p-6 md:p-8 rounded-2xl md:rounded-3xl flex flex-col justify-center items-center gap-4 transition-all duration-200 active:scale-[0.98] shadow-xl shadow-indigo-500/10 text-center"
                >
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0">🛍️</div>
                    <div>
                        <h3 className="text-xl md:text-2xl font-black text-white">Para Llevar</h3>
                        <p className="text-indigo-100/80 text-sm font-medium mt-1.5">Ver órdenes de mostrador y domicilio</p>
                    </div>
                </Link>
            </div>
        </div>
    );
}
