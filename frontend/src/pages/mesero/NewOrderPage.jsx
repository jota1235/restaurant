import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { categoriesAPI, productsAPI } from '../../api/menu';
import { tablesAPI } from '../../api/tables';
import { ordersAPI } from '../../api/orders';
import ExtrasModal from '../../components/ExtrasModal';
import CustomerSelector from '../../components/CustomerSelector';
import TicketPreview from '../../components/TicketPreview';
import useAuthStore from '../../store/authStore';

export default function NewOrderPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const tableIdParam = searchParams.get('table_id');
    const orderIdParam = searchParams.get('order_id');

    // Use current route path to detect caja context — more reliable than role checks
    const isCajaRoute = location.pathname.startsWith('/caja');
    const backRoute = isCajaRoute ? '/caja' : '/mesero/mesas';

    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [orderType, setOrderType] = useState(orderIdParam ? 'takeaway' : (isCajaRoute ? 'takeaway' : 'dine_in'));
    const [selectedTable, setSelectedTable] = useState(tableIdParam || '');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [activeCat, setActiveCat] = useState(null);
    const [search, setSearch] = useState('');
    const [cart, setCart] = useState([]);
    const [notes, setNotes] = useState('');

    // Existing Order State
    const [activeOrderId, setActiveOrderId] = useState(null);
    const [existingItems, setExistingItems] = useState([]);

    // Modal State
    const [modalProduct, setModalProduct] = useState(null);
    const [ticketData, setTicketData] = useState(null);
    const [showTicketPreview, setShowTicketPreview] = useState(false);

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

    const fetchActiveOrder = useCallback(async (tableId, directOrderId = null) => {
        if (!tableId && !directOrderId) {
            setActiveOrderId(null);
            setExistingItems([]);
            return;
        }
        try {
            if (directOrderId) {
                const res = await ordersAPI.show(directOrderId);
                const order = res.data;
                if (order && !['paid', 'cancelled'].includes(order.status)) {
                    setActiveOrderId(order.id);
                    setExistingItems(order.items || []);
                    setOrderType(order.type);
                    if (order.table_id) setSelectedTable(order.table_id.toString());
                    setActiveTab('cart');
                } else {
                    setActiveOrderId(null);
                    setExistingItems([]);
                }
            } else {
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
            }
        } catch (e) { console.error(e) }
    }, []);

    useEffect(() => {
        if (orderIdParam) {
            fetchActiveOrder(null, orderIdParam);
        } else if (orderType === 'dine_in') {
            fetchActiveOrder(selectedTable);
        } else {
            setActiveOrderId(null);
            setExistingItems([]);
        }
    }, [selectedTable, orderType, fetchActiveOrder, orderIdParam]);

    // Reset table when switching to takeaway
    const handleOrderTypeChange = (type) => {
        setOrderType(type);
        if (type === 'takeaway') {
            setSelectedTable('');
            setActiveOrderId(null);
            setExistingItems([]);
        }
    };

    const handleRemoveExistingItem = async (itemId) => {
        if (!window.confirm('¿Eliminar este producto de la orden?')) return;
        try {
            await ordersAPI.removeItem(activeOrderId, itemId);
            setExistingItems(prev => prev.filter(i => i.id !== itemId));
        } catch (e) {
            alert(e.response?.data?.message || 'Error al eliminar');
        }
    };

    const handleProductClick = (product) => {
        if (product.variants?.length > 0 || product.extras?.length > 0 || product.promotion_type) {
            setModalProduct(product);
        } else {
            addToCart({ product, variant: null, extras: [], quantity: 1, notes: '', promotion_type: null });
        }
    };

    const addToCart = (item) => {
        const existingIndex = cart.findIndex(c =>
            c.product.id === item.product.id &&
            c.variant?.id === item.variant?.id &&
            c.custom_price === item.custom_price &&
            c.promotion_type === item.promotion_type &&
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
        let price = item.custom_price !== undefined ? item.custom_price : item.product.price;
        if (item.variant && !item.variant.is_open_price) price += item.variant.price_modifier;
        price += item.extras.reduce((sum, e) => sum + e.price, 0);
        return price;
    };

    const getPhysicalQuantity = (billedQty, promoType) => {
        if (promoType === '2x1') return billedQty * 2;
        if (promoType === '3x2') return billedQty + Math.floor(billedQty / 2);
        return billedQty;
    };

    const calculateTotal = () => {
        const cartTotal = cart.reduce((sum, item) => sum + (calculateItemPrice(item) * item.quantity), 0);
        const existingTotal = existingItems.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
        return cartTotal + existingTotal;
    };


    const handleSubmit = async () => {
        if (orderType === 'dine_in' && !selectedTable) return alert('Selecciona una mesa');
        if (orderType === 'takeaway' && !selectedCustomer) return alert('Selecciona un cliente para la entrega');

        if (cart.length === 0 && (!activeOrderId || existingItems.length > 0)) {
            if (cart.length === 0 && activeOrderId) return navigate(backRoute);
            return alert('El carrito está vacío');
        }
        setSubmitting(true);
        try {
            const payload = {
                table_id: orderType === 'dine_in' ? selectedTable : null,
                customer_id: orderType === 'takeaway' ? selectedCustomer?.id : null,
                type: orderType,
                customer_name: orderType === 'takeaway' ? selectedCustomer?.name : undefined,
                delivery_address: orderType === 'takeaway' && selectedAddress 
                                    ? `[${(selectedAddress.label || 'DOMICILIO').toUpperCase()}] ${selectedAddress.street}\nRef: ${selectedAddress.references || 'N/A'}\nTel: ${selectedCustomer?.phone || 'N/A'}` 
                                    : null,
                notes: notes,
                items: cart.map(item => ({
                    product_id: item.product.id,
                    product_variant_id: item.variant?.id || null,
                    quantity: getPhysicalQuantity(item.quantity, item.promotion_type),
                    notes: item.notes,
                    custom_price: item.custom_price,
                    promotion_type: item.promotion_type || null,
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
            navigate(backRoute);
        } catch (err) {
            alert(err.response?.data?.message || 'Error al procesar la orden');
        } finally {
            setSubmitting(false);
        }
    };

    const handlePrintPreCuenta = async () => {
        if (!activeOrderId) return;
        setSubmitting(true);
        try {
            const res = await ordersAPI.getTicket(activeOrderId);
            setTicketData(res.ticket_data);
            setShowTicketPreview(true);
        } catch (e) {
            alert(e.response?.data?.message || 'Error al generar pre-cuenta');
        } finally {
            setSubmitting(false);
        }
    };

    // TAB State for mobile
    const [activeTab, setActiveTab] = useState('menu');

    useEffect(() => {
        if (activeOrderId && existingItems.length > 0) {
            setActiveTab('cart');
        }
    }, [activeOrderId, existingItems]);

    // Skeleton Loading
    if (loading) return (
        <div className="flex flex-col sm:landscape:flex-row sm:flex-row h-full gap-3 overflow-hidden">
            <div className="flex-1 bg-gray-900/40 rounded-2xl border border-gray-800/50 p-4 animate-pulse space-y-4">
                <div className="h-10 bg-gray-800 rounded-xl" />
                <div className="flex gap-2">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-8 w-20 bg-gray-800 rounded-xl" />)}
                </div>
                <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="aspect-square bg-gray-800 rounded-2xl" />)}
                </div>
            </div>
            <div className="hidden sm:block w-48 sm:w-56 md:w-72 lg:w-80 bg-gray-900/40 rounded-2xl border border-gray-800/50 animate-pulse" />
        </div>
    );

    return (
        <div className="flex flex-col sm:landscape:flex-row sm:flex-row sm:h-full gap-3 sm:overflow-hidden relative">
            {/* ── Mobile Tab Switcher ── */}
            <div className="flex sm:hidden bg-gray-900/60 border border-gray-800/50 rounded-2xl p-1 mb-1">
                <button
                    onClick={() => setActiveTab('menu')}
                    className={`flex-1 py-2.5 text-[11px] font-black rounded-xl transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 ${activeTab === 'menu'
                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                        : 'text-gray-500'
                        }`}
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    Menú
                </button>
                <button
                    onClick={() => setActiveTab('cart')}
                    className={`flex-1 py-2.5 text-[11px] font-black rounded-xl transition-all relative uppercase tracking-wider flex items-center justify-center gap-1.5 ${activeTab === 'cart'
                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                        : 'text-gray-500'
                        }`}
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 6M17 13l1.5 6M9 19h6" />
                    </svg>
                    Carrito
                    {(cart.length + existingItems.length) > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-white text-orange-500 rounded-full flex items-center justify-center text-[10px] font-black">
                            {cart.length + existingItems.length}
                        </span>
                    )}
                </button>
            </div>

            {/* ═══════════════ MENU SECTION ═══════════════ */}
            <div className={`flex-1 flex flex-col min-w-0 min-h-0 bg-gray-900/30 rounded-2xl border border-gray-800/50 overflow-hidden ${activeTab !== 'menu' && 'hidden sm:flex'}`}>
                {/* Search & Categories */}
                <div className="flex flex-col gap-2 p-3 sm:p-3 md:p-4 pb-0 flex-shrink-0">
                    <div className="relative">
                        <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Buscar producto..."
                            className="w-full bg-gray-950/60 border border-gray-800/50 text-white rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-orange-500/40 focus:ring-2 focus:ring-orange-500/10 transition-all placeholder:text-gray-600"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                        <button
                            onClick={() => setActiveCat(null)}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all border ${activeCat === null
                                ? 'bg-orange-500 border-orange-400/50 text-white shadow-md shadow-orange-500/20'
                                : 'bg-gray-900/50 border-gray-800/50 text-gray-400 hover:text-white hover:border-gray-700'
                                }`}
                        >
                            Todos
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCat(cat.id)}
                                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all border ${activeCat === cat.id
                                    ? 'bg-orange-500 border-orange-400/50 text-white shadow-md shadow-orange-500/20'
                                    : 'bg-gray-900/50 border-gray-800/50 text-gray-400 hover:text-white hover:border-gray-700'
                                    }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Product Grid */}
                <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-3 md:p-4 pt-3 scrollbar-none">
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 content-start">
                        {products.map(p => (
                            <button
                                key={p.id}
                                onClick={() => handleProductClick(p)}
                                className="bg-gray-900/50 hover:bg-gray-800/60 border border-gray-800/40 hover:border-gray-700/50 rounded-2xl p-2.5 md:p-3 text-left transition-all duration-200 active:scale-[0.97] group relative overflow-hidden h-fit"
                            >
                                <div className="aspect-square bg-gray-950/50 rounded-xl mb-2 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform overflow-hidden">
                                    {p.image ? <img src={p.image} className="w-full h-full object-cover" alt={p.name} /> : '🍽️'}
                                </div>
                                <h3 className="text-xs md:text-sm font-bold text-white line-clamp-1">{p.name}</h3>
                                <div className="flex items-center justify-between mt-1">
                                    <p className="text-orange-400 font-black text-sm">${p.price}</p>
                                    <div className="flex gap-1">
                                        {p.promotion_type && (
                                            <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 rounded-md flex items-center justify-center text-[9px] font-black shadow-sm uppercase">
                                                {p.promotion_type}
                                            </span>
                                        )}
                                        {(p.variants?.length > 0 || p.extras?.length > 0) && (
                                            <span className="bg-orange-500 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-black shadow-sm">+</span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ═══════════════ CART SIDEBAR ═══════════════ */}
            <div className={`sm:w-56 md:w-72 lg:w-80 flex flex-col min-h-0 bg-gray-900/40 rounded-2xl border border-gray-800/50 overflow-hidden ${activeTab !== 'cart' && 'hidden sm:flex'}`}>
                {/* Cart Header */}
                <div className="p-2.5 sm:p-3 md:p-4 border-b border-gray-800/50 bg-gray-900/30">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <h2 className="text-sm font-black text-white tracking-tight">Resumen</h2>
                        </div>
                        <button onClick={() => setNotes(n => n === '' ? ' ' : '')} className="text-gray-500 hover:text-orange-400 transition-colors p-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                    </div>

                    {/* ── Order Type Toggle ── */}
                    <div className="grid grid-cols-2 bg-gray-950/60 border border-gray-800/50 rounded-xl p-1 mb-3 gap-1">
                        <button
                            onClick={() => handleOrderTypeChange('dine_in')}
                            className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${orderType === 'dine_in'
                                ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                                : 'text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            🍽️ Mesa
                        </button>
                        <button
                            onClick={() => handleOrderTypeChange('takeaway')}
                            className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${orderType === 'takeaway'
                                ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                                : 'text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            🛵 Llevar
                        </button>
                    </div>

                    {/* Mesa selector OR customer name */}
                    {orderType === 'dine_in' ? (
                        <>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Mesa</label>
                            <select
                                value={selectedTable}
                                onChange={(e) => setSelectedTable(e.target.value)}
                                className="w-full bg-gray-950/60 border border-gray-800/50 text-white rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/40 appearance-none bg-no-repeat bg-[right_0.5rem_center] bg-[length:1em_1em] transition-all"
                                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7281'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")` }}
                            >
                                <option value="">Seleccionar mesa...</option>
                                {tables.map(t => (
                                    <option key={t.id} value={t.id}>{t.name} ({t.zone || 'Gen'})</option>
                                ))}
                            </select>
                        </>
                    ) : (
                        <CustomerSelector 
                            onSelectCustomer={(c, a) => {
                                setSelectedCustomer(c);
                                setSelectedAddress(a);
                            }}
                            onClearCustomer={() => {
                                setSelectedCustomer(null);
                                setSelectedAddress(null);
                            }}
                        />
                    )}
                </div>

                {/* Cart Items */}
                <div className="flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-3 space-y-2 scrollbar-none">
                    {/* Active Order Banner */}
                    {activeOrderId && (
                        <div className="bg-orange-500/10 border border-orange-500/15 rounded-xl p-3 mb-1">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                                <div>
                                    <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Orden Activa</p>
                                    <p className="text-[9px] text-gray-500 mt-0.5">{existingItems.length} productos · Agrega más abajo</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Existing Items */}
                    {existingItems.map((item) => (
                        <div key={'ext-' + item.id} className="bg-gray-800/20 border border-gray-700/20 rounded-xl p-2.5 opacity-70">
                            <div className="flex gap-2">
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-xs font-bold text-gray-300 truncate">{item.product?.name ?? 'Producto'}</h4>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${item.status === 'pending' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/15' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'}`}>
                                            {item.status === 'pending' ? 'Pendiente' : (item.status === 'ready' ? 'Listo' : 'En Prep')}
                                        </span>
                                        {item.variant && <span className="text-[8px] font-black uppercase text-gray-400 bg-gray-900 px-1.5 py-0.5 rounded">{item.variant.name}</span>}
                                        {item.promotion_type && <span className="text-[8px] font-black uppercase text-blue-400 bg-blue-500/10 border border-blue-500/15 px-1.5 py-0.5 rounded">🏷️ {item.promotion_type}</span>}
                                        {item.extras?.map(e => (
                                            <span key={e.id} className="text-[8px] font-black uppercase text-emerald-400/50 bg-emerald-500/5 px-1.5 py-0.5 rounded">+ {e.extra?.name || 'Extra'}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="text-right flex flex-col items-end gap-1">
                                    <p className="text-[10px] text-gray-400 font-black">${parseFloat(item.subtotal).toFixed(2)}</p>
                                    {['pending', 'preparing'].includes(item.status) && (
                                        <button onClick={() => handleRemoveExistingItem(item.id)} className="text-red-400/40 hover:text-red-400 p-1 hover:bg-red-500/10 rounded-lg transition-all">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Cart Items */}
                    {cart.length === 0 && existingItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-600 py-10">
                            <div className="w-14 h-14 bg-gray-900/50 rounded-2xl flex items-center justify-center mb-3 border border-gray-800/50">
                                <svg className="w-7 h-7 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 6M17 13l1.5 6M9 19h6" />
                                </svg>
                            </div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Carrito vacío</p>
                            <p className="text-[9px] text-gray-700 mt-0.5">Selecciona productos del menú</p>
                        </div>
                    ) : (
                        cart.map((item, i) => (
                            <div key={i} className="bg-gray-800/30 border border-gray-700/20 rounded-xl p-2.5 hover:border-gray-600/30 transition-colors">
                                <div className="flex gap-2">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-xs font-bold text-white truncate">{item.product.name}</h4>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {item.variant && (
                                                <span className="text-[8px] font-black uppercase text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/15">
                                                    {item.variant.name}
                                                </span>
                                            )}
                                            {item.promotion_type && (
                                                <span className="text-[8px] font-black uppercase text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/15">
                                                    🏷️ {item.promotion_type} (Cocina: {getPhysicalQuantity(item.quantity, item.promotion_type)})
                                                </span>
                                            )}
                                            {item.extras.map(e => (
                                                <span key={e.id} className="text-[8px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/15">
                                                    + {e.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-white font-black whitespace-nowrap">${(calculateItemPrice(item) * item.quantity).toFixed(2)}</p>
                                </div>
                                {item.notes && <p className="text-[9px] text-gray-500 italic px-2 py-1 bg-gray-900/40 rounded-lg mt-1.5">"{item.notes}"</p>}
                                <div className="flex items-center justify-between pt-1.5 mt-1.5 border-t border-gray-800/30">
                                    <div className="flex items-center bg-gray-950/50 rounded-lg p-0.5 gap-0.5">
                                        <button onClick={() => updateQuantity(i, -1)} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white bg-gray-800/60 rounded-md font-black text-xs transition-colors">-</button>
                                        <span className="w-5 text-center text-[11px] font-black text-white">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(i, 1)} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white bg-gray-800/60 rounded-md font-black text-xs transition-colors">+</button>
                                    </div>
                                    <button onClick={() => removeFromCart(i)} className="text-gray-600 hover:text-red-400 p-1.5 hover:bg-red-500/10 rounded-lg transition-all">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-2.5 sm:p-3 md:p-4 bg-gray-900/50 border-t border-gray-800/50 space-y-2 sm:space-y-3 flex-shrink-0">
                    {typeof notes === 'string' && notes.trim() !== '' && (
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full bg-gray-950/50 border border-gray-800/50 text-white rounded-xl p-2.5 text-xs outline-none focus:border-orange-500/40 focus:ring-2 focus:ring-orange-500/10 transition-all placeholder:text-gray-700"
                            placeholder="Notas generales..."
                            rows={2}
                        />
                    )}

                    <div className="flex justify-between items-end">
                        <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Total</span>
                        <span className="text-xl font-black text-white tracking-tight">${calculateTotal().toFixed(2)}</span>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={submitting || (cart.length === 0 && !activeOrderId) || (orderType === 'dine_in' && !selectedTable)}
                        className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-3.5 md:py-4 rounded-2xl shadow-lg shadow-orange-500/20 transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 uppercase text-[11px] tracking-wider"
                    >
                        {submitting ? (
                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        ) : (
                            <>
                                {orderType === 'takeaway'
                                    ? '🛵 Enviar Orden a Domicilio'
                                    : activeOrderId
                                        ? (cart.length > 0 ? 'Enviar Adicionales' : 'Volver')
                                        : 'Enviar a Cocina'
                                }
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </>
                        )}
                    </button>
                    {activeOrderId && (
                        <button
                            onClick={handlePrintPreCuenta}
                            disabled={submitting}
                            className="w-full bg-gray-950 border border-gray-800 disabled:opacity-40 text-gray-300 hover:text-white hover:bg-gray-900 font-bold py-3 rounded-2xl transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest mt-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Imprimir Pre-Cuenta
                        </button>
                    )}
                </div>
            </div>

            {/* Extras/Variants Modal */}
            {modalProduct && (
                <ExtrasModal
                    product={modalProduct}
                    onClose={() => setModalProduct(null)}
                    onConfirm={addToCart}
                />
            )}

            {/* Ticket Preview Modal */}
            {showTicketPreview && ticketData && (
                <TicketPreview
                    ticketData={ticketData}
                    onClose={() => { setShowTicketPreview(false); setTicketData(null); }}
                    onPrint={() => { setShowTicketPreview(false); setTicketData(null); }}
                />
            )}
        </div>
    );
}
