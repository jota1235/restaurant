import { useState, useEffect } from 'react';
import { categoriesAPI } from '../api/menu';
import { usersAPI } from '../api/users';

export default function CategoryFormModal({ category, onClose, onSaved }) {
    const editing = !!category;
    const [form, setForm] = useState({
        name: category?.name ?? '',
        description: category?.description ?? '',
        assigned_cook_id: category?.assigned_cook_id ?? '',
    });
    const [cooks, setCooks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Load available cooks (users with role 'cocina')
    useEffect(() => {
        usersAPI.listCooks()
            .then(res => setCooks(res.data ?? []))
            .catch(() => setCooks([]));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const payload = {
                name: form.name,
                description: form.description,
                assigned_cook_id: form.assigned_cook_id !== '' ? Number(form.assigned_cook_id) : null,
            };
            if (editing) {
                await categoriesAPI.update(category.id, payload);
            } else {
                await categoriesAPI.create(payload);
            }
            onSaved();
        } catch (err) {
            setError(err.response?.data?.message ?? 'Error inesperado');
        } finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative bg-gray-900 border border-gray-800/50 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm sm:mx-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-800/50">
                    <h2 className="text-base font-black text-white tracking-tight">
                        {editing ? 'Editar categoría' : 'Nueva categoría'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3.5">
                    {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>}

                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Nombre *</label>
                        <input
                            type="text" required value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="Tacos, Refrescos, Antojitos…"
                            className="w-full bg-gray-900/60 border border-gray-600/60 text-white placeholder-gray-500 rounded-xl px-3.5 py-2 text-sm
                         focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Descripción</label>
                        <textarea
                            value={form.description} rows={2}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            placeholder="Descripción opcional…"
                            className="w-full bg-gray-900/60 border border-gray-600/60 text-white placeholder-gray-500 rounded-xl px-3.5 py-2 text-sm resize-none
                         focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-colors"
                        />
                    </div>

                    {/* Cook Assignment */}
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">
                            <span className="mr-1">👨‍🍳</span> Cocinero asignado
                            <span className="ml-1.5 text-[10px] text-gray-600 font-normal">(opcional)</span>
                        </label>
                        <select
                            value={form.assigned_cook_id}
                            onChange={e => setForm(f => ({ ...f, assigned_cook_id: e.target.value }))}
                            className="w-full bg-gray-900/60 border border-gray-600/60 text-white rounded-xl px-3.5 py-2 text-sm
                         focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-colors appearance-none"
                        >
                            <option value="">— Sin asignar (mesero entrega) —</option>
                            {cooks.map(cook => (
                                <option key={cook.id} value={cook.id}>{cook.name}</option>
                            ))}
                        </select>
                        {form.assigned_cook_id === '' && (
                            <p className="mt-1 text-[10px] text-gray-600">
                                Esta categoría no irá a pantalla de cocina.
                            </p>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button type="button" onClick={onClose}
                            className="flex-1 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold rounded-xl py-2.5 transition-colors border border-gray-700/50">
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading}
                            className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 disabled:opacity-60 text-white text-sm font-black rounded-xl py-2.5 transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98] flex items-center justify-center gap-2">
                            {loading && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>}
                            {editing ? 'Guardar' : 'Crear'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
