import { useNavigate } from 'react-router-dom';

export default function Unauthorized() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-center px-4">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-500/5 rounded-full blur-3xl" />
            </div>
            <div className="relative">
                <div className="text-6xl md:text-7xl mb-4">🔒</div>
                <h1 className="text-xl md:text-2xl font-black text-white mb-2 tracking-tight uppercase">Sin permisos</h1>
                <p className="text-gray-500 text-xs mb-8 font-medium">No tienes acceso a esta sección.</p>
                <button
                    onClick={() => navigate('/login')}
                    className="px-8 py-3.5 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-2xl text-[10px] font-black shadow-lg shadow-orange-500/20 hover:from-orange-600 hover:to-amber-700 transition-all uppercase tracking-widest active:scale-[0.98]"
                >
                    Volver al inicio
                </button>
            </div>
        </div>
    );
}
