import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { categoriesAPI, productsAPI } from '../../api/menu';
import { tablesAPI } from '../../api/tables';
import { ordersAPI } from '../../api/orders';
import ExtrasModal from '../../components/ExtrasModal';

export default function NewOrderPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const tableIdParam = searchParams.get('table_id');

    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [selectedTable, setSelectedTable] = useState(tableIdParam || '');
    const [activeCat, setActiveCat] = useState(null);
    const [search, setSearch] = useState('');
    const [cart, setCart] = useState([]); // { product, variant, quantity, notes, extras: [] }
    const [notes, setNotes] = useState('');

    // Existing Order State
    const [activeOrderId, setActiveOrderId] = useState(null);
    const [existingItems, setExistingItems] = useState([]);

    // Modal State
    const [modalProduct, setModalProduct] = useState(null);

    const fetchInitialData = useCallback(async () => {
        try {
            const [catsRes, tablesRes] = await Promise.all([
                categoriesAPI.list(),
                tablesAPI.list()
            ]);
            setCategories(catsRes.data);
            setTables(tablesRes.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchProducts = useCallback(async () => {
        try {
            const data = await productsAPI.list({
                category_id: activeCat || undefined,
                search: search || undefined,
                available: 1
            });
            setProducts(data.data);
        } catch (e) {
            console.error(e);
        }
    }, [activeCat, search]);

    useEffect(() => { fetchInitialData(); }, [fetchInitialData]);
    useEffect(() => { fetchProducts(); }, [fetchProducts]);

    const fetchActiveOrder = useCallback(async (tableId) => {
        if (!tableId) {
            setActiveOrderId(null);
            setExistingItems([]);
            return;
        }
        try {
            const res = await ordersAPI.list({ table_id: tableId, include_closed: 0 });
            const activeOrders = (res.data || []).filter(o => !['paid', 'cancelled'].includes(o.status));
            if (activeOrders.length > 0) {
                const order = activeOrders[0];
                setActiveOrderId(order.id);
                setExistingItems(order.items || []);
                setActiveTab('cart');
            } else {
                setActiveOrderId(null);
                setExistingItems([]);
            }
        } catch (e) { console.error(e) }
    }, []);

    useEffect(() => {
        fetchActiveOrder(selectedTable);
    }, [selectedTable, fetchActiveOrder]);

    const handleRemoveExistingItem = async (itemId) => {
        if (!window.confirm('¿Eliminar este producto de la orden? (\'pending\' status)')) return;
        try {
            await ordersAPI.removeItem(activeOrderId, itemId);
            setExistingItems(prev => prev.filter(i => i.id !== itemId));
        } catch (e) {
            alert(e.response?.data?.message || 'Error al eliminar');
        }
    };

    const handleProductClick = (product) => {
        if (product.variants?.length > 0 || product.extras?.length > 0) {
            setModalProduct(product);
        } else {
            addToCart({ product, variant: null, extras: [], quantity: 1, notes: '' });
        }
    };

    const addToCart = (item) => {
        // Find existing with same variant and same extras
        const existingIndex = cart.findIndex(c =>
            c.product.id === item.product.id &&
            c.variant?.id === item.variant?.id &&
            JSON.stringify(c.extras.map(e => e.id).sort()) === JSON.stringify(item.extras.map(e => e.id).sort()) &&
            c.notes === item.notes
        );

        if (existingIndex !== -1) {
            const newCart = [...cart];
            newCart[existingIndex].quantity += item.quantity;
            setCart(newCart);
        } else {
            setCart([...cart, item]);
        }
        setModalProduct(null);
    };

    const removeFromCart = (index) => {
        setCart(cart.filter((_, i) => i !== index));
    };

    const updateQuantity = (index, delta) => {
        setCart(cart.map((item, i) =>
            i === index ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
        ));
    };

    const calculateItemPrice = (item) => {
        let price = item.product.price;
        if (item.variant) price += item.variant.price_modifier;
        price += item.extras.reduce((sum, e) => sum + e.price, 0);
        return price;
    };

    const calculateTotal = () => {
        const cartTotal = cart.reduce((sum, item) => sum + (calculateItemPrice(item) * item.quantity), 0);
        const existingTotal = existingItems.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
        return cartTotal + existingTotal;
    };

    const handleSubmit = async () => {
        if (!selectedTable) return alert('Selecciona una mesa');
        if (cart.length === 0 && (!activeOrderId || existingItems.length > 0)) {
            // if there's an active order, but they don't add anything, maybe just return
            if (cart.length === 0 && activeOrderId) return navigate('/mesero/mesas');
            return alert('El carrito está vacío');
        }

        setSubmitting(true);
        try {
            const payload = {
                table_id: selectedTable,
                notes: notes,
                items: cart.map(item => ({
                    product_id: item.product.id,
                    product_variant_id: item.variant?.id || null,
                    quantity: item.quantity,
                    notes: item.notes,
                    extras: item.extras.map(e => ({
                        extra_id: e.id,
                        quantity: 1
                    }))
                }))
            };
            if (activeOrderId && cart.length > 0) {
                await ordersAPI.addItems(activeOrderId, payload);
            } else if (!activeOrderId) {
                await ordersAPI.create(payload);
            }
            navigate('/mesero/mesas');
        } catch (err) {
            alert(err.response?.data?.message || 'Error al procesar la orden');
        } finally {
            setSubmitting(false);
        }
    };

    // TAB State for mobile
    const [activeTab, setActiveTab] = useState('menu'); // 'menu' or 'cart'

    // Auto-switch to cart tab when an active order is loaded on mobile
    useEffect(() => {
        if (activeOrderId && existingItems.length > 0) {
            setActiveTab('cart');
        }
    }, [activeOrderId, existingItems]);

    if (loading) return <div className="p-10 text-center text-white">Cargando...</div>;

    return (
        <div className="flex flex-col lg:flex-row h-full gap-4 overflow-hidden relative">
            {/* ── Mobile Tab Switcher ───────────────────────── */}
            <div className="flex lg:hidden bg-gray-900 border border-gray-800 rounded-2xl p-1 mb-2">
                <button
                    onClick={() => setActiveTab('menu')}
                    className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${activeTab === 'menu' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-gray-500'}`}
                >
                    MENU
                </button>
                <button
                    onClick={() => setActiveTab('cart')}
                    className={`flex-1 py-3 text-xs font-black rounded-xl transition-all relative ${activeTab === 'cart' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-gray-500'}`}
                >
                    CARRITO
                    {cart.length > 0 && (
                        <span className="absolute top-2 right-4 w-5 h-5 bg-white text-orange-500 rounded-full flex items-center justify-center text-[10px] font-black animate-bounce">
                            {cart.length}
                        </span>
                    )}
                </button>
            </div>

            {/* ── Menu Section ─────────────────────────────── */}
            <div className={`flex-1 flex flex-col min-w-0 bg-gray-900/40 rounded-3xl border border-gray-800 p-4 ${activeTab !== 'menu' && 'hidden lg:flex'}`}>
                {/* Search & Categories */}
                <div className="flex flex-col gap-4 mb-4">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Buscar producto..."
                            className="w-full bg-gray-800 border-gray-700 text-white rounded-2xl pl-10 pr-4 py-3 focus:outline-none focus:border-orange-500/50"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <svg className="w-5 h-5 absolute left-3 top-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                        <button
                            onClick={() => setActiveCat(null)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors border ${activeCat === null ? 'bg-orange-500 border-orange-400 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                                }`}
                        >
                            Todos
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCat(cat.id)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors border ${activeCat === cat.id ? 'bg-orange-500 border-orange-400 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                                    }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 pr-2 scrollbar-thin scrollbar-thumb-gray-800 pb-20 lg:pb-0">
                    {products.map(p => (
                        <button
                            key={p.id}
                            onClick={() => handleProductClick(p)}
                            className="bg-gray-800 hover:bg-gray-700 border border-gray-700/50 rounded-2xl p-3 text-left transition-all active:scale-95 group relative overflow-hidden h-fit"
                        >
                            <div className="aspect-square bg-gray-900 rounded-xl mb-3 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform overflow-hidden">
                                {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : '🍽️'}
                            </div>
                            <h3 className="text-sm font-semibold text-white line-clamp-1">{p.name}</h3>
                            <div className="flex items-center justify-between mt-1">
                                <p className="text-orange-400 font-bold">${p.price}</p>
                                {(p.variants?.length > 0 || p.extras?.length > 0) && (
                                    <span className="bg-orange-500 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-black">+</span>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Cart Section ─────────────────────────────── */}
            <div className={`lg:w-85 flex flex-col bg-gray-900/60 rounded-3xl border border-gray-800 overflow-hidden ${activeTab !== 'cart' && 'hidden lg:flex'}`}>
                <div className="p-4 border-b border-gray-800">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-white">Resumen</h2>
                        <button onClick={() => setNotes(n => n === '' ? ' ' : '')} className="text-gray-500 hover:text-white transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                    </div>

                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Asignar Mesa</label>
                    <select
                        value={selectedTable}
                        onChange={(e) => setSelectedTable(e.target.value)}
                        className="w-full bg-gray-800 border-gray-700 text-white rounded-xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500/50 appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:1em_1em]"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7281'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")` }}
                    >
                        <option value="">Seleccionar mesa...</option>
                        {tables.map(t => (
                            <option key={t.id} value={t.id}>{t.name} ({t.zone || 'Gen'})</option>
                        ))}
                    </select>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-none pb-20 lg:pb-4">
                    {/* Active Order Status Banner */}
                    {activeOrderId && (
                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 mb-2">
                            <div className="flex items-center gap-3">
                                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></span>
                                <div>
                                    <p className="text-xs font-black text-orange-400 uppercase tracking-widest">Orden Activa</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">{existingItems.length} productos en la orden · Puedes agregar más abajo</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Existing Items */}
                    {existingItems.map((item) => (
                        <div key={'ext-' + item.id} className="bg-gray-800/20 border border-gray-700/20 rounded-2xl p-3 space-y-2 opacity-75">
                            <div className="flex gap-3">
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-bold text-gray-300 truncate">{item.product?.name ?? 'Producto'}</h4>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${item.status === 'pending' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                            {item.status === 'pending' ? 'Pendiente' : (item.status === 'ready' ? 'Listo' : 'En Prep')}
                                        </span>
                                        {item.variant && <span className="text-[9px] font-black uppercase text-gray-400 bg-gray-900 px-1.5 py-0.5 rounded">{item.variant.name}</span>}
                                        {item.extras?.map(e => (
                                            <span key={e.id} className="text-[9px] font-black uppercase text-emerald-400/50 bg-emerald-500/5 px-1.5 py-0.5 rounded">+ {e.extra?.name || 'Extra'}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="text-right flex flex-col items-end gap-2">
                                    <p className="text-xs text-gray-400 font-black">${parseFloat(item.subtotal).toFixed(2)}</p>
                                    {item.status === 'pending' && (
                                        <button onClick={() => handleRemoveExistingItem(item.id)} className="text-red-400/50 hover:text-red-400 p-1 hover:bg-red-500/10 rounded-lg transition-all">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {cart.length === 0 && existingItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-4 opacity-50 py-10">
                            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 6M17 13l1.5 6M9 19h6" />
                                </svg>
                            </div>
                            <p className="text-xs font-black uppercase tracking-widest">El carrito está vacío</p>
                        </div>
                    ) : (
                        cart.map((item, i) => (
                            <div key={i} className="bg-gray-800/40 border border-gray-700/30 rounded-2xl p-3 space-y-2 group hover:border-gray-600/50 transition-colors">
                                <div className="flex gap-3">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-bold text-white truncate">{item.product.name}</h4>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {item.variant && (
                                                <span className="text-[9px] font-black uppercase text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded">
                                                    {item.variant.name}
                                                </span>
                                            )}
                                            {item.extras.map(e => (
                                                <span key={e.id} className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                                    + {e.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-white font-black">${(calculateItemPrice(item) * item.quantity).toFixed(2)}</p>
                                    </div>
                                </div>
                                {item.notes && <p className="text-[10px] text-gray-500 italic px-2 py-1 bg-gray-900/50 rounded-lg">"{item.notes}"</p>}
                                <div className="flex items-center justify-between pt-1">
                                    <div className="flex items-center bg-gray-950 rounded-xl p-1 gap-1">
                                        <button onClick={() => updateQuantity(i, -1)} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white bg-gray-800 rounded-lg font-black transition-colors">-</button>
                                        <span className="w-6 text-center text-[11px] font-black text-white">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(i, 1)} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white bg-gray-800 rounded-lg font-black transition-colors">+</button>
                                    </div>
                                    <button onClick={() => removeFromCart(i)} className="text-gray-600 hover:text-red-400 p-2 hover:bg-red-500/10 rounded-xl transition-all">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 bg-gray-900 border-t border-gray-800 space-y-4 sticky bottom-0 z-10 lg:static">
                    {typeof notes === 'string' && notes.trim() !== '' && (
                        <div>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full bg-gray-800 border-gray-700 text-white rounded-xl p-3 text-xs outline-none focus:border-orange-500/50"
                                placeholder="Notas generales de la orden..."
                                rows={2}
                            />
                        </div>
                    )}

                    <div className="flex justify-between items-end">
                        <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Total Orden</span>
                        <span className="text-2xl font-black text-white">${calculateTotal().toFixed(2)}</span>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={submitting || (cart.length === 0 && !activeOrderId) || !selectedTable}
                        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl shadow-lg shadow-orange-950/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                    >
                        {submitting ? (
                            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <>
                                {activeOrderId ? (cart.length > 0 ? 'ENVIAR ADICIONALES' : 'VOLVER A MESAS') : 'ENVIAR A COCINA'}
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Modal */}
            {modalProduct && (
                <ExtrasModal
                    product={modalProduct}
                    onClose={() => setModalProduct(null)}
                    onConfirm={addToCart}
                />
            )}
        </div>
    );
}
