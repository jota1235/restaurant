import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

const ROLE_REDIRECTS = {
    superadmin: '/admin',
    admin: '/admin',
    mesero: '/mesero',
    cocina: '/cocina',
    caja: '/caja',
    almacenista: '/admin/inventario',
};

const getRoleName = (role) => typeof role === 'string' ? role : role?.name;

export default function Login() {
    const navigate = useNavigate();
    const { login, loading, error, clearError, isAuthenticated, user, requiresBranchSelection } = useAuthStore();
    const [form, setForm] = useState({ email: '', password: '' });

    useEffect(() => {
        if (isAuthenticated && user && !requiresBranchSelection) {
            const roles = user.roles || [];
            const primaryRole = getRoleName(roles[0]);
            const redirect = ROLE_REDIRECTS[primaryRole] || '/admin';
            navigate(redirect, { replace: true });
        }
    }, [isAuthenticated, user, navigate, requiresBranchSelection]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        clearError();
        const result = await login(form);
        if (result.success) {
            if (result.data.requires_branch_selection) {
                navigate('/select-branch', { replace: true });
            } else {
                const roles = result.data.user?.roles || [];
                const primaryRole = getRoleName(roles[0]);
                const redirect = ROLE_REDIRECTS[primaryRole] || '/admin';
                navigate(redirect, { replace: true });
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
            {/* Background effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500" />
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-72 md:w-96 h-72 md:h-96 bg-orange-500/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-sm">
                {/* Logo / Brand */}
                <div className="text-center mb-6 md:mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl shadow-xl shadow-orange-500/20 mb-4">
                        <svg className="w-7 h-7 md:w-8 md:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 6M17 13l1.5 6M9 19h6" />
                        </svg>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">TaquerPOS</h1>
                    <p className="text-gray-500 text-xs md:text-sm mt-1 font-medium">Sistema POS para Restaurantes</p>
                </div>

                {/* Card */}
                <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl shadow-2xl p-6 md:p-8">
                    <h2 className="text-lg font-black text-white mb-5 tracking-tight">Iniciar Sesión</h2>

                    {/* Error message */}
                    {error && (
                        <div className="mb-4 flex items-start gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-3">
                            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span className="font-medium">{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email */}
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                                Correo electrónico
                            </label>
                            <input
                                type="email"
                                autoComplete="email"
                                required
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                placeholder="admin@restaurante.com"
                                className="w-full bg-gray-950/60 border border-gray-800/50 text-white placeholder-gray-600
                                    rounded-xl px-4 py-3 text-sm font-medium
                                    focus:outline-none focus:border-orange-500/40 focus:ring-2 focus:ring-orange-500/10
                                    transition-all"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                                Contraseña
                            </label>
                            <input
                                type="password"
                                autoComplete="current-password"
                                required
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                placeholder="••••••••"
                                className="w-full bg-gray-950/60 border border-gray-800/50 text-white placeholder-gray-600
                                    rounded-xl px-4 py-3 text-sm font-medium
                                    focus:outline-none focus:border-orange-500/40 focus:ring-2 focus:ring-orange-500/10
                                    transition-all"
                            />
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700
                                disabled:opacity-50 text-white font-black rounded-xl py-3.5 text-sm uppercase tracking-wider
                                transition-all shadow-lg shadow-orange-500/20
                                disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
                        >
                            {loading ? (
                                <>
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                    Iniciando sesión…
                                </>
                            ) : (
                                'Entrar al sistema'
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center text-gray-700 text-[10px] mt-5 font-medium">
                    TaquerPOS © {new Date().getFullYear()} · Todos los derechos reservados
                </p>
            </div>
        </div>
    );
}
