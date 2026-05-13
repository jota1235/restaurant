import { useRef } from 'react';

export default function CashRegisterTicket({ data, onClose }) {
    const ticketRef = useRef(null);

    if (!data || !data.shift) return null;

    const shift = data.shift;
    const restaurant = data.restaurant || {};
    const payments = data.payments || [];
    const movements = data.movements || [];

    const handlePrint = () => {
        const content = ticketRef.current;
        if (!content) return;

        const printWindow = window.open('', '_blank', 'width=340,height=700');
        printWindow.document.write(`
            <html>
            <head>
                <title>Corte de Caja #${shift.id}</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                        color: #000000 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        font-weight: 900 !important;
                    }
                    body {
                        font-family: 'Courier New', Courier, monospace;
                        font-size: 14px;
                        line-height: 1.2;
                        width: 80mm;
                        padding: 4mm 2mm;
                    }
                    .center { text-align: center; }
                    .right  { text-align: right; }
                    .sep { border-top: 2px dashed #000; margin: 4px 0; }
                    .bold { font-weight: 900; }
                    table { width: 100%; border-collapse: collapse; }
                    td { padding: 2px 0; vertical-align: top; }
                    .flex { display: flex; justify-content: space-between; }
                    @media print {
                        html, body { width: 80mm; }
                        @page { size: 80mm auto; margin: 0; }
                    }
                </style>
            </head>
            <body>
                <div style="width: 100%;">
                    ${content.innerHTML}
                </div>
                <script>
                    window.onload = function() {
                        setTimeout(function() { window.print(); window.close(); }, 300);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const s = {
        wrap: { fontFamily: "'Courier New', Courier, monospace", fontSize: '14px', color: '#000', fontWeight: '900', padding: '10px', backgroundColor: '#fff', width: '100%' },
        sep: { borderTop: '2px dashed #000', margin: '6px 0' },
        center: { textAlign: 'center' },
        bold: { fontWeight: '900' },
        flex: { display: 'flex', justifyContent: 'space-between' },
        title: { fontSize: '18px', fontWeight: '900', textAlign: 'center' }
    };

    const formatDate = (date) => date ? new Date(date).toLocaleString() : '---';

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
            <div className="relative flex flex-col items-center gap-4 max-h-[95vh] w-full max-w-[340px]">
                <div className="bg-white rounded-xl shadow-2xl overflow-y-auto w-full">
                    <div ref={ticketRef} style={s.wrap}>
                        <div style={s.title}>CORTE DE CAJA</div>
                        <div style={s.center}>{restaurant.name}</div>
                        {restaurant.address && <div style={{...s.center, fontSize: '11px'}}>{restaurant.address}</div>}
                        
                        <div style={s.sep} />
                        
                        <div style={s.flex}><span>Turno ID:</span> <span>#{shift.id}</span></div>
                        <div style={s.flex}><span>Cajero:</span> <span>{shift.user?.name}</span></div>
                        <div style={s.flex}><span>Apertura:</span> <span>{formatDate(shift.opened_at)}</span></div>
                        {shift.closed_at && <div style={s.flex}><span>Cierre:</span> <span>{formatDate(shift.closed_at)}</span></div>}
                        
                        <div style={s.sep} />
                        <div style={{...s.bold, textAlign: 'center'}}>RESUMEN DE EFECTIVO</div>
                        <div style={s.sep} />
                        
                        <div style={s.flex}><span>(+) Fondo Inicial:</span> <span>${parseFloat(shift.opening_balance).toFixed(2)}</span></div>
                        <div style={s.flex}><span>(+) Ventas Efectivo:</span> <span>${data.cash_sales.toFixed(2)}</span></div>
                        <div style={s.flex}><span>(+) Entradas:</span> <span>${data.in_movements.toFixed(2)}</span></div>
                        <div style={s.flex}><span>(-) Salidas:</span> <span>${data.out_movements.toFixed(2)}</span></div>
                        
                        <div style={s.sep} />
                        <div style={{...s.flex, fontSize: '16px'}}>
                            <span>ESPERADO CAJA:</span> 
                            <span>${data.expected_balance.toFixed(2)}</span>
                        </div>
                        {shift.status === 'closed' && (
                            <>
                                <div style={s.flex}><span>REAL EN CAJA:</span> <span>${parseFloat(shift.closing_balance).toFixed(2)}</span></div>
                                <div style={{...s.flex, color: shift.difference < 0 ? 'red' : 'black'}}>
                                    <span>DIFERENCIA:</span> 
                                    <span>${parseFloat(shift.difference).toFixed(2)}</span>
                                </div>
                            </>
                        )}

                        <div style={s.sep} />
                        <div style={{...s.bold, textAlign: 'center'}}>OTRAS VENTAS (No Efectivo)</div>
                        <div style={s.sep} />
                        <div style={s.flex}><span>Ventas Tarjeta:</span> <span>${data.card_sales.toFixed(2)}</span></div>
                        <div style={s.flex}><span>Transferencias:</span> <span>${data.transfer_sales.toFixed(2)}</span></div>
                        <div style={s.flex}><span>Otros:</span> <span>${data.other_sales.toFixed(2)}</span></div>
                        <div style={{...s.flex, borderTop: '1px solid #000', marginTop: '2px'}}>
                            <span>TOTAL VENTAS:</span> <span>${data.total_sales.toFixed(2)}</span>
                        </div>

                        <div style={s.sep} />
                        <div style={{...s.bold, textAlign: 'center'}}>VENTAS A DOMICILIO</div>
                        <div style={s.sep} />
                        <div style={s.flex}><span>Cant. Pedidos:</span> <span>{data.delivery_count}</span></div>
                        <div style={s.flex}><span>Total Domicilio:</span> <span>${data.delivery_sales.toFixed(2)}</span></div>

                        {movements.length > 0 && (
                            <>
                                <div style={s.sep} />
                                <div style={{...s.bold, textAlign: 'center'}}>MOVIMIENTOS DETALLADOS</div>
                                <div style={s.sep} />
                                <table style={{width: '100%', fontSize: '11px'}}>
                                    <tbody>
                                        {movements.map((m, i) => (
                                            <tr key={i}>
                                                <td>{m.type === 'in' ? '[E]' : '[S]'} {m.reason}</td>
                                                <td style={{textAlign: 'right'}}>{m.type === 'in' ? '+' : '-'}${parseFloat(m.amount).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </>
                        )}

                        {payments.length > 0 && (
                            <>
                                <div style={s.sep} />
                                <div style={{...s.bold, textAlign: 'center'}}>DETALLE DE VENTAS</div>
                                <div style={s.sep} />
                                <table style={{width: '100%', fontSize: '11px'}}>
                                    <tbody>
                                        {payments.map((p, i) => (
                                            <tr key={i}>
                                                <td>#{p.order?.order_number} ({p.payment_method})</td>
                                                <td style={{textAlign: 'right'}}>${parseFloat(p.amount).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </>
                        )}

                        <div style={s.sep} />
                        <div style={{textAlign: 'center', fontSize: '10px', marginTop: '10px'}}>
                            Generado el {new Date().toLocaleString()}
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 w-full">
                    <button onClick={onClose} className="flex-1 py-3 bg-gray-800 text-white rounded-xl font-bold text-xs uppercase">Cerrar</button>
                    <button onClick={handlePrint} className="flex-[2] py-3 bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase shadow-lg shadow-emerald-500/20">Imprimir Ticket</button>
                </div>
            </div>
        </div>
    );
}
