import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import BranchSwitcher from '../components/BranchSwitcher';

const navItems = [
    {
        to: '/caja',
        end: true,
        label: 'Cobrar',
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
        ),
    },
    {
        to: '/caja/corte',
        label: 'Corte de Caja',
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
        ),
    },
    {
        to: '/caja/historial',
        label: 'Historial',
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
    {
        to: '/caja/creditos',
        label: 'Créditos',
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
        ),
    },
];

export default function CajaLayout() {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col">
            {/* Top accent gradient line */}
            <div className="h-[2px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

            {/* Header */}
            <header className="bg-gray-900/80 backdrop-blur-xl border-b border-gray-800/60 px-4 md:px-6 h-14 flex items-center gap-3 sticky top-0 z-30">
                {/* Logo */}
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                    <span className="font-bold text-sm tracking-tight">TaquerPOS</span>
                    <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-lg uppercase tracking-widest">Caja</span>
                </div>

                {/* Navigation */}
                <nav className="flex gap-1 ml-4">
                    {navItems.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) =>
                                `px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${isActive
                                    ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20 shadow-sm'
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
                <div className="ml-auto flex items-center gap-3">
                    <BranchSwitcher />
                    <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-gray-800">
                        <div className="w-7 h-7 bg-gray-800 rounded-lg flex items-center justify-center text-[11px] font-black text-gray-400 uppercase">
                            {user?.name?.charAt(0)}
                        </div>
                        <span className="text-xs text-gray-400 font-medium">{user?.name?.split(' ')[0]}</span>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="text-xs bg-gray-800/60 hover:bg-red-500/10 px-3 py-1.5 rounded-xl text-gray-500 hover:text-red-400 transition-all duration-200 border border-gray-700/50 hover:border-red-500/20"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>
            </header>

            <main className="flex-1 p-3 md:p-6 overflow-auto">
                <Outlet />
            </main>
        </div>
    );
}
