import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';

/**
 * ProtectedRoute
 * @param {string[]} allowedRoles - Roles permitidos. Si está vacío solo verifica autenticación.
 * @param {string}   redirectTo   - Ruta destino si no tiene acceso.
 */
export default function ProtectedRoute({ allowedRoles = [], redirectTo = '/login' }) {
    const { isAuthenticated, user, requiresBranchSelection } = useAuthStore();
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to={redirectTo} replace />;
    }

    // Si el usuario tiene múltiples sucursales y aún no ha elegido, redirigir al selector
    if (requiresBranchSelection && location.pathname !== '/select-branch') {
        return <Navigate to="/select-branch" replace />;
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
