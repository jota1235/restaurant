import { useState, useEffect, useCallback } from 'react';
import { inventoryAPI } from '../../api/inventory';
import { productsAPI } from '../../api/menu';

// ── Helpers ──────────────────────────────────────────────────
const UNITS = ['pieza', 'kg', 'g', 'lt', 'ml', 'caja', 'paquete', 'botella', 'lata'];
const ITEM_TYPES = { ingredient: 'Insumo', menu_product: 'Producto de Menú' };

const stockColor = (item) => {
    if (!item.min_stock) return 'emerald';
    if (item.current_stock <= 0) return 'red';
    if (item.is_low_stock) return 'yellow';
    return 'emerald';
};

const typeColors = {
    entrada: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    salida:  'bg-red-500/15 text-red-400 border-red-500/30',
    ajuste:  'bg-blue-500/15 text-blue-400 border-blue-500/30',
};

// ── Main Component ───────────────────────────────────────────
export default function InventoryPage() {
    const [tab, setTab] = useState('stock'); // 'stock' | 'movements'
    const [items, setItems] = useState([]);
    const [meta, setMeta] = useState({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [lowStockOnly, setLowStockOnly] = useState(false);

    // Modals
    const [itemModal, setItemModal] = useState({ open: false, item: null });
    const [movementModal, setMovementModal] = useState({ open: false, item: null });
    const [movementsPanel, setMovementsPanel] = useState({ open: false, item: null, data: [] });

    const fetchItems = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                search: search || undefined,
                item_type: typeFilter || undefined,
                low_stock: lowStockOnly ? 1 : undefined,
            };
            const res = await inventoryAPI.list(params);
            setItems(res.data);
            setMeta(res.meta);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [search, typeFilter, lowStockOnly]);

    useEffect(() => {
        const t = setTimeout(fetchItems, 250);
        return () => clearTimeout(t);
    }, [fetchItems]);

    const handleDelete = async (item) => {
        if (!window.confirm(`¿Eliminar "${item.name}"?`)) return;
        await inventoryAPI.delete(item.id);
        fetchItems();
    };

    const openMovementsPanel = async (item) => {
        const res = await inventoryAPI.movements(item.id);
        setMovementsPanel({ open: true, item, data: res.data });
    };

    const totalValue = items.reduce((s, i) => s + i.total_value, 0);

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                        <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        Inventario
                    </h1>
                    <p className="text-gray-500 text-xs mt-0.5">Control de insumos y productos</p>
                </div>
                <button
                    onClick={() => setItemModal({ open: true, item: null })}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all shadow shadow-orange-500/20 uppercase tracking-wider"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nuevo insumo
                </button>
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Total insumos', value: meta.total ?? 0, icon: '📦' },
                    { label: 'Stock bajo', value: meta.low_stock ?? 0, icon: '⚠️', warn: (meta.low_stock ?? 0) > 0 },
                    { label: 'Valor total', value: `$${totalValue.toLocaleString()}`, icon: '💰' },
                    { label: 'Filtro activo', value: typeFilter ? ITEM_TYPES[typeFilter] : 'Todos', icon: '🔍' },
                ].map((k, i) => (
                    <div key={i} className={`bg-gray-900/40 border rounded-2xl p-4 ${k.warn ? 'border-yellow-500/30' : 'border-gray-800/50'}`}>
                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">{k.label}</p>
                        <p className={`text-xl font-black mt-0.5 ${k.warn ? 'text-yellow-400' : 'text-white'}`}>{k.value}</p>
                    </div>
                ))}
            </div>

            {/* Tabs + Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex bg-gray-900/40 border border-gray-800/50 rounded-xl p-1 gap-1">
                    {['stock', 'movements'].map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${tab === t ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            {t === 'stock' ? 'Stock' : 'Movimientos'}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2 flex-1">
                    <input
                        type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar insumo…"
                        className="flex-1 bg-gray-900/50 border border-gray-800/50 text-white placeholder-gray-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-500/40"
                    />
                    <select
                        value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                        className="bg-gray-900/50 border border-gray-800/50 text-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none"
                    >
                        <option value="">Todos los tipos</option>
                        <option value="ingredient">Insumos</option>
                        <option value="menu_product">Productos</option>
                    </select>
                    <button
                        onClick={() => setLowStockOnly(l => !l)}
                        className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all ${lowStockOnly ? 'bg-yellow-500/15 border-yellow-500/40 text-yellow-400' : 'border-gray-700/50 text-gray-400 hover:text-white'}`}
                    >
                        ⚠️ Bajo stock
                    </button>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <svg className="w-7 h-7 animate-spin text-orange-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                </div>
            ) : tab === 'stock' ? (
                <StockGrid
                    items={items}
                    onEdit={item => setItemModal({ open: true, item })}
                    onDelete={handleDelete}
                    onMovement={item => setMovementModal({ open: true, item })}
                    onHistory={openMovementsPanel}
                />
            ) : (
                <MovementsTab items={items} />
            )}

            {/* Item CRUD Modal */}
            {itemModal.open && (
                <ItemFormModal
                    item={itemModal.item}
                    onClose={() => setItemModal({ open: false, item: null })}
                    onSaved={() => { setItemModal({ open: false, item: null }); fetchItems(); }}
                />
            )}

            {/* Movement Modal */}
            {movementModal.open && (
                <MovementModal
                    item={movementModal.item}
                    onClose={() => setMovementModal({ open: false, item: null })}
                    onSaved={() => { setMovementModal({ open: false, item: null }); fetchItems(); }}
                />
            )}

            {/* Movements Side Panel */}
            {movementsPanel.open && (
                <MovementsPanel
                    item={movementsPanel.item}
                    data={movementsPanel.data}
                    onClose={() => setMovementsPanel({ open: false, item: null, data: [] })}
                />
            )}
        </div>
    );
}

// ── Stock Grid ──────────────────────────────────────────────
function StockGrid({ items, onEdit, onDelete, onMovement, onHistory }) {
    if (items.length === 0) {
        return (
            <div className="text-center py-20">
                <div className="text-4xl mb-3 opacity-30">📦</div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Sin elementos en inventario</p>
                <p className="text-gray-600 text-xs mt-1">Agrega tu primer insumo o producto</p>
            </div>
        );
    }

    return (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map(item => {
                const color = stockColor(item);
                const colorMap = {
                    red: 'border-red-500/40 bg-red-500/5',
                    yellow: 'border-yellow-500/30 bg-yellow-500/5',
                    emerald: 'border-gray-800/50 bg-gray-900/40',
                };
                const dotMap = { red: 'bg-red-500', yellow: 'bg-yellow-400', emerald: 'bg-emerald-500' };

                return (
                    <div key={item.id} className={`border rounded-2xl overflow-hidden transition-all ${colorMap[color]}`}>
                        <div className="p-4">
                            <div className="flex items-start justify-between gap-2 mb-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotMap[color]}`} />
                                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest truncate">
                                            {item.category ?? ITEM_TYPES[item.item_type]}
                                        </span>
                                    </div>
                                    <h3 className="text-white font-bold text-sm truncate">{item.name}</h3>
                                </div>
                                <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-lg flex-shrink-0 font-bold">
                                    {item.item_type === 'ingredient' ? '🧂 Insumo' : '🍽️ Menú'}
                                </span>
                            </div>

                            {/* Stock bar */}
                            <div className="mb-3">
                                <div className="flex justify-between items-baseline mb-1">
                                    <span className="text-xs font-black text-white">{item.current_stock} {item.unit}</span>
                                    {item.min_stock > 0 && (
                                        <span className="text-[10px] text-gray-500">mín: {item.min_stock}</span>
                                    )}
                                </div>
                                {item.min_stock > 0 && (
                                    <div className="w-full bg-gray-800 rounded-full h-1.5">
                                        <div
                                            className={`h-1.5 rounded-full transition-all ${color === 'red' ? 'bg-red-500' : color === 'yellow' ? 'bg-yellow-400' : 'bg-emerald-500'}`}
                                            style={{ width: `${Math.min(100, (item.current_stock / (item.min_stock * 2)) * 100)}%` }}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-gray-500 mb-3">
                                <span>Valor: <span className="text-gray-300 font-bold">${item.total_value.toLocaleString()}</span></span>
                                <span>${item.cost_per_unit}/{item.unit}</span>
                            </div>

                            {/* Actions */}
                            <div className="grid grid-cols-3 gap-1.5">
                                <button
                                    onClick={() => onMovement(item)}
                                    className="flex items-center justify-center gap-1 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 text-[10px] font-bold rounded-lg py-1.5 transition-all"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                    </svg>
                                    Mover
                                </button>
                                <button
                                    onClick={() => onHistory(item)}
                                    className="flex items-center justify-center gap-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] font-bold rounded-lg py-1.5 transition-all"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Historial
                                </button>
                                <div className="flex gap-1">
                                    <button onClick={() => onEdit(item)} className="flex-1 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg py-1.5 transition-all">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
                                    <button onClick={() => onDelete(item)} className="flex-1 flex items-center justify-center bg-gray-800 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-lg py-1.5 transition-all">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ── Movements Tab (global view) ──────────────────────────────
function MovementsTab({ items }) {
    const [selectedItemId, setSelectedItemId] = useState('');
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchMovements = useCallback(async () => {
        if (!selectedItemId) return;
        setLoading(true);
        try {
            const res = await inventoryAPI.movements(selectedItemId);
            setMovements(res.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [selectedItemId]);

    useEffect(() => { fetchMovements(); }, [fetchMovements]);

    return (
        <div className="space-y-4">
            <select
                value={selectedItemId} onChange={e => setSelectedItemId(e.target.value)}
                className="bg-gray-900/50 border border-gray-800/50 text-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-500/40 w-full sm:w-72"
            >
                <option value="">Selecciona un insumo para ver historial…</option>
                {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>

            {loading && <div className="flex justify-center py-10"><svg className="w-6 h-6 animate-spin text-orange-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg></div>}

            {!loading && movements.length > 0 && (
                <div className="bg-gray-900/30 border border-gray-800/50 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="border-b border-gray-800/50 text-[10px] text-gray-500 uppercase tracking-widest">
                                <th className="px-4 py-3 font-bold">Tipo</th>
                                <th className="px-4 py-3 font-bold">Cantidad</th>
                                <th className="px-4 py-3 font-bold hidden md:table-cell">Stock antes → después</th>
                                <th className="px-4 py-3 font-bold hidden sm:table-cell">Usuario</th>
                                <th className="px-4 py-3 font-bold">Nota</th>
                                <th className="px-4 py-3 font-bold">Fecha</th>
                            </tr>
                        </thead>
                        <tbody>
                            {movements.map(m => (
                                <tr key={m.id} className="border-b border-gray-800/20 last:border-0 hover:bg-gray-800/20 transition-colors">
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${typeColors[m.type]}`}>
                                            {m.type === 'entrada' ? '▲ Entrada' : m.type === 'salida' ? '▼ Salida' : '⇄ Ajuste'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-bold text-white">{m.quantity}</td>
                                    <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{m.stock_before} → {m.stock_after}</td>
                                    <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">{m.user}</td>
                                    <td className="px-4 py-3 text-gray-500 max-w-[150px] truncate">{m.notes || '—'}</td>
                                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{m.date}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {!loading && !selectedItemId && (
                <div className="text-center py-16 text-gray-600 text-xs">Selecciona un insumo para ver su historial de movimientos.</div>
            )}
        </div>
    );
}

// ── Item Modal ───────────────────────────────────────────────
function ItemFormModal({ item, onClose, onSaved }) {
    const editing = !!item;
    const [form, setForm] = useState({
        name: item?.name ?? '',
        category: item?.category ?? '',
        unit: item?.unit ?? 'pieza',
        item_type: item?.item_type ?? 'ingredient',
        current_stock: item?.current_stock ?? 0,
        min_stock: item?.min_stock ?? 0,
        cost_per_unit: item?.cost_per_unit ?? 0,
        notes: item?.notes ?? '',
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});
        try {
            if (editing) await inventoryAPI.update(item.id, form);
            else await inventoryAPI.create(form);
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
                <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-800/50 flex-shrink-0">
                    <h2 className="text-base font-black text-white">{editing ? 'Editar insumo' : 'Nuevo insumo'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-3 scrollbar-none">
                    {errors._global && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{errors._global}</p>}

                    <div>
                        <label className={lbl}>Tipo</label>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.entries(ITEM_TYPES).map(([k, v]) => (
                                <button key={k} type="button" onClick={() => set('item_type', k)}
                                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${form.item_type === k ? 'bg-orange-500/15 border-orange-500/40 text-orange-400' : 'border-gray-700/50 text-gray-400'}`}>
                                    {v}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <label className={lbl}>Nombre *</label>
                            <input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Pollo, Tortillas…" className={inp(errors.name)} />
                        </div>
                        <div>
                            <label className={lbl}>Categoría</label>
                            <input value={form.category} onChange={e => set('category', e.target.value)} placeholder="Carnes, Verduras…" className={inp()} />
                        </div>
                        <div>
                            <label className={lbl}>Unidad *</label>
                            <select value={form.unit} onChange={e => set('unit', e.target.value)} className={inp()}>
                                {UNITS.map(u => <option key={u} value={u} className="bg-gray-800">{u}</option>)}
                            </select>
                        </div>
                        {!editing && (
                            <div>
                                <label className={lbl}>Stock inicial</label>
                                <input type="number" min="0" step="0.001" value={form.current_stock} onChange={e => set('current_stock', e.target.value)} className={inp()} />
                            </div>
                        )}
                        <div>
                            <label className={lbl}>Stock mínimo (alerta)</label>
                            <input type="number" min="0" step="0.001" value={form.min_stock} onChange={e => set('min_stock', e.target.value)} className={inp()} />
                        </div>
                        <div>
                            <label className={lbl}>Costo por unidad $</label>
                            <input type="number" min="0" step="0.01" value={form.cost_per_unit} onChange={e => set('cost_per_unit', e.target.value)} className={inp()} />
                        </div>
                        <div className="col-span-2">
                            <label className={lbl}>Notas</label>
                            <input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Opcional…" className={inp()} />
                        </div>
                    </div>
                </form>
                <div className="flex gap-3 px-5 py-4 border-t border-gray-800/50 flex-shrink-0">
                    <button type="button" onClick={onClose} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold rounded-xl py-2.5 transition-colors">Cancelar</button>
                    <button onClick={handleSubmit} disabled={loading} className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 disabled:opacity-60 text-white text-sm font-black rounded-xl py-2.5 shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all">
                        {loading && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>}
                        {editing ? 'Guardar' : 'Crear insumo'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Movement Modal ───────────────────────────────────────────
function MovementModal({ item, onClose, onSaved }) {
    const [form, setForm] = useState({ type: 'entrada', quantity: '', notes: '' });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});
        try {
            await inventoryAPI.addMovement(item.id, form);
            onSaved();
        } catch (err) {
            if (err.response?.status === 422) setErrors(err.response.data.errors ?? {});
            else setErrors({ _global: err.response?.data?.message ?? 'Error' });
        } finally { setLoading(false); }
    };

    const newStock = () => {
        const q = parseFloat(form.quantity) || 0;
        const cur = item.current_stock;
        if (form.type === 'entrada') return cur + q;
        if (form.type === 'salida') return Math.max(0, cur - q);
        return q;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative bg-gray-900 border border-gray-800/50 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm sm:mx-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-800/50">
                    <div>
                        <h2 className="text-base font-black text-white">Registrar movimiento</h2>
                        <p className="text-xs text-gray-500">{item.name} · Stock actual: <span className="text-white font-bold">{item.current_stock} {item.unit}</span></p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
                    {errors._global && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{errors._global}</p>}
                    <div>
                        <label className={lbl}>Tipo de movimiento</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[['entrada', '▲ Entrada', 'emerald'], ['salida', '▼ Salida', 'red'], ['ajuste', '⇄ Ajuste', 'blue']].map(([k, v, c]) => (
                                <button key={k} type="button" onClick={() => setForm(f => ({ ...f, type: k }))}
                                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${form.type === k ? typeColors[k] : 'border-gray-700/50 text-gray-400'}`}>
                                    {v}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className={lbl}>{form.type === 'ajuste' ? 'Nuevo stock total' : 'Cantidad'} *</label>
                        <input
                            required type="number" min="0.001" step="0.001"
                            value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                            placeholder={`0.00 ${item.unit}`} className={inp(errors.quantity)}
                        />
                        {errors.quantity && <p className="text-red-400 text-xs mt-1">{errors.quantity[0]}</p>}
                    </div>
                    {form.quantity > 0 && (
                        <div className="flex items-center justify-between text-xs bg-gray-900/60 rounded-xl px-3 py-2 border border-gray-800/50">
                            <span className="text-gray-400">Stock resultante:</span>
                            <span className={`font-black ${newStock() <= item.min_stock && item.min_stock > 0 ? 'text-yellow-400' : 'text-white'}`}>{newStock().toFixed(3)} {item.unit}</span>
                        </div>
                    )}
                    <div>
                        <label className={lbl}>Nota / Motivo</label>
                        <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Compra del día, desperdicio, entrega…" className={inp()} />
                    </div>
                </form>
                <div className="flex gap-3 px-5 py-4 border-t border-gray-800/50">
                    <button type="button" onClick={onClose} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold rounded-xl py-2.5 transition-colors">Cancelar</button>
                    <button onClick={handleSubmit} disabled={loading} className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600 disabled:opacity-60 text-white text-sm font-black rounded-xl py-2.5 flex items-center justify-center gap-2 transition-all">
                        {loading && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>}
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Movements Side Panel ──────────────────────────────────────
function MovementsPanel({ item, data, onClose }) {
    return (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative bg-gray-900 border-l border-gray-800/60 w-full sm:w-96 h-full flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-800/50 flex-shrink-0">
                    <div>
                        <h2 className="text-base font-black text-white">Historial</h2>
                        <p className="text-xs text-gray-500">{item.name}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2 scrollbar-none">
                    {data.length === 0 && <p className="text-center text-gray-600 text-xs py-10">Sin movimientos registrados</p>}
                    {data.map(m => (
                        <div key={m.id} className="flex items-start gap-3 p-3 bg-gray-900/50 border border-gray-800/30 rounded-xl">
                            <span className={`mt-0.5 px-2 py-0.5 rounded-md text-[9px] font-black border flex-shrink-0 ${typeColors[m.type]}`}>
                                {m.type === 'entrada' ? '▲' : m.type === 'salida' ? '▼' : '⇄'}
                            </span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline justify-between gap-2">
                                    <span className="text-white font-bold text-xs">{m.quantity} {item.unit}</span>
                                    <span className="text-gray-600 text-[10px]">{m.date}</span>
                                </div>
                                <p className="text-gray-500 text-[10px]">{m.stock_before} → {m.stock_after} · {m.user}</p>
                                {m.notes && <p className="text-gray-400 text-[10px] italic mt-0.5 truncate">{m.notes}</p>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

const lbl = 'block text-xs font-medium text-gray-400 mb-1.5';
const inp = (err) =>
    `w-full bg-gray-900/60 border text-white placeholder-gray-500 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-1 transition-colors
   ${err ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/30' : 'border-gray-600/60 focus:border-orange-500 focus:ring-orange-500/30'}`;
