import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import BranchSwitcher from '../components/BranchSwitcher';

const navItems = [
    {
        to: '/mesero',
        end: true,
        label: 'Inicio',
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        ),
    },
    {
        to: '/mesero/mesas',
        label: 'Mesas',
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
        ),
    },
    {
        to: '/mesero/orden',
        label: 'Nueva Orden',
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
        ),
    },
];

export default function MeseroLayout() {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="h-screen bg-gray-950 text-white flex flex-col overflow-hidden">
            {/* Top accent gradient line */}
            <div className="h-[2px] bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500" />

            {/* Header */}
            <header className="bg-gray-900/80 backdrop-blur-xl border-b border-gray-800/60 px-3 md:px-6 h-12 md:h-14 flex items-center gap-2 md:gap-3 sticky top-0 z-30">
                {/* Logo */}
                <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/20">
                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 6M17 13l1.5 6M9 19h6" />
                    </svg>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                    <span className="font-bold text-sm tracking-tight">TaquerPOS</span>
                    <span className="text-[10px] font-black text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-lg uppercase tracking-widest">Mesero</span>
                </div>
                <span className="sm:hidden text-xs text-gray-400 font-medium truncate">{user?.name?.split(' ')[0]}</span>

                {/* Navigation */}
                <nav className="flex gap-1 ml-2 md:ml-4">
                    {navItems.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) =>
                                `px-2.5 md:px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap ${isActive
                                    ? 'bg-orange-500/15 text-orange-400 border border-orange-500/20 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/60 border border-transparent'
                                }`
                            }
                        >
                            {item.icon}
                            <span className="hidden md:inline">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* Right section */}
                <div className="ml-auto flex items-center gap-2 md:gap-3">
                    <BranchSwitcher />
                    <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-gray-800">
                        <div className="w-7 h-7 bg-gray-800 rounded-lg flex items-center justify-center text-[11px] font-black text-gray-400 uppercase">
                            {user?.name?.charAt(0)}
                        </div>
                        <span className="text-xs text-gray-400 font-medium hidden md:inline">{user?.name?.split(' ')[0]}</span>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="text-xs bg-gray-800/60 hover:bg-red-500/10 p-1.5 md:px-3 md:py-1.5 rounded-xl text-gray-500 hover:text-red-400 transition-all duration-200 border border-gray-700/50 hover:border-red-500/20"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>
            </header>

            <main className="flex-1 min-h-0 p-1.5 sm:p-2 md:p-4 lg:p-6 overflow-hidden">
                <Outlet />
            </main>
        </div>
    );
}
