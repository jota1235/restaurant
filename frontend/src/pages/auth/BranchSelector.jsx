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
            // Role can be a string or an object with a name property
            const firstRole = roles[0];
            const primaryRole = typeof firstRole === 'string' ? firstRole : firstRole?.name;
            const redirect = ROLE_REDIRECTS[primaryRole] || '/admin';
            navigate(redirect, { replace: true });
        }
    };

    if (!restaurants || restaurants.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
                <div className="text-center">
                    <p className="text-gray-400 mb-4">No tienes sucursales asignadas o tu sesión expiró.</p>
                    <button onClick={() => navigate('/login')} className="text-orange-500 font-bold underline">Volver al Login</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
            {/* Background effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500" />
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-72 md:w-96 h-72 md:h-96 bg-orange-500/5 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-6 md:mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl shadow-xl shadow-orange-500/20 mb-4">
                        <svg className="w-7 h-7 md:w-8 md:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>
                    <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">Selecciona Sucursal</h1>
                    <p className="text-gray-500 text-xs md:text-sm mt-1 font-medium">¿En cuál sucursal quieres trabajar hoy?</p>
                </div>

                {/* Branch Cards */}
                <div className="space-y-2.5">
                    {restaurants.map((r) => (
                        <button
                            key={r.id}
                            onClick={() => handleSelect(r.id)}
                            className="w-full bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 hover:border-orange-500/30 rounded-2xl p-4 md:p-5 text-left transition-all duration-200 hover:bg-gray-900/60 hover:shadow-lg hover:shadow-orange-500/5 active:scale-[0.98] group"
                        >
                            <div className="flex items-center gap-3 md:gap-4">
                                <div className="w-11 h-11 md:w-12 md:h-12 bg-orange-500/10 border border-orange-500/15 rounded-xl flex items-center justify-center group-hover:bg-orange-500/15 transition-colors flex-shrink-0">
                                    <svg className="w-5 h-5 md:w-6 md:h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base md:text-lg font-black text-white truncate">{r.name}</h3>
                                    {(r.address || r.city) && (
                                        <p className="text-xs text-gray-400 truncate">
                                            {[r.address, r.city].filter(Boolean).join(' · ')}
                                        </p>
                                    )}
                                </div>
                                <svg className="w-4 h-4 text-gray-600 group-hover:text-orange-400 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </button>
                    ))}
                </div>

                <p className="text-center text-gray-700 text-[10px] mt-5 font-medium">
                    TaquerPOS © {new Date().getFullYear()} · Todos los derechos reservados
                </p>
            </div>
        </div>
    );
}
