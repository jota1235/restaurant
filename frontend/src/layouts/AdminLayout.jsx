import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import BranchSwitcher from '../components/BranchSwitcher';

const NAV_ITEMS = [
    {
        label: 'Dashboard',
        to: '/admin',
        end: true,
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        ),
    },
    {
        label: 'Restaurantes',
        to: '/admin/restaurantes',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
        ),
    },
    {
        label: 'Usuarios',
        to: '/admin/usuarios',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
    },
    {
        label: 'Menú',
        to: '/admin/menu',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
        ),
    },
    {
        label: 'Extras',
        to: '/admin/extras',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
    {
        label: 'Mesas',
        to: '/admin/mesas',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
        ),
    },
    {
        label: 'Inventario',
        to: '/admin/inventario',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
        ),
    },
    {
        label: 'Créditos',
        to: '/admin/creditos',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
        ),
    },
    {
        label: 'Reportes',
        to: '/admin/reportes',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        ),
    },
];

export default function AdminLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const NavContent = ({ isMobile = false }) => (
        <>
            {/* Brand */}
            <div className="flex items-center gap-3 px-4 h-14 border-b border-gray-800/60 flex-shrink-0">
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 6M17 13l1.5 6M9 19h6" />
                    </svg>
                </div>
                {(isMobile || desktopSidebarOpen) && (
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm tracking-tight">TaquerPOS</span>
                        <span className="text-[9px] font-black text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded-md uppercase tracking-widest">Admin</span>
                    </div>
                )}
            </div>

            {/* Nav */}
            <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto scrollbar-none">
                {NAV_ITEMS.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        onClick={() => isMobile && setSidebarOpen(false)}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${isActive
                                ? 'bg-orange-500/15 text-orange-400 border border-orange-500/20'
                                : 'text-gray-400 hover:bg-gray-800/60 hover:text-white border border-transparent'
                            }`
                        }
                    >
                        {item.icon}
                        {(isMobile || desktopSidebarOpen) && <span className="text-xs font-bold">{item.label}</span>}
                    </NavLink>
                ))}
            </nav>

            {/* User footer */}
            <div className="border-t border-gray-800/60 p-3 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center flex-shrink-0 text-orange-400 font-bold text-sm border border-orange-500/10">
                        {user?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    {(isMobile || desktopSidebarOpen) && (
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate">{user?.name}</p>
                            <p className="text-[10px] text-gray-500 truncate capitalize">{user?.roles?.[0] || 'usuario'}</p>
                        </div>
                    )}
                    {(isMobile || desktopSidebarOpen) && (
                        <button
                            onClick={handleLogout}
                            title="Cerrar sesión"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
        </>
    );

    return (
        <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Mobile Sidebar (Drawer) */}
            <aside
                className={`fixed inset-y-0 left-0 w-64 bg-gray-900/95 backdrop-blur-xl border-r border-gray-800/60 z-50 transform transition-transform duration-300 lg:hidden flex flex-col
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <NavContent isMobile={true} />
            </aside>

            {/* Desktop Sidebar */}
            <aside
                className={`${desktopSidebarOpen ? 'w-56' : 'w-16'} hidden lg:flex flex-shrink-0 flex-col bg-gray-900/80 backdrop-blur-xl border-r border-gray-800/60
                    transition-all duration-200 ease-in-out`}
            >
                <NavContent isMobile={false} />
            </aside>

            {/* Main */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top accent */}
                <div className="h-[2px] bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 flex-shrink-0" />

                {/* Topbar */}
                <header className="h-12 md:h-14 flex items-center px-3 md:px-4 border-b border-gray-800/60 bg-gray-900/50 backdrop-blur-xl gap-3 flex-shrink-0">
                    {/* Hamburger for mobile */}
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-1.5 -ml-1 text-gray-400 hover:text-white lg:hidden transition-colors rounded-lg hover:bg-gray-800/50"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    {/* Desktop Toggle */}
                    <button
                        onClick={() => setDesktopSidebarOpen(!desktopSidebarOpen)}
                        className="hidden lg:block text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-gray-800/50"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    {/* Breadcrumb / Title */}
                    <div className="flex-1 overflow-hidden">
                        <span className="text-xs md:text-sm font-bold text-gray-300 truncate">Administración</span>
                    </div>

                    {/* Branch Switcher */}
                    <BranchSwitcher />
                </header>

                {/* Page content */}
                <main className="flex-1 min-h-0 overflow-auto p-3 md:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
