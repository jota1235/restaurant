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
        <div className="min-h-screen bg-gray-950 text-white flex flex-col">
            <header className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center gap-4">
                <div className="w-7 h-7 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857" />
                    </svg>
                </div>
                <span className="font-bold text-sm">TaquerPOS</span>
                <span className="text-gray-500 text-xs">·</span>
                <span className="text-green-400 text-xs font-semibold uppercase tracking-widest">Cocina KDS</span>

                <div className="ml-auto flex items-center gap-3">
                    <BranchSwitcher />
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs text-gray-400">En vivo</span>
                    </div>
                    <span className="text-xs text-gray-400">{user?.name}</span>
                    <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-red-400 transition-colors">
                        Salir
                    </button>
                </div>
            </header>

            <main className="flex-1 p-4 overflow-auto">
                <Outlet />
            </main>
        </div>
    );
}
