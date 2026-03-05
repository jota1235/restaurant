import { useNavigate } from 'react-router-dom';

export default function NotFound() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-center px-4 overflow-hidden relative">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative">
                <h1 className="text-[150px] font-black text-white/5 leading-none select-none">404</h1>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-7xl mb-4">🔦</div>
                </div>
            </div>

            <h2 className="text-2xl font-black text-white mb-2 tracking-tight uppercase">Página no encontrada</h2>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] mb-10 italic">
                El plato que buscas no está en el menú
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="px-8 py-4 bg-gray-900 border border-gray-800 rounded-3xl text-[10px] font-black text-gray-500 hover:text-white hover:border-gray-700 transition-all uppercase tracking-widest"
                >
                    Volver Atrás
                </button>
                <button
                    onClick={() => navigate('/')}
                    className="px-10 py-4 bg-orange-500 text-white rounded-3xl text-[10px] font-black shadow-xl shadow-orange-500/20 hover:bg-orange-600 transition-all uppercase tracking-widest active:scale-95"
                >
                    Ir al Inicio
                </button>
            </div>
        </div>
    );
}
