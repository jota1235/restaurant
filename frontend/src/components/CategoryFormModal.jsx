import { useState } from 'react';
import { categoriesAPI } from '../api/menu';

export default function CategoryFormModal({ category, onClose, onSaved }) {
    const editing = !!category;
    const [form, setForm] = useState({ name: category?.name ?? '', description: category?.description ?? '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            if (editing) {
                await categoriesAPI.update(category.id, form);
            } else {
                await categoriesAPI.create(form);
            }
            onSaved();
        } catch (err) {
            setError(err.response?.data?.message ?? 'Error inesperado');
        } finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-gray-800 border border-gray-700/60 rounded-2xl shadow-2xl w-full max-w-sm">
                <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-700/50">
                    <h2 className="text-base font-semibold text-white">
                        {editing ? 'Editar categoría' : 'Nueva categoría'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
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

                    <div className="flex gap-3">
                        <button type="button" onClick={onClose}
                            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-xl py-2.5 transition-colors">
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading}
                            className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold rounded-xl py-2.5 transition-colors flex items-center justify-center gap-2">
                            {loading && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>}
                            {editing ? 'Guardar' : 'Crear'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
