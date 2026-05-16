import { useState, useEffect, useCallback } from 'react';
import paymentAPI from '../../services/paymentAPI';
import CashRegisterTicket from '../../components/CashRegisterTicket';

export default function CashRegisterControl() {
    const [status, setStatus] = useState({ isOpen: false, shift: null });
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState(null);
    const [history, setHistory] = useState([]);
    const [activeTab, setActiveTab] = useState('current'); // 'current', 'history'
    
    const [showMovementModal, setShowMovementModal] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [movements, setMovements] = useState([]);

    // Forms
    const [openForm, setOpenForm] = useState({ opening_balance: '', notes: '' });
    const [closeForm, setCloseForm] = useState({ closing_balance: '', notes: '' });
    const [movementForm, setMovementForm] = useState({ type: 'out', amount: '', reason: '', notes: '' });

    const fetchStatus = useCallback(async () => {
        try {
            const res = await paymentAPI.getRegisterStatus();
            setStatus(res.data);
            if (res.data.isOpen) {
                const movRes = await paymentAPI.getMovements();
                setMovements(movRes.data.movements);
                
                const sumRes = await paymentAPI.getRegisterSummary();
                setSummary(sumRes.data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchHistory = useCallback(async () => {
        try {
            const res = await paymentAPI.getRegisterHistory();
            setHistory(res.data.data);
        } catch (e) {
            console.error(e);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    useEffect(() => {
        if (activeTab === 'history') {
            fetchHistory();
        }
    }, [activeTab, fetchHistory]);

    const handleOpen = async (e) => {
        e.preventDefault();
        try {
            await paymentAPI.openRegister(openForm);
            fetchStatus();
        } catch (e) {
            alert(e.response?.data?.message || 'Error al abrir caja');
        }
    };

    const handleClose = async (e) => {
        e.preventDefault();
        if (!window.confirm('¿Seguro que desea cerrar la caja con estos montos?')) return;
        try {
            await paymentAPI.closeRegister(closeForm);
            // Refresh summary one last time to get the final state with difference, etc.
            const sumRes = await paymentAPI.getRegisterSummary();
            setSummary(sumRes.data);
            setShowPrintModal(true);
            
            await fetchStatus();
            await fetchHistory();
            setActiveTab('history');
        } catch (e) {
            alert(e.response?.data?.message || 'Error al cerrar caja');
        }
    };

    const handleMovement = async (e) => {
        e.preventDefault();
        try {
            await paymentAPI.storeMovement(movementForm);
            setShowMovementModal(false);
            setMovementForm({ type: 'out', amount: 0, reason: '', notes: '' });
            fetchStatus();
        } catch (e) {
            alert(e.response?.data?.message || 'Error al registrar movimiento');
        }
    };

    const totalIn = movements.filter(m => m.type === 'in').reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
    const totalOut = movements.filter(m => m.type === 'out').reduce((acc, curr) => acc + parseFloat(curr.amount), 0);

    if (loading) return (
        <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
            <div className="h-8 w-48 bg-gray-800 rounded-xl" />
            <div className="h-4 w-64 bg-gray-800/50 rounded-lg" />
            <div className="h-80 bg-gray-900/40 rounded-3xl border border-gray-800/50" />
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Corte de Caja</h1>
                    </div>
                    <p className="text-gray-500 text-sm ml-[52px]">Control de turnos y movimientos de efectivo</p>
                </div>
                
                <div className="flex items-center gap-3">
                    {/* Tabs */}
                    <div className="flex bg-gray-900/50 p-1 rounded-xl border border-gray-800/50">
                        <button
                            onClick={() => setActiveTab('current')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                                activeTab === 'current' ? 'bg-gray-800 text-white shadow' : 'text-gray-500 hover:text-gray-300'
                            }`}
                        >
                            Turno Actual
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                                activeTab === 'history' ? 'bg-gray-800 text-white shadow' : 'text-gray-500 hover:text-gray-300'
                            }`}
                        >
                            Historial
                        </button>
                    </div>

                    <div className={`inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all duration-500 ${status.isOpen
                            ? 'bg-emerald-500/10 border-emerald-500/20'
                            : 'bg-gray-800/50 border-gray-700/50'
                        }`}>
                        <span className={`w-2.5 h-2.5 rounded-full ${status.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-gray-600'}`} />
                        <span className={`text-[11px] font-black uppercase tracking-widest ${status.isOpen ? 'text-emerald-400' : 'text-gray-500'}`}>
                            {status.isOpen ? 'Abierta' : 'Cerrada'}
                        </span>
                    </div>
                </div>
            </header>

            {activeTab === 'history' ? (
                /* ═══════════════ HISTORY TAB ═══════════════ */
                <div className="space-y-4">
                    <h2 className="text-lg font-black text-white">Historial de Cortes de Caja</h2>
                    {history.length === 0 ? (
                        <div className="text-center py-20 bg-gray-900/30 rounded-3xl border border-gray-800/50">
                            <p className="text-gray-500 text-sm font-medium">No hay cortes de caja registrados en el historial.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {history.map(shift => (
                                <div key={shift.id} className="bg-gray-900/40 border border-gray-800/60 rounded-2xl p-5 hover:bg-gray-900/60 transition-colors">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center font-bold text-gray-400 uppercase">
                                                {shift.user?.name?.[0] || '?'}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">{shift.user?.name}</p>
                                                <p className="text-xs text-gray-500">{new Date(shift.closed_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2 mb-4 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Apertura</span>
                                            <span className="text-gray-300">{new Date(shift.opened_at).toLocaleTimeString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Fondo Inicial</span>
                                            <span className="font-medium text-white">${parseFloat(shift.opening_balance).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Cierre</span>
                                            <span className="font-medium text-white">${parseFloat(shift.closing_balance).toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <div className={`p-3 rounded-xl border ${
                                        parseFloat(shift.difference) === 0 
                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                            : parseFloat(shift.difference) > 0
                                                ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                                : 'bg-red-500/10 border-red-500/20 text-red-400'
                                    }`}>
                                        <div className="flex justify-between text-xs font-black uppercase tracking-wider mb-1">
                                            <span>Diferencia</span>
                                            <span>{parseFloat(shift.difference) > 0 ? '+' : ''}${parseFloat(shift.difference).toFixed(2)}</span>
                                        </div>
                                        {shift.difference !== 0 && (
                                            <p className="text-[10px] opacity-80 mix-blend-plus-lighter">
                                                {parseFloat(shift.difference) > 0 ? 'Sobrante en caja' : 'Faltante en caja'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : !status.isOpen ? (
                /* ═══════════════ OPEN SHIFT FORM ═══════════════ */
                <div className="relative overflow-hidden bg-gray-900/30 border border-gray-800/50 rounded-3xl p-8 sm:p-12 text-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.03] to-indigo-500/[0.03]" />
                    <div className="relative z-10">
                        <div className="w-20 h-20 bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl mx-auto flex items-center justify-center mb-6 border border-gray-700/50 shadow-2xl">
                            <svg className="w-9 h-9 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Abrir Turno</h2>
                        <p className="text-gray-500 text-sm mb-10 max-w-md mx-auto leading-relaxed">
                            Inicia un nuevo turno ingresando el fondo inicial de caja (efectivo disponible al inicio).
                        </p>

                        <form onSubmit={handleOpen} className="max-w-md mx-auto space-y-6">
                            <div className="text-left">
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 block ml-1">
                                    Fondo Inicial
                                </label>
                                <div className="relative">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl font-black text-gray-600">$</span>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        value={openForm.opening_balance}
                                        onChange={e => setOpenForm({ ...openForm, opening_balance: e.target.value })}
                                        className="w-full bg-gray-950/80 border border-gray-700/50 rounded-2xl pl-12 pr-6 py-5 text-2xl font-black text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all placeholder:text-gray-700"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <button className="w-full py-5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 uppercase text-xs tracking-[0.2em] transition-all duration-200 active:scale-[0.98]">
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                    </svg>
                                    INICIAR TURNO
                                </span>
                            </button>
                        </form>
                    </div>
                </div>
            ) : (
                /* ═══════════════ SHIFT ACTIVE DASHBOARD ═══════════════ */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Closing Form */}
                        <div className="bg-gray-900/30 border border-gray-800/50 rounded-3xl p-6 sm:p-8">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
                                <div>
                                    <h2 className="text-lg font-black text-white tracking-tight">Cerrar Turno</h2>
                                    <p className="text-xs text-gray-500 mt-0.5">Ingresa el efectivo real contado en caja</p>
                                </div>
                                <button
                                    onClick={() => setShowMovementModal(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-800/60 hover:bg-gray-700/60 text-gray-300 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-200 border border-gray-700/50 hover:border-gray-600/50"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    Movimiento
                                </button>
                            </div>

                            <form onSubmit={handleClose} className="space-y-6">
                                {/* Shift Info Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="bg-gray-950/40 p-5 rounded-2xl border border-gray-800/40">
                                        <div className="flex items-center gap-2 mb-2">
                                            <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Cajero</span>
                                        </div>
                                        <span className="text-white font-bold text-sm">{status.shift.user.name}</span>
                                    </div>
                                    <div className="bg-gray-950/40 p-5 rounded-2xl border border-gray-800/40">
                                        <div className="flex items-center gap-2 mb-2">
                                            <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Apertura</span>
                                        </div>
                                        <span className="text-white font-bold text-sm">{new Date(status.shift.opened_at).toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* Preview of Expected Total */}
                                {summary && (
                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex justify-between items-center mt-2">
                                        <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Balance Esperado en Caja</span>
                                        <span className="text-xl font-black text-blue-400 tracking-tight">${summary.expected_balance.toFixed(2)}</span>
                                    </div>
                                )}

                                {/* Cash Input */}
                                <div className="relative bg-gradient-to-br from-gray-900/60 to-gray-800/20 border border-gray-700/50 p-8 rounded-3xl">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4 block text-center">
                                        ¿Cuánto efectivo contaste realmente en caja?
                                    </label>
                                    <div className="relative max-w-xs mx-auto">
                                        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-3xl font-black text-gray-700">$</span>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            step="0.01"
                                            value={closeForm.closing_balance}
                                            onChange={e => setCloseForm({ ...closeForm, closing_balance: e.target.value })}
                                            className="w-full bg-transparent text-[44px] font-black text-white text-center outline-none placeholder:text-gray-800 leading-none pl-8"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-500 text-center mt-5 uppercase font-bold tracking-widest">
                                        Escribe el total físico exacto para calcular sobrantes/faltantes
                                    </p>
                                </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowPrintModal(true)}
                                    className="w-full py-5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-black rounded-2xl uppercase text-xs tracking-[0.2em] transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 border border-gray-700/50"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    Vista Previa
                                </button>
                                <button className="w-full py-5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 hover:border-red-500 font-black rounded-2xl uppercase text-xs tracking-[0.2em] transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    Cerrar Turno
                                </button>
                            </div>
                        </form>
                    </div>

                        {/* Recent Movements */}
                        <div className="bg-gray-900/20 border border-gray-800/40 rounded-3xl p-6 sm:p-8">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Movimientos del Turno</h3>
                                <span className="text-[10px] font-bold text-gray-600 bg-gray-800/50 px-2.5 py-1 rounded-lg">
                                    {movements.length} registros
                                </span>
                            </div>
                            <div className="space-y-2">
                                {movements.length === 0 ? (
                                    <div className="text-center py-10">
                                        <svg className="w-10 h-10 text-gray-800 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        <p className="text-gray-600 text-xs font-bold uppercase tracking-widest">Sin movimientos registrados</p>
                                    </div>
                                ) : (
                                    movements.map(m => (
                                        <div key={m.id} className="flex items-center justify-between p-4 bg-gray-950/30 rounded-2xl border border-gray-800/30 hover:border-gray-700/30 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm ${m.type === 'in'
                                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                    }`}>
                                                    {m.type === 'in' ? '↑' : '↓'}
                                                </div>
                                                <div>
                                                    <p className="text-white text-sm font-bold tracking-tight">{m.reason}</p>
                                                    <p className="text-[10px] text-gray-600 font-medium mt-0.5">{new Date(m.created_at).toLocaleTimeString()}</p>
                                                </div>
                                            </div>
                                            <span className={`font-black text-sm ${m.type === 'in' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {m.type === 'in' ? '+' : '-'}${parseFloat(m.amount).toFixed(2)}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Stats Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-gray-900/40 border border-gray-800/50 rounded-3xl p-6 space-y-5">
                            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                Resumen de Ventas
                            </h3>

                            <div className="flex justify-between items-center p-3 bg-gray-950/30 rounded-xl">
                                <span className="text-[11px] font-bold text-gray-400">Fondo Inicial</span>
                                <span className="text-white font-black">${parseFloat(status.shift.opening_balance).toFixed(2)}</span>
                            </div>

                            {summary ? (
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center p-3 bg-emerald-500/[0.04] rounded-xl border border-emerald-500/10">
                                        <span className="text-[11px] font-bold text-emerald-400/70">+ Vtas Efectivo</span>
                                        <span className="font-black text-emerald-400">${summary.cash_sales.toFixed(2)}</span>
                                    </div>
                                    {summary.card_sales > 0 && (
                                        <div className="flex justify-between items-center p-3 bg-blue-500/[0.04] rounded-xl border border-blue-500/10">
                                            <span className="text-[11px] font-bold text-blue-400/70">+ Vtas Tarjeta</span>
                                            <span className="font-black text-blue-400">${summary.card_sales.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {summary.transfer_sales > 0 && (
                                        <div className="flex justify-between items-center p-3 bg-purple-500/[0.04] rounded-xl border border-purple-500/10">
                                            <span className="text-[11px] font-bold text-purple-400/70">+ Transferencias</span>
                                            <span className="font-black text-purple-400">${summary.transfer_sales.toFixed(2)}</span>
                                        </div>
                                    )}

                                    {/* Service Type Indicators */}
                                    <div className="flex justify-between items-center p-3 bg-indigo-500/[0.04] rounded-xl border border-indigo-500/10">
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-bold text-indigo-400/70">🍽️ Ventas Comedor</span>
                                            <span className="text-[9px] text-indigo-400/50 uppercase font-black tracking-widest">{summary.dine_in_count || 0} pedidos</span>
                                        </div>
                                        <span className="font-black text-indigo-400">${(summary.dine_in_sales || 0).toFixed(2)}</span>
                                    </div>

                                    <div className="flex justify-between items-center p-3 bg-pink-500/[0.04] rounded-xl border border-pink-500/10">
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-bold text-pink-400/70">🛍️ Para Llevar</span>
                                            <span className="text-[9px] text-pink-400/50 uppercase font-black tracking-widest">{summary.takeaway_count || 0} pedidos</span>
                                        </div>
                                        <span className="font-black text-pink-400">${(summary.takeaway_sales || 0).toFixed(2)}</span>
                                    </div>

                                    <div className="flex justify-between items-center p-3 bg-orange-500/[0.04] rounded-xl border border-orange-500/10">
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-bold text-orange-400/70">📦 A Domicilio</span>
                                            <span className="text-[9px] text-orange-400/50 uppercase font-black tracking-widest">{summary.delivery_count || 0} pedidos</span>
                                        </div>
                                        <span className="font-black text-orange-400">${(summary.delivery_sales || 0).toFixed(2)}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="animate-pulse h-12 bg-gray-900 rounded-xl" />
                            )}

                            <div className="h-px bg-gray-800/50" />

                            <div className="flex justify-between items-center p-3 rounded-xl">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                                    <span className="text-[11px] font-bold text-gray-400">Otras Entradas</span>
                                </div>
                                <span className="font-black text-blue-400">+${totalIn.toFixed(2)}</span>
                            </div>

                            <div className="flex justify-between items-center p-3 rounded-xl">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-400" />
                                    <span className="text-[11px] font-bold text-gray-400">Salidas</span>
                                </div>
                                <span className="font-black text-red-400">-${totalOut.toFixed(2)}</span>
                            </div>

                            <div className="h-px bg-gray-800/50" />

                            {summary && (
                                <div className="flex justify-between items-center p-4 bg-emerald-500/[0.06] rounded-2xl border border-emerald-500/10">
                                    <span className="text-[11px] font-black text-emerald-400/80 uppercase tracking-wider">Flujo Efectivo Total</span>
                                    <span className="font-black text-xl text-emerald-400">
                                        ${summary.expected_balance.toFixed(2)}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-gradient-to-br from-indigo-500/[0.05] to-blue-500/[0.05] border border-indigo-500/10 rounded-3xl text-center">
                            <div className="w-8 h-8 bg-indigo-500/10 rounded-xl mx-auto flex items-center justify-center mb-3">
                                <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p className="text-xs text-gray-400 font-medium leading-relaxed">
                                Solo las ventas en Efectivo y Entradas/Salidas manuales cambian el flujo de efectivo final de la caja.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════ MOVEMENT MODAL ═══════════════ */}
            {showMovementModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setShowMovementModal(false)} />
                    <div className="relative w-full max-w-md bg-gray-950 border border-gray-800/60 rounded-3xl overflow-hidden shadow-2xl shadow-black/50">
                        <div className="p-6 border-b border-gray-800/50 bg-gray-900/30">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-black text-white tracking-tight">Nuevo Movimiento</h3>
                                <button
                                    onClick={() => setShowMovementModal(false)}
                                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-800/50 hover:bg-gray-700/50 text-gray-500 hover:text-white transition-all"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleMovement} className="p-6 space-y-5">
                            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-900/50 rounded-2xl border border-gray-800/50">
                                <button
                                    type="button"
                                    onClick={() => setMovementForm({ ...movementForm, type: 'in' })}
                                    className={`py-3.5 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 ${movementForm.type === 'in'
                                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                            : 'text-gray-500 hover:text-gray-300'
                                        }`}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                                    </svg>
                                    Entrada
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMovementForm({ ...movementForm, type: 'out' })}
                                    className={`py-3.5 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 ${movementForm.type === 'out'
                                            ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                                            : 'text-gray-500 hover:text-gray-300'
                                        }`}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                                    </svg>
                                    Salida
                                </button>
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Monto</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-gray-600">$</span>
                                    <input
                                        type="number"
                                        required
                                        min="0.01"
                                        step="0.01"
                                        value={movementForm.amount}
                                        onChange={e => setMovementForm({ ...movementForm, amount: e.target.value })}
                                        className="w-full bg-gray-900/60 border border-gray-800/50 rounded-2xl pl-10 pr-5 py-4 text-white text-lg font-black focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all placeholder:text-gray-700"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Motivo / Concepto</label>
                                <input
                                    type="text"
                                    required
                                    value={movementForm.reason}
                                    onChange={e => setMovementForm({ ...movementForm, reason: e.target.value })}
                                    className="w-full bg-gray-900/60 border border-gray-800/50 rounded-2xl px-5 py-4 text-white font-bold focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all placeholder:text-gray-700"
                                    placeholder="Ej: Pago de proveedores"
                                />
                            </div>

                            <div className="flex gap-3 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setShowMovementModal(false)}
                                    className="flex-1 py-4 rounded-2xl text-xs font-bold text-gray-500 uppercase tracking-wider hover:text-white hover:bg-gray-800/50 transition-all border border-transparent hover:border-gray-700/50"
                                >
                                    Cancelar
                                </button>
                                <button className="flex-[2] py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-black rounded-2xl text-[11px] uppercase tracking-wider shadow-lg shadow-blue-500/20 transition-all duration-200 active:scale-[0.98]">
                                    Registrar Movimiento
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* ═══════════════ PRINT MODAL ═══════════════ */}
            {showPrintModal && summary && (
                <CashRegisterTicket
                    data={summary}
                    onClose={() => setShowPrintModal(false)}
                />
            )}
        </div>
    );
}
