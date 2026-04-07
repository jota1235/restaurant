import { useState, useEffect } from 'react';
import useAuthStore from '../../store/authStore';
import { statsAPI } from '../../api/stats';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#f97316', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b'];

export default function ReportsPage() {
    const { user } = useAuthStore();
    const [data, setData] = useState({
        sales_over_time: [],
        waiter_performance: [],
        sales_by_type: [],
        sales_by_branch: [],
        top_products: []
    });
    const [loading, setLoading] = useState(true);

    // Date range preset options
    const presets = [
        { label: 'Hoy', value: 'today' },
        { label: 'Esta Semana', value: 'week' },
        { label: 'Este Mes', value: 'month' },
    ];
    const [preset, setPreset] = useState('month');

    // Custom Dates
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    useEffect(() => {
        // Calculate dates on preset change
        const now = new Date();
        if (preset === 'today') {
            const todayStr = now.toISOString().split('T')[0];
            setDateFrom(todayStr);
            setDateTo(todayStr + ' 23:59:59');
        } else if (preset === 'week') {
            const first = now.getDate() - now.getDay(); 
            const firstDay = new Date(now.setDate(first));
            setDateFrom(firstDay.toISOString().split('T')[0]);
            setDateTo(new Date().toISOString().split('T')[0] + ' 23:59:59');
        } else if (preset === 'month') {
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            setDateFrom(firstDay.toISOString().split('T')[0]);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            setDateTo(lastDay.toISOString().split('T')[0] + ' 23:59:59');
        }
    }, [preset]);

    useEffect(() => {
        if (dateFrom && dateTo) {
            fetchReports();
        }
    }, [dateFrom, dateTo]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const res = await statsAPI.reports({ date_from: dateFrom, date_to: dateTo });
            setData(res.data);
        } catch (err) {
            console.error('Error cargando reportes:', err);
        } finally {
            setLoading(false);
        }
    };

    const isSuperAdmin = user?.roles?.includes('superadmin');
    const totalSales = data.sales_over_time.reduce((sum, item) => sum + item.total, 0);
    const totalOrders = data.sales_by_type.reduce((sum, item) => sum + item.orders_count, 0);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-gray-900 border border-gray-700 p-3 rounded-lg shadow-xl">
                    <p className="text-gray-300 text-xs mb-1 font-bold">{label}</p>
                    <p className="text-orange-400 font-black text-sm">
                        ${payload[0].value.toLocaleString()}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6 md:space-y-8 pb-10">
            {/* Header & Filter */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                        <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Reportes Inteligentes
                    </h1>
                    <p className="text-gray-500 text-sm mt-0.5">Analíticas de desempeño y control financiero</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 bg-gray-900/40 p-1.5 rounded-xl border border-gray-800/50">
                    {presets.map(p => (
                        <button
                            key={p.value}
                            onClick={() => setPreset(p.value)}
                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                                preset === p.value 
                                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' 
                                : 'text-gray-400 hover:text-white hover:bg-gray-800'
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                    <div className="w-px h-6 bg-gray-700 mx-1 hidden sm:block"></div>
                    <div className="flex items-center gap-2 px-2">
                        <input 
                            type="date" 
                            className="bg-transparent text-gray-300 text-xs outline-none"
                            value={dateFrom.split(' ')[0] || ''}
                            onChange={(e) => { setPreset('custom'); setDateFrom(e.target.value); }}
                        />
                        <span className="text-gray-500">-</span>
                        <input 
                            type="date" 
                            className="bg-transparent text-gray-300 text-xs outline-none"
                            value={dateTo.split(' ')[0] || ''}
                            onChange={(e) => { setPreset('custom'); setDateTo(e.target.value + ' 23:59:59'); }}
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20">
                    <svg className="w-8 h-8 animate-spin text-orange-500 mb-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <p className="text-gray-500 text-sm font-bold animate-pulse">Generando Reportes...</p>
                </div>
            ) : (
                <>
                    {/* General KPI Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800/80 rounded-2xl p-5 relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 w-20 h-20 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-all"></div>
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Total Ingresos</p>
                            <p className="text-2xl lg:text-3xl font-black text-white">${totalSales.toLocaleString()}</p>
                        </div>
                        <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800/80 rounded-2xl p-5 relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Órdenes Atendidas</p>
                            <p className="text-2xl lg:text-3xl font-black text-white">{totalOrders}</p>
                        </div>
                        <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800/80 rounded-2xl p-5 relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Ticket Promedio</p>
                            <p className="text-2xl lg:text-3xl font-black text-white">
                                ${totalOrders > 0 ? (totalSales / totalOrders).toFixed(2) : '0.00'}
                            </p>
                        </div>
                        <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800/80 rounded-2xl p-5 relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all"></div>
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Top Producto</p>
                            <p className="text-lg lg:text-xl font-black text-white truncate">
                                {data.top_products?.[0]?.name || 'N/A'}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Ventas en el tiempo */}
                        <div className="lg:col-span-2 bg-gray-900/40 border border-gray-800/50 rounded-2xl p-5">
                            <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                Ventas en el Tiempo
                            </h3>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={data.sales_over_time} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                        <XAxis dataKey="date" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                                        <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: '#4B5563', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                        <Line type="monotone" dataKey="total" stroke="#f97316" strokeWidth={3} dot={{ r: 4, fill: '#f97316', strokeWidth: 2, stroke: '#111827' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Tipos de Pedido */}
                        <div className="bg-gray-900/40 border border-gray-800/50 rounded-2xl p-5 flex flex-col">
                            <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                Tipos de Pedido
                            </h3>
                            <div className="flex-1 min-h-[250px] relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={data.sales_by_type.map(s => ({
                                                name: s.type === 'dine_in' ? 'Mesa' : s.type === 'takeaway' ? 'Llevar' : 'Domicilio',
                                                value: s.orders_count
                                            }))}
                                            cx="50%" cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {data.sales_by_type.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip 
                                            contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }}
                                            itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                        />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#9CA3AF' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8 text-center">
                                    <span className="text-3xl font-black text-white">{totalOrders}</span>
                                    <span className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Órdenes</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Rendimiento de Meseros */}
                        <div className="bg-gray-900/40 border border-gray-800/50 rounded-2xl p-5">
                            <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                Top Meseros (Monto Vendido)
                            </h3>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data.waiter_performance} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={true} vertical={false} />
                                        <XAxis type="number" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                                        <YAxis type="category" dataKey="waiter_name" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} width={100} />
                                        <RechartsTooltip cursor={{ fill: '#1F2937' }} contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }} />
                                        <Bar dataKey="sold_amount" name="Ventas ($)" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20}>
                                            {data.waiter_performance.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Top Products Table */}
                        <div className="bg-gray-900/40 border border-gray-800/50 rounded-2xl p-5 flex flex-col">
                            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                Productos de Mayor Éxito
                            </h3>
                            <div className="flex-1 overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-gray-800/50 text-[10px] text-gray-500 uppercase tracking-widest">
                                            <th className="pb-2 font-bold">Producto</th>
                                            <th className="pb-2 font-bold text-right">Cantidad</th>
                                            <th className="pb-2 font-bold text-right">Recaudado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.top_products?.map((prod, i) => (
                                            <tr key={i} className="border-b border-gray-800/30 last:border-0 hover:bg-gray-800/20 transition-colors">
                                                <td className="py-2.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black text-gray-600 w-4">{i + 1}.</span>
                                                        <span className="text-xs font-bold text-gray-200">{prod.name}</span>
                                                    </div>
                                                </td>
                                                <td className="py-2.5 text-right text-xs text-gray-400 font-bold">{prod.qty}</td>
                                                <td className="py-2.5 text-right text-xs text-emerald-400 font-black">${prod.total?.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {(!data.top_products || data.top_products.length === 0) && (
                                    <p className="text-center text-gray-500 text-xs mt-6">Sin ventas de productos</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {isSuperAdmin && data.sales_by_branch?.length > 1 && (
                        <div className="bg-gray-900/40 border border-gray-800/50 rounded-2xl p-5">
                            <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                Comparativa por Sucursal
                            </h3>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data.sales_by_branch} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                        <XAxis dataKey="branch_name" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                                        <RechartsTooltip cursor={{ fill: '#1F2937' }} contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }} />
                                        <Bar dataKey="sold_amount" name="Ventas ($)" radius={[4, 4, 0, 0]} barSize={40}>
                                            {data.sales_by_branch.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
