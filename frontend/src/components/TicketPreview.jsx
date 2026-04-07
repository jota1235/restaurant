import { useRef } from 'react';

/**
 * TicketPreview — Thermal-style receipt component (80mm format).
 * Renders a receipt for preview/print. Pass ticket_data from the backend.
 */
export default function TicketPreview({ ticketData, onClose, onPrint }) {
    const ticketRef = useRef(null);

    if (!ticketData) return null;

    const handlePrint = () => {
        const content = ticketRef.current;
        if (!content) return;

        const printWindow = window.open('', '_blank', 'width=340,height=700');
        printWindow.document.write(`
            <html>
            <head>
                <title>Ticket ${ticketData.folio || ''}</title>
                <style>
                    /* ── Reset ── */
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                        color: #000000 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        /* Bold by default = more ink dots = darker on thermal */
                        font-weight: 700 !important;
                    }

                    body {
                        font-family: 'Courier New', Courier, monospace;
                        font-size: 14px;
                        line-height: 1.45;
                        width: 80mm;
                        max-width: 80mm;
                        padding: 4mm 3mm;
                        background: #ffffff;
                    }

                    /* ── Layout helpers ── */
                    .center { text-align: center; }
                    .right  { text-align: right; }

                    /* ── Separator ── */
                    .sep {
                        border: none;
                        border-top: 2px dashed #000000;
                        margin: 5px 0;
                    }

                    /* ── Items table ── */
                    table { width: 100%; border-collapse: collapse; }
                    td {
                        padding: 2px 0;
                        vertical-align: top;
                        font-size: 13px;
                    }
                    /* Space between qty and product name */
                    .col-qty {
                        width: 28px;
                        padding-right: 4px;
                    }
                    .col-price {
                        text-align: right;
                        width: 68px;
                    }
                    th {
                        font-size: 12px;
                        padding-bottom: 4px;
                        border-bottom: 2px solid #000000;
                        text-align: left;
                    }
                    th.col-price { text-align: right; }

                    /* ── Print media ── */
                    @media print {
                        html, body { width: 80mm; }
                        @page {
                            size: 80mm auto;
                            margin: 0;
                        }
                        * {
                            color: #000000 !important;
                            font-weight: 700 !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                    }
                </style>
            </head>
            <body>
                ${content.innerHTML}
                <script>
                    window.onload = function() {
                        setTimeout(function() { window.print(); window.close(); }, 300);
                    };
                <\/script>
            </body>
            </html>
        `);
        printWindow.document.close();

        if (onPrint) onPrint();
    };

    const r = ticketData.restaurant || {};
    const METHOD_LABELS = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', other: 'Otro' };

    // Inline styles — all 700 weight, pure black, no grays
    const s = {
        wrap:   { fontFamily: "'Courier New', Courier, monospace", fontSize: '14px', color: '#000', fontWeight: '700', padding: '16px', lineHeight: 1.45 },
        sep:    { borderTop: '2px dashed #000', margin: '6px 0' },
        center: { textAlign: 'center' },
        bold:   { fontWeight: '900' },
        small:  { fontSize: '12px', fontWeight: '700' },
        flex:   { display: 'flex', justifyContent: 'space-between' },
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

            <div className="relative flex flex-col items-center gap-4 max-h-[90vh]">
                {/* Ticket Paper Preview */}
                <div className="bg-white rounded-2xl shadow-2xl overflow-y-auto max-h-[70vh] w-[300px]">
                    <div ref={ticketRef} style={s.wrap}>

                        {/* Header */}
                        <div style={s.center}>
                            {r.logo && (
                                <img
                                    src={r.logo}
                                    alt="Logo"
                                    style={{
                                        display: 'block',
                                        margin: '0 auto 6px auto',
                                        maxWidth: '60mm',
                                        maxHeight: '25mm',
                                        objectFit: 'contain',
                                        // Boost contrast for thermal printing
                                        filter: 'contrast(1.3) brightness(0.9)',
                                    }}
                                />
                            )}
                            <div style={{ fontSize: '20px', fontWeight: '900', letterSpacing: '1px' }}>
                                {ticketData.is_pre_cuenta ? '*** PRE-CUENTA ***' : (r.name || 'Restaurante')}
                            </div>
                            {ticketData.is_pre_cuenta && <div style={{ fontSize: '14px', fontWeight: '900' }}>{r.name || 'Restaurante'}</div>}
                            {r.address && <div style={{ ...s.small }}>{r.address}</div>}
                            {r.city    && <div style={{ ...s.small }}>{r.city}</div>}
                            {r.phone   && <div style={{ ...s.small }}>Tel: {r.phone}</div>}
                        </div>

                        <div style={s.sep} />

                        {/* Folio & Date */}
                        <div style={{ ...s.flex, ...s.small }}>
                            <span><strong>Folio:</strong> {ticketData.folio}</span>
                            <span>{ticketData.date}</span>
                        </div>
                        <div style={{ ...s.flex, ...s.small }}>
                            <span><strong>Cajero:</strong> {ticketData.cashier}</span>
                            <span>{ticketData.time}</span>
                        </div>
                        <div style={s.small}>
                            <strong>Orden:</strong> #{ticketData.order_number} ·{' '}
                            {ticketData.order_type === 'takeaway' || ticketData.order_type === 'delivery'
                                ? (ticketData.order_type === 'delivery' ? 'A Domicilio' : 'Para Llevar')
                                : `Mesa: ${ticketData.table ?? 'N/A'}`}
                        </div>

                        {(ticketData.customer_name || ticketData.delivery_address) && (
                            <>
                                <div style={s.sep} />
                                <div style={s.small}>
                                    <div style={s.bold}>Datos del Cliente:</div>
                                    {ticketData.customer_name   && <div>Nombre: {ticketData.customer_name}</div>}
                                    {ticketData.delivery_address && <div>Dir: {ticketData.delivery_address}</div>}
                                </div>
                            </>
                        )}

                        <div style={s.sep} />

                        {/* Items */}
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ fontSize: '12px', fontWeight: '900', borderBottom: '2px solid #000' }}>
                                    <td style={{ width: '28px', paddingRight: '4px', fontWeight: '900' }}>Qty</td>
                                    <td style={{ fontWeight: '900' }}>Producto</td>
                                    <td style={{ textAlign: 'right', width: '68px', fontWeight: '900' }}>Precio</td>
                                </tr>
                            </thead>
                            <tbody>
                                {ticketData.items?.map((item, i) => (
                                    <tr key={i} style={{ fontSize: '13px', fontWeight: '700' }}>
                                        <td style={{ verticalAlign: 'top', fontWeight: '900', paddingRight: '4px', width: '28px' }}>{item.quantity}</td>
                                        <td style={{ verticalAlign: 'top' }}>
                                            {item.name}
                                            {item.variant && (
                                                <div style={{ fontSize: '12px', fontWeight: '700' }}>  {item.variant}</div>
                                            )}
                                            {item.extras?.length > 0 && (
                                                <div style={{ fontSize: '12px', fontWeight: '700' }}>
                                                    {item.extras.map(e => `+${e}`).join(', ')}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'right', verticalAlign: 'top', fontWeight: '900' }}>
                                            ${item.subtotal.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div style={s.sep} />

                        {/* Totals */}
                        <div style={{ ...s.flex, fontSize: '13px', fontWeight: '700' }}>
                            <span>Subtotal:</span><span>${ticketData.subtotal?.toFixed(2)}</span>
                        </div>
                        {ticketData.tax > 0 && (
                        <div style={{ ...s.flex, fontSize: '13px', fontWeight: '700' }}>
                            <span>IVA:</span><span>${ticketData.tax?.toFixed(2)}</span>
                        </div>
                        )}
                        {ticketData.tip > 0 && (
                            <div style={{ ...s.flex, fontSize: '13px', fontWeight: '700' }}>
                                <span>Propina:</span><span>${ticketData.tip?.toFixed(2)}</span>
                            </div>
                        )}
                        <div style={{ ...s.flex, fontSize: '17px', fontWeight: '900', marginTop: '4px' }}>
                            <span>TOTAL:</span><span>${ticketData.grand_total?.toFixed(2)}</span>
                        </div>

                        <div style={s.sep} />

                        {/* Payment */}
                        {!ticketData.is_pre_cuenta && (
                            <div style={{ fontSize: '13px', fontWeight: '700' }}>
                                <div><strong>Método:</strong> {METHOD_LABELS[ticketData.payment_method] || ticketData.payment_method}</div>
                                {ticketData.payment_method === 'cash' && ticketData.amount_received > 0 && (
                                    <>
                                        <div>Recibido: ${ticketData.amount_received?.toFixed(2)}</div>
                                        <div>Cambio: ${ticketData.change_amount?.toFixed(2)}</div>
                                    </>
                                )}
                                {ticketData.reference && <div>Ref: {ticketData.reference}</div>}
                            </div>
                        )}

                        <div style={{ borderTop: '2px dashed #000', margin: '8px 0' }} />

                        {/* Footer */}
                        <div style={{ textAlign: 'center', fontSize: '12px', fontWeight: '700' }}>
                            {ticketData.is_pre_cuenta ? (
                                <div style={{ marginTop: '4px', fontSize: '11px' }}>
                                    <div>---</div>
                                    <div>ESTE DOCUMENTO NO ES UN</div>
                                    <div>COMPROBANTE DE PAGO</div>
                                    <div>---</div>
                                </div>
                            ) : (
                                <div>¡Gracias por su preferencia!</div>
                            )}
                            <div style={{ marginTop: '4px' }}>Creado por Ing. Jafet Cruz Delfin</div>
                        </div>

                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 w-[300px]">
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
