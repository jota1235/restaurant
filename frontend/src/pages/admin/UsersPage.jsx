import { useState, useEffect, useCallback } from 'react';
import { usersAPI } from '../../api/users';
import useAuthStore from '../../store/authStore';
import UserFormModal from '../../components/UserFormModal';

const ROLE_COLORS = {
    superadmin: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    admin: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    mesero: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    cocina: 'bg-green-500/20 text-green-300 border-green-500/30',
    caja: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
};

export default function UsersPage() {
    const { user: me } = useAuthStore();
    const [users, setUsers] = useState([]);
    const [meta, setMeta] = useState({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modal, setModal] = useState({ open: false, user: null });
    const [deleting, setDeleting] = useState(null);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const data = await usersAPI.list({ search: search || undefined });
            setUsers(data.data);
            setMeta(data.meta);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        const t = setTimeout(fetchUsers, 300);
        return () => clearTimeout(t);
    }, [fetchUsers]);

    const handleToggle = async (u) => {
        try {
            await usersAPI.toggleActive(u.id);
            fetchUsers();
        } catch (e) { console.error(e); }
    };

    const handleDelete = async (u) => {
        if (!window.confirm(`¿Eliminar a ${u.name}?`)) return;
        setDeleting(u.id);
        try {
            await usersAPI.delete(u.id);
            fetchUsers();
        } catch (e) { console.error(e); }
        finally { setDeleting(null); }
    };

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-white">Usuarios</h1>
                    <p className="text-gray-400 text-sm mt-0.5">
                        {meta.total ?? '…'} usuario{meta.total !== 1 ? 's' : ''} en tu restaurante
                    </p>
                </div>
                <button
                    onClick={() => setModal({ open: true, user: null })}
                    className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow shadow-orange-500/20"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nuevo usuario
                </button>
            </div>

            {/* Search */}
            <div className="mb-4">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nombre o correo…"
                    className="w-full max-w-xs bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-4 py-2 text-sm
                     focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-colors"
                />
            </div>

            {/* Table */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <svg className="w-6 h-6 animate-spin text-orange-400" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                    </div>
                ) : users.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                        <div className="text-4xl mb-3">👤</div>
                        <p>No hay usuarios registrados</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-700/60">
                                <th className="text-left text-xs text-gray-400 font-medium px-5 py-3">Usuario</th>
                                <th className="text-left text-xs text-gray-400 font-medium px-5 py-3">Rol</th>
                                <th className="text-left text-xs text-gray-400 font-medium px-5 py-3">Estado</th>
                                <th className="text-right text-xs text-gray-400 font-medium px-5 py-3">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/40">
                            {users.map((u) => (
                                <tr key={u.id} className="hover:bg-gray-700/20 transition-colors">
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-orange-500/15 text-orange-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                                {u.name?.[0]?.toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-white font-medium">{u.name}</p>
                                                <p className="text-gray-400 text-xs">{u.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        {u.roles?.map((role) => (
                                            <span
                                                key={role}
                                                className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border capitalize ${ROLE_COLORS[role] ?? 'bg-gray-700 text-gray-300 border-gray-600'}`}
                                            >
                                                {role}
                                            </span>
                                        ))}
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <button
                                            onClick={() => handleToggle(u)}
                                            disabled={u.id === me?.id}
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${u.is_active
                                                    ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                                                    : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
                                                } disabled:opacity-40 disabled:cursor-not-allowed`}
                                        >
                                            <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                                            {u.is_active ? 'Activo' : 'Inactivo'}
                                        </button>
                                    </td>
                                    <td className="px-5 py-3.5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => setModal({ open: true, user: u })}
                                                className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-gray-700"
                                                title="Editar"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            {u.id !== me?.id && (
                                                <button
                                                    onClick={() => handleDelete(u)}
                                                    disabled={deleting === u.id}
                                                    className="text-gray-400 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10 disabled:opacity-40"
                                                    title="Eliminar"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            {modal.open && (
                <UserFormModal
                    user={modal.user}
                    onClose={() => setModal({ open: false, user: null })}
                    onSaved={() => { setModal({ open: false, user: null }); fetchUsers(); }}
                />
            )}
        </div>
    );
}
