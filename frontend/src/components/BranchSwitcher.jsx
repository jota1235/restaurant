import { useState, useRef, useEffect } from 'react';
import useAuthStore from '../store/authStore';

export default function BranchSwitcher() {
    const { restaurants, activeRestaurantId, switchBranch, user } = useAuthStore();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    const hasMultiple = restaurants && restaurants.length > 1;
    const active = restaurants?.find(r => String(r.id) === String(activeRestaurantId));
    const displayName = active?.name || user?.restaurant?.name || 'Sucursal';

    // Close on outside click
    useEffect(() => {
        if (!hasMultiple) return;
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [hasMultiple]);

    // Single branch — just show the name badge (no dropdown)
    if (!hasMultiple) {
        return (
            <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 px-3 py-1.5 rounded-xl text-xs font-bold">
                <svg className="w-3.5 h-3.5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="text-white truncate max-w-[140px]">{displayName}</span>
            </div>
        );
    }

    // Multiple branches — show dropdown switcher
    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
            >
                <svg className="w-3.5 h-3.5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="text-white truncate max-w-[120px]">{displayName}</span>
                <svg className={`w-3 h-3 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {open && (
                <div className="absolute top-full mt-1 right-0 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl min-w-[200px] py-1 z-50">
                    <p className="px-3 py-1.5 text-[10px] font-black text-gray-500 uppercase tracking-widest">Cambiar Sucursal</p>
                    {restaurants.map(r => (
                        <button
                            key={r.id}
                            onClick={() => { setOpen(false); if (String(r.id) !== String(activeRestaurantId)) switchBranch(r.id); }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-700 transition-colors flex items-center gap-2 ${String(r.id) === String(activeRestaurantId) ? 'text-orange-400' : 'text-gray-300'
                                }`}
                        >
                            {String(r.id) === String(activeRestaurantId) && (
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                            )}
                            <span className="truncate">{r.name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
