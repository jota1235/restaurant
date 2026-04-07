import { useState, useEffect, useRef } from 'react';
import { customersAPI } from '../api/customers';

export default function CustomerSelector({ onSelectCustomer, onClearCustomer }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [selectedAddress, setSelectedAddress] = useState(null);

    const [isCreating, setIsCreating] = useState(false);
    const [showAddressForm, setShowAddressForm] = useState(false);

    // Form states
    const [formData, setFormData] = useState({ name: '', phone: '', street: '', references: '', label: 'Casa' });

    const searchTimeout = useRef(null);

    // Búsqueda en vivo
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await customersAPI.search(query);
                setResults(res.data);
            } catch (e) {
                console.error('Error buscando clientes', e);
            } finally {
                setLoading(false);
            }
        }, 400);

        return () => clearTimeout(searchTimeout.current);
    }, [query]);

    const handleSelect = (customer) => {
        setSelectedCustomer(customer);
        const defAddress = customer.addresses?.find(a => a.is_default) || customer.addresses?.[0] || null;
        setSelectedAddress(defAddress);
        onSelectCustomer(customer, defAddress);
        setQuery('');
        setResults([]);
    };

    const handleClear = () => {
        setSelectedCustomer(null);
        setSelectedAddress(null);
        setQuery('');
        onClearCustomer?.();
    };

    const handleCreateCustomer = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = {
                name: formData.name,
                phone: formData.phone,
                address: formData.street ? {
                    street: formData.street,
                    references: formData.references,
                    label: formData.label
                } : null
            };
            const res = await customersAPI.create(data);
            handleSelect(res.data);
            setIsCreating(false);
            setFormData({ name: '', phone: '', street: '', references: '', label: 'Casa' });
        } catch (err) {
            alert(err.response?.data?.message || 'Error al crear cliente');
        } finally {
            setLoading(false);
        }
    };

    const handleAddAddress = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await customersAPI.addAddress(selectedCustomer.id, {
                street: formData.street,
                references: formData.references,
                label: formData.label,
                is_default: true
            });
            // Update local customer state to include new address and select it
            const updatedCustomer = {
                ...selectedCustomer,
                addresses: [res.data, ...(selectedCustomer.addresses || [])].map(a =>
                    a.id === res.data.id ? a : { ...a, is_default: false }
                )
            };
            setSelectedCustomer(updatedCustomer);
            setSelectedAddress(res.data);
            onSelectCustomer(updatedCustomer, res.data);
            setShowAddressForm(false);
            setFormData(prev => ({ ...prev, street: '', references: '' }));
        } catch (err) {
            alert(err.response?.data?.message || 'Error al agregar dirección');
        } finally {
            setLoading(false);
        }
    };

    if (selectedCustomer) {
        return (
            <div className="bg-gray-900/40 border border-green-500/30 rounded-xl p-3 mb-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2">
                    <button onClick={handleClear} className="text-gray-500 hover:text-red-400 p-1 bg-gray-950/50 rounded-lg">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                        <span className="text-green-400 font-black">
                            {selectedCustomer.name.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-white truncate pr-6">{selectedCustomer.name}</h4>
                        {selectedCustomer.phone && (
                            <p className="text-[10px] text-gray-400 font-bold tracking-widest">{selectedCustomer.phone}</p>
                        )}
                    </div>
                </div>

                <div className="border-t border-gray-800/50 pt-2 mt-2">
                    <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Dirección de Entrega</label>
                    {selectedCustomer.addresses?.length > 0 ? (
                        <select
                            value={selectedAddress?.id || ''}
                            onChange={(e) => {
                                const addr = selectedCustomer.addresses.find(a => a.id == e.target.value);
                                setSelectedAddress(addr);
                                onSelectCustomer(selectedCustomer, addr);
                            }}
                            className="w-full bg-gray-950/60 border border-gray-800/50 text-white rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-orange-500/20 appearance-none"
                        >
                            {selectedCustomer.addresses.map(a => (
                                <option key={a.id} value={a.id}>{a.label}: {a.street}</option>
                            ))}
                        </select>
                    ) : (
                        <p className="text-[10px] text-yellow-500/80 mb-2 italic">Sin direcciones guardadas</p>
                    )}

                    {!showAddressForm ? (
                        <button
                            onClick={() => setShowAddressForm(true)}
                            className="text-[10px] font-bold text-orange-400 hover:text-orange-300 mt-2 flex items-center gap-1"
                        >
                            <span>+</span> Nueva dirección
                        </button>
                    ) : (
                        <form onSubmit={handleAddAddress} className="mt-2 bg-gray-950/40 p-2 rounded-lg border border-gray-800/50">
                            <input
                                required placeholder="Calle y número..."
                                className="w-full bg-gray-900 border border-gray-700 rounded p-1.5 text-xs text-white mb-1.5"
                                value={formData.street} onChange={e => setFormData({ ...formData, street: e.target.value })}
                            />
                            <div className="flex gap-1.5 mb-2">
                                <input
                                    placeholder="Referencias..."
                                    className="flex-1 bg-gray-900 border border-gray-700 rounded p-1.5 text-xs text-white"
                                    value={formData.references} onChange={e => setFormData({ ...formData, references: e.target.value })}
                                />
                                <select
                                    className="w-20 bg-gray-900 border border-gray-700 rounded p-1.5 text-xs text-white outline-none"
                                    value={formData.label} onChange={e => setFormData({ ...formData, label: e.target.value })}
                                >
                                    <option>Casa</option>
                                    <option>Trabajo</option>
                                    <option>Otro</option>
                                </select>
                            </div>
                            <div className="flex gap-1.5">
                                <button type="submit" disabled={loading} className="flex-1 bg-orange-500 text-white text-[10px] font-bold py-1.5 rounded">Guardar</button>
                                <button type="button" onClick={() => setShowAddressForm(false)} className="px-2 bg-gray-800 text-gray-400 text-[10px] font-bold rounded">Cancelar</button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        );
    }

    if (isCreating) {
        return (
            <div className="bg-gray-900/40 border border-orange-500/30 rounded-xl p-3 mb-3">
                <div className="flex items-center justify-between mb-2 border-b border-gray-800 pb-2">
                    <h4 className="text-[11px] font-black uppercase text-orange-400 tracking-wider">Nuevo Cliente</h4>
                    <button onClick={() => setIsCreating(false)} className="text-gray-500 hover:text-white">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <form onSubmit={handleCreateCustomer} className="space-y-2">
                    <div>
                        <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Nombre Completo</label>
                        <input required type="text" className="w-full bg-gray-950/60 border border-gray-800/50 text-white rounded-lg px-2 py-1.5 text-xs mt-1" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div>
                        <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Teléfono</label>
                        <input type="text" className="w-full bg-gray-950/60 border border-gray-800/50 text-white rounded-lg px-2 py-1.5 text-xs mt-1" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                    </div>
                    <div className="pt-1">
                        <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Dirección (Opcional)</label>
                        <input placeholder="Calle y número" type="text" className="w-full bg-gray-950/60 border border-gray-800/50 text-white rounded-lg px-2 py-1.5 text-xs mt-1" value={formData.street} onChange={e => setFormData({ ...formData, street: e.target.value })} />
                    </div>
                    <button type="submit" disabled={loading} className="w-full mt-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white text-[11px] font-black uppercase tracking-wider py-2 rounded-lg shadow-lg">
                        {loading ? 'Guardando...' : 'Crear y Seleccionar'}
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="mb-3 relative">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Cliente (Domicilio)</label>
            <div className="relative">
                <svg className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Buscar por nombre o teléfono..."
                    className="w-full bg-gray-950/60 border border-gray-800/50 text-white rounded-xl pl-8 pr-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/40 transition-all placeholder:text-gray-600"
                />
            </div>

            {/* Results dropdown */}
            {(query || results.length > 0) && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto w-full">
                    {loading && <div className="p-3 text-center text-[10px] text-gray-500 font-bold uppercase tracking-wider">Buscando...</div>}
                    {!loading && results.length === 0 && (
                        <div className="p-3 text-center">
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Sin resultados</p>
                            <button onClick={() => { setIsCreating(true); setFormData(p => ({ ...p, name: query })); }} className="px-3 py-1.5 bg-orange-500/10 text-orange-400 font-bold text-xs rounded border border-orange-500/20 w-full">
                                + Crear "{query}"
                            </button>
                        </div>
                    )}
                    {!loading && results.map(c => (
                        <button
                            key={c.id}
                            onClick={() => handleSelect(c)}
                            className="w-full text-left p-2.5 border-b border-gray-800/50 hover:bg-gray-800 transition-colors flex items-center justify-between"
                        >
                            <div>
                                <p className="text-white text-xs font-bold">{c.name}</p>
                                {c.phone && <p className="text-gray-500 text-[9px] font-black tracking-widest">{c.phone}</p>}
                            </div>
                            {c.addresses?.length > 0 && (
                                <span className="text-[9px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <span>📍</span> {c.addresses[0].street.substring(0, 15)}...
                                </span>
                            )}
                        </button>
                    ))}
                    {!loading && results.length > 0 && (
                        <div className="p-1 border-t border-gray-800">
                            <button onClick={() => { setIsCreating(true); setFormData(p => ({ ...p, name: query })); }} className="w-full text-center py-1.5 text-[10px] font-bold text-orange-400 hover:bg-orange-500/10 rounded">
                                + Nuevo Cliente
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
