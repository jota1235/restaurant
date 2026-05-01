import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import useAuthStore from '../store/authStore';
import BranchSwitcher from '../components/BranchSwitcher';
import echo from '../api/echo';

const navItems = [
    {
        to: '/mesero',
        end: true,
        label: 'Inicio',
        icon: (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        ),
    },
    {
        to: '/mesero/mesas',
        label: 'Mesas',
        icon: (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
        ),
    },
    {
        to: '/mesero/orden',
        label: 'Nueva Orden',
        icon: (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
        ),
    },
    {
        to: '/mesero/para-llevar',
        label: 'Para Llevar',
        icon: (
            <span className="text-lg leading-none">🛍️</span>
        ),
    },
];

export default function MeseroLayout() {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const [bellNotification, setBellNotification] = useState(null);
    const audioContextRef = useRef(null);

    const playBell = () => {
        try {
            // Create context if it doesn't exist
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            const audioCtx = audioContextRef.current;

            // Important: Resume context if browser suspended it
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            const playDing = (delay, freq) => {
                const osc = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
                
                gainNode.gain.setValueAtTime(0, audioCtx.currentTime + delay);
                gainNode.gain.linearRampToValueAtTime(1, audioCtx.currentTime + delay + 0.05);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + 1.2);
                
                osc.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                
                osc.start(audioCtx.currentTime + delay);
                osc.stop(audioCtx.currentTime + delay + 1.2);
            };
            
            // Triple High Pitch Chime (More piercing for noisy environments)
            const now = audioCtx.currentTime;
            playDing(0, 1567.98); // G6
            playDing(0.12, 1567.98); // G6
            playDing(0.24, 2093.00); // C7
        } catch (e) {
            console.error('Audio api error', e);
        }
    };

    useEffect(() => {
        // Try to resume audio context on any user interaction
        const resumeAudio = () => {
            if (audioContextRef.current?.state === 'suspended') {
                audioContextRef.current.resume();
            }
        };
        window.addEventListener('click', resumeAudio);
        return () => window.removeEventListener('click', resumeAudio);
    }, []);

    useEffect(() => {
        if (!user || !user.restaurant_id || !echo) return;

        const channel = echo.private(`restaurant.${user.restaurant_id}`);
        channel.listen('.order.bell', (e) => {
            playBell();
            setBellNotification(e.order_number);
            
            // Auto hide notification after 5s
            setTimeout(() => setBellNotification(null), 5000);
        });

        return () => {
            channel.stopListening('.order.bell');
        };
    }, [user]);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="h-screen bg-gray-950 text-white flex flex-col overflow-hidden">
            {/* Top accent gradient line */}
            <div className="h-[2px] bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500" />

            {/* Header */}
            <header className="bg-gray-900/90 backdrop-blur-xl border-b border-gray-800 px-4 md:px-8 h-16 md:h-20 flex items-center gap-3 md:gap-5 sticky top-0 z-30">
                {/* Logo */}
                <div className="w-9 h-9 md:w-10 md:h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/30">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 6M17 13l1.5 6M9 19h6" />
                    </svg>
                </div>
                <div className="hidden sm:flex items-center gap-3">
                    <span className="font-black text-lg text-white tracking-widest">TaquerPOS</span>
                    <span className="text-xs font-black text-orange-300 bg-orange-500/20 border border-orange-500/30 px-3 py-1 rounded-lg uppercase tracking-widest">Mesero</span>
                </div>
                <span className="sm:hidden text-base text-gray-200 font-bold truncate">{user?.name?.split(' ')[0]}</span>

                {/* Navigation */}
                <nav className="flex gap-2 ml-2 md:ml-6">
                    {navItems.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) =>
                                `px-3 md:px-4 py-2.5 rounded-xl text-[15px] font-black transition-all duration-200 flex items-center gap-2.5 whitespace-nowrap ${isActive
                                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20 border border-orange-400/50'
                                    : 'text-gray-300 hover:text-white hover:bg-gray-800 border border-transparent'
                                }`
                            }
                        >
                            {item.icon}
                            <span className="hidden md:inline leading-none">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* Right section */}
                <div className="ml-auto flex items-center gap-3 md:gap-5">
                    <BranchSwitcher />
                    <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-gray-700">
                        <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center text-lg font-black text-gray-200 uppercase shadow-inner">
                            {user?.name?.charAt(0)}
                        </div>
                        <span className="text-sm text-gray-200 font-bold hidden md:inline">{user?.name?.split(' ')[0]}</span>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="bg-gray-800/80 hover:bg-red-500/20 p-2.5 md:px-4 md:py-2.5 rounded-xl text-gray-300 hover:text-red-400 transition-all duration-200 border border-gray-700/80 hover:border-red-500/40"
                    >
                        <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>
            </header>

            <main className="flex-1 min-h-0 p-1.5 sm:p-2 md:p-4 lg:p-6 overflow-hidden relative">
                {/* Bell Notification Popup */}
                {bellNotification && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-bounce">
                        <div className="bg-yellow-500 text-black px-6 py-3 rounded-full font-black flex items-center gap-3 shadow-2xl shadow-yellow-500/50 border-4 border-yellow-400">
                            <span className="text-2xl animate-pulse">🔔</span>
                            <span>¡PEDIDO #{bellNotification} LISTO EN COCINA!</span>
                        </div>
                    </div>
                )}
                <Outlet />
            </main>
        </div>
    );
}
