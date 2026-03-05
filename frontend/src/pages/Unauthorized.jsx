export default function Unauthorized() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-center px-4">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold text-white mb-2">Sin permisos</h1>
            <p className="text-gray-400 text-sm mb-6">No tienes acceso a esta sección.</p>
            <a href="/login" className="text-orange-400 hover:text-orange-300 text-sm underline">
                Volver al inicio
            </a>
        </div>
    );
}
