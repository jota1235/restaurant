import { useState, useEffect, useCallback } from 'react';
import { categoriesAPI, productsAPI } from '../../api/menu';
import ProductFormModal from '../../components/ProductFormModal';
import CategoryFormModal from '../../components/CategoryFormModal';

export default function MenuPage() {
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [activeCat, setActiveCat] = useState(null);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [showCatPanel, setShowCatPanel] = useState(false);

    const [productModal, setProductModal] = useState({ open: false, product: null });
    const [categoryModal, setCategoryModal] = useState({ open: false, category: null });

    const fetchCategories = useCallback(async () => {
        try {
            const data = await categoriesAPI.list();
            setCategories(data.data);
        } catch (e) { console.error(e); }
    }, []);

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                category_id: activeCat ?? undefined,
                search: search || undefined,
            };
            const data = await productsAPI.list(params);
            setProducts(data.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [activeCat, search]);

    useEffect(() => { fetchCategories(); }, [fetchCategories]);

    useEffect(() => {
        const t = setTimeout(fetchProducts, 250);
        return () => clearTimeout(t);
    }, [fetchProducts]);

    const handleToggle = async (product) => {
        try {
            await productsAPI.toggleAvailability(product.id);
            fetchProducts();
        } catch (e) { console.error(e); }
    };

    const handleDeleteProduct = async (product) => {
        if (!window.confirm(`¿Eliminar "${product.name}"?`)) return;
        try {
            await productsAPI.delete(product.id);
            fetchProducts();
        } catch (e) { console.error(e); }
    };

    const handleDeleteCategory = async (cat) => {
        if (!window.confirm(`¿Eliminar categoría "${cat.name}"?`)) return;
        try {
            await categoriesAPI.delete(cat.id);
            fetchCategories();
            if (activeCat === cat.id) setActiveCat(null);
        } catch (e) {
            alert(e.response?.data?.message ?? 'No se pudo eliminar');
        }
    };

    const afterSave = (type) => {
        if (type === 'product') { setProductModal({ open: false, product: null }); fetchProducts(); }
        if (type === 'category') { setCategoryModal({ open: false, category: null }); fetchCategories(); }
    };

    return (
        <div className="flex flex-col md:flex-row h-full gap-4 md:gap-5">
            {/* ── Mobile Category Bar (horizontal scroll) ─── */}
            <div className="md:hidden flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Categorías</h2>
                    <button
                        onClick={() => setCategoryModal({ open: true, category: null })}
                        className="text-orange-400 hover:text-orange-300 transition-colors p-1"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    <button
                        onClick={() => setActiveCat(null)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all border ${activeCat === null
                            ? 'bg-orange-500 border-orange-400/50 text-white'
                            : 'bg-gray-900/50 border-gray-800/50 text-gray-400 hover:text-white'
                            }`}
                    >
                        Todos
                    </button>
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCat(cat.id)}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${activeCat === cat.id
                                ? 'bg-orange-500 border-orange-400/50 text-white'
                                : 'bg-gray-900/50 border-gray-800/50 text-gray-400 hover:text-white'
                                }`}
                        >
                            {cat.name}
                            <button
                                onClick={(e) => { e.stopPropagation(); setCategoryModal({ open: true, category: cat }); }}
                                className="text-gray-500 hover:text-white ml-0.5"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </button>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Desktop Sidebar categorías ─── */}
            <aside className="w-48 flex-shrink-0 hidden md:block">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Categorías</h2>
                    <button
                        onClick={() => setCategoryModal({ open: true, category: null })}
                        className="text-orange-400 hover:text-orange-300 transition-colors"
                        title="Nueva categoría"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-0.5">
                    <button
                        onClick={() => setActiveCat(null)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors ${activeCat === null
                            ? 'bg-orange-500/15 text-orange-400'
                            : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                            }`}
                    >
                        Todos los productos
                    </button>

                    {categories.map((cat) => (
                        <div key={cat.id} className="group flex items-center gap-1">
                            <button
                                onClick={() => setActiveCat(cat.id)}
                                className={`flex-1 text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors ${activeCat === cat.id
                                    ? 'bg-orange-500/15 text-orange-400'
                                    : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                                    }`}
                            >
                                <span className="truncate flex items-center gap-2">
                                    {cat.name}
                                    {cat.products_count !== undefined && (
                                        <span className="text-[10px] opacity-50">{cat.products_count}</span>
                                    )}
                                </span>
                            </button>
                            <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity">
                                <button
                                    onClick={() => setCategoryModal({ open: true, category: cat })}
                                    className="p-1 text-gray-500 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => handleDeleteCategory(cat)}
                                    className="p-1 text-gray-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </aside>

            {/* ── Área principal ─── */}
            <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                        <h1 className="text-lg md:text-xl font-black text-white tracking-tight">
                            {activeCat ? categories.find(c => c.id === activeCat)?.name : 'Menú'}
                        </h1>
                        <span className="text-gray-500 text-xs">{products.length} items</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1 sm:flex-initial">
                            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text" value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Buscar producto…"
                                className="w-full sm:w-44 bg-gray-900/50 border border-gray-800/50 text-white placeholder-gray-600 rounded-xl pl-10 pr-3 py-2 text-sm
                                    focus:outline-none focus:border-orange-500/40 transition-all"
                            />
                        </div>
                        <button
                            onClick={() => setProductModal({ open: true, product: null })}
                            disabled={categories.length === 0}
                            className="flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black px-3 py-2 rounded-xl transition-all shadow shadow-orange-500/20 active:scale-[0.98] uppercase tracking-wider whitespace-nowrap"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="hidden sm:inline">Nuevo</span>
                        </button>
                    </div>
                </div>

                {/* Product grid */}
                {categories.length === 0 && !loading ? (
                    <div className="text-center py-16 text-gray-500">
                        <div className="text-4xl mb-3 opacity-30">🍽️</div>
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Sin categorías aún</p>
                        <p className="text-[10px] text-gray-600 mt-1">Crea una categoría primero</p>
                        <button
                            onClick={() => setCategoryModal({ open: true, category: null })}
                            className="mt-4 bg-gradient-to-r from-orange-500 to-amber-600 text-white text-xs font-black px-5 py-2.5 rounded-xl transition-all uppercase tracking-wider"
                        >
                            Crear primera categoría
                        </button>
                    </div>
                ) : loading ? (
                    <div className="flex items-center justify-center h-48">
                        <svg className="w-6 h-6 animate-spin text-orange-400" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                    </div>
                ) : products.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                        <div className="text-4xl mb-3 opacity-30">📭</div>
                        <p className="text-xs font-bold uppercase tracking-widest">No hay productos en esta categoría</p>
                    </div>
                ) : (
                    <div className="grid gap-2.5 md:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {products.map((p) => (
                            <ProductCard
                                key={p.id}
                                product={p}
                                onEdit={() => setProductModal({ open: true, product: p })}
                                onDelete={() => handleDeleteProduct(p)}
                                onToggle={() => handleToggle(p)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Modals */}
            {productModal.open && (
                <ProductFormModal
                    product={productModal.product}
                    categories={categories}
                    onClose={() => setProductModal({ open: false, product: null })}
                    onSaved={() => afterSave('product')}
                />
            )}
            {categoryModal.open && (
                <CategoryFormModal
                    category={categoryModal.category}
                    onClose={() => setCategoryModal({ open: false, category: null })}
                    onSaved={() => afterSave('category')}
                />
            )}
        </div>
    );
}

function ProductCard({ product, onEdit, onDelete, onToggle }) {
    return (
        <div className={`bg-gray-900/40 border rounded-2xl overflow-hidden transition-all ${product.is_available ? 'border-gray-800/50' : 'border-gray-800/30 opacity-60'
            }`}>
            {/* Product Image */}
            <div className="relative bg-gray-950 h-28 overflow-hidden">
                {product.image ? (
                    <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl opacity-20 select-none">
                        🍽️
                    </div>
                )}
                {!product.is_available && (
                    <div className="absolute inset-0 bg-gray-950/60 flex items-center justify-center">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-900/80 px-2 py-0.5 rounded-full">No disponible</span>
                    </div>
                )}
            </div>

            <div className="px-3 md:px-4 pt-2.5 pb-2 md:pb-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                        <p className="text-[9px] text-gray-600 uppercase tracking-wide mb-0.5 font-bold">
                            {product.category?.name}
                        </p>
                        <h3 className="text-white font-bold text-xs md:text-sm leading-tight truncate">{product.name}</h3>
                        {product.description && (
                            <p className="text-gray-500 text-[10px] mt-0.5 line-clamp-2">{product.description}</p>
                        )}
                    </div>
                    <p className="text-orange-400 font-black text-sm flex-shrink-0">
                        ${Number(product.price).toFixed(2)}
                    </p>
                </div>

                {product.variants?.length > 0 && (
                    <p className="text-[10px] text-gray-500 font-medium">{product.variants.length} variante{product.variants.length !== 1 ? 's' : ''}</p>
                )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-3 md:px-4 py-2 border-t border-gray-800/30 bg-gray-950/30">
                <button
                    onClick={onToggle}
                    className={`flex items-center gap-1.5 text-[10px] font-black uppercase transition-colors ${product.is_available
                        ? 'text-emerald-400 hover:text-emerald-300'
                        : 'text-gray-500 hover:text-gray-300'
                        }`}
                >
                    <span className={`w-1.5 h-1.5 rounded-full ${product.is_available ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                    {product.is_available ? 'Disp.' : 'No disp.'}
                </button>
                <div className="flex gap-1">
                    <button
                        onClick={onEdit}
                        className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
