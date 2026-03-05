import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { tablesAPI } from '../../api/tables';

const STATUS_CONFIG = {
    available: {
        label: 'Disponible', nextLabel: 'Marcar ocupada',
        next: 'occupied',
        bg: 'bg-emerald-500/10 hover:bg-emerald-500/20',
        border: 'border-emerald-500/40',
        text: 'text-emerald-300',
        icon: '🟢',
    },
    occupied: {
        label: 'Ocupada', nextLabel: 'Liberar mesa',
        next: 'available',
        bg: 'bg-red-500/15 hover:bg-red-500/25',
        border: 'border-red-500/50',
        text: 'text-red-300',
        icon: '🔴',
    },
    reserved: {
        label: 'Reservada', nextLabel: 'Confirmar llegada',
        next: 'occupied',
        bg: 'bg-yellow-500/15 hover:bg-yellow-500/20',
        border: 'border-yellow-500/40',
        text: 'text-yellow-300',
        icon: '🟡',
    },
    disabled: {
        label: 'Fuera de servicio', nextLabel: null,
        next: null,
        bg: 'bg-gray-700/30',
        border: 'border-gray-600/30',
        text: 'text-gray-500',
        icon: '⚫',
    },
};

export default function TableMap() {
    const navigate = useNavigate();
    const [tables, setTables] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [changing, setChanging] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');

    const fetchTables = useCallback(async () => {
        try {
            const data = await tablesAPI.list();
            setTables(data.data);
            setStats(data.stats ?? {});
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        fetchTables();
        // Refresh each 10 seconds so all waiters see table status changes
        const interval = setInterval(fetchTables, 10000);
        return () => clearInterval(interval);
    }, [fetchTables]);

    const handleChangeStatus = async (table, status) => {
        if (!status) return;
        setChanging(table.id);
        try {
            await tablesAPI.changeStatus(table.id, status);
            setTables(prev => prev.map(t => t.id === table.id ? { ...t, status } : t));
            setStats(prev => {
                const next = { ...prev };
                next[table.status] = Math.max(0, (next[table.status] ?? 0) - 1);
                next[status] = (next[status] ?? 0) + 1;
                return next;
            });
        } catch (e) { console.error(e); }
        finally { setChanging(null); }
    };

    const filtered = filterStatus === 'all' ? tables : tables.filter(t => t.status === filterStatus);

    // Group by zone
    const zones = filtered.reduce((acc, t) => {
        const zone = t.zone ?? 'General';
        if (!acc[zone]) acc[zone] = [];
        acc[zone].push(t);
        return acc;
    }, {});

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-white">Mapa de Mesas</h1>
                    <p className="text-gray-400 text-xs">
                        {stats.available ?? 0} libres · {stats.occupied ?? 0} ocupadas
                    </p>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                        onClick={fetchTables}
                        className="p-2 bg-gray-800 rounded-xl text-gray-400 hover:text-white transition-colors border border-gray-700"
                        title="Actualizar"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Filter chips */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
                {[['all', 'Todas', stats.total], ...Object.entries(STATUS_CONFIG).map(([k, v]) => [k, v.label, stats[k]])].map(([key, label, count]) => (
                    <button
                        key={key}
                        onClick={() => setFilterStatus(key)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${filterStatus === key
                            ? 'bg-orange-500 border-orange-400 text-white shadow-lg shadow-orange-500/20'
                            : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-white'
                            }`}
                    >
                        {label} {count !== undefined && <span className="opacity-50 ml-1">{count}</span>}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-48">
                    <svg className="w-6 h-6 animate-spin text-orange-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 text-gray-600 bg-gray-900/20 rounded-3xl border border-dashed border-gray-800">
                    <div className="text-5xl mb-3 opacity-20">🪑</div>
                    <p className="text-sm font-bold uppercase tracking-widest italic">No hay mesas</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {Object.entries(zones).sort().map(([zone, zoneTables]) => (
                        <div key={zone}>
                            <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-4">
                                <span>{zone}</span>
                                <span className="flex-1 border-t border-gray-800" />
                            </h2>
                            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                                {zoneTables.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)).map(t => {
                                    const cfg = STATUS_CONFIG[t.status];
                                    const isChanging = changing === t.id;

                                    return (
                                        <div
                                            key={t.id}
                                            className={`relative rounded-3xl border p-4 transition-all duration-200 ${cfg.bg} ${cfg.border} ${!t.is_active ? 'opacity-40' : ''} flex flex-col justify-between aspect-[4/3]`}
                                        >
                                            {/* Status icon + name */}
                                            <div className="flex flex-col items-center">
                                                <div className="text-3xl mb-1">{cfg.icon}</div>
                                                <h3 className={`font-black text-lg ${cfg.text}`}>{t.name}</h3>
                                                <p className="opacity-50 text-[10px] uppercase font-black">{t.capacity} PAX</p>
                                            </div>

                                            {/* Action buttons */}
                                            {t.is_active && (
                                                <div className="flex flex-col gap-2 mt-4">
                                                    {t.status === 'occupied' && (
                                                        <button
                                                            onClick={() => navigate(`/mesero/orden?table_id=${t.id}`)}
                                                            className="w-full text-[10px] font-black py-2 rounded-xl transition-all bg-orange-500 text-white shadow-lg shadow-orange-500/20 flex items-center justify-center uppercase tracking-wider hover:bg-orange-600"
                                                        >
                                                            Ver / Agregar
                                                        </button>
                                                    )}
                                                    {cfg.next && (
                                                        <button
                                                            onClick={() => {
                                                                if (t.status === 'available') {
                                                                    navigate(`/mesero/orden?table_id=${t.id}`);
                                                                } else {
                                                                    handleChangeStatus(t, cfg.next);
                                                                }
                                                            }}
                                                            disabled={isChanging}
                                                            className={`w-full text-[10px] font-black py-2 rounded-xl transition-all disabled:opacity-40 flex items-center justify-center gap-1 uppercase tracking-wider
                                                                ${t.status === 'available' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600' : 'bg-gray-950 text-gray-400 hover:text-white border border-gray-800'}
                                                            `}
                                                        >
                                                            {isChanging ? (
                                                                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                                                </svg>
                                                            ) : (t.status === 'available' ? 'Abrir Mesa' : cfg.nextLabel)}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
