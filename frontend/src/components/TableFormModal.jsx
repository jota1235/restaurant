import { useState } from 'react';
import { tablesAPI } from '../api/tables';

const ZONES = ['Interior', 'Terraza', 'Barra', 'VIP', 'Jardín'];

export default function TableFormModal({ table, onClose, onSaved }) {
    const editing = !!table;
    const [form, setForm] = useState({
        name: table?.name ?? '',
        zone: table?.zone ?? '',
        capacity: table?.capacity ?? 4,
        sort_order: table?.sort_order ?? 0,
        is_active: table?.is_active ?? true,
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const set = (field, val) => {
        setForm(f => ({ ...f, [field]: val }));
        setErrors(e => ({ ...e, [field]: null }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});
        try {
            if (editing) {
                await tablesAPI.update(table.id, form);
            } else {
                await tablesAPI.create(form);
            }
            onSaved();
        } catch (err) {
            if (err.response?.status === 422) {
                setErrors(err.response.data.errors ?? {});
            } else {
                setErrors({ _global: err.response?.data?.message ?? 'Error inesperado' });
            }
        } finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-gray-800 border border-gray-700/60 rounded-2xl shadow-2xl w-full max-w-sm">
                <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-700/50">
                    <h2 className="text-base font-semibold text-white">
                        {editing ? 'Editar mesa' : 'Nueva mesa'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
                    {errors._global && (
                        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{errors._global}</p>
                    )}

                    {/* Name */}
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Nombre / Número *</label>
                        <input
                            type="text" required value={form.name}
                            onChange={e => set('name', e.target.value)}
                            placeholder="Mesa 1, VIP 3, Barra A…"
                            className={inputCls(errors.name)}
                        />
                        {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name[0]}</p>}
                    </div>

                    {/* Zone */}
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Zona</label>
                        <div className="flex gap-2">
                            <input
                                type="text" value={form.zone}
                                onChange={e => set('zone', e.target.value)}
                                placeholder="Interior, Terraza…"
                                list="zones-list"
                                className={`${inputCls()} flex-1`}
                            />
                            <datalist id="zones-list">
                                {ZONES.map(z => <option key={z} value={z} />)}
                            </datalist>
                        </div>
                    </div>

                    {/* Capacity + Sort */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1.5">Capacidad (pers.)</label>
                            <input
                                type="number" min={1} max={50} value={form.capacity}
                                onChange={e => set('capacity', parseInt(e.target.value))}
                                className={inputCls()}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1.5">Orden</label>
                            <input
                                type="number" min={0} value={form.sort_order}
                                onChange={e => set('sort_order', parseInt(e.target.value))}
                                className={inputCls()}
                            />
                        </div>
                    </div>

                    {/* Active toggle */}
                    <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-300">Mesa activa</label>
                        <button
                            type="button"
                            onClick={() => set('is_active', !form.is_active)}
                            className={`relative w-11 h-6 rounded-full transition-colors ${form.is_active ? 'bg-orange-500' : 'bg-gray-600'}`}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : ''}`} />
                        </button>
                    </div>

                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose}
                            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-xl py-2.5 transition-colors">
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading}
                            className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold rounded-xl py-2.5 transition-colors flex items-center justify-center gap-2">
                            {loading && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>}
                            {editing ? 'Guardar' : 'Crear mesa'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

const inputCls = (err) =>
    `w-full bg-gray-900/60 border text-white placeholder-gray-500 rounded-xl px-3.5 py-2 text-sm
   focus:outline-none focus:ring-1 transition-colors
   ${err ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/30' : 'border-gray-600/60 focus:border-orange-500 focus:ring-orange-500/30'}`;
