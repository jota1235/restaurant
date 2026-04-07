import { Navigate } from 'react-router-dom';

export default function CajaHome() {
    // Redirect to the main caja page since it's now fully implemented
    return <Navigate to="/caja" replace />;
}
