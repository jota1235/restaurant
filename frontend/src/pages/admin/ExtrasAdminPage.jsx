import { useState, useEffect, useCallback } from 'react';
import { extrasAPI } from '../../api/menu';

export default function ExtrasAdminPage() {
    const [extras, setExtras] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ open: false, extra: null });

    const fetchExtras = useCallback(async () => {
        setLoading(true);
        try {
            const data = await extrasAPI.list();
            setExtras(data.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchExtras();
    }, [fetchExtras]);

    const handleDelete = async (extra) => {
        if (!window.confirm(`¿Eliminar extra "${extra.name}"?`)) return;
        try {
            await extrasAPI.delete(extra.id);
            fetchExtras();
        } catch (e) {
            alert('No se pudo eliminar el extra. Puede que esté en uso en órdenes pasadas.');
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const payload = {
            name: formData.get('name'),
            price: parseFloat(formData.get('price')),
            is_active: formData.get('is_active') === 'on'
        };

        try {
            if (modal.extra) {
                await extrasAPI.update(modal.extra.id, payload);
            } else {
                await extrasAPI.create(payload);
            }
            setModal({ open: false, extra: null });
            fetchExtras();
        } catch (err) {
            alert(err.response?.data?.message || 'Error al guardar');
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
                <div>
                    <h1 className="text-lg md:text-xl font-black text-white tracking-tight">Administrar Extras</h1>
                    <p className="text-gray-500 text-xs">Ingredientes adicionales, toppings o mejoradores</p>
                </div>
                <button
                    onClick={() => setModal({ open: true, extra: null })}
                    className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98] uppercase tracking-wider"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nuevo Extra
                </button>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 md:gap-4">
                    {extras.map(extra => (
                        <div key={extra.id} className="bg-gray-900/40 border border-gray-800/50 rounded-2xl p-3 md:p-4 flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-white font-bold">{extra.name}</h3>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${extra.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-700 text-gray-400'}`}>
                                        {extra.is_active ? 'Activo' : 'Inactivo'}
                                    </span>
                                </div>
                                <p className="text-orange-400 font-black text-lg">${parseFloat(extra.price).toFixed(2)}</p>
                            </div>
                            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-700/30">
                                <button
                                    onClick={() => setModal({ open: true, extra })}
                                    className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold rounded-lg transition-colors"
                                >
                                    Editar
                                </button>
                                <button
                                    onClick={() => handleDelete(extra)}
                                    className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                    {extras.length === 0 && (
                        <div className="col-span-full py-20 text-center text-gray-500 opacity-50">
                            <p>No hay extras configurados aún.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            {modal.open && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setModal({ open: false, extra: null })}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <form onSubmit={handleSave} onClick={e => e.stopPropagation()} className="relative bg-gray-900 border border-gray-800/50 rounded-t-3xl sm:rounded-2xl p-5 md:p-6 w-full sm:max-w-md shadow-2xl sm:mx-4">
                        <h2 className="text-lg font-bold text-white mb-4">
                            {modal.extra ? 'Editar Extra' : 'Nuevo Extra'}
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nombre</label>
                                <input
                                    name="name"
                                    type="text"
                                    required
                                    defaultValue={modal.extra?.name || ''}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-orange-500"
                                    placeholder="Ej: Tocino, Queso extra..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Precio</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-2.5 text-gray-500">$</span>
                                    <input
                                        name="price"
                                        type="number"
                                        step="0.01"
                                        required
                                        defaultValue={modal.extra?.price || ''}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-8 pr-4 py-2.5 text-white outline-none focus:border-orange-500"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    name="is_active"
                                    type="checkbox"
                                    defaultChecked={modal.extra ? modal.extra.is_active : true}
                                    className="w-5 h-5 rounded border-gray-700 bg-gray-900 text-orange-500 focus:ring-orange-500/20"
                                />
                                <span className="text-sm text-gray-300">Disponible para la venta</span>
                            </label>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                type="button"
                                onClick={() => setModal({ open: false, extra: null })}
                                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-black rounded-xl shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98]"
                            >
                                {modal.extra ? 'Guardar Cambios' : 'Crear Extra'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
