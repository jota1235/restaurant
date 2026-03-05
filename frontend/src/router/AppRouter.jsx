import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import AdminLayout from '../layouts/AdminLayout';
import MeseroLayout from '../layouts/MeseroLayout';
import CocinaLayout from '../layouts/CocinaLayout';
import CajaLayout from '../layouts/CajaLayout';

// Auth pages
import Login from '../pages/auth/Login';
import BranchSelector from '../pages/auth/BranchSelector';

// Protected route
import ProtectedRoute from '../components/ProtectedRoute';

// Admin Pages
import AdminDashboard from '../pages/admin/Dashboard';
import UsersPage from '../pages/admin/UsersPage';
import RestaurantsPage from '../pages/admin/RestaurantsPage';
import MenuPage from '../pages/admin/MenuPage';
import TablesAdmin from '../pages/admin/TablesAdmin';
import ExtrasAdminPage from '../pages/admin/ExtrasAdminPage';
// Role Pages
import TableMap from '../pages/mesero/TableMap';
import MeseroHome from '../pages/mesero/MeseroHome';
import NewOrderPage from '../pages/mesero/NewOrderPage';
import CocinaPage from '../pages/cocina/CocinaPage';
import CajaPage from '../pages/caja/CajaPage';
import CashRegisterControl from '../pages/caja/CashRegisterControl';
import PaymentHistory from '../pages/caja/PaymentHistory';
import Unauthorized from '../pages/Unauthorized';

import ComingSoon from '../pages/ComingSoon';
import NotFound from '../pages/NotFound';

export default function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Público */}
                <Route path="/login" element={<Login />} />
                <Route path="/select-branch" element={<BranchSelector />} />
                <Route path="/unauthorized" element={<Unauthorized />} />

                {/* Admin / Superadmin */}
                <Route element={<ProtectedRoute allowedRoles={['superadmin', 'admin']} />}>
                    <Route element={<AdminLayout />}>
                        <Route path="/admin" element={<AdminDashboard />} />
                        <Route path="/admin/usuarios" element={<UsersPage />} />
                        <Route path="/admin/restaurantes" element={<RestaurantsPage />} />
                        <Route path="/admin/menu" element={<MenuPage />} />
                        <Route path="/admin/extras" element={<ExtrasAdminPage />} />
                        <Route path="/admin/mesas" element={<TablesAdmin />} />
                        <Route path="/admin/ordenes" element={<ComingSoon />} />
                        <Route path="/admin/reportes" element={<ComingSoon />} />
                    </Route>
                </Route>

                {/* Mesero */}
                <Route element={<ProtectedRoute allowedRoles={['mesero', 'admin', 'superadmin']} />}>
                    <Route element={<MeseroLayout />}>
                        <Route path="/mesero" element={<MeseroHome />} />
                        <Route path="/mesero/mesas" element={<TableMap />} />
                        <Route path="/mesero/orden" element={<NewOrderPage />} />
                    </Route>
                </Route>

                {/* Cocina */}
                <Route element={<ProtectedRoute allowedRoles={['cocina', 'admin', 'superadmin']} />}>
                    <Route element={<AdminLayout />}>  {/* Admin can see kitchen too */}
                        <Route path="/cocina" element={<CocinaPage />} />
                    </Route>
                    <Route element={<CocinaLayout />}>
                        <Route path="/cocina" element={<CocinaPage />} />
                    </Route>
                </Route>

                {/* Caja */}
                <Route element={<ProtectedRoute allowedRoles={['caja', 'admin', 'superadmin']} />}>
                    <Route element={<CajaLayout />}>
                        <Route path="/caja" element={<CajaPage />} />
                        <Route path="/caja/corte" element={<CashRegisterControl />} />
                        <Route path="/caja/historial" element={<PaymentHistory />} />
                    </Route>
                </Route>

                {/* Root Redirect */}
                <Route path="/" element={<Navigate to="/login" replace />} />

                {/* 404 Not Found */}
                <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
    );
}
