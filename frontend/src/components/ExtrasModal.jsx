import { useState } from 'react';

export default function ExtrasModal({ product, onClose, onConfirm }) {
    const [selectedVariant, setSelectedVariant] = useState(
        product.variants?.length > 0 ? product.variants[0] : null
    );
    const [selectedExtras, setSelectedExtras] = useState([]);
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState('');

    const toggleExtra = (extra) => {
        setSelectedExtras(prev =>
            prev.find(e => e.id === extra.id)
                ? prev.filter(e => e.id !== extra.id)
                : [...prev, extra]
        );
    };

    const handleConfirm = () => {
        onConfirm({
            product,
            variant: selectedVariant,
            extras: selectedExtras,
            quantity,
            notes
        });
    };

    const totalPrice = (product.price + (selectedVariant?.price_modifier || 0) +
        selectedExtras.reduce((sum, e) => sum + e.price, 0)) * quantity;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-gray-950 border border-gray-800 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-4 bg-gray-900 border-b border-gray-800 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-white">{product.name}</h2>
                        <p className="text-gray-500 text-sm font-medium">Personaliza tu orden</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-xl">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
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
                                            {v.price_modifier !== 0 && (
                                                <span className="text-[10px] opacity-70">
                                                    {v.price_modifier > 0 ? '+' : ''}${Math.abs(v.price_modifier).toFixed(2)}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
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
                <div className="p-4 bg-gray-900 border-t border-gray-800 space-y-4">
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
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-orange-950/20 transition-all active:scale-[0.98]"
                    >
                        AÑADIR A LA ORDEN
                    </button>
                </div>
            </div>
        </div>
    );
}
