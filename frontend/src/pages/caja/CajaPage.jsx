import { useState, useEffect, useCallback } from 'react';
import { ordersAPI } from '../../api/orders';
import paymentAPI from '../../services/paymentAPI';
import TicketPreview from '../../components/TicketPreview';

export default function CajaPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [shiftStatus, setShiftStatus] = useState({ isOpen: false, shift: null });

    // Payment State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentData, setPaymentData] = useState({
        method: 'cash',
        tip: 0,
        reference: '',
        received: 0,
        skipTicket: false,
        skipCashRegister: false,
    });

    // Ticket Preview State
    const [ticketData, setTicketData] = useState(null);
    const [showTicketPreview, setShowTicketPreview] = useState(false);

    const fetchOrders = useCallback(async () => {
        try {
            const res = await ordersAPI.list({ include_closed: 0 });
            setOrders(res.data.filter(o => ['ready', 'delivered', 'confirmed'].includes(o.status)));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchShiftStatus = useCallback(async () => {
        try {
            const res = await paymentAPI.getRegisterStatus();
            setShiftStatus(res.data);
        } catch (e) {
            console.error(e);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
        fetchShiftStatus();
        const interval = setInterval(fetchOrders, 15000);
        return () => clearInterval(interval);
    }, [fetchOrders, fetchShiftStatus]);

    const resetPaymentForm = () => {
        setPaymentData({
            method: 'cash',
            tip: 0,
            reference: '',
            received: 0,
            skipTicket: false,
            skipCashRegister: false,
        });
    };

    const openPaymentModal = () => {
        resetPaymentForm();
        setShowPaymentModal(true);
    };

    const handleProcessPayment = async () => {
        if (!selectedOrder) return;

        // Cash payment validation: need open shift or skip flag
        if (paymentData.method === 'cash' && !shiftStatus.isOpen && !paymentData.skipCashRegister) {
            alert('Debe abrir caja antes de procesar pagos en efectivo, o marque "Cobrar sin caja"');
            return;
        }

        const totalWithTip = selectedOrder.total + paymentData.tip;

        // Cash: validate received amount
        if (paymentData.method === 'cash' && paymentData.received < totalWithTip) {
            alert('El monto recibido es menor al total');
            return;
        }

        setProcessing(true);
        try {
            const res = await paymentAPI.processPayment({
                order_id: selectedOrder.id,
                amount: selectedOrder.total,
                tip: paymentData.tip,
                payment_method: paymentData.method,
                reference: paymentData.reference,
                amount_received: paymentData.method === 'cash' ? paymentData.received : null,
                skip_ticket: paymentData.skipTicket,
                skip_cash_register: paymentData.skipCashRegister,
            });

            setShowPaymentModal(false);

            // Show ticket preview if ticket was generated
            if (!paymentData.skipTicket && res.data?.ticket_data) {
                setTicketData(res.data.ticket_data);
                setShowTicketPreview(true);
            }

            setSelectedOrder(null);
            fetchOrders();
        } catch (e) {
            console.error(e);
            alert(e.response?.data?.message || 'Error al procesar el pago');
        } finally {
            setProcessing(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'ready': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            case 'delivered': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            default: return 'bg-gray-800 text-gray-400 border-gray-700';
        }
    };

    // Mobile View State
    const [showTicket, setShowTicket] = useState(false);

    useEffect(() => {
        if (selectedOrder) setShowTicket(true);
    }, [selectedOrder]);

    if (loading && orders.length === 0) return <div className="p-10 text-center">Cargando caja...</div>;

    const totalWithTip = selectedOrder ? selectedOrder.total + paymentData.tip : 0;
    const changeAmount = paymentData.method === 'cash' ? Math.max(0, paymentData.received - totalWithTip) : 0;

    return (
        <div className="flex h-full gap-6 relative overflow-hidden">
            {/* Orders List */}
            <div className={`flex-1 flex flex-col min-w-0 ${showTicket && 'hidden xl:flex'}`}>
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-white">Caja / Cobros</h1>
                        <p className="text-gray-400 font-medium">{orders.length} cuentas activas</p>
                    </div>
                    {/* Shift indicator */}
                    <div className={`px-3 py-1.5 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border ${shiftStatus.isOpen
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-gray-800 border-gray-700 text-gray-500'
                        }`}>
                        <span className={`w-2 h-2 rounded-full ${shiftStatus.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-gray-600'}`} />
                        {shiftStatus.isOpen ? 'Caja Abierta' : 'Caja Cerrada'}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-20 sm:pb-6 scrollbar-none">
                    {orders.map(order => (
                        <button
                            key={order.id}
                            onClick={() => setSelectedOrder(order)}
                            className={`p-4 sm:p-5 rounded-[2.5rem] border text-left transition-all ${selectedOrder?.id === order.id
                                ? 'bg-orange-500 border-orange-400 ring-4 ring-orange-500/10'
                                : 'bg-gray-900/60 border-gray-800 hover:border-gray-700'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <span className={`text-xl font-black ${selectedOrder?.id === order.id ? 'text-white' : 'text-gray-200'}`}>#{order.order_number}</span>
                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${selectedOrder?.id === order.id ? 'bg-white/20 border-white/20 text-white' : getStatusColor(order.status)}`}>
                                    {order.status === 'ready' ? 'Listo' : order.status === 'delivered' ? 'Servido' : 'Pend.'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mb-6">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${selectedOrder?.id === order.id ? 'text-orange-200' : 'text-gray-500'}`}>Mesa</span>
                                <span className={`px-2 py-0.5 rounded-lg text-xs font-black ${selectedOrder?.id === order.id ? 'bg-white text-orange-500' : 'bg-gray-800 text-white'}`}>
                                    {order.table?.name || 'Llevar'}
                                </span>
                            </div>
                            <div className="flex justify-between items-end">
                                <span className={`text-[9px] font-black uppercase tracking-widest ${selectedOrder?.id === order.id ? 'text-orange-200' : 'text-gray-500'}`}>Total</span>
                                <span className={`text-xl font-black ${selectedOrder?.id === order.id ? 'text-white' : 'text-orange-400'}`}>
                                    ${order.total.toFixed(2)}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Ticket Details (Sidebar on Desktop, Overlay on Mobile) */}
            <div className={`
                fixed inset-0 z-40 bg-black/60 backdrop-blur-sm xl:hidden transition-opacity duration-300
                ${showTicket && selectedOrder ? 'opacity-100' : 'opacity-0 pointer-events-none'}
            `} onClick={() => setShowTicket(false)} />

            <div className={`
                fixed inset-y-0 right-0 z-50 w-[90%] sm:w-[400px] bg-gray-950 border-l border-gray-800 shadow-2xl transition-transform duration-300 transform
                xl:static xl:w-96 xl:translate-x-0 xl:rounded-3xl xl:flex
                ${showTicket && selectedOrder ? 'translate-x-0' : 'translate-x-full'}
                flex flex-col overflow-hidden
            `}>
                {selectedOrder ? (
                    <>
                        {/* Mobile Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-800 xl:hidden">
                            <span className="font-black text-xs uppercase text-gray-500 tracking-widest">Resumen de Cuenta</span>
                            <button onClick={() => setShowTicket(false)} className="p-2 bg-gray-800 rounded-xl text-gray-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="text-center p-8 bg-gray-900/50">
                            <h2 className="text-3xl font-black text-white leading-none mb-2 tracking-tighter">#{selectedOrder.order_number}</h2>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Mesa {selectedOrder.table?.name || 'N/A'}</span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-none">
                            <div className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] mb-4">Consumo Actual</div>
                            {selectedOrder.items.map(item => (
                                <div key={item.id} className="flex justify-between gap-4 border-b border-gray-900 pb-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex gap-3">
                                            <span className="w-6 h-6 flex-shrink-0 bg-gray-900 rounded-lg flex items-center justify-center text-[11px] font-black text-white">{item.quantity}</span>
                                            <div className="flex-1 min-w-0">
                                                <span className="text-sm font-black text-white uppercase tracking-tight line-clamp-1">{item.product.name}</span>
                                                {item.variant && <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mt-0.5">{item.variant.name}</p>}
                                                {item.extras?.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                                        {item.extras.map(e => (
                                                            <span key={e.id} className="text-[8px] font-black uppercase text-emerald-500 bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10">
                                                                + {e.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-sm font-black text-gray-300 leading-none">${item.subtotal.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="p-8 bg-gray-950 border-t border-gray-800 space-y-4 shadow-[0_-20px_40px_rgba(0,0,0,0.5)]">
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-black text-gray-600 uppercase tracking-widest">
                                    <span>Subtotal</span>
                                    <span>${selectedOrder.subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-[10px] font-black text-gray-600 uppercase tracking-widest">
                                    <span>Impuestos</span>
                                    <span>${selectedOrder.tax.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-end pt-2">
                                <span className="text-xs font-black text-white uppercase tracking-widest">Total</span>
                                <span className="text-4xl font-black text-orange-500 tracking-tighter leading-none">${selectedOrder.total.toFixed(2)}</span>
                            </div>

                            <button
                                onClick={openPaymentModal}
                                disabled={processing}
                                className="w-full mt-6 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-black py-5 rounded-[2rem] shadow-2xl shadow-emerald-500/20 flex items-center justify-center gap-3 transition-all active:scale-95 uppercase text-xs tracking-[0.2em]"
                            >
                                {processing ? (
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                ) : 'PROCESAR PAGO'}
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-10">
                        <div className="w-24 h-24 bg-gray-900 rounded-[2.5rem] flex items-center justify-center mb-6 border border-gray-800 shadow-inner">
                            <svg className="w-10 h-10 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                        </div>
                        <p className="text-xs font-black text-gray-600 uppercase tracking-widest leading-loose">Selecciona una orden<br />para procesar pago</p>
                    </div>
                )}
            </div>

            {/* Enhanced Payment Modal */}
            {showPaymentModal && selectedOrder && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowPaymentModal(false)} />
                    <div className="relative w-full max-w-lg bg-gray-950 border border-gray-800 rounded-[3rem] overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
                        <div className="p-8 text-center border-b border-gray-900 flex-shrink-0">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-2 block">Confirmar Pago — Orden #{selectedOrder.order_number}</span>
                            <h3 className="text-4xl font-black text-white tracking-tighter">${selectedOrder.total.toFixed(2)}</h3>
                        </div>

                        <div className="p-8 space-y-6 overflow-y-auto flex-1">
                            {/* Method Selector */}
                            <div className="grid grid-cols-4 gap-2">
                                {['cash', 'card', 'transfer', 'other'].map(m => (
                                    <button
                                        key={m}
                                        onClick={() => setPaymentData({ ...paymentData, method: m })}
                                        className={`py-3 rounded-2xl border font-black uppercase text-[9px] tracking-widest transition-all ${paymentData.method === m
                                            ? 'bg-orange-500 border-orange-400 text-white shadow-xl shadow-orange-500/20'
                                            : 'bg-gray-900 border-gray-800 text-gray-500 hover:border-gray-700'
                                            }`}
                                    >
                                        {m === 'cash' ? 'Efectivo' : m === 'card' ? 'Tarjeta' : m === 'transfer' ? 'Transf.' : 'Otro'}
                                    </button>
                                ))}
                            </div>

                            {/* Tip */}
                            <div>
                                <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2 block">Propina (Opcional)</label>
                                <input
                                    type="number"
                                    value={paymentData.tip}
                                    onChange={(e) => setPaymentData({ ...paymentData, tip: parseFloat(e.target.value) || 0 })}
                                    className="w-full bg-gray-900 border border-gray-800 rounded-2xl px-5 py-4 text-white font-black focus:border-orange-500 outline-none transition-all placeholder:text-gray-700"
                                    placeholder="0.00"
                                />
                            </div>

                            {/* Cash: received */}
                            {paymentData.method === 'cash' ? (
                                <div className="bg-gray-900/50 p-6 rounded-[2rem] border border-gray-900">
                                    <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2 block">Billete Recibido</label>
                                    <input
                                        type="number"
                                        value={paymentData.received}
                                        onChange={(e) => setPaymentData({ ...paymentData, received: parseFloat(e.target.value) || 0 })}
                                        className="w-full bg-transparent text-3xl font-black text-white outline-none placeholder:text-gray-800"
                                        placeholder="0.00"
                                        autoFocus
                                    />
                                    {/* Quick amounts */}
                                    <div className="flex gap-2 mt-3">
                                        {[50, 100, 200, 500, 1000].map(amt => (
                                            <button
                                                key={amt}
                                                type="button"
                                                onClick={() => setPaymentData({ ...paymentData, received: amt })}
                                                className="flex-1 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] font-black transition-colors"
                                            >
                                                ${amt}
                                            </button>
                                        ))}
                                    </div>
                                    {paymentData.received > 0 && paymentData.received >= totalWithTip && (
                                        <div className="mt-4 pt-4 border-t border-gray-800 flex justify-between items-center">
                                            <span className="text-[10px] font-black text-gray-500 uppercase">Cambio</span>
                                            <span className="text-xl font-black text-emerald-500">${changeAmount.toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2 block">Referencia / Folio</label>
                                    <input
                                        type="text"
                                        value={paymentData.reference}
                                        onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                                        className="w-full bg-gray-900 border border-gray-800 rounded-2xl px-5 py-4 text-white font-black focus:border-orange-500 outline-none transition-all placeholder:text-gray-700"
                                        placeholder="Ej: 123456"
                                    />
                                </div>
                            )}

                            {/* Options */}
                            <div className="space-y-3 pt-2">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={paymentData.skipTicket}
                                        onChange={(e) => setPaymentData({ ...paymentData, skipTicket: e.target.checked })}
                                        className="accent-orange-500 w-4 h-4"
                                    />
                                    <div>
                                        <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Cobrar sin ticket</span>
                                        <p className="text-[9px] text-gray-600 uppercase tracking-widest font-bold">No se genera recibo imprimible</p>
                                    </div>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={paymentData.skipCashRegister}
                                        onChange={(e) => setPaymentData({ ...paymentData, skipCashRegister: e.target.checked })}
                                        className="accent-orange-500 w-4 h-4"
                                    />
                                    <div>
                                        <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Cobrar sin caja</span>
                                        <p className="text-[9px] text-gray-600 uppercase tracking-widest font-bold">No se registra en caja {!shiftStatus.isOpen && '(caja cerrada)'}</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div className="p-8 bg-gray-900/30 flex gap-4 flex-shrink-0">
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                className="flex-1 py-5 rounded-[2rem] text-xs font-black text-gray-500 uppercase tracking-widest hover:text-white transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleProcessPayment}
                                disabled={processing || (paymentData.method === 'cash' && paymentData.received < totalWithTip)}
                                className="flex-[2] py-5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-30 text-white rounded-[2rem] text-xs font-black shadow-2xl shadow-emerald-500/20 uppercase tracking-widest transition-all"
                            >
                                {processing ? 'Procesando...' : 'Finalizar Pago'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Ticket Preview Modal */}
            {showTicketPreview && ticketData && (
                <TicketPreview
                    ticketData={ticketData}
                    onClose={() => { setShowTicketPreview(false); setTicketData(null); }}
                    onPrint={() => { setShowTicketPreview(false); setTicketData(null); }}
                />
            )}
        </div>
    );
}
