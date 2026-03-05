import { useState, useEffect, useCallback } from 'react';
import { tablesAPI } from '../../api/tables';
import TableFormModal from '../../components/TableFormModal';

const STATUS_CONFIG = {
    available: { label: 'Disponible', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
    occupied: { label: 'Ocupada', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30', dot: 'bg-red-400' },
    reserved: { label: 'Reservada', color: 'text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-yellow-500/30', dot: 'bg-yellow-400' },
    disabled: { label: 'Fuera de servicio', color: 'text-gray-400', bg: 'bg-gray-700/30', border: 'border-gray-600/30', dot: 'bg-gray-500' },
};

export default function TablesAdmin() {
    const [tables, setTables] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ open: false, table: null });

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const data = await tablesAPI.list();
            setTables(data.data);
            setStats(data.stats ?? {});
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetch(); }, [fetch]);

    const handleDelete = async (t) => {
        if (!window.confirm(`¿Eliminar mesa "${t.name}"?`)) return;
        try {
            await tablesAPI.delete(t.id);
            fetch();
        } catch (e) { alert(e.response?.data?.message ?? 'No se pudo eliminar'); }
    };

    // Group by zone
    const zones = tables.reduce((acc, t) => {
        const zone = t.zone ?? 'Sin zona';
        if (!acc[zone]) acc[zone] = [];
        acc[zone].push(t);
        return acc;
    }, {});

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-white">Mesas</h1>
                    <p className="text-gray-400 text-sm mt-0.5">{stats.total ?? 0} mesas activas</p>
                </div>
                <button
                    onClick={() => setModal({ open: true, table: null })}
                    className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow shadow-orange-500/20"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nueva mesa
                </button>
            </div>

            {/* Stats pills */}
            <div className="flex flex-wrap gap-2 mb-6">
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <div key={key} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label} · {stats[key] ?? 0}
                    </div>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-40">
                    <svg className="w-6 h-6 animate-spin text-orange-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                </div>
            ) : tables.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                    <div className="text-5xl mb-3">🪑</div>
                    <p className="font-medium text-gray-300">Sin mesas</p>
                    <p className="text-sm mt-1">Crea las mesas de tu restaurante</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(zones).sort().map(([zone, zoneTables]) => (
                        <div key={zone}>
                            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{zone}</h2>
                            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                                {zoneTables.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)).map((t) => {
                                    const cfg = STATUS_CONFIG[t.status];
                                    return (
                                        <div key={t.id} className={`group relative bg-gray-800/60 border ${cfg.border} rounded-2xl p-4 transition-all`}>
                                            <div className="flex items-start justify-between mb-3">
                                                <h3 className="text-white font-bold text-lg">{t.name}</h3>
                                                <span className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                                    {cfg.label}
                                                </span>
                                            </div>
                                            <p className="text-gray-400 text-xs">
                                                👥 {t.capacity} persona{t.capacity !== 1 ? 's' : ''}
                                            </p>

                                            {/* Actions */}
                                            <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => setModal({ open: true, table: t })}
                                                    className="flex-1 text-xs text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg py-1.5 transition-colors"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(t)}
                                                    className="px-3 text-xs text-gray-400 hover:text-red-400 bg-gray-700 hover:bg-red-500/10 rounded-lg py-1.5 transition-colors"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {modal.open && (
                <TableFormModal
                    table={modal.table}
                    onClose={() => setModal({ open: false, table: null })}
                    onSaved={() => { setModal({ open: false, table: null }); fetch(); }}
                />
            )}
        </div>
    );
}
