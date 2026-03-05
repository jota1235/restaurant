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
        <div className="max-w-4xl mx-auto py-6">
            <header className="mb-8">
                <h1 className="text-3xl font-black text-white">¡Hola, {user?.name?.split(' ')[0]}! 👋</h1>
                <p className="text-gray-400 mt-1 font-medium">Aquí tienes un resumen de lo que está pasando ahora.</p>
            </header>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-gray-900 border border-gray-800 p-5 rounded-3xl">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Mesas Libres</p>
                    <div className="flex items-end gap-2">
                        <span className="text-4xl font-black text-emerald-400">{stats.tables.available || 0}</span>
                        <span className="text-gray-600 mb-1 font-bold">/ {stats.tables.total || 0}</span>
                    </div>
                </div>
                <div className="bg-gray-900 border border-gray-800 p-5 rounded-3xl">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Órdenes Activas</p>
                    <span className="text-4xl font-black text-orange-500">{stats.orders || 0}</span>
                </div>
                <div className="bg-gray-900 border border-gray-800 p-5 rounded-3xl">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Mesas Ocupadas</p>
                    <span className="text-4xl font-black text-red-400">{stats.tables.occupied || 0}</span>
                </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link
                    to="/mesero/mesas"
                    className="group bg-orange-600 hover:bg-orange-500 p-6 rounded-3xl flex flex-col gap-4 transition-all active:scale-[0.98] shadow-xl shadow-orange-950/20"
                >
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">🪑</div>
                    <div>
                        <h3 className="text-xl font-bold text-white">Mapa de Mesas</h3>
                        <p className="text-orange-100/70 text-sm">Gestiona el estado de las mesas y atiende clientes.</p>
                    </div>
                </Link>

                <Link
                    to="/mesero/orden"
                    className="group bg-gray-900 hover:bg-gray-800 border border-gray-800 p-6 rounded-3xl flex flex-col gap-4 transition-all active:scale-[0.98]"
                >
                    <div className="w-12 h-12 bg-gray-800 rounded-2xl flex items-center justify-center text-2xl">📝</div>
                    <div>
                        <h3 className="text-xl font-bold text-white">Nueva Orden</h3>
                        <p className="text-gray-500 text-sm">Crea una orden directamente desde el menú.</p>
                    </div>
                </Link>
            </div>
        </div>
    );
}
