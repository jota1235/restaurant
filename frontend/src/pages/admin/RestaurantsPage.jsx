import { useState, useEffect, useCallback } from 'react';
import { restaurantsAPI } from '../../api/restaurants';
import useAuthStore from '../../store/authStore';

const STATUS_STYLE = {
    active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    expired: 'bg-red-500/20 text-red-300 border-red-500/30',
    cancelled: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    trial: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
};

const EMPTY_FORM = {
    name: '', email: '', phone: '', address: '',
    city: '', state: '', country: 'México',
    tax_rate: 0, logo: null,
};

export default function RestaurantsPage() {
    const { user } = useAuthStore();
    const isSuperAdmin = user?.roles?.includes('superadmin');

    const [restaurants, setRestaurants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalMode, setModalMode] = useState('create');
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    // Extend subscription
    const [showExtendModal, setShowExtendModal] = useState(false);
    const [extendRestaurant, setExtendRestaurant] = useState(null);
    const [extendForm, setExtendForm] = useState({ ends_at: '', status: 'active' });
    const [extendSaving, setExtendSaving] = useState(false);

    const fetchRestaurants = useCallback(async () => {
        setLoading(true);
        try {
            const data = await restaurantsAPI.list();
            setRestaurants(data.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchRestaurants(); }, [fetchRestaurants]);

    const openCreate = () => {
        setModalMode('create');
        setEditingId(null);
        setForm(EMPTY_FORM);
        setFormError('');
        setShowModal(true);
    };

    const openEdit = (r) => {
        setModalMode('edit');
        setEditingId(r.id);
        setForm({
            name:     r.name     ?? '',
            email:    r.email    ?? '',
            phone:    r.phone    ?? '',
            address:  r.address  ?? '',
            city:     r.city     ?? '',
            state:    r.state    ?? '',
            country:  r.country  ?? 'México',
            tax_rate: parseFloat(r.tax_rate ?? 0),
            logo:     r.logo     ?? null,
        });
        setFormError('');
        setShowModal(true);
    };

    const handleToggle = async (r) => {
        try {
            await restaurantsAPI.toggleActive(r.id);
            fetchRestaurants();
        } catch (e) { console.error(e); }
    };

    const openExtend = (r) => {
        setExtendRestaurant(r);
        setExtendForm({
            ends_at: r.subscription?.ends_at ?? '',
            status: r.subscription?.status ?? 'active',
        });
        setShowExtendModal(true);
    };

    const handleExtend = async (e) => {
        e.preventDefault();
        setExtendSaving(true);
        try {
            await restaurantsAPI.extendSubscription(extendRestaurant.id, extendForm);
            setShowExtendModal(false);
            fetchRestaurants();
        } catch (err) {
            alert(err.response?.data?.message || 'Error al actualizar suscripción');
        } finally { setExtendSaving(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setSaving(true);
        try {
            if (modalMode === 'edit') {
                await restaurantsAPI.update(editingId, form);
            } else {
                await restaurantsAPI.create(form);
            }
            setShowModal(false);
            fetchRestaurants();
        } catch (err) {
            setFormError(err.response?.data?.message || 'Error al guardar restaurante');
        } finally { setSaving(false); }
    };

    const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    const handleLogoFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => handleChange('logo', ev.target.result);
        reader.readAsDataURL(file);
    };

    if (!isSuperAdmin && restaurants.length === 1) {
        return <RestaurantDetailCard restaurant={restaurants[0]} onEdit={openEdit} />;
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-white">Restaurantes</h1>
                    <p className="text-gray-400 text-sm mt-0.5">{restaurants.length} restaurantes en la plataforma</p>
                </div>
                {isSuperAdmin && (
                    <button onClick={openCreate}
                        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow shadow-orange-500/20">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Nuevo restaurante
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-40">
                    <svg className="w-6 h-6 animate-spin text-orange-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {restaurants.map((r) => (
                        <div key={r.id} className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-5">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-orange-500/15 text-orange-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                                        {r.name?.[0]?.toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-white font-semibold text-sm">{r.name}</p>
                                        <p className="text-gray-500 text-xs">{r.email ?? 'Sin correo'}</p>
                                    </div>
                                </div>
                                {isSuperAdmin && (
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => openEdit(r)}
                                            className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" title="Editar">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        <button onClick={() => openExtend(r)}
                                            className="p-1.5 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors" title="Extender suscripción">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </button>
                                        <button onClick={() => handleToggle(r)}
                                            className={`text-xs px-2 py-1 rounded-lg border font-medium transition-colors ${r.is_active
                                                ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                                                : 'border-gray-600 text-gray-400 bg-gray-700/40 hover:bg-gray-700'}`}>
                                            {r.is_active ? 'Activo' : 'Inactivo'}
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="text-xs text-gray-400 space-y-1 mb-4">
                                {r.address && <p>📍 {r.address}</p>}
                                {r.city && <p>🏙️ {r.city}{r.state ? `, ${r.state}` : ''}</p>}
                                {r.phone && <p>📞 {r.phone}</p>}
                                <p>👥 {r.users_count ?? 0} usuarios</p>
                            </div>
                            {r.subscription && (
                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${STATUS_STYLE[r.subscription.status] ?? STATUS_STYLE.expired}`}>
                                    <span className="capitalize">{r.subscription.status}</span>
                                    {r.subscription.ends_at && <span className="opacity-60">· hasta {r.subscription.ends_at}</span>}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Create / Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={() => setShowModal(false)}>
                    <div className="bg-gray-900 border border-gray-800/50 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md sm:mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-800/50 flex-shrink-0">
                            <h2 className="text-lg font-bold text-white">
                                {modalMode === 'edit' ? '✏️ Editar Restaurante' : 'Nuevo Restaurante'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
                            {formError && (
                                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl p-3">{formError}</div>
                            )}

                            {/* Nombre */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Nombre *</label>
                                <input type="text" required value={form.name} onChange={e => handleChange('name', e.target.value)}
                                    placeholder="Ej: Tizón Suc. Centro"
                                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500" />
                            </div>

                            {/* Correo / Teléfono */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Correo</label>
                                    <input type="email" value={form.email} onChange={e => handleChange('email', e.target.value)}
                                        placeholder="contacto@tizon.com"
                                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Teléfono</label>
                                    <input type="text" value={form.phone} onChange={e => handleChange('phone', e.target.value)}
                                        placeholder="288 123 4567"
                                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500" />
                                </div>
                            </div>

                            {/* Dirección */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Dirección</label>
                                <input type="text" value={form.address} onChange={e => handleChange('address', e.target.value)}
                                    placeholder="Av. Principal #123, Col. Centro"
                                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500" />
                            </div>

                            {/* Ciudad / Estado / País */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Ciudad</label>
                                    <input type="text" value={form.city} onChange={e => handleChange('city', e.target.value)}
                                        placeholder="Oaxaca"
                                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Estado</label>
                                    <input type="text" value={form.state} onChange={e => handleChange('state', e.target.value)}
                                        placeholder="Veracruz"
                                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">País</label>
                                    <input type="text" value={form.country} onChange={e => handleChange('country', e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500" />
                                </div>
                            </div>

                            {/* IVA */}
                            <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-4 space-y-3">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" checked={form.tax_rate > 0}
                                        onChange={e => handleChange('tax_rate', e.target.checked ? 0.16 : 0)}
                                        className="accent-orange-500 w-4 h-4 rounded" />
                                    <div>
                                        <span className="text-sm font-semibold text-white">Aplicar IVA</span>
                                        <p className="text-xs text-gray-500">Se suma al subtotal en cada orden</p>
                                    </div>
                                </label>
                                {form.tax_rate > 0 && (
                                    <div className="flex items-center gap-3 pl-7">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Tasa</label>
                                        <select value={form.tax_rate}
                                            onChange={e => handleChange('tax_rate', parseFloat(e.target.value))}
                                            className="bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-500">
                                            <option value={0.08}>8%</option>
                                            <option value={0.16}>16% (estándar)</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Logo */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Logo del ticket</label>
                                {form.logo ? (
                                    <div className="relative inline-block">
                                        <img src={form.logo} alt="Logo"
                                            className="h-20 max-w-full rounded-xl object-contain bg-white p-1 border border-gray-700" />
                                        <button type="button" onClick={() => handleChange('logo', null)}
                                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600">
                                            ✕
                                        </button>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center gap-2 border-2 border-dashed border-gray-700 hover:border-orange-500/50 rounded-xl p-4 cursor-pointer transition-colors">
                                        <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span className="text-sm text-gray-500">Click para subir logo <span className="text-gray-600">(PNG, JPG)</span></span>
                                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
                                    </label>
                                )}
                                <p className="text-xs text-gray-600 mt-1">Recomendado: PNG fondo blanco, máx 200×80px</p>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-2.5 rounded-xl text-sm transition-colors border border-gray-700">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={saving}
                                    className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors shadow shadow-orange-500/20 flex items-center justify-center gap-2">
                                    {saving ? (
                                        <>
                                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                            </svg>
                                            Guardando…
                                        </>
                                    ) : (modalMode === 'edit' ? 'Guardar Cambios' : 'Crear Restaurante')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Extend Subscription Modal */}
            {showExtendModal && extendRestaurant && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={() => setShowExtendModal(false)}>
                    <div className="bg-gray-900 border border-gray-800/50 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm sm:mx-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-800/50">
                            <div>
                                <h2 className="text-base font-bold text-white">📅 Extender Suscripción</h2>
                                <p className="text-xs text-gray-500 mt-0.5">{extendRestaurant.name}</p>
                            </div>
                            <button onClick={() => setShowExtendModal(false)} className="text-gray-500 hover:text-white transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleExtend} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Nueva fecha de vencimiento *</label>
                                <input
                                    type="date"
                                    required
                                    value={extendForm.ends_at}
                                    onChange={e => setExtendForm(f => ({ ...f, ends_at: e.target.value }))}
                                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Estado de la suscripción</label>
                                <select
                                    value={extendForm.status}
                                    onChange={e => setExtendForm(f => ({ ...f, status: e.target.value }))}
                                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500"
                                >
                                    <option value="active">Activa</option>
                                    <option value="trial">Prueba</option>
                                    <option value="cancelled">Cancelada</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={() => setShowExtendModal(false)}
                                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-2.5 rounded-xl text-sm transition-colors border border-gray-700">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={extendSaving}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors shadow shadow-emerald-500/20 flex items-center justify-center gap-2">
                                    {extendSaving ? 'Guardando…' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function RestaurantDetailCard({ restaurant: r, onEdit }) {
    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl font-bold text-white">Mi Restaurante</h1>
                {onEdit && (
                    <button onClick={() => onEdit(r)}
                        className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Editar datos
                    </button>
                )}
            </div>
            <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6 max-w-lg">
                {r.logo && (
                    <img src={r.logo} alt="Logo"
                        className="h-16 max-w-[160px] object-contain mb-4 rounded-lg bg-white p-1" />
                )}
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-orange-500/15 text-orange-400 flex items-center justify-center font-bold text-xl">
                        {r.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                        <h2 className="text-white text-lg font-bold">{r.name}</h2>
                        <p className="text-gray-400 text-sm">{r.email ?? 'Sin correo'}</p>
                    </div>
                </div>
                <div className="text-sm text-gray-300 space-y-2">
                    {r.phone   && <p><span className="text-gray-500">Teléfono:</span> {r.phone}</p>}
                    {r.address && <p><span className="text-gray-500">Dirección:</span> {r.address}</p>}
                    {r.city    && <p><span className="text-gray-500">Ciudad:</span> {r.city}{r.state ? `, ${r.state}` : ''}</p>}
                </div>
                {r.subscription && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                        <p className="text-xs text-gray-500 mb-1">Suscripción</p>
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${STATUS_STYLE[r.subscription.status] ?? STATUS_STYLE.expired}`}>
                            {r.subscription.status}
                            {r.subscription.ends_at && <span className="opacity-60">· hasta {r.subscription.ends_at}</span>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
