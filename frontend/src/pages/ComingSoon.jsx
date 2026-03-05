import { useNavigate } from 'react-router-dom';

export default function ComingSoon() {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full animate-pulse" />
                <div className="relative w-24 h-24 bg-gray-900 border border-gray-800 rounded-3xl flex items-center justify-center text-5xl shadow-2xl">
                    🚀
                </div>
            </div>

            <h1 className="text-3xl font-black text-white mb-3 tracking-tighter uppercase">
                Próximamente
            </h1>

            <p className="text-gray-500 max-w-md mx-auto mb-8 font-medium leading-relaxed uppercase text-[10px] tracking-[0.2em]">
                Estamos trabajando duro para traerte esta nueva funcionalidad. <br />
                ¡Vuelve pronto para ver las novedades!
            </p>

            <button
                onClick={() => navigate(-1)}
                className="px-8 py-4 bg-gray-900 border border-gray-800 rounded-2xl text-xs font-black text-gray-400 hover:text-white hover:border-orange-500/40 transition-all uppercase tracking-widest active:scale-95 shadow-xl shadow-black/40"
            >
                Regresar
            </button>
        </div>
    );
}
