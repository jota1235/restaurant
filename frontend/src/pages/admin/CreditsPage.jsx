import { useState, useEffect, useCallback } from 'react';
import { creditsAPI } from '../../api/credits';
import AddCreditModal from '../../components/AddCreditModal';
import useAuthStore from '../../store/authStore';

const statusColors = {
    pending:   'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    paid:      'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    cancelled: 'bg-gray-700/40 text-gray-500 border-gray-700/30',
};
const statusLabel = { pending: 'Pendiente', paid: 'Pagado', cancelled: 'Cancelado' };

export default function CreditsPage() {
    const user = useAuthStore(s => s.user);
    // roles is a plain string array e.g. ['admin']
    const isAdmin = user?.roles?.some(r => ['superadmin', 'admin', 'caja'].includes(r)) ?? false;

    const [tab, setTab] = useState('pending');
    const [credits, setCredits] = useState([]);
    const [summary, setSummary] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [payModal, setPayModal] = useState(null);  // credit to pay
    const [actionLoading, setActionLoading] = useState(null);

    const fetchCredits = useCallback(async () => {
        setLoading(true);
        try {
            const params = tab !== 'all' ? { status: tab } : {};
            const res = await creditsAPI.list(params);
            setCredits(res.data);
            if (res.summary) setSummary(res.summary);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [tab]);

    useEffect(() => { fetchCredits(); }, [fetchCredits]);

    const handlePay = async (note) => {
        if (!payModal) return;
        setActionLoading(payModal.id);
        try {
            await creditsAPI.pay(payModal.id, { notes: note });
            setPayModal(null);
            fetchCredits();
        } catch (e) { alert(e.response?.data?.message ?? 'Error'); }
        finally { setActionLoading(null); }
    };

    const handleCancel = async (credit) => {
        if (!window.confirm(`¿Cancelar el crédito de ${credit.employee.name}?`)) return;
        setActionLoading(credit.id);
        try {
            await creditsAPI.cancel(credit.id);
            fetchCredits();
        } catch (e) { alert(e.response?.data?.message ?? 'Error'); }
        finally { setActionLoading(null); }
    };

    const pendingTotal = credits.filter(c => c.status === 'pending').reduce((s, c) => s + c.total, 0);

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                        <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        Créditos de Empleados
                    </h1>
                    <p className="text-gray-500 text-xs mt-0.5">Consumos a cuenta – Fiado y cobros</p>
                </div>
                <button
                    onClick={() => setShowAdd(true)}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all shadow shadow-orange-500/20 uppercase tracking-wider"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nuevo crédito
                </button>
            </div>

            {/* Summary per employee (admin only) */}
            {isAdmin && summary.length > 0 && (
                <div className="bg-gray-900/40 border border-yellow-500/20 rounded-2xl p-4">
                    <p className="text-[10px] text-yellow-400 font-black uppercase tracking-widest mb-3">⚠️ Deuda pendiente por empleado</p>
                    <div className="flex flex-wrap gap-2">
                        {summary.map(s => (
                            <div key={s.user_id} className="flex items-center gap-2 bg-gray-900/50 border border-gray-800/60 rounded-xl px-3 py-2">
                                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                                <span className="text-white text-xs font-bold">{s.user_name}</span>
                                <span className="text-yellow-400 text-xs font-black">${s.total_pending.toFixed(2)}</span>
                                <span className="text-gray-600 text-[10px]">{s.items} items</span>
                            </div>
                        ))}
                        <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-xl px-3 py-2 ml-auto">
                            <span className="text-gray-400 text-xs">Total:</span>
                            <span className="text-orange-400 text-sm font-black">${pendingTotal.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex bg-gray-900/40 border border-gray-800/50 rounded-xl p-1 gap-1 w-fit">
                {[['pending', 'Pendientes'], ['paid', 'Pagados'], ['cancelled', 'Cancelados'], ['all', 'Todos']].map(([k, l]) => (
                    <button key={k} onClick={() => setTab(k)}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${tab === k ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'}`}>
                        {l}
                    </button>
                ))}
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex justify-center py-20"><svg className="w-7 h-7 animate-spin text-orange-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg></div>
            ) : credits.length === 0 ? (
                <div className="text-center py-20">
                    <div className="text-4xl mb-3 opacity-30">💳</div>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Sin créditos {tab === 'pending' ? 'pendientes' : ''}</p>
                </div>
            ) : (
                <div className="bg-gray-900/30 border border-gray-800/50 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-gray-800/50 text-[10px] text-gray-500 uppercase tracking-widest">
                                    {isAdmin && <th className="px-4 py-3 font-bold">Empleado</th>}
                                    <th className="px-4 py-3 font-bold">Producto</th>
                                    <th className="px-4 py-3 font-bold">Cant.</th>
                                    <th className="px-4 py-3 font-bold">Total</th>
                                    <th className="px-4 py-3 font-bold">Estado</th>
                                    <th className="px-4 py-3 font-bold hidden md:table-cell">Registrado por</th>
                                    <th className="px-4 py-3 font-bold hidden sm:table-cell">Fecha</th>
                                    {isAdmin && <th className="px-4 py-3 font-bold">Acciones</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {credits.map(c => (
                                    <tr key={c.id} className="border-b border-gray-800/20 last:border-0 hover:bg-gray-800/20 transition-colors">
                                        {isAdmin && (
                                            <td className="px-4 py-3">
                                                <span className="font-bold text-white">{c.employee.name}</span>
                                            </td>
                                        )}
                                        <td className="px-4 py-3">
                                            <p className="font-bold text-white">{c.product_name}</p>
                                            {c.notes && <p className="text-gray-500 text-[10px] italic">{c.notes}</p>}
                                        </td>
                                        <td className="px-4 py-3 text-gray-400">{c.quantity}</td>
                                        <td className="px-4 py-3 font-black text-orange-400">${c.total.toFixed(2)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${statusColors[c.status]}`}>
                                                {statusLabel[c.status]}
                                            </span>
                                            {c.has_cash_movement && c.status === 'paid' && (
                                                <span className="ml-1 text-[9px] text-emerald-400 font-bold">✓ en caja</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{c.registered_by}</td>
                                        <td className="px-4 py-3 text-gray-500 hidden sm:table-cell whitespace-nowrap">
                                            {c.status === 'paid' ? c.paid_at : c.status === 'cancelled' ? c.cancelled_at : c.created_at}
                                        </td>
                                        {isAdmin && (
                                            <td className="px-4 py-3">
                                                {c.status === 'pending' && (
                                                    <div className="flex gap-1.5">
                                                        <button
                                                            onClick={() => setPayModal(c)}
                                                            disabled={actionLoading === c.id}
                                                            className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-black rounded-lg transition-all disabled:opacity-50"
                                                        >
                                                            ✓ Cobrar
                                                        </button>
                                                        <button
                                                            onClick={() => handleCancel(c)}
                                                            disabled={actionLoading === c.id}
                                                            className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-black rounded-lg transition-all disabled:opacity-50"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add Credit Modal */}
            {showAdd && (
                <AddCreditModal
                    onClose={() => setShowAdd(false)}
                    onSaved={() => { setShowAdd(false); fetchCredits(); }}
                />
            )}

            {/* Pay Confirmation Modal */}
            {payModal && (
                <PayConfirmModal
                    credit={payModal}
                    onClose={() => setPayModal(null)}
                    onConfirm={handlePay}
                    loading={actionLoading === payModal.id}
                />
            )}
        </div>
    );
}

// ── Pay Confirmation Modal ───────────────────────────────────
function PayConfirmModal({ credit, onClose, onConfirm, loading }) {
    const [note, setNote] = useState('');
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative bg-gray-900 border border-gray-800/50 rounded-2xl shadow-2xl w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
                <div className="p-5">
                    <h3 className="text-white font-black text-base mb-1">Confirmar cobro</h3>
                    <p className="text-gray-400 text-xs mb-4">Se registrará un ingreso en la caja activa y el crédito quedará como pagado.</p>

                    <div className="bg-gray-900/60 border border-gray-800/50 rounded-xl p-3 mb-4 space-y-1">
                        <div className="flex justify-between text-xs"><span className="text-gray-500">Empleado</span><span className="text-white font-bold">{credit.employee.name}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-gray-500">Producto</span><span className="text-white">{credit.product_name}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-gray-500">Monto a cobrar</span><span className="text-orange-400 font-black">${credit.total.toFixed(2)}</span></div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-xs text-gray-400 mb-1.5">Nota (opcional)</label>
                        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Ej: Pagó en efectivo"
                            className="w-full bg-gray-900/60 border border-gray-600/60 text-white placeholder-gray-500 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-orange-500" />
                    </div>

                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold rounded-xl py-2.5 transition-colors">Cancelar</button>
                        <button onClick={() => onConfirm(note)} disabled={loading}
                            className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-60 text-white text-sm font-black rounded-xl py-2.5 flex items-center justify-center gap-2 transition-all">
                            {loading && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>}
                            Cobrar ${credit.total.toFixed(2)}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
