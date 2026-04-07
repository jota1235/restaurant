import { Outlet, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import BranchSwitcher from '../components/BranchSwitcher';

export default function CocinaLayout() {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="h-screen bg-gray-950 text-white flex flex-col overflow-hidden">
            {/* Top accent — green theme for kitchen */}
            <div className="h-[2px] bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500" />

            <header className="bg-gray-900/80 backdrop-blur-xl border-b border-gray-800/60 px-3 md:px-6 h-12 md:h-14 flex items-center gap-2 md:gap-3 sticky top-0 z-30 flex-shrink-0">
                {/* Logo */}
                <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20">
                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857" />
                    </svg>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                    <span className="font-bold text-sm tracking-tight">TaquerPOS</span>
                    <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg uppercase tracking-widest">Cocina</span>
                </div>

                {/* Live indicator */}
                <div className="flex items-center gap-1.5 ml-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider hidden sm:inline">En vivo</span>
                </div>

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
                        className="p-1.5 md:px-3 md:py-1.5 rounded-xl bg-gray-800/60 hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-all border border-gray-700/50 hover:border-red-500/20"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>
            </header>

            <main className="flex-1 min-h-0 p-2 md:p-4 overflow-hidden">
                <Outlet />
            </main>
        </div>
    );
}
