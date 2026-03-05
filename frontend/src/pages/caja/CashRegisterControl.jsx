import { useState, useEffect, useCallback } from 'react';
import paymentAPI from '../../services/paymentAPI';

export default function CashRegisterControl() {
    const [status, setStatus] = useState({ isOpen: false, shift: null });
    const [loading, setLoading] = useState(true);
    const [showMovementModal, setShowMovementModal] = useState(false);
    const [movements, setMovements] = useState([]);

    // Forms
    const [openForm, setOpenForm] = useState({ opening_balance: 0, notes: '' });
    const [closeForm, setCloseForm] = useState({ closing_balance: 0, notes: '' });
    const [movementForm, setMovementForm] = useState({ type: 'out', amount: 0, reason: '', notes: '' });

    const fetchStatus = useCallback(async () => {
        try {
            const res = await paymentAPI.getRegisterStatus();
            setStatus(res.data);
            if (res.data.isOpen) {
                const movRes = await paymentAPI.getMovements();
                setMovements(movRes.data.movements);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

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
        if (!window.confirm('¿Seguro que desea cerrar la caja?')) return;
        try {
            await paymentAPI.closeRegister(closeForm);
            fetchStatus();
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

    if (loading) return <div className="p-10 text-center">Cargando...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-white">Corte de Caja</h1>
                    <p className="text-gray-500 font-medium uppercase text-[10px] tracking-widest mt-1">
                        Control de turnos y efectivo
                    </p>
                </div>
                {status.isOpen && (
                    <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Caja Abierta</span>
                    </div>
                )}
            </header>

            {!status.isOpen ? (
                /* OPEN SHIFT FORM */
                <div className="bg-gray-900/40 border border-gray-800 rounded-[3rem] p-10 text-center">
                    <div className="w-20 h-20 bg-gray-900 rounded-3xl mx-auto flex items-center justify-center mb-6 border border-gray-800 shadow-2xl">
                        <span className="text-4xl">🔐</span>
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2">Abrir Turno</h2>
                    <p className="text-gray-500 text-sm mb-8 max-w-sm mx-auto">
                        Inicia un nuevo turno ingresando el fondo inicial de caja (efectivo disponible).
                    </p>

                    <form onSubmit={handleOpen} className="max-w-md mx-auto space-y-6">
                        <div className="text-left">
                            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-3 block ml-4">Fondo Inicial ($)</label>
                            <input
                                type="number"
                                required
                                value={openForm.opening_balance}
                                onChange={e => setOpenForm({ ...openForm, opening_balance: e.target.value })}
                                className="w-full bg-gray-950 border border-gray-800 rounded-[2rem] px-8 py-5 text-2xl font-black text-white focus:border-orange-500 outline-none transition-all"
                                placeholder="0.00"
                            />
                        </div>
                        <button className="w-full py-5 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-[2rem] shadow-2xl shadow-orange-500/20 uppercase text-xs tracking-[0.2em] transition-all active:scale-95">
                            INICIAR TURNO
                        </button>
                    </form>
                </div>
            ) : (
                /* SHIFT ACTIVE DASHBOARD */
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Closing Form */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-gray-900/40 border border-gray-800 rounded-[3rem] p-8">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-xl font-black text-white uppercase tracking-tight">Cerrar Caja</h2>
                                <button
                                    onClick={() => setShowMovementModal(true)}
                                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                >
                                    + Movimiento
                                </button>
                            </div>

                            <form onSubmit={handleClose} className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="bg-gray-950/50 p-6 rounded-[2rem] border border-gray-900">
                                        <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1 block">Abierto por</span>
                                        <span className="text-white font-black">{status.shift.user.name}</span>
                                    </div>
                                    <div className="bg-gray-950/50 p-6 rounded-[2rem] border border-gray-900">
                                        <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1 block">Fecha Apertura</span>
                                        <span className="text-white font-black">{new Date(status.shift.opened_at).toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="bg-orange-500/5 border border-orange-500/10 p-8 rounded-[2.5rem]">
                                    <label className="text-[10px] font-black text-orange-500/60 uppercase tracking-widest mb-3 block text-center">Total en Caja (Efectivo Real)</label>
                                    <input
                                        type="number"
                                        required
                                        value={closeForm.closing_balance}
                                        onChange={e => setCloseForm({ ...closeForm, closing_balance: e.target.value })}
                                        className="w-full bg-transparent text-[50px] font-black text-white text-center outline-none placeholder:text-gray-800 leading-none"
                                        placeholder="0.00"
                                    />
                                    <p className="text-[10px] text-gray-500 text-center mt-4 uppercase font-black tracking-widest">
                                        Cuenta el dinero físico y escribe el total
                                    </p>
                                </div>

                                <button className="w-full py-6 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 font-black rounded-[2.5rem] uppercase text-xs tracking-[0.2em] transition-all active:scale-95">
                                    Cerrar Turno y Guardar
                                </button>
                            </form>
                        </div>

                        {/* Recent Movements */}
                        <div className="bg-gray-900/20 border border-gray-800/50 rounded-[3rem] p-8">
                            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6">Movimientos de Turno</h3>
                            <div className="space-y-3">
                                {movements.length === 0 ? (
                                    <p className="text-center py-6 text-gray-600 text-xs font-black uppercase tracking-widest italic">No hay movimientos registrados</p>
                                ) : (
                                    movements.map(m => (
                                        <div key={m.id} className="flex items-center justify-between p-4 bg-gray-950/30 rounded-2xl border border-gray-900">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${m.type === 'in' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                    {m.type === 'in' ? '+' : '-'}
                                                </div>
                                                <div>
                                                    <p className="text-white text-sm font-black tracking-tight">{m.reason}</p>
                                                    <p className="text-[9px] text-gray-600 uppercase font-black tracking-widest">{new Date(m.created_at).toLocaleTimeString()}</p>
                                                </div>
                                            </div>
                                            <span className={`font-black ${m.type === 'in' ? 'text-emerald-500' : 'text-red-500'}`}>
                                                ${parseFloat(m.amount).toFixed(2)}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Stats Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-gray-900/60 border border-gray-800 rounded-[2.5rem] p-6 space-y-4">
                            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Resumen de Caja</h3>

                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Fondo Inicial</span>
                                <span className="text-white font-black">${parseFloat(status.shift.opening_balance).toFixed(2)}</span>
                            </div>

                            <div className="flex justify-between items-center text-emerald-500">
                                <span className="text-[10px] font-bold uppercase">+ Vtas Efectivo</span>
                                <span className="font-black">$0.00</span> {/* Total actual will be calculated by backend on close, but we could sum here */}
                            </div>

                            <div className="border-t border-gray-800 pt-4 mt-4 space-y-4">
                                <div className="flex justify-between items-center text-orange-400">
                                    <span className="text-[10px] font-bold uppercase">Entradas</span>
                                    <span className="font-black">+ ${movements.filter(m => m.type === 'in').reduce((acc, curr) => acc + parseFloat(curr.amount), 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-red-400">
                                    <span className="text-[10px] font-bold uppercase">Salidas</span>
                                    <span className="font-black">- ${movements.filter(m => m.type === 'out').reduce((acc, curr) => acc + parseFloat(curr.amount), 0).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-blue-500/5 border border-blue-500/10 rounded-[2.5rem] text-center">
                            <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.3em] mb-2 block">Tip Antigravity</span>
                            <p className="text-xs text-gray-400 font-medium italic">
                                "Recuerda conciliar los vouchers de tarjeta al final del día por separado."
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Movement Modal */}
            {showMovementModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowMovementModal(false)} />
                    <div className="relative w-full max-w-md bg-gray-950 border border-gray-800 rounded-[3rem] overflow-hidden">
                        <div className="p-8 border-b border-gray-900 bg-gray-900/30">
                            <h3 className="text-xl font-black text-white text-center uppercase tracking-tight">Nuevo Movimiento</h3>
                        </div>
                        <form onSubmit={handleMovement} className="p-8 space-y-6">
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setMovementForm({ ...movementForm, type: 'in' })}
                                    className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all ${movementForm.type === 'in' ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-gray-900 border-gray-800 text-gray-600'}`}
                                >
                                    Entrada
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMovementForm({ ...movementForm, type: 'out' })}
                                    className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all ${movementForm.type === 'out' ? 'bg-red-500 border-red-400 text-white' : 'bg-gray-900 border-gray-800 text-gray-600'}`}
                                >
                                    Salida
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">Monto ($)</label>
                                    <input
                                        type="number"
                                        required
                                        value={movementForm.amount}
                                        onChange={e => setMovementForm({ ...movementForm, amount: e.target.value })}
                                        className="w-full bg-gray-900 border border-gray-800 rounded-2xl px-5 py-4 text-white font-black focus:border-orange-500 outline-none placeholder:text-gray-800"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">Motivo / Concepto</label>
                                    <input
                                        type="text"
                                        required
                                        value={movementForm.reason}
                                        onChange={e => setMovementForm({ ...movementForm, reason: e.target.value })}
                                        className="w-full bg-gray-900 border border-gray-800 rounded-2xl px-5 py-4 text-white font-black focus:border-orange-500 outline-none placeholder:text-gray-800"
                                        placeholder="Ej: Pago de proveedores"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowMovementModal(false)}
                                    className="flex-1 py-4 text-xs font-black text-gray-600 uppercase tracking-widest hover:text-white transition-all"
                                >
                                    Cancelar
                                </button>
                                <button className="flex-[2] py-4 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all">
                                    REGISTRAR
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
