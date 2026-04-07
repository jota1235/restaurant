import { useState, useEffect } from 'react';
import { usersAPI } from '../api/users';
import { restaurantsAPI } from '../api/restaurants';
import useAuthStore from '../store/authStore';

const ROLES = ['admin', 'mesero', 'cocina', 'caja'];

export default function UserFormModal({ user, onClose, onSaved }) {
    const editing = !!user;
    const { user: me } = useAuthStore();
    const isSuperAdmin = me?.roles?.includes('superadmin');

    const [form, setForm] = useState({
        name: user?.name ?? '',
        email: user?.email ?? '',
        password: '',
        password_confirmation: '',
        role: user?.roles?.[0] ?? 'mesero',
        is_active: user?.is_active ?? true,
        restaurant_ids: user?.restaurant_ids ?? [],
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [restaurants, setRestaurants] = useState([]);

    // Fetch restaurants for superadmin
    useEffect(() => {
        if (isSuperAdmin) {
            restaurantsAPI.list().then(data => {
                setRestaurants(data.data || []);
                // If editing and user has no restaurant_ids, try to get from user object
                if (editing && form.restaurant_ids.length === 0 && user?.restaurant_id) {
                    set('restaurant_ids', [user.restaurant_id]);
                }
            }).catch(console.error);
        }
    }, [isSuperAdmin]);

    const set = (field, value) => {
        setForm(f => ({ ...f, [field]: value }));
        setErrors(e => ({ ...e, [field]: null }));
    };

    const toggleRestaurant = (id) => {
        set('restaurant_ids',
            form.restaurant_ids.includes(id)
                ? form.restaurant_ids.filter(x => x !== id)
                : [...form.restaurant_ids, id]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate at least one restaurant for superadmin
        if (isSuperAdmin && form.restaurant_ids.length === 0) {
            setErrors({ restaurant_ids: ['Selecciona al menos una sucursal'] });
            return;
        }

        setLoading(true);
        setErrors({});
        try {
            const payload = { ...form };
            // For superadmin, set restaurant_id to the first selected
            if (isSuperAdmin && form.restaurant_ids.length > 0) {
                payload.restaurant_id = form.restaurant_ids[0];
            }
            if (editing) {
                await usersAPI.update(user.id, payload);
            } else {
                await usersAPI.create(payload);
            }
            onSaved();
        } catch (err) {
            if (err.response?.status === 422) {
                setErrors(err.response.data.errors ?? {});
            } else {
                setErrors({ _global: err.response?.data?.message ?? 'Error inesperado' });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Modal */}
            <div className="relative bg-gray-900 border border-gray-800/50 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[90vh] flex flex-col sm:mx-4" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 md:px-6 pt-4 pb-3 border-b border-gray-800/50 flex-shrink-0">
                    <h2 className="text-base font-black text-white tracking-tight">
                        {editing ? 'Editar usuario' : 'Nuevo usuario'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-5 md:px-6 py-4 space-y-3.5 overflow-y-auto flex-1 min-h-0 scrollbar-none">
                    {errors._global && (
                        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
                            {errors._global}
                        </p>
                    )}

                    {/* Name */}
                    <Field label="Nombre" error={errors.name?.[0]}>
                        <input
                            type="text" required value={form.name}
                            onChange={e => set('name', e.target.value)}
                            placeholder="Juan Pérez"
                            className={inputCls(errors.name)}
                        />
                    </Field>

                    {/* Email */}
                    <Field label="Correo" error={errors.email?.[0]}>
                        <input
                            type="email" required value={form.email}
                            onChange={e => set('email', e.target.value)}
                            placeholder="juan@restaurante.com"
                            className={inputCls(errors.email)}
                        />
                    </Field>

                    {/* Password */}
                    <Field label={editing ? 'Nueva contraseña (opcional)' : 'Contraseña'} error={errors.password?.[0]}>
                        <input
                            type="password"
                            required={!editing}
                            value={form.password}
                            onChange={e => set('password', e.target.value)}
                            placeholder="••••••••"
                            className={inputCls(errors.password)}
                        />
                    </Field>

                    {(form.password || !editing) && (
                        <Field label="Confirmar contraseña" error={errors.password_confirmation?.[0]}>
                            <input
                                type="password"
                                required={!editing}
                                value={form.password_confirmation}
                                onChange={e => set('password_confirmation', e.target.value)}
                                placeholder="••••••••"
                                className={inputCls(errors.password_confirmation)}
                            />
                        </Field>
                    )}

                    {/* Role */}
                    <Field label="Rol" error={errors.role?.[0]}>
                        <select
                            value={form.role}
                            onChange={e => set('role', e.target.value)}
                            className={inputCls(errors.role)}
                        >
                            {ROLES.map(r => (
                                <option key={r} value={r} className="bg-gray-800 capitalize">{r}</option>
                            ))}
                        </select>
                    </Field>

                    {/* Restaurants (superadmin only) */}
                    {isSuperAdmin && restaurants.length > 0 && (
                        <Field label="Sucursales asignadas" error={errors.restaurant_ids?.[0]}>
                            <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                {restaurants.map(r => (
                                    <label
                                        key={r.id}
                                        className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-colors ${form.restaurant_ids.includes(r.id)
                                            ? 'bg-orange-500/15 border border-orange-500/30'
                                            : 'bg-gray-900/40 border border-gray-700/50 hover:bg-gray-900/60'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={form.restaurant_ids.includes(r.id)}
                                            onChange={() => toggleRestaurant(r.id)}
                                            className="accent-orange-500 w-4 h-4 rounded"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-medium ${form.restaurant_ids.includes(r.id) ? 'text-orange-300' : 'text-gray-300'}`}>
                                                {r.name}
                                            </p>
                                            {r.city && (
                                                <p className="text-xs text-gray-500">{r.city}</p>
                                            )}
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </Field>
                    )}

                    {/* Active toggle */}
                    <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-300">Usuario activo</label>
                        <button
                            type="button"
                            onClick={() => set('is_active', !form.is_active)}
                            className={`relative w-11 h-6 rounded-full transition-colors ${form.is_active ? 'bg-orange-500' : 'bg-gray-600'}`}
                        >
                            <span
                                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : ''}`}
                            />
                        </button>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button" onClick={onClose}
                            className="flex-1 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold rounded-xl py-2.5 transition-colors border border-gray-700/50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit" disabled={loading}
                            className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 disabled:opacity-60 text-white text-sm font-black rounded-xl py-2.5 transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {loading && (
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                </svg>
                            )}
                            {editing ? 'Guardar cambios' : 'Crear usuario'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function Field({ label, error, children }) {
    return (
        <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
            {children}
            {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        </div>
    );
}

const inputCls = (err) =>
    `w-full bg-gray-900/60 border text-white placeholder-gray-500 rounded-xl px-3.5 py-2 text-sm
   focus:outline-none focus:ring-1 transition-colors
   ${err ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/30' : 'border-gray-600/60 focus:border-orange-500 focus:ring-orange-500/30'}`;
