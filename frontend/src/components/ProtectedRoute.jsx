import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../store/authStore';

/**
 * ProtectedRoute
 * @param {string[]} allowedRoles - Roles permitidos. Si está vacío solo verifica autenticación.
 * @param {string}   redirectTo   - Ruta destino si no tiene acceso.
 */
export default function ProtectedRoute({ allowedRoles = [], redirectTo = '/login' }) {
    const { isAuthenticated, user } = useAuthStore();

    if (!isAuthenticated) {
        return <Navigate to={redirectTo} replace />;
    }

    if (allowedRoles.length > 0) {
        const userRoles = user?.roles || [];
        const hasAccess = allowedRoles.some((role) => userRoles.includes(role));
        if (!hasAccess) {
            return <Navigate to="/unauthorized" replace />;
        }
    }

    return <Outlet />;
}
