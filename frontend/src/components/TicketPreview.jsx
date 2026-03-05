import { useRef } from 'react';

/**
 * TicketPreview — Thermal-style receipt component (58mm/80mm format).
 * Renders a receipt for preview/print. Pass ticket_data from the backend.
 */
export default function TicketPreview({ ticketData, onClose, onPrint }) {
    const ticketRef = useRef(null);

    if (!ticketData) return null;

    const handlePrint = () => {
        const content = ticketRef.current;
        if (!content) return;

        const printWindow = window.open('', '_blank', 'width=320,height=600');
        printWindow.document.write(`
            <html>
            <head>
                <title>Ticket ${ticketData.folio || ''}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: 'Courier New', monospace;
                        font-size: 12px;
                        width: 80mm;
                        padding: 4mm;
                        color: #000;
                    }
                    .center { text-align: center; }
                    .right { text-align: right; }
                    .bold { font-weight: bold; }
                    .separator { border-top: 1px dashed #000; margin: 6px 0; }
                    .double { font-size: 16px; }
                    table { width: 100%; border-collapse: collapse; }
                    td { padding: 2px 0; vertical-align: top; }
                    .qty { width: 24px; }
                    .price { text-align: right; width: 60px; }
                    @media print { body { width: 80mm; } }
                </style>
            </head>
            <body>
                ${content.innerHTML}
                <script>window.onload = function() { window.print(); window.close(); }<\/script>
            </body>
            </html>
        `);
        printWindow.document.close();

        if (onPrint) onPrint();
    };

    const r = ticketData.restaurant || {};
    const METHOD_LABELS = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', other: 'Otro' };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

            <div className="relative flex flex-col items-center gap-4 max-h-[90vh]">
                {/* Ticket Paper */}
                <div className="bg-white rounded-2xl shadow-2xl overflow-y-auto max-h-[70vh] w-[320px]">
                    <div ref={ticketRef} style={{ fontFamily: "'Courier New', monospace", fontSize: '12px', color: '#000', padding: '16px' }}>
                        {/* Header */}
                        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '1px' }}>
                                {r.name || 'Restaurante'}
                            </div>
                            {r.address && <div style={{ fontSize: '10px', marginTop: '2px' }}>{r.address}</div>}
                            {r.city && <div style={{ fontSize: '10px' }}>{r.city}</div>}
                            {r.phone && <div style={{ fontSize: '10px' }}>Tel: {r.phone}</div>}
                        </div>

                        <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

                        {/* Folio & Date */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                            <span><strong>Folio:</strong> {ticketData.folio}</span>
                            <span>{ticketData.date}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                            <span><strong>Cajero:</strong> {ticketData.cashier}</span>
                            <span>{ticketData.time}</span>
                        </div>
                        <div style={{ fontSize: '10px' }}>
                            <strong>Orden:</strong> #{ticketData.order_number} · Mesa: {ticketData.table}
                        </div>

                        <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

                        {/* Items */}
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ fontSize: '10px', fontWeight: 'bold', borderBottom: '1px solid #ccc' }}>
                                    <td style={{ width: '24px' }}>Qty</td>
                                    <td>Producto</td>
                                    <td style={{ textAlign: 'right', width: '60px' }}>Precio</td>
                                </tr>
                            </thead>
                            <tbody>
                                {ticketData.items?.map((item, i) => (
                                    <tr key={i} style={{ fontSize: '11px' }}>
                                        <td style={{ verticalAlign: 'top' }}>{item.quantity}</td>
                                        <td style={{ verticalAlign: 'top' }}>
                                            {item.name}
                                            {item.variant && <div style={{ fontSize: '9px', color: '#666' }}>  {item.variant}</div>}
                                            {item.extras?.length > 0 && (
                                                <div style={{ fontSize: '9px', color: '#666' }}>
                                                    {item.extras.map(e => `+${e}`).join(', ')}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'right', verticalAlign: 'top' }}>${item.subtotal.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

                        {/* Totals */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                            <span>Subtotal:</span>
                            <span>${ticketData.subtotal?.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                            <span>IVA:</span>
                            <span>${ticketData.tax?.toFixed(2)}</span>
                        </div>
                        {ticketData.tip > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                                <span>Propina:</span>
                                <span>${ticketData.tip?.toFixed(2)}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', marginTop: '4px' }}>
                            <span>TOTAL:</span>
                            <span>${ticketData.grand_total?.toFixed(2)}</span>
                        </div>

                        <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

                        {/* Payment Info */}
                        <div style={{ fontSize: '10px' }}>
                            <div><strong>Método:</strong> {METHOD_LABELS[ticketData.payment_method] || ticketData.payment_method}</div>
                            {ticketData.payment_method === 'cash' && ticketData.amount_received > 0 && (
                                <>
                                    <div>Recibido: ${ticketData.amount_received?.toFixed(2)}</div>
                                    <div>Cambio: ${ticketData.change_amount?.toFixed(2)}</div>
                                </>
                            )}
                            {ticketData.reference && <div>Ref: {ticketData.reference}</div>}
                        </div>

                        <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

                        {/* Footer */}
                        <div style={{ textAlign: 'center', fontSize: '10px', color: '#666' }}>
                            <div>¡Gracias por su preferencia!</div>
                            <div style={{ marginTop: '4px', fontSize: '9px' }}>Powered by TaquerPOS</div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 w-[320px]">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 bg-gray-800 hover:bg-gray-700 text-white font-black rounded-2xl text-xs uppercase tracking-widest transition-all"
                    >
                        Cerrar
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex-[2] py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Imprimir
                    </button>
                </div>
            </div>
        </div>
    );
}
