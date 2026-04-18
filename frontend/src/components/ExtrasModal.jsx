import { useState } from 'react';

export default function ExtrasModal({ product, onClose, onConfirm }) {
    const [selectedVariant, setSelectedVariant] = useState(
        product.variants?.length > 0 ? product.variants[0] : null
    );
    const [selectedExtras, setSelectedExtras] = useState([]);
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState('');
    const [customPrice, setCustomPrice] = useState('');

    const toggleExtra = (extra) => {
        setSelectedExtras(prev =>
            prev.find(e => e.id === extra.id)
                ? prev.filter(e => e.id !== extra.id)
                : [...prev, extra]
        );
    };

    const handleConfirm = () => {
        if (selectedVariant?.is_open_price && (!customPrice || Number(customPrice) <= 0)) {
            return; // Could add an alert or error state here
        }
        onConfirm({
            product,
            variant: selectedVariant,
            extras: selectedExtras,
            quantity,
            notes,
            ...(selectedVariant?.is_open_price ? { custom_price: Number(customPrice) } : {})
        });
    };

    const basePrice = selectedVariant?.is_open_price ? Number(customPrice || 0) : (product.price + (selectedVariant?.price_modifier || 0));
    const totalPrice = (basePrice + selectedExtras.reduce((sum, e) => sum + e.price, 0)) * quantity;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-gray-950 border border-gray-800/50 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[90vh] sm:mx-4" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-3 md:p-4 bg-gray-900/50 border-b border-gray-800/50 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-black text-white tracking-tight">{product.name}</h2>
                        <p className="text-gray-500 text-xs font-medium">Personaliza tu orden</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-xl">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto p-3 md:p-4 space-y-5 scrollbar-none">
                    {/* Variants / Tamaño / Sabor */}
                    {product.variants?.length > 0 && (
                        <div>
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Opciones</label>
                            <div className="grid grid-cols-2 gap-2">
                                {product.variants.map(v => (
                                    <button
                                        key={v.id}
                                        onClick={() => setSelectedVariant(v)}
                                        className={`p-3 rounded-2xl border text-sm font-bold transition-all text-left ${selectedVariant?.id === v.id
                                            ? 'bg-orange-500/10 border-orange-500 text-orange-400'
                                            : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'
                                            }`}
                                    >
                                        <div className="flex flex-col">
                                            <span>{v.name}</span>
                                            {v.is_open_price ? (
                                                <span className="text-[10px] opacity-70 italic text-orange-300">Precio Libre</span>
                                            ) : (v.price_modifier !== 0 && (
                                                <span className="text-[10px] opacity-70">
                                                    {v.price_modifier > 0 ? '+' : ''}${Math.abs(v.price_modifier).toFixed(2)}
                                                </span>
                                            ))}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Custom Price Input */}
                    {selectedVariant?.is_open_price && (
                        <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4">
                            <label className="block text-xs font-black text-orange-400 uppercase tracking-widest mb-3">Monto del cliente</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-400 font-bold text-xl">$</span>
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    min="0"
                                    step="0.01"
                                    value={customPrice}
                                    onChange={(e) => setCustomPrice(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-gray-950 border border-orange-500/50 rounded-xl py-3 pl-9 pr-4 text-white font-bold focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                                    autoFocus
                                />
                            </div>
                            <p className="text-[10px] text-orange-300/70 mt-2 leading-tight">Este monto sobreescribe el costo del producto para esta orden. Es obligatorio ingresar un número mayor a cero.</p>
                        </div>
                    )}

                    {/* Extras */}
                    {product.extras?.length > 0 && (
                        <div>
                            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Extras</label>
                            <div className="space-y-2">
                                {product.extras.map(e => {
                                    const isSelected = selectedExtras.find(se => se.id === e.id);
                                    return (
                                        <button
                                            key={e.id}
                                            onClick={() => toggleExtra(e)}
                                            className={`w-full p-4 rounded-2xl border flex justify-between items-center transition-all ${isSelected
                                                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                                                : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${isSelected ? 'bg-emerald-500 border-emerald-500 text-gray-950' : 'border-gray-700'
                                                    }`}>
                                                    {isSelected && (
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <span className="font-bold text-sm">{e.name}</span>
                                            </div>
                                            <span className="text-xs font-black">+${Number(e.price).toFixed(2)}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Notas */}
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Notas especiales</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ej. Sin cebolla, término medio..."
                            className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 min-h-[80px]"
                        />
                    </div>
                </div>

                {/* Footer / Confirm */}
                <div className="p-3 md:p-4 bg-gray-900/50 border-t border-gray-800/50 space-y-3 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center bg-gray-950 border border-gray-800 rounded-2xl p-1">
                            <button
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white text-xl"
                            >-</button>
                            <span className="w-10 text-center font-black text-white">{quantity}</span>
                            <button
                                onClick={() => setQuantity(quantity + 1)}
                                className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white text-xl"
                            >+</button>
                        </div>
                        <div className="text-right">
                            <p className="text-gray-500 text-[10px] font-black uppercase">Total</p>
                            <p className="text-2xl font-black text-white">${totalPrice.toFixed(2)}</p>
                        </div>
                    </div>

                    <button
                        onClick={handleConfirm}
                        disabled={selectedVariant?.is_open_price && (!customPrice || Number(customPrice) <= 0)}
                        className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-black py-3.5 rounded-2xl shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] uppercase text-xs tracking-wider"
                    >
                        AÑADIR A LA ORDEN
                    </button>
                </div>
            </div>
        </div>
    );
}
