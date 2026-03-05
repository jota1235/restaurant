import { useState, useEffect, useCallback } from 'react';
import paymentAPI from '../../services/paymentAPI';
import TicketPreview from '../../components/TicketPreview';

const METHOD_LABELS = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', other: 'Otro' };

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
            // Use stored ticket_data first, then fetch from endpoint
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

    // Summary calculations
    const totalSales = payments.reduce((acc, p) => acc + parseFloat(p.amount || 0), 0);
    const totalTips = payments.reduce((acc, p) => acc + parseFloat(p.tip || 0), 0);

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-white">Historial de Pagos</h1>
                    <p className="text-gray-500 text-sm mt-0.5">{meta.total ?? '...'} pagos registrados</p>
                </div>
                {/* Quick summary */}
                <div className="flex gap-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-2xl text-center">
                        <div className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest">Ventas</div>
                        <div className="text-lg font-black text-emerald-400">${totalSales.toFixed(2)}</div>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-2xl text-center">
                        <div className="text-[9px] font-black text-blue-500/60 uppercase tracking-widest">Propinas</div>
                        <div className="text-lg font-black text-blue-400">${totalTips.toFixed(2)}</div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
                <input
                    type="text"
                    placeholder="Buscar folio u orden..."
                    value={filters.search}
                    onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                    className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-orange-500 outline-none w-52"
                />
                <input
                    type="date"
                    value={filters.date_from}
                    onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))}
                    className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-orange-500 outline-none"
                />
                <input
                    type="date"
                    value={filters.date_to}
                    onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))}
                    className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-orange-500 outline-none"
                />
                <select
                    value={filters.method}
                    onChange={e => setFilters(f => ({ ...f, method: e.target.value }))}
                    className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-orange-500 outline-none"
                >
                    <option value="">Todos los métodos</option>
                    <option value="cash">Efectivo</option>
                    <option value="card">Tarjeta</option>
                    <option value="transfer">Transferencia</option>
                    <option value="other">Otro</option>
                </select>
                {(filters.search || filters.date_from || filters.date_to || filters.method) && (
                    <button
                        onClick={() => setFilters({ date_from: '', date_to: '', method: '', search: '' })}
                        className="text-xs text-gray-500 hover:text-white transition-colors underline"
                    >
                        Limpiar filtros
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-gray-900/40 border border-gray-800 rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-32">
                        <svg className="w-6 h-6 animate-spin text-orange-400" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                    </div>
                ) : payments.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="text-4xl mb-3">🧾</div>
                        <p className="text-gray-500 text-sm">No se encontraron pagos</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-800">
                                    <th className="text-left text-[10px] text-gray-500 font-black uppercase tracking-widest px-5 py-3">Folio</th>
                                    <th className="text-left text-[10px] text-gray-500 font-black uppercase tracking-widest px-5 py-3">Orden</th>
                                    <th className="text-left text-[10px] text-gray-500 font-black uppercase tracking-widest px-5 py-3">Fecha</th>
                                    <th className="text-left text-[10px] text-gray-500 font-black uppercase tracking-widest px-5 py-3">Método</th>
                                    <th className="text-right text-[10px] text-gray-500 font-black uppercase tracking-widest px-5 py-3">Monto</th>
                                    <th className="text-center text-[10px] text-gray-500 font-black uppercase tracking-widest px-5 py-3">Flags</th>
                                    <th className="text-right text-[10px] text-gray-500 font-black uppercase tracking-widest px-5 py-3">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50">
                                {payments.map(p => (
                                    <tr key={p.id} className="hover:bg-gray-800/30 transition-colors">
                                        <td className="px-5 py-3">
                                            <span className="font-mono text-xs text-orange-400 font-bold">{p.ticket_folio || '—'}</span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className="text-white font-bold">#{p.order?.order_number || p.order_id}</span>
                                        </td>
                                        <td className="px-5 py-3 text-gray-400 text-xs">
                                            {new Date(p.created_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border ${p.payment_method === 'cash' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                    : p.payment_method === 'card' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                        : p.payment_method === 'transfer' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                                            : 'bg-gray-700 text-gray-400 border-gray-600'
                                                }`}>
                                                {METHOD_LABELS[p.payment_method] || p.payment_method}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <span className="text-white font-black">${parseFloat(p.amount).toFixed(2)}</span>
                                            {parseFloat(p.tip) > 0 && (
                                                <span className="text-blue-400 text-[10px] ml-1">+${parseFloat(p.tip).toFixed(2)}</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                {!p.ticket_generated && (
                                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" title="Sin ticket">
                                                        S/T
                                                    </span>
                                                )}
                                                {!p.registered_in_cash && (
                                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-red-500/10 text-red-400 border border-red-500/20" title="Sin caja">
                                                        S/C
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            {p.ticket_generated && (
                                                <button
                                                    onClick={() => handleReprint(p)}
                                                    disabled={reprintLoading === p.id}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
