import { useState, useEffect } from 'react';
import { productsAPI } from '../api/menu';
import { creditsAPI } from '../api/credits';
import { usersAPI } from '../api/users';
import useAuthStore from '../store/authStore';

export default function AddCreditModal({ onClose, onSaved, targetUserId = null }) {
    const currentUser = useAuthStore(s => s.user);
    // roles is a plain string array e.g. ['admin']
    const isAdmin = currentUser?.roles?.some(r => ['superadmin', 'admin', 'caja'].includes(r)) ?? false;

    const [products, setProducts] = useState([]);
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [form, setForm] = useState({
        product_id: '',
        user_id: targetUserId ?? currentUser?.id ?? '',
        quantity: 1,
        notes: '',
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        // Load products list
        productsAPI.list({ available: 1 }).then(r => setProducts(r.data)).catch(console.error);
        // Load restaurant users (admins can choose any employee)
        if (isAdmin) {
            usersAPI.list().then(res => setUsers(res.data ?? [])).catch(console.error);
        }
    }, [isAdmin]);

    const filteredProducts = products.filter(p =>
        !search || p.name.toLowerCase().includes(search.toLowerCase())
    );

    const selectedProduct = products.find(p => p.id === Number(form.product_id));
    const estimatedTotal = selectedProduct ? (selectedProduct.price * (parseFloat(form.quantity) || 0)).toFixed(2) : '0.00';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});
        try {
            await creditsAPI.create({
                product_id: form.product_id,
                user_id: form.user_id,
                quantity: parseFloat(form.quantity),
                notes: form.notes || undefined,
            });
            onSaved();
        } catch (err) {
            if (err.response?.status === 422) setErrors(err.response.data.errors ?? {});
            else setErrors({ _global: err.response?.data?.message ?? 'Error inesperado' });
        } finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative bg-gray-900 border border-gray-800/50 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[90vh] flex flex-col sm:mx-4" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-800/50 flex-shrink-0">
                    <div>
                        <h2 className="text-base font-black text-white">Registrar crédito</h2>
                        <p className="text-xs text-gray-500">El producto se agrega a cuenta para pagar después</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-none">
                    {errors._global && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{errors._global}</p>}

                    {/* Who is charged (admins can pick any employee) */}
                    {isAdmin && (
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1.5">Empleado a cargo *</label>
                            <select
                                required value={form.user_id} onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}
                                className="w-full bg-gray-900/60 border border-gray-600/60 text-white rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-orange-500"
                            >
                                <option value="">Selecciona empleado…</option>
                                {users.map(u => <option key={u.id} value={u.id} className="bg-gray-800">{u.name}</option>)}
                            </select>
                            {errors.user_id && <p className="text-red-400 text-xs mt-1">{errors.user_id[0]}</p>}
                        </div>
                    )}

                    {/* Product search */}
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Producto *</label>
                        <div className="relative mb-2">
                            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text" value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Buscar producto…"
                                className="w-full bg-gray-900/60 border border-gray-600/60 text-white placeholder-gray-500 rounded-xl pl-9 pr-3.5 py-2 text-sm focus:outline-none focus:border-orange-500"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto scrollbar-none">
                            {filteredProducts.map(p => (
                                <button
                                    key={p.id} type="button"
                                    onClick={() => setForm(f => ({ ...f, product_id: p.id }))}
                                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${form.product_id === p.id
                                        ? 'bg-orange-500/15 border-orange-500/40 ring-1 ring-orange-500/20'
                                        : 'bg-gray-900/40 border-gray-700/40 hover:border-gray-600'
                                    }`}
                                >
                                    {p.image && <img src={p.image} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />}
                                    <div className="min-w-0">
                                        <p className="text-white text-xs font-bold truncate">{p.name}</p>
                                        <p className="text-orange-400 text-[10px] font-black">${Number(p.price).toFixed(2)}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                        {errors.product_id && <p className="text-red-400 text-xs mt-1">{errors.product_id[0]}</p>}
                    </div>

                    {/* Quantity + note */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1.5">Cantidad</label>
                            <input
                                type="number" min="0.001" step="0.001" value={form.quantity}
                                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                                className="w-full bg-gray-900/60 border border-gray-600/60 text-white rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-orange-500"
                            />
                        </div>
                        <div className="flex flex-col justify-end">
                            <div className="bg-gray-900/60 border border-gray-800/50 rounded-xl px-3.5 py-2 text-center">
                                <p className="text-[10px] text-gray-500 font-bold uppercase">Total estimado</p>
                                <p className="text-orange-400 font-black text-lg">${estimatedTotal}</p>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Nota / Motivo</label>
                        <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                            placeholder="Ej: Comida de turno…"
                            className="w-full bg-gray-900/60 border border-gray-600/60 text-white placeholder-gray-500 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-orange-500"
                        />
                    </div>
                </div>

                <div className="flex gap-3 px-5 py-4 border-t border-gray-800/50 flex-shrink-0">
                    <button type="button" onClick={onClose} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold rounded-xl py-2.5 transition-colors">Cancelar</button>
                    <button
                        onClick={handleSubmit} disabled={loading || !form.product_id || !form.user_id}
                        className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 disabled:opacity-60 text-white text-sm font-black rounded-xl py-2.5 flex items-center justify-center gap-2 transition-all"
                    >
                        {loading && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>}
                        Registrar crédito
                    </button>
                </div>
            </div>
        </div>
    );
}
