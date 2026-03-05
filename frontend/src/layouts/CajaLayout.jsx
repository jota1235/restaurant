import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import BranchSwitcher from '../components/BranchSwitcher';

export default function CajaLayout() {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col">
            <header className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center gap-4">
                <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                </div>
                <span className="font-bold text-sm">TaquerPOS</span>
                <span className="text-gray-500 text-xs">·</span>
                <span className="text-blue-400 text-xs font-semibold uppercase tracking-widest">Caja</span>

                <nav className="flex gap-2 ml-4">
                    <NavLink to="/caja" end
                        className={({ isActive }) =>
                            `px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isActive ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-white'}`
                        }
                    >
                        Cobrar
                    </NavLink>
                    <NavLink to="/caja/corte"
                        className={({ isActive }) =>
                            `px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isActive ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-white'}`
                        }
                    >
                        Corte de Caja
                    </NavLink>
                    <NavLink to="/caja/historial"
                        className={({ isActive }) =>
                            `px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isActive ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-white'}`
                        }
                    >
                        Historial
                    </NavLink>
                </nav>

                <div className="ml-auto flex items-center gap-3">
                    <BranchSwitcher />
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
