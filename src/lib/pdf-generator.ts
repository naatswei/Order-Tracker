export interface InvoiceData {
    invoiceNumber: string;
    createdAt: string;
    dueDate: string;
    invoiceStatus: "unpaid" | "paid";
    items: { name: string; quantity: number; price: number }[];
    subtotal: number;
    tax?: number;
    deliveryFee?: number;
    discount?: number;
    amountDue: number;
    paymentMethod?: "online" | "cash";
}

export function printInvoice(invoice: InvoiceData, customerName: string, customerPhone: string, customerEmail?: string, businessName: string = "Business") {
    if (typeof window === "undefined") return;
    
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const itemsHtml = (invoice.items || []).map((item: any) => `
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #f1f5f9;">${item.name}</td>
            <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: center;">${item.quantity}</td>
            <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: right;">GH₵ ${item.price.toFixed(2)}</td>
            <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: right;">GH₵ ${(item.price * item.quantity).toFixed(2)}</td>
        </tr>
    `).join("");

    printWindow.document.write(`
        <html>
            <head>
                <title>Invoice - ${invoice.invoiceNumber}</title>
                <style>
                    body { font-family: system-ui, -apple-system, sans-serif; color: #1e293b; padding: 40px; }
                    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 30px; }
                    .logo { font-size: 24px; font-weight: 800; color: #CE0003; }
                    .invoice-title { font-size: 28px; font-weight: 900; color: #191A43; text-align: right; }
                    .details { display: flex; justify-content: space-between; margin-bottom: 40px; }
                    .details h4 { margin: 0 0 8px 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
                    .details p { margin: 0; font-size: 14px; font-weight: 500; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                    th { background: #f8fafc; padding: 12px; text-align: left; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; }
                    .totals { width: 300px; margin-left: auto; font-size: 14px; }
                    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; }
                    .totals-row.final { border-top: 2px solid #191A43; padding-top: 12px; font-size: 18px; font-weight: 800; color: #191A43; }
                    .footer { text-align: center; margin-top: 60px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <div class="logo">${businessName}</div>
                    </div>
                    <div>
                        <div class="invoice-title">INVOICE</div>
                        <p style="margin: 5px 0 0 0; font-size: 14px; font-weight: 600; text-align: right;">${invoice.invoiceNumber}</p>
                    </div>
                </div>
                <div class="details">
                    <div>
                        <h4>Billed To:</h4>
                        <p style="font-size: 16px; font-weight: 700;">${customerName}</p>
                        <p>${customerPhone}</p>
                        <p>${customerEmail || ""}</p>
                    </div>
                    <div style="text-align: right;">
                        <h4>Invoice Details:</h4>
                        <p>Date Issued: ${new Date(invoice.createdAt).toLocaleDateString()}</p>
                        <p>Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}</p>
                        <p>Payment Method: <strong style="text-transform: uppercase;">${invoice.paymentMethod || "online"}</strong></p>
                        <p>Status: <strong style="color: ${invoice.invoiceStatus === 'paid' ? '#16a34a' : '#dc2626'}">${invoice.invoiceStatus.toUpperCase()}</strong></p>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th style="text-align: center;">Qty</th>
                            <th style="text-align: right;">Unit Price</th>
                            <th style="text-align: right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
                <div class="totals">
                    <div class="totals-row">
                        <span>Subtotal</span>
                        <span>GH₵ ${invoice.subtotal.toFixed(2)}</span>
                    </div>
                    ${invoice.tax ? `<div class="totals-row"><span>Tax</span><span>GH₵ ${invoice.tax.toFixed(2)}</span></div>` : ""}
                    ${invoice.deliveryFee ? `<div class="totals-row"><span>Delivery Fee</span><span>GH₵ ${invoice.deliveryFee.toFixed(2)}</span></div>` : ""}
                    ${invoice.discount ? `<div class="totals-row"><span>Discount</span><span>GH₵ -${invoice.discount.toFixed(2)}</span></div>` : ""}
                    <div class="totals-row final">
                        <span>Amount Due</span>
                        <span>GH₵ ${invoice.amountDue.toFixed(2)}</span>
                    </div>
                </div>
                <div class="footer">
                    Thank you for your business! — ${businessName}
                </div>
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
        </html>
    `);
    printWindow.document.close();
}
