import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

const ROLE_REDIRECTS = {
    superadmin: '/admin',
    admin: '/admin',
    mesero: '/mesero',
    cocina: '/cocina',
    caja: '/caja',
};

export default function Login() {
    const navigate = useNavigate();
    const { login, loading, error, clearError, isAuthenticated, user, requiresBranchSelection } = useAuthStore();
    const [form, setForm] = useState({ email: '', password: '' });

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated && user && !requiresBranchSelection) {
            const roles = user.roles || [];
            const primaryRole = roles[0];
            const redirect = ROLE_REDIRECTS[primaryRole] || '/dashboard';
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
                const primaryRole = roles[0];
                const redirect = ROLE_REDIRECTS[primaryRole] || '/dashboard';
                navigate(redirect, { replace: true });
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-orange-900">
            {/* Glow background effect */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md mx-4">
                {/* Logo / Brand */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500 rounded-2xl shadow-lg shadow-orange-500/30 mb-4">
                        <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 6M17 13l1.5 6M9 19h6" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">TaquerPOS</h1>
                    <p className="text-gray-400 text-sm mt-1">Sistema POS para Restaurantes</p>
                </div>

                {/* Card */}
                <div className="bg-gray-800/60 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl p-8">
                    <h2 className="text-xl font-semibold text-white mb-6">Iniciar Sesión</h2>

                    {/* Error message */}
                    {error && (
                        <div className="mb-4 flex items-start gap-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl p-3">
                            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                Correo electrónico
                            </label>
                            <input
                                type="email"
                                autoComplete="email"
                                required
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                placeholder="admin@restaurante.com"
                                className="w-full bg-gray-900/60 border border-gray-600/60 text-white placeholder-gray-500
                           rounded-xl px-4 py-2.5 text-sm
                           focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/40
                           transition-colors duration-150"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                Contraseña
                            </label>
                            <input
                                type="password"
                                autoComplete="current-password"
                                required
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                placeholder="••••••••"
                                className="w-full bg-gray-900/60 border border-gray-600/60 text-white placeholder-gray-500
                           rounded-xl px-4 py-2.5 text-sm
                           focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/40
                           transition-colors duration-150"
                            />
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50
                         text-white font-semibold rounded-xl py-2.5 text-sm
                         transition-all duration-150 shadow-lg shadow-orange-500/25
                         disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

                <p className="text-center text-gray-600 text-xs mt-6">
                    TaquerPOS © {new Date().getFullYear()} · Todos los derechos reservados
                </p>
            </div>
        </div>
    );
}
