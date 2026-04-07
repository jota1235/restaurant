import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersAPI } from '../../api/orders';
import paymentAPI from '../../services/paymentAPI';
import TicketPreview from '../../components/TicketPreview';
import AddCreditModal from '../../components/AddCreditModal';

export default function CajaPage() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [shiftStatus, setShiftStatus] = useState({ isOpen: false, shift: null });

    // Payment State
    const [showCreditModal, setShowCreditModal] = useState(false);
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

    const handlePrintPreCuenta = async () => {
        if (!selectedOrder) return;
        setProcessing(true);
        try {
            const res = await ordersAPI.getTicket(selectedOrder.id);
            setTicketData(res.ticket_data);
            setShowTicketPreview(true);
        } catch (e) {
            alert(e.response?.data?.message || 'Error al generar pre-cuenta');
        } finally {
            setProcessing(false);
        }
    };

    const handleProcessPayment = async () => {
        if (!selectedOrder) return;
        if (paymentData.method === 'cash' && !shiftStatus.isOpen && !paymentData.skipCashRegister) {
            alert('Debe abrir caja antes de procesar pagos en efectivo, o marque "Cobrar sin caja"');
            return;
        }
        const totalWithTip = selectedOrder.total + paymentData.tip;
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

    const getStatusLabel = (s) => {
        switch (s) {
            case 'ready': return 'Listo';
            case 'delivered': return 'Servido';
            case 'confirmed': return 'Confirmado';
            default: return s;
        }
    };

    const getStatusStyle = (s) => {
        switch (s) {
            case 'ready': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20';
            case 'delivered': return 'bg-blue-500/15 text-blue-400 border-blue-500/20';
            default: return 'bg-gray-800/50 text-gray-400 border-gray-700/50';
        }
    };

    // Mobile View State
    const [showTicket, setShowTicket] = useState(false);
    useEffect(() => {
        if (selectedOrder) setShowTicket(true);
    }, [selectedOrder]);

    const totalWithTip = selectedOrder ? selectedOrder.total + paymentData.tip : 0;
    const changeAmount = paymentData.method === 'cash' ? Math.max(0, paymentData.received - totalWithTip) : 0;

    // Skeleton Loading
    if (loading && orders.length === 0) return (
        <div className="flex h-full gap-6">
            <div className="flex-1 space-y-6">
                <div className="h-8 w-48 bg-gray-800 rounded-xl animate-pulse" />
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-40 bg-gray-900/40 rounded-3xl border border-gray-800/30 animate-pulse" />
                    ))}
                </div>
            </div>
            <div className="hidden xl:block w-96 bg-gray-900/40 rounded-3xl border border-gray-800/30 animate-pulse" />
        </div>
    );

    return (
        <div className="flex h-full gap-6 relative overflow-hidden">
            {/* ═══════════════ ORDERS LIST ═══════════════ */}
            <div className={`flex-1 flex flex-col min-w-0 ${showTicket && 'hidden xl:flex'}`}>
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-white tracking-tight">Cobros</h1>
                            <p className="text-gray-500 text-xs font-medium">{orders.length} cuentas activas</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Registrar crédito */}
                        <button
                            onClick={() => setShowCreditModal(true)}
                            className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 hover:border-yellow-500/40 text-yellow-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            <span className="text-sm">💳</span>
                            <span className="hidden sm:inline">Crédito</span>
                        </button>
                        {/* Nueva orden a domicilio */}
                        <button
                            onClick={() => navigate('/caja/orden')}
                            className="flex items-center gap-2 px-3 py-2 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 hover:border-orange-500/40 text-orange-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            <span className="text-sm">📞</span>
                            <span className="hidden sm:inline">Nueva orden</span>
                        </button>
                        {/* Shift indicator */}
                        <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest ${
                            shiftStatus.isOpen
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                : 'bg-gray-800/50 border-gray-700/50 text-gray-500'
                        }`}>
                            <span className={`w-2 h-2 rounded-full ${shiftStatus.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-gray-600'}`} />
                            {shiftStatus.isOpen ? 'Caja Abierta' : 'Caja Cerrada'}
                        </div>
                    </div>
                </div>

                {orders.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                        <div className="w-20 h-20 bg-gray-900/60 rounded-3xl flex items-center justify-center mb-5 border border-gray-800/50">
                            <svg className="w-9 h-9 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                        </div>
                        <p className="text-gray-600 text-xs font-bold uppercase tracking-widest mb-1">Sin cuentas pendientes</p>
                        <p className="text-gray-700 text-xs">Las órdenes listas aparecerán aquí automáticamente</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 pb-20 sm:pb-6 scrollbar-none">
                        {orders.map(order => (
                            <button
                                key={order.id}
                                onClick={() => setSelectedOrder(order)}
                                className={`p-5 rounded-3xl border text-left transition-all duration-200 group ${selectedOrder?.id === order.id
                                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-400/50 ring-4 ring-blue-500/10 shadow-xl shadow-blue-500/10'
                                    : 'bg-gray-900/40 border-gray-800/50 hover:border-gray-700/50 hover:bg-gray-900/60'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`text-lg font-black ${selectedOrder?.id === order.id ? 'text-white' : 'text-gray-200'}`}>
                                        #{order.order_number}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${selectedOrder?.id === order.id
                                        ? 'bg-white/20 border-white/20 text-white'
                                        : getStatusStyle(order.status)
                                        }`}>
                                        {getStatusLabel(order.status)}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-2 mb-5">
                                    {order.type === 'takeaway' ? (
                                        <div className="flex flex-col gap-1.5">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase border w-max ${
                                                selectedOrder?.id === order.id
                                                    ? 'bg-white/20 border-white/20 text-white'
                                                    : 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                                            }`}>
                                                🛵 {order.customer_name || 'Para Llevar'}
                                            </span>
                                            {order.delivery_address && (
                                                <span className={`text-[10px] font-bold ${selectedOrder?.id === order.id ? 'text-blue-100' : 'text-gray-400'} truncate`}>
                                                    📍 {order.delivery_address}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <svg className={`w-3 h-3 ${selectedOrder?.id === order.id ? 'text-blue-200' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                            </svg>
                                            <span className={`text-[10px] font-bold uppercase tracking-widest ${selectedOrder?.id === order.id ? 'text-blue-200' : 'text-gray-500'}`}>
                                                Mesa
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-lg text-xs font-black ${selectedOrder?.id === order.id
                                                ? 'bg-white/20 text-white'
                                                : 'bg-gray-800/60 text-white'
                                            }`}>
                                                {order.table?.name || 'N/A'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-between items-end">
                                    <span className={`text-[9px] font-bold uppercase tracking-widest ${selectedOrder?.id === order.id ? 'text-blue-200' : 'text-gray-600'}`}>
                                        Total
                                    </span>
                                    <span className={`text-xl font-black tracking-tight ${selectedOrder?.id === order.id ? 'text-white' : 'text-blue-400'}`}>
                                        ${order.total.toFixed(2)}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ═══════════════ TICKET SIDEBAR ═══════════════ */}
            <div className={`
                fixed inset-0 z-40 bg-black/60 backdrop-blur-sm xl:hidden transition-opacity duration-300
                ${showTicket && selectedOrder ? 'opacity-100' : 'opacity-0 pointer-events-none'}
            `} onClick={() => setShowTicket(false)} />

            <div className={`
                fixed inset-y-0 right-0 z-50 w-[90%] sm:w-[400px] bg-gray-950 border-l border-gray-800/60 shadow-2xl transition-transform duration-300 transform
                xl:static xl:w-96 xl:translate-x-0 xl:rounded-3xl xl:flex xl:border xl:border-gray-800/50
                ${showTicket && selectedOrder ? 'translate-x-0' : 'translate-x-full'}
                flex flex-col overflow-hidden
            `}>
                {selectedOrder ? (
                    <>
                        {/* Mobile Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-800/50 xl:hidden">
                            <span className="font-black text-xs uppercase text-gray-500 tracking-widest">Resumen de Cuenta</span>
                            <button onClick={() => setShowTicket(false)} className="p-2 bg-gray-800/60 rounded-xl text-gray-400 hover:text-white transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Order Header */}
                        <div className="text-center p-6 bg-gradient-to-b from-gray-900/60 to-transparent">
                            <h2 className="text-3xl font-black text-white leading-none mb-2 tracking-tighter">#{selectedOrder.order_number}</h2>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/15 rounded-xl">
                                <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                </svg>
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                                    Mesa {selectedOrder.table?.name || 'N/A'}
                                </span>
                            </div>
                        </div>

                        {/* Items List */}
                        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-3 scrollbar-none">
                            <div className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                Consumo
                            </div>
                            {selectedOrder.items.map(item => (
                                <div key={item.id} className="flex justify-between gap-3 p-3 bg-gray-900/30 rounded-2xl border border-gray-800/30">
                                    <div className="flex gap-3 flex-1 min-w-0">
                                        <span className="w-7 h-7 flex-shrink-0 bg-blue-500/10 border border-blue-500/15 rounded-lg flex items-center justify-center text-[11px] font-black text-blue-400">
                                            {item.quantity}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <span className="text-sm font-bold text-white line-clamp-1">{item.product.name}</span>
                                            {item.variant && <p className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mt-0.5">{item.variant.name}</p>}
                                            {item.extras?.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1.5">
                                                    {item.extras.map(e => (
                                                        <span key={e.id} className="text-[8px] font-bold uppercase text-emerald-400 bg-emerald-500/[0.06] px-1.5 py-0.5 rounded border border-emerald-500/10">
                                                            + {e.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-sm font-black text-gray-300 whitespace-nowrap">${item.subtotal.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>

                        {/* Totals + Pay Button */}
                        <div className="p-6 bg-gray-950 border-t border-gray-800/50 space-y-3 shadow-[0_-20px_40px_rgba(0,0,0,0.5)]">
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                                    <span>Subtotal</span>
                                    <span>${selectedOrder.subtotal.toFixed(2)}</span>
                                </div>
                                {selectedOrder.tax > 0 && (
                                <div className="flex justify-between text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                                    <span>Impuestos</span>
                                    <span>${selectedOrder.tax.toFixed(2)}</span>
                                </div>
                                )}
                            </div>
                            <div className="flex justify-between items-end pt-2 pb-1">
                                <span className="text-xs font-black text-white uppercase tracking-widest">Total</span>
                                <span className="text-3xl font-black text-blue-400 tracking-tighter leading-none">${selectedOrder.total.toFixed(2)}</span>
                            </div>
                            <button
                                onClick={handlePrintPreCuenta}
                                disabled={processing}
                                className="w-full mt-3 bg-gray-900 border border-gray-700 hover:bg-gray-800 disabled:opacity-50 text-white font-black py-3 rounded-2xl flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] uppercase text-[11px] tracking-widest"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                IMPRIMIR PRE-CUENTA
                            </button>
                            <button
                                onClick={openPaymentModal}
                                disabled={processing}
                                className="w-full mt-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 text-white font-black py-5 rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] uppercase text-xs tracking-[0.2em]"
                            >
                                {processing ? (
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                        PROCESAR PAGO
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-10">
                        <div className="w-20 h-20 bg-gray-900/60 rounded-3xl flex items-center justify-center mb-5 border border-gray-800/50">
                            <svg className="w-9 h-9 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                        </div>
                        <p className="text-gray-600 text-xs font-bold uppercase tracking-widest mb-1">Sin selección</p>
                        <p className="text-gray-700 text-xs">Selecciona una orden para ver el detalle</p>
                    </div>
                )}
            </div>

            {/* ═══════════════ PAYMENT MODAL ═══════════════ */}
            {showPaymentModal && selectedOrder && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setShowPaymentModal(false)} />
                    <div className="relative w-full max-w-lg bg-gray-950 border border-gray-800/60 rounded-3xl overflow-hidden shadow-2xl shadow-black/50 max-h-[90vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="p-6 text-center border-b border-gray-800/50 bg-gradient-to-b from-gray-900/40 to-transparent flex-shrink-0">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Confirmar Pago</span>
                                <button onClick={() => setShowPaymentModal(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-800/50 hover:bg-gray-700/50 text-gray-500 hover:text-white transition-all">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <span className="text-gray-500 text-xs font-bold">Orden #{selectedOrder.order_number}</span>
                            <h3 className="text-4xl font-black text-white tracking-tighter mt-1">${selectedOrder.total.toFixed(2)}</h3>
                        </div>

                        <div className="p-6 space-y-5 overflow-y-auto flex-1">
                            {/* Method Selector */}
                            <div className="grid grid-cols-4 gap-2 p-1.5 bg-gray-900/40 rounded-2xl border border-gray-800/40">
                                {[
                                    { key: 'cash', label: 'Efectivo', icon: '💵' },
                                    { key: 'card', label: 'Tarjeta', icon: '💳' },
                                    { key: 'transfer', label: 'Transf.', icon: '🏦' },
                                    { key: 'other', label: 'Otro', icon: '📋' },
                                ].map(m => (
                                    <button
                                        key={m.key}
                                        onClick={() => setPaymentData({ ...paymentData, method: m.key })}
                                        className={`py-3 rounded-xl border font-bold uppercase text-[9px] tracking-wider transition-all duration-200 flex flex-col items-center gap-1 ${paymentData.method === m.key
                                            ? 'bg-blue-500 border-blue-400/50 text-white shadow-lg shadow-blue-500/20'
                                            : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                                            }`}
                                    >
                                        <span className="text-base">{m.icon}</span>
                                        {m.label}
                                    </button>
                                ))}
                            </div>

                            {/* Tip */}
                            <div>
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Propina (Opcional)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-gray-600">$</span>
                                    <input
                                        type="number"
                                        value={paymentData.tip}
                                        onChange={(e) => setPaymentData({ ...paymentData, tip: parseFloat(e.target.value) || 0 })}
                                        className="w-full bg-gray-900/50 border border-gray-800/50 rounded-2xl pl-9 pr-5 py-4 text-white font-bold focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all placeholder:text-gray-700"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            {/* Cash: received */}
                            {paymentData.method === 'cash' ? (
                                <div className="bg-gray-900/30 p-5 rounded-2xl border border-gray-800/40 space-y-4">
                                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Billete Recibido</label>
                                    <div className="relative">
                                        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-600">$</span>
                                        <input
                                            type="number"
                                            value={paymentData.received}
                                            onChange={(e) => setPaymentData({ ...paymentData, received: parseFloat(e.target.value) || 0 })}
                                            className="w-full bg-transparent text-3xl font-black text-white outline-none placeholder:text-gray-800 pl-8"
                                            placeholder="0.00"
                                            autoFocus
                                        />
                                    </div>
                                    {/* Quick amounts */}
                                    <div className="flex gap-2">
                                        {[50, 100, 200, 500, 1000].map(amt => (
                                            <button
                                                key={amt}
                                                type="button"
                                                onClick={() => setPaymentData({ ...paymentData, received: amt })}
                                                className="flex-1 py-2.5 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/30 text-gray-300 text-[10px] font-black transition-all hover:border-gray-600/50"
                                            >
                                                ${amt}
                                            </button>
                                        ))}
                                    </div>
                                    {paymentData.received > 0 && paymentData.received >= totalWithTip && (
                                        <div className="pt-3 border-t border-gray-800/50 flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Cambio</span>
                                            <span className="text-xl font-black text-emerald-400">${changeAmount.toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Referencia / Folio</label>
                                    <input
                                        type="text"
                                        value={paymentData.reference}
                                        onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                                        className="w-full bg-gray-900/50 border border-gray-800/50 rounded-2xl px-5 py-4 text-white font-bold focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all placeholder:text-gray-700"
                                        placeholder="Ej: 123456"
                                    />
                                </div>
                            )}

                            {/* Options */}
                            <div className="space-y-2 pt-1">
                                <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-xl hover:bg-gray-900/30 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={paymentData.skipTicket}
                                        onChange={(e) => setPaymentData({ ...paymentData, skipTicket: e.target.checked })}
                                        className="accent-blue-500 w-4 h-4 rounded"
                                    />
                                    <div>
                                        <span className="text-sm text-gray-300 group-hover:text-white transition-colors font-medium">Cobrar sin ticket</span>
                                        <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">No se genera recibo imprimible</p>
                                    </div>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-xl hover:bg-gray-900/30 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={paymentData.skipCashRegister}
                                        onChange={(e) => setPaymentData({ ...paymentData, skipCashRegister: e.target.checked })}
                                        className="accent-blue-500 w-4 h-4 rounded"
                                    />
                                    <div>
                                        <span className="text-sm text-gray-300 group-hover:text-white transition-colors font-medium">Cobrar sin caja</span>
                                        <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">
                                            No registra en caja {!shiftStatus.isOpen && '(cerrada)'}
                                        </p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-gray-900/20 border-t border-gray-800/50 flex gap-3 flex-shrink-0">
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                className="flex-1 py-4 rounded-2xl text-xs font-bold text-gray-500 uppercase tracking-wider hover:text-white hover:bg-gray-800/50 transition-all border border-transparent hover:border-gray-700/50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleProcessPayment}
                                disabled={processing || (paymentData.method === 'cash' && paymentData.received < totalWithTip)}
                                className="flex-[2] py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-30 text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-500/20 uppercase tracking-wider transition-all duration-200 active:scale-[0.98]"
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
            {/* Credit Modal */}
            {showCreditModal && (
                <AddCreditModal
                    onClose={() => setShowCreditModal(false)}
                    onSaved={() => setShowCreditModal(false)}
                />
            )}
        </div>
    );
}
