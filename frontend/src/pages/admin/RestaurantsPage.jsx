import { useState, useEffect, useCallback } from 'react';
import { restaurantsAPI } from '../../api/restaurants';
import useAuthStore from '../../store/authStore';

const STATUS_STYLE = {
    active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    expired: 'bg-red-500/20 text-red-300 border-red-500/30',
    cancelled: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    trial: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
};

const EMPTY_FORM = { name: '', email: '', phone: '', address: '', city: '', state: '', country: 'México' };

export default function RestaurantsPage() {
    const { user } = useAuthStore();
    const isSuperAdmin = user?.roles?.includes('superadmin');

    const [restaurants, setRestaurants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    const fetchRestaurants = useCallback(async () => {
        setLoading(true);
        try {
            const data = await restaurantsAPI.list();
            setRestaurants(data.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchRestaurants(); }, [fetchRestaurants]);

    const handleToggle = async (r) => {
        try {
            await restaurantsAPI.toggleActive(r.id);
            fetchRestaurants();
        } catch (e) { console.error(e); }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setFormError('');
        setSaving(true);
        try {
            await restaurantsAPI.create(form);
            setShowModal(false);
            setForm(EMPTY_FORM);
            fetchRestaurants();
        } catch (err) {
            setFormError(err.response?.data?.message || 'Error al crear restaurante');
        } finally { setSaving(false); }
    };

    const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    if (!isSuperAdmin && restaurants.length === 1) {
        const r = restaurants[0];
        return <RestaurantDetailCard restaurant={r} />;
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-white">Restaurantes</h1>
                    <p className="text-gray-400 text-sm mt-0.5">{restaurants.length} restaurantes en la plataforma</p>
                </div>
                {isSuperAdmin && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow shadow-orange-500/20"
                    >
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
                                    <button
                                        onClick={() => handleToggle(r)}
                                        className={`text-xs px-2 py-1 rounded-lg border font-medium transition-colors ${r.is_active
                                            ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                                            : 'border-gray-600 text-gray-400 bg-gray-700/40 hover:bg-gray-700'
                                            }`}
                                    >
                                        {r.is_active ? 'Activo' : 'Inactivo'}
                                    </button>
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
                                    {r.subscription.ends_at && (
                                        <span className="opacity-60">· hasta {r.subscription.ends_at}</span>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Create Restaurant Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-800">
                            <h2 className="text-lg font-bold text-white">Nuevo Restaurante</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="p-5 space-y-4">
                            {formError && (
                                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl p-3">{formError}</div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Nombre *</label>
                                <input type="text" required value={form.name} onChange={e => handleChange('name', e.target.value)}
                                    placeholder="Ej: Tizón Suc. Centro"
                                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500" />
                            </div>

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
                                        placeholder="614 123 4567"
                                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Dirección</label>
                                <input type="text" value={form.address} onChange={e => handleChange('address', e.target.value)}
                                    placeholder="Av. Principal #123, Col. Centro"
                                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500" />
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Ciudad</label>
                                    <input type="text" value={form.city} onChange={e => handleChange('city', e.target.value)}
                                        placeholder="Chihuahua"
                                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Estado</label>
                                    <input type="text" value={form.state} onChange={e => handleChange('state', e.target.value)}
                                        placeholder="Chihuahua"
                                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">País</label>
                                    <input type="text" value={form.country} onChange={e => handleChange('country', e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500" />
                                </div>
                            </div>

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
                                            Creando…
                                        </>
                                    ) : 'Crear Restaurante'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function RestaurantDetailCard({ restaurant: r }) {
    return (
        <div>
            <h1 className="text-xl font-bold text-white mb-6">Mi Restaurante</h1>
            <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6 max-w-lg">
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
                    {r.phone && <p><span className="text-gray-500">Teléfono:</span> {r.phone}</p>}
                    {r.address && <p><span className="text-gray-500">Dirección:</span> {r.address}</p>}
                    {r.city && <p><span className="text-gray-500">Ciudad:</span> {r.city}</p>}
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
