import { useState, useEffect, useCallback } from 'react';
import paymentAPI from '../../services/paymentAPI';
import TicketPreview from '../../components/TicketPreview';

const METHOD_LABELS = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', other: 'Otro' };
const METHOD_STYLES = {
    cash: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    card: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    transfer: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    other: 'bg-gray-700/30 text-gray-400 border-gray-600/30',
};

export default function PaymentHistory() {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [meta, setMeta] = useState({});
    const [filters, setFilters] = useState({ date_from: '', date_to: '', method: '', search: '' });

    // Reprint
    const [ticketData, setTicketData] = useState(null);
    const [showTicket, setShowTicket] = useState(false);
    const [reprintLoading, setReprintLoading] = useState(null);

    const fetchPayments = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (filters.date_from) params.date_from = filters.date_from;
            if (filters.date_to) params.date_to = filters.date_to;
            if (filters.method) params.method = filters.method;
            if (filters.search) params.search = filters.search;

            const res = await paymentAPI.getPayments(params);
            setPayments(res.data.data || []);
            setMeta({
                total: res.data.total,
                current_page: res.data.current_page,
                last_page: res.data.last_page,
            });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        const t = setTimeout(fetchPayments, 300);
        return () => clearTimeout(t);
    }, [fetchPayments]);

    const handleReprint = async (payment) => {
        setReprintLoading(payment.id);
        try {
            if (payment.ticket_data) {
                setTicketData(payment.ticket_data);
                setShowTicket(true);
            } else {
                const res = await paymentAPI.getTicket(payment.id);
                setTicketData(res.data.ticket_data);
                setShowTicket(true);
            }
        } catch (e) {
            alert('No se pudo obtener el ticket');
        } finally {
            setReprintLoading(null);
        }
    };

    const totalSales = payments.reduce((acc, p) => acc + parseFloat(p.amount || 0), 0);
    const totalTips = payments.reduce((acc, p) => acc + parseFloat(p.tip || 0), 0);
    const hasFilters = filters.search || filters.date_from || filters.date_to || filters.method;

    return (
        <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">Historial de Pagos</h1>
                    <p className="text-gray-500 text-xs mt-0.5">{meta.total ?? '...'} pagos registrados</p>
                </div>
                {/* Quick summary */}
                <div className="flex gap-2 sm:gap-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 md:px-4 py-2 rounded-xl md:rounded-2xl text-center flex-1 sm:flex-initial">
                        <div className="text-[8px] md:text-[9px] font-black text-emerald-500/60 uppercase tracking-widest">Ventas</div>
                        <div className="text-sm md:text-lg font-black text-emerald-400">${totalSales.toFixed(2)}</div>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 px-3 md:px-4 py-2 rounded-xl md:rounded-2xl text-center flex-1 sm:flex-initial">
                        <div className="text-[8px] md:text-[9px] font-black text-blue-500/60 uppercase tracking-widest">Propinas</div>
                        <div className="text-sm md:text-lg font-black text-blue-400">${totalTips.toFixed(2)}</div>
                    </div>
                </div>
            </div>

            {/* Filters — stack on mobile */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 items-stretch sm:items-center">
                <div className="relative flex-1 sm:flex-initial sm:w-52">
                    <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Buscar folio u orden..."
                        value={filters.search}
                        onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                        className="w-full bg-gray-900/50 border border-gray-800/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-orange-500/40 outline-none transition-all"
                    />
                </div>
                <div className="flex gap-2 flex-1 sm:flex-initial">
                    <input
                        type="date"
                        value={filters.date_from}
                        onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))}
                        className="flex-1 sm:flex-initial bg-gray-900/50 border border-gray-800/50 rounded-xl px-3 py-2.5 text-sm text-white focus:border-orange-500/40 outline-none transition-all"
                    />
                    <input
                        type="date"
                        value={filters.date_to}
                        onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))}
                        className="flex-1 sm:flex-initial bg-gray-900/50 border border-gray-800/50 rounded-xl px-3 py-2.5 text-sm text-white focus:border-orange-500/40 outline-none transition-all"
                    />
                </div>
                <select
                    value={filters.method}
                    onChange={e => setFilters(f => ({ ...f, method: e.target.value }))}
                    className="bg-gray-900/50 border border-gray-800/50 rounded-xl px-3 py-2.5 text-sm text-white focus:border-orange-500/40 outline-none transition-all"
                >
                    <option value="">Todos los métodos</option>
                    <option value="cash">Efectivo</option>
                    <option value="card">Tarjeta</option>
                    <option value="transfer">Transferencia</option>
                    <option value="other">Otro</option>
                </select>
                {hasFilters && (
                    <button
                        onClick={() => setFilters({ date_from: '', date_to: '', method: '', search: '' })}
                        className="text-xs text-gray-500 hover:text-white transition-colors px-3 py-2 bg-gray-800/50 rounded-xl border border-gray-700/50"
                    >
                        Limpiar
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="bg-gray-900/30 border border-gray-800/50 rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-32">
                        <svg className="w-6 h-6 animate-spin text-orange-400" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                    </div>
                ) : payments.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="text-4xl mb-3 opacity-30">🧾</div>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">No se encontraron pagos</p>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table — hidden on mobile */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-800/50">
                                        <th className="text-left text-[10px] text-gray-500 font-black uppercase tracking-widest px-4 py-3">Folio</th>
                                        <th className="text-left text-[10px] text-gray-500 font-black uppercase tracking-widest px-4 py-3">Orden</th>
                                        <th className="text-left text-[10px] text-gray-500 font-black uppercase tracking-widest px-4 py-3">Fecha</th>
                                        <th className="text-left text-[10px] text-gray-500 font-black uppercase tracking-widest px-4 py-3">Método</th>
                                        <th className="text-right text-[10px] text-gray-500 font-black uppercase tracking-widest px-4 py-3">Monto</th>
                                        <th className="text-center text-[10px] text-gray-500 font-black uppercase tracking-widest px-4 py-3">Flags</th>
                                        <th className="text-right text-[10px] text-gray-500 font-black uppercase tracking-widest px-4 py-3">Acc.</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800/30">
                                    {payments.map(p => (
                                        <tr key={p.id} className="hover:bg-gray-800/20 transition-colors">
                                            <td className="px-4 py-3">
                                                <span className="font-mono text-xs text-orange-400 font-bold">{p.ticket_folio || '—'}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-white font-bold text-xs">#{p.order?.order_number || p.order_id}</span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-400 text-xs">
                                                {new Date(p.created_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${METHOD_STYLES[p.payment_method] || METHOD_STYLES.other}`}>
                                                    {METHOD_LABELS[p.payment_method] || p.payment_method}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="text-white font-black text-xs">${parseFloat(p.amount).toFixed(2)}</span>
                                                {parseFloat(p.tip) > 0 && (
                                                    <span className="text-blue-400 text-[10px] ml-1">+${parseFloat(p.tip).toFixed(2)}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    {!p.ticket_generated && (
                                                        <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">S/T</span>
                                                    )}
                                                    {!p.registered_in_cash && (
                                                        <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-red-500/10 text-red-400 border border-red-500/20">S/C</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {p.ticket_generated && (
                                                    <button
                                                        onClick={() => handleReprint(p)}
                                                        disabled={reprintLoading === p.id}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gray-800/50 hover:bg-gray-700 text-gray-400 hover:text-white text-[9px] font-black uppercase tracking-wider transition-all disabled:opacity-40"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                                        </svg>
                                                        Reimprimir
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View — shown only on mobile */}
                        <div className="md:hidden divide-y divide-gray-800/30">
                            {payments.map(p => (
                                <div key={p.id} className="p-3 hover:bg-gray-800/10 transition-colors">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-white font-black text-sm">#{p.order?.order_number || p.order_id}</span>
                                            <span className={`px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase border ${METHOD_STYLES[p.payment_method] || METHOD_STYLES.other}`}>
                                                {METHOD_LABELS[p.payment_method] || p.payment_method}
                                            </span>
                                        </div>
                                        <span className="text-white font-black text-sm">${parseFloat(p.amount).toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-500 text-[10px]">
                                                {p.ticket_folio && <span className="font-mono text-orange-400">{p.ticket_folio}</span>}
                                                {p.ticket_folio && ' · '}
                                                {new Date(p.created_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {parseFloat(p.tip) > 0 && (
                                                <span className="text-blue-400 text-[9px] font-bold">+${parseFloat(p.tip).toFixed(2)} tip</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {!p.ticket_generated && <span className="px-1 py-0.5 rounded text-[7px] font-black bg-yellow-500/10 text-yellow-400">S/T</span>}
                                            {!p.registered_in_cash && <span className="px-1 py-0.5 rounded text-[7px] font-black bg-red-500/10 text-red-400">S/C</span>}
                                            {p.ticket_generated && (
                                                <button
                                                    onClick={() => handleReprint(p)}
                                                    disabled={reprintLoading === p.id}
                                                    className="p-1.5 rounded-lg bg-gray-800/50 text-gray-400 hover:text-white transition-all disabled:opacity-40"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Ticket Reprint Preview */}
            {showTicket && ticketData && (
                <TicketPreview
                    ticketData={ticketData}
                    onClose={() => { setShowTicket(false); setTicketData(null); }}
                    onPrint={() => { setShowTicket(false); setTicketData(null); }}
                />
            )}
        </div>
    );
}
