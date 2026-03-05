import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

const ROLE_REDIRECTS = {
    superadmin: '/admin',
    admin: '/admin',
    mesero: '/mesero',
    cocina: '/cocina',
    caja: '/caja',
};

export default function BranchSelector() {
    const navigate = useNavigate();
    const { restaurants, selectBranch, user, isAuthenticated } = useAuthStore();

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    const handleSelect = async (restaurantId) => {
        const result = await selectBranch(restaurantId);
        if (result.success) {
            const roles = user?.roles || [];
            const primaryRole = roles[0];
            const redirect = ROLE_REDIRECTS[primaryRole] || '/admin';
            navigate(redirect, { replace: true });
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-orange-900">
            {/* Glow background effect */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-lg mx-4">
                {/* Logo / Brand */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500 rounded-2xl shadow-lg shadow-orange-500/30 mb-4">
                        <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Selecciona Sucursal</h1>
                    <p className="text-gray-400 text-sm mt-1">¿En cuál sucursal quieres trabajar hoy?</p>
                </div>

                {/* Branch Cards */}
                <div className="space-y-3">
                    {restaurants.map((r) => (
                        <button
                            key={r.id}
                            onClick={() => handleSelect(r.id)}
                            className="w-full bg-gray-800/60 backdrop-blur-xl border border-gray-700/50 hover:border-orange-500/50 rounded-2xl p-5 text-left transition-all duration-200 hover:bg-gray-800/80 hover:shadow-lg hover:shadow-orange-500/10 active:scale-[0.98] group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                                    <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-bold text-white truncate">{r.name}</h3>
                                    {(r.address || r.city) && (
                                        <p className="text-sm text-gray-400 truncate">
                                            {[r.address, r.city].filter(Boolean).join(' · ')}
                                        </p>
                                    )}
                                </div>
                                <svg className="w-5 h-5 text-gray-600 group-hover:text-orange-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </button>
                    ))}
                </div>

                <p className="text-center text-gray-600 text-xs mt-6">
                    TaquerPOS © {new Date().getFullYear()} · Todos los derechos reservados
                </p>
            </div>
        </div>
    );
}
