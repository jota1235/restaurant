import { useState, useEffect } from 'react';
import { productsAPI, extrasAPI } from '../api/menu';

export default function ProductFormModal({ product, categories, onClose, onSaved }) {
    const editing = !!product;
    const [availableExtras, setAvailableExtras] = useState([]);
    const [form, setForm] = useState({
        name: product?.name ?? '',
        description: product?.description ?? '',
        price: product?.price ?? '',
        category_id: product?.category?.id ?? categories[0]?.id ?? '',
        is_available: product?.is_available ?? true,
        variants: product?.variants?.map(v => ({ name: v.name, price_modifier: v.price_modifier })) ?? [],
        extras: product?.extras?.map(e => e.id) ?? [],
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

    // Variants helpers
    const addVariant = () => setForm(f => ({ ...f, variants: [...f.variants, { name: '', price_modifier: 0 }] }));
    const removeVariant = (i) => setForm(f => ({ ...f, variants: f.variants.filter((_, idx) => idx !== i) }));
    const setVariant = (i, field, value) =>
        setForm(f => ({ ...f, variants: f.variants.map((v, idx) => idx === i ? { ...v, [field]: value } : v) }));

    const toggleExtra = (id) => {
        setForm(f => ({
            ...f,
            extras: f.extras.includes(id) ? f.extras.filter(eid => eid !== id) : [...f.extras, id]
        }));
    };

    useEffect(() => {
        extrasAPI.list().then(res => setAvailableExtras(res.data)).catch(console.error);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});
        try {
            const payload = {
                ...form,
                price: parseFloat(form.price),
                variants: form.variants.map(v => ({ ...v, price_modifier: parseFloat(v.price_modifier) })),
            };
            if (editing) {
                await productsAPI.update(product.id, payload);
            } else {
                await productsAPI.create(payload);
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
            <div className="relative bg-gray-800 border border-gray-700/60 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-700/50 flex-shrink-0">
                    <h2 className="text-base font-semibold text-white">
                        {editing ? 'Editar producto' : 'Nuevo producto'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Scrollable form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    {errors._global && (
                        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{errors._global}</p>
                    )}

                    {/* Name + Price */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-xs font-medium text-gray-400 mb-1.5">Nombre *</label>
                            <input
                                type="text" required value={form.name}
                                onChange={e => set('name', e.target.value)}
                                placeholder="Taco de Pastor"
                                className={inputCls(errors.name)}
                            />
                            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name[0]}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1.5">Precio *</label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                                <input
                                    type="number" required min="0" step="0.01" value={form.price}
                                    onChange={e => set('price', e.target.value)}
                                    placeholder="0.00"
                                    className={`${inputCls(errors.price)} pl-7`}
                                />
                            </div>
                            {errors.price && <p className="text-red-400 text-xs mt-1">{errors.price[0]}</p>}
                        </div>
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Categoría *</label>
                        <select
                            required value={form.category_id}
                            onChange={e => set('category_id', e.target.value)}
                            className={inputCls(errors.category_id)}
                        >
                            {categories.map(c => (
                                <option key={c.id} value={c.id} className="bg-gray-800">{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Descripción</label>
                        <textarea
                            value={form.description} rows={2}
                            onChange={e => set('description', e.target.value)}
                            placeholder="Descripción del platillo…"
                            className={`${inputCls()} resize-none`}
                        />
                    </div>

                    {/* Available toggle */}
                    <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-300">Disponible ahora</label>
                        <button
                            type="button"
                            onClick={() => set('is_available', !form.is_available)}
                            className={`relative w-11 h-6 rounded-full transition-colors ${form.is_available ? 'bg-orange-500' : 'bg-gray-600'}`}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_available ? 'translate-x-5' : ''}`} />
                        </button>
                    </div>

                    {/* Variants */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-medium text-gray-400">Variantes</label>
                            <button
                                type="button" onClick={addVariant}
                                className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 transition-colors"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Agregar variante
                            </button>
                        </div>
                        {form.variants.length > 0 && (
                            <div className="space-y-2">
                                {form.variants.map((v, i) => (
                                    <div key={i} className="flex gap-2 items-center">
                                        <input
                                            type="text" required value={v.name}
                                            onChange={e => setVariant(i, 'name', e.target.value)}
                                            placeholder="Grande, Sin picante…"
                                            className={`${inputCls()} flex-1`}
                                        />
                                        <div className="relative w-28 flex-shrink-0">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">+$</span>
                                            <input
                                                type="number" step="0.01" value={v.price_modifier}
                                                onChange={e => setVariant(i, 'price_modifier', e.target.value)}
                                                className={`${inputCls()} pl-8 w-full`}
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <button type="button" onClick={() => removeVariant(i)}
                                            className="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {/* Extras Selection */}
                        <div>
                            <label className="text-xs font-medium text-gray-400 block mb-2">Extras disponibles para este producto</label>
                            {availableExtras.length === 0 ? (
                                <p className="text-[10px] text-gray-500 italic">No hay extras creados. Créalos en la sección de Extras.</p>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    {availableExtras.map(extra => (
                                        <button
                                            key={extra.id}
                                            type="button"
                                            onClick={() => toggleExtra(extra.id)}
                                            className={`flex items-center justify-between px-3 py-2 rounded-xl border text-left transition-all ${form.extras.includes(extra.id)
                                                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 ring-1 ring-emerald-500/20'
                                                : 'bg-gray-900/40 border-gray-700/50 text-gray-400'
                                                }`}
                                        >
                                            <span className="text-xs font-bold truncate">{extra.name}</span>
                                            <span className="text-[10px] opacity-70">${parseFloat(extra.price).toFixed(0)}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="flex gap-3 px-6 py-4 border-t border-gray-700/50 flex-shrink-0">
                    <button type="button" onClick={onClose}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-xl py-2.5 transition-colors">
                        Cancelar
                    </button>
                    <button
                        type="submit" form="product-form" disabled={loading}
                        onClick={handleSubmit}
                        className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold rounded-xl py-2.5 transition-colors flex items-center justify-center gap-2">
                        {loading && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>}
                        {editing ? 'Guardar cambios' : 'Crear producto'}
                    </button>
                </div>
            </div>
        </div>
    );
}

const inputCls = (err) =>
    `w-full bg-gray-900/60 border text-white placeholder-gray-500 rounded-xl px-3.5 py-2 text-sm
   focus:outline-none focus:ring-1 transition-colors
   ${err ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/30' : 'border-gray-600/60 focus:border-orange-500 focus:ring-orange-500/30'}`;
