import { useState, useEffect, useCallback } from 'react';
import { categoriesAPI, productsAPI } from '../../api/menu';
import ProductFormModal from '../../components/ProductFormModal';
import CategoryFormModal from '../../components/CategoryFormModal';

export default function MenuPage() {
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [activeCat, setActiveCat] = useState(null);  // null = todas
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const [productModal, setProductModal] = useState({ open: false, product: null });
    const [categoryModal, setCategoryModal] = useState({ open: false, category: null });

    // Fetch categories
    const fetchCategories = useCallback(async () => {
        try {
            const data = await categoriesAPI.list();
            setCategories(data.data);
        } catch (e) { console.error(e); }
    }, []);

    // Fetch products
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
        <div className="flex h-full gap-5">
            {/* ── Sidebar categorías ─────────────────────────── */}
            <aside className="w-52 flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Categorías</h2>
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
                        className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${activeCat === null
                                ? 'bg-orange-500/15 text-orange-400 font-medium'
                                : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                            }`}
                    >
                        Todos los productos
                    </button>

                    {categories.map((cat) => (
                        <div key={cat.id} className="group flex items-center gap-1">
                            <button
                                onClick={() => setActiveCat(cat.id)}
                                className={`flex-1 text-left px-3 py-2 rounded-xl text-sm transition-colors ${activeCat === cat.id
                                        ? 'bg-orange-500/15 text-orange-400 font-medium'
                                        : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                                    }`}
                            >
                                <span className="truncate flex items-center gap-2">
                                    {cat.name}
                                    {cat.products_count !== undefined && (
                                        <span className="text-xs opacity-50">{cat.products_count}</span>
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

            {/* ── Área principal ─────────────────────────────── */}
            <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-bold text-white">
                            {activeCat ? categories.find(c => c.id === activeCat)?.name : 'Menú'}
                        </h1>
                        <span className="text-gray-500 text-sm">{products.length} items</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="text" value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar producto…"
                            className="bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-4 py-2 text-sm
                         focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-colors w-52"
                        />
                        <button
                            onClick={() => setProductModal({ open: true, product: null })}
                            disabled={categories.length === 0}
                            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow shadow-orange-500/20"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Nuevo producto
                        </button>
                    </div>
                </div>

                {/* Product grid */}
                {categories.length === 0 && !loading ? (
                    <div className="text-center py-20 text-gray-500">
                        <div className="text-5xl mb-3">🍽️</div>
                        <p className="font-medium text-gray-300">Sin categorías aún</p>
                        <p className="text-sm mt-1">Crea una categoría primero para agregar productos</p>
                        <button
                            onClick={() => setCategoryModal({ open: true, category: null })}
                            className="mt-4 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors"
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
                    <div className="text-center py-20 text-gray-500">
                        <div className="text-5xl mb-3">📭</div>
                        <p>No hay productos en esta categoría</p>
                    </div>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
        <div className={`bg-gray-800/60 border rounded-2xl overflow-hidden group transition-all ${product.is_available ? 'border-gray-700/40' : 'border-gray-700/20 opacity-60'
            }`}>
            {/* Category badge */}
            <div className="px-4 pt-4 pb-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">
                            {product.category?.name}
                        </p>
                        <h3 className="text-white font-semibold text-sm leading-tight truncate">{product.name}</h3>
                        {product.description && (
                            <p className="text-gray-400 text-xs mt-1 line-clamp-2">{product.description}</p>
                        )}
                    </div>
                    <p className="text-orange-400 font-bold text-base flex-shrink-0">
                        ${Number(product.price).toFixed(2)}
                    </p>
                </div>

                {/* Variants count */}
                {product.variants?.length > 0 && (
                    <p className="text-xs text-gray-500">{product.variants.length} variante{product.variants.length !== 1 ? 's' : ''}</p>
                )}
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-700/30 bg-gray-900/20">
                <button
                    onClick={onToggle}
                    className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${product.is_available
                            ? 'text-emerald-400 hover:text-emerald-300'
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                >
                    <span className={`w-1.5 h-1.5 rounded-full ${product.is_available ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                    {product.is_available ? 'Disponible' : 'No disp.'}
                </button>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={onEdit}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
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
