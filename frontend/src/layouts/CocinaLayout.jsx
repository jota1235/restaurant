import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef, useCallback } from 'react';
import useAuthStore from '../store/authStore';
import BranchSwitcher from '../components/BranchSwitcher';
import echo from '../api/echo';

export default function CocinaLayout() {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const audioContextRef = useRef(null);
    const [newOrderNotification, setNewOrderNotification] = useState(null);
    const [audioUnlocked, setAudioUnlocked] = useState(false);

    // ─── Audio Engine (same unlock strategy as MeseroLayout) ────────────────
    // iOS Safari and Android Chrome block AudioContext until a user gesture.
    // We eagerly create and unlock the context on the first touch/click so
    // subsequent programmatic plays work without any user interaction.

    const playKitchenBell = useCallback(() => {
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }

            const audioCtx = audioContextRef.current;

            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            // Helper: play a single sine tone with fade-in / fade-out
            const playTone = (delay, freq, duration = 0.6) => {
                const osc      = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);

                gainNode.gain.setValueAtTime(0, audioCtx.currentTime + delay);
                gainNode.gain.linearRampToValueAtTime(0.9, audioCtx.currentTime + delay + 0.04);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + duration);

                osc.connect(gainNode);
                gainNode.connect(audioCtx.destination);

                osc.start(audioCtx.currentTime + delay);
                osc.stop(audioCtx.currentTime + delay + duration);
            };

            // Kitchen alert: 3-tone ascending pattern (lower, more "urgent" than waiter bell)
            // Do4 → Mi4 → Sol4 — clearly distinct from the mesero chime (G6/C7)
            playTone(0.00, 523.25);  // C5
            playTone(0.18, 659.25);  // E5
            playTone(0.36, 783.99);  // G5
            playTone(0.54, 1046.50); // C6 — final high ping
        } catch (e) {
            console.error('Kitchen audio error', e);
        }
    }, []);

    // Unlock AudioContext on first user interaction (iOS/Android requirement)
    useEffect(() => {
        const initAudio = () => {
            try {
                if (!audioContextRef.current) {
                    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();

                    // Play a silent 1-sample buffer to definitively unlock audio on iOS Safari
                    const buffer = audioContextRef.current.createBuffer(1, 1, 22050);
                    const source = audioContextRef.current.createBufferSource();
                    source.buffer = buffer;
                    source.connect(audioContextRef.current.destination);
                    source.start(0);
                }
                if (audioContextRef.current.state === 'suspended') {
                    audioContextRef.current.resume().then(() => setAudioUnlocked(true));
                } else {
                    setAudioUnlocked(true);
                }
            } catch (e) {
                console.error('Audio unlock failed', e);
            }
        };

        const events = ['click', 'touchstart', 'keydown', 'pointerdown'];
        events.forEach(e => window.addEventListener(e, initAudio, { passive: true }));
        return () => events.forEach(e => window.removeEventListener(e, initAudio));
    }, []);

    // ─── WebSocket: listen for new orders on this cook's channel ────────────
    useEffect(() => {
        if (!user?.id || !echo) return;

        // Listen on the cook's personal channel (same one CocinaPage uses)
        const cookChannel = echo.private(`cook.${user.id}`);

        cookChannel.listen('.order.created', (data) => {
            const orderNumber = data?.order?.order_number ?? data?.order_number ?? '?';

            playKitchenBell();
            setNewOrderNotification(orderNumber);

            // Auto-hide after 6 seconds
            setTimeout(() => setNewOrderNotification(null), 6000);
        });
        
        // Event from Waiter adding items to existing order
        cookChannel.listen('.cook.bell', (data) => {
            const orderNumber = data?.order_number ?? '?';
            playKitchenBell();
            setNewOrderNotification(orderNumber + ' (Actualización)');
            setTimeout(() => setNewOrderNotification(null), 6000);
        });

        return () => {
            cookChannel.stopListening('.order.created');
            cookChannel.stopListening('.cook.bell');
        };
    }, [user?.id, playKitchenBell]);

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
                    {!audioUnlocked && (
                        <button 
                            onClick={() => {
                                try {
                                    if (!audioContextRef.current) {
                                        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
                                        const buffer = audioContextRef.current.createBuffer(1, 1, 22050);
                                        const source = audioContextRef.current.createBufferSource();
                                        source.buffer = buffer;
                                        source.connect(audioContextRef.current.destination);
                                        source.start(0);
                                    }
                                    if (audioContextRef.current.state === 'suspended') {
                                        audioContextRef.current.resume().then(() => setAudioUnlocked(true));
                                    } else {
                                        setAudioUnlocked(true);
                                    }
                                } catch (e) {
                                    console.error(e);
                                    setAudioUnlocked(true);
                                }
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 border border-red-500/40 rounded-xl text-red-400 text-[10px] md:text-xs font-black uppercase tracking-widest shadow-lg shadow-red-500/20 animate-pulse"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                            </svg>
                            Activar Timbre
                        </button>
                    )}
                    <BranchSwitcher />
                    <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-gray-800">
                        <div className="w-7 h-7 bg-gray-800 rounded-lg flex items-center justify-center text-[11px] font-black text-gray-400 uppercase">
                            {user?.name?.charAt(0)}
                        </div>
                        <span className="text-xs text-gray-400 font-medium hidden md:inline">{user?.name?.split(' ')[0]}</span>
                    </div>
                    <button
                        onClick={handleLogout}
                        title="Cerrar sesión"
                        className="p-1.5 md:px-3 md:py-1.5 rounded-xl bg-gray-800/60 hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-all border border-gray-700/50 hover:border-red-500/20"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>
            </header>

            <main className="flex-1 min-h-0 p-2 md:p-4 overflow-hidden relative">
                {/* New Order Notification Banner */}
                {newOrderNotification && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 animate-bounce pointer-events-none">
                        <div className="bg-emerald-500 text-white px-5 py-3 rounded-full font-black flex items-center gap-3 shadow-2xl shadow-emerald-500/60 border-4 border-emerald-400 whitespace-nowrap">
                            <span className="text-2xl animate-pulse">🍽️</span>
                            <span className="text-sm uppercase tracking-widest">¡NUEVA ORDEN #{newOrderNotification}!</span>
                        </div>
                    </div>
                )}
                <Outlet />
            </main>
        </div>
    );
}
