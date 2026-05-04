import { useState, useEffect, useRef } from 'react';
import { productsAPI, extrasAPI } from '../api/menu';

// Compress image via canvas to ensure compatibility with any source (camera, gallery, HEIC)
async function compressImage(file, maxWidthPx = 1200, quality = 0.82) {
    return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            const ratio = Math.min(1, maxWidthPx / img.width);
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * ratio);
            canvas.height = Math.round(img.height * ratio);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(
                (blob) => {
                    URL.revokeObjectURL(url);
                    const compressed = new File([blob], 'product.jpg', { type: 'image/jpeg' });
                    resolve(compressed);
                },
                'image/jpeg',
                quality
            );
        };
        img.onerror = () => resolve(file); // Fallback: upload original
        img.src = url;
    });
}

export default function ProductFormModal({ product, categories, onClose, onSaved }) {
    const editing = !!product;
    const fileInputRef = useRef(null);
    const [availableExtras, setAvailableExtras] = useState([]);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(product?.image ?? null);
    const [form, setForm] = useState({
        name: product?.name ?? '',
        description: product?.description ?? '',
        price: product?.price ?? '',
        category_id: product?.category?.id ?? categories[0]?.id ?? '',
        is_available: product?.is_available ?? true,
        promotion_type: product?.promotion_type ?? '',
        variants: product?.variants?.map(v => ({ name: v.name, price_modifier: v.price_modifier, is_open_price: v.is_open_price ?? false })) ?? [],
        extras: product?.extras?.map(e => e.id) ?? [],
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [dragging, setDragging] = useState(false);

    const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

    const addVariant = () => setForm(f => ({ ...f, variants: [...f.variants, { name: '', price_modifier: 0, is_open_price: false }] }));
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

    const handleFileChange = async (file) => {
        if (!file) return;
        // Compress + normalize to JPEG (handles HEIC, large camera shots, etc.)
        const compressed = await compressImage(file);
        setImageFile(compressed);
        const url = URL.createObjectURL(compressed);
        setImagePreview(url);
    };

    const handleInputChange = (e) => {
        handleFileChange(e.target.files[0]);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        handleFileChange(e.dataTransfer.files[0]);
    };

    const clearImage = (e) => {
        e.stopPropagation();
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});
        try {
            const payload = {
                ...form,
                price: parseFloat(form.price),
                variants: form.variants.map(v => ({ ...v, price_modifier: parseFloat(v.price_modifier) })),
                ...(imageFile ? { image: imageFile } : {}),
            };
            if (editing) {
                const res = await productsAPI.update(product.id, payload);
                alert(`DEBUG: URL API=${api.defaults.baseURL}\n\nRespuesta COMPLETA:\n${JSON.stringify(res, null, 2)}`);
            } else {
                const res = await productsAPI.create(payload);
                alert(`DEBUG: URL API=${api.defaults.baseURL}\n\nRespuesta COMPLETA:\n${JSON.stringify(res, null, 2)}`);
            }
            onSaved();
        } catch (err) {
            console.error("Error saving product:", err);
            const errorMsg = err.response?.data?.message || err.message || 'Error desconocido';
            alert(`¡ERROR al guardar!\nDetalles: ${errorMsg}\nRevisa si la base de datos se actualizó correctamente.`);
            
            if (err.response?.status === 422) {
                setErrors(err.response.data.errors ?? {});
            } else if (err.response?.status === 403) {
                setErrors({ _global: 'No tienes permisos para editar este producto (403)' });
            } else if (err.response?.status === 500) {
                setErrors({ _global: 'Error interno del servidor (500). Verifica la base de datos.' });
            } else {
                setErrors({ _global: err.response?.data?.message ?? `Error: ${err.message}` });
            }
        } finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative bg-gray-900 border border-gray-800/50 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] flex flex-col sm:mx-4" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 md:px-6 pt-4 pb-3 border-b border-gray-800/50 flex-shrink-0">
                    <h2 className="text-base font-black text-white tracking-tight">
                        {editing ? 'Editar producto' : 'Nuevo producto'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Scrollable form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 md:px-6 py-4 space-y-3.5 min-h-0 scrollbar-none">
                    {errors._global && (
                        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{errors._global}</p>
                    )}

                    {/* ── Image Upload Zone ── */}
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Foto del producto <span className="text-gray-600 font-normal">(opcional)</span></label>
                        
                        {/* Hidden file input — accept image/*, capture lets mobile show camera option */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                            className="hidden"
                            onChange={handleInputChange}
                        />

                        {imagePreview ? (
                            /* Preview state */
                            <div className="relative group rounded-xl overflow-hidden border border-gray-700/50 bg-gray-950 aspect-video">
                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 text-white text-xs font-bold px-3 py-2 rounded-lg transition-all"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        Cambiar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={clearImage}
                                        className="flex items-center gap-1.5 bg-red-500/20 hover:bg-red-500/40 backdrop-blur border border-red-500/30 text-red-300 text-xs font-bold px-3 py-2 rounded-lg transition-all"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Quitar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Upload drop zone */
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={handleDrop}
                                className={`w-full border-2 border-dashed rounded-xl py-6 px-4 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer
                                    ${dragging 
                                        ? 'border-orange-500 bg-orange-500/10' 
                                        : 'border-gray-700 hover:border-orange-500/60 hover:bg-gray-800/30 bg-gray-900/50'
                                    }`}
                            >
                                <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-bold text-gray-300">Toca para subir foto</p>
                                    <p className="text-[10px] text-gray-600 mt-0.5">
                                        📱 En móvil: cámara o galería · 🖥️ En PC: explorador de archivos
                                    </p>
                                </div>
                            </button>
                        )}
                    </div>

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

                    {/* Description and Promo */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-xs font-medium text-gray-400 mb-1.5">Descripción</label>
                            <textarea
                                value={form.description} rows={2}
                                onChange={e => set('description', e.target.value)}
                                placeholder="Descripción del platillo…"
                                className={`${inputCls()} resize-none`}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1.5">Tipo de Promoción</label>
                            <select
                                value={form.promotion_type || ''}
                                onChange={e => set('promotion_type', e.target.value || null)}
                                className={inputCls(errors.promotion_type)}
                            >
                                <option value="" className="bg-gray-800">Ninguna</option>
                                <option value="2x1" className="bg-gray-800">2x1</option>
                                <option value="3x2" className="bg-gray-800">3x2</option>
                            </select>
                        </div>
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
                                    <div key={i} className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-2.5">
                                        <div className="flex gap-2 items-center">
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
                                                    disabled={v.is_open_price}
                                                />
                                            </div>
                                            <button type="button" onClick={() => removeVariant(i)}
                                                className="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0 p-1">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                        <div className="mt-2 flex items-center justify-between pl-1">
                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                <div className="relative flex items-center">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={v.is_open_price ?? false}
                                                        onChange={e => setVariant(i, 'is_open_price', e.target.checked)}
                                                        className="peer sr-only"
                                                    />
                                                    <div className="w-8 h-4 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-orange-500"></div>
                                                </div>
                                                <span className="text-[10px] text-gray-400 group-hover:text-gray-300 font-medium">Es Variante de Monto Libre (Ignora Precio Base)</span>
                                            </label>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {/* Extras Selection */}
                        <div className="mt-3">
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
                <div className="flex gap-3 px-5 md:px-6 py-4 border-t border-gray-800/50 flex-shrink-0">
                    <button type="button" onClick={onClose}
                        className="flex-1 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold rounded-xl py-2.5 transition-colors border border-gray-700/50">
                        Cancelar
                    </button>
                    <button
                        type="submit" disabled={loading}
                        onClick={handleSubmit}
                        className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 disabled:opacity-60 text-white text-sm font-black rounded-xl py-2.5 transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98] flex items-center justify-center gap-2">
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
