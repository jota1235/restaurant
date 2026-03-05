import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import BranchSwitcher from '../components/BranchSwitcher';

export default function MeseroLayout() {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col">
            {/* Header compacto */}
            <header className="bg-gray-900 border-b border-gray-800 px-4 h-14 flex items-center gap-3 sticky top-0 z-30">
                <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 6M17 13l1.5 6M9 19h6" />
                    </svg>
                </div>
                <span className="font-bold text-sm hidden sm:inline">TaquerPOS</span>
                <span className="text-gray-500 text-xs hidden sm:inline">·</span>
                <span className="text-gray-400 text-xs truncate">Mesero: {user?.name?.split(' ')[0]}</span>

                <div className="ml-auto flex items-center gap-3">
                    <BranchSwitcher />
                    <button
                        onClick={handleLogout}
                        className="text-xs bg-gray-800 px-3 py-1.5 rounded-lg text-gray-400 hover:text-red-400 transition-colors border border-gray-700"
                    >
                        Salir
                    </button>
                </div>
            </header>

            {/* Sub-nav responsivo (Sticky below header or Bottom Nav on mobile) */}
            <nav className="bg-gray-900/80 backdrop-blur-md border-b border-gray-800 px-4 py-2 flex gap-1 overflow-x-auto scrollbar-none sticky top-14 z-20">
                <NavLink
                    to="/mesero"
                    end
                    className={({ isActive }) =>
                        `px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${isActive
                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                            : 'text-gray-400 hover:bg-gray-800'
                        }`
                    }
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span>Inicio</span>
                </NavLink>
                <NavLink
                    to="/mesero/mesas"
                    className={({ isActive }) =>
                        `px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${isActive
                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                            : 'text-gray-400 hover:bg-gray-800'
                        }`
                    }
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    <span>Mesas</span>
                </NavLink>
                <NavLink
                    to="/mesero/orden"
                    className={({ isActive }) =>
                        `px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${isActive
                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                            : 'text-gray-400 hover:bg-gray-800'
                        }`
                    }
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Nueva Orden</span>
                </NavLink>
            </nav>

            <main className="flex-1 p-3 md:p-6 overflow-auto">
                <Outlet />
            </main>
        </div>
    );
}
