import * as QRCode from 'qrcode'

export interface ReceiptItem {
  name: string
  quantity: number
  price: number
  total: number
}

export interface ReceiptData {
  invoiceNumber: string
  date: string
  time: string
  storeName: string
  address1: string
  address2: string
  phone: string
  items: ReceiptItem[]
  subtotal: number
  discount: number
  taxRate: number
  taxAmount: number
  grandTotal: number
  paymentMethod: string
  amountPaid: number
  change: number
  logoBase64?: string  // base64 data URL for logo
}

/**
 * Generates a self-contained HTML receipt.
 * Call this from POS checkout after fetching logo as base64 + generating QR.
 */
export async function generateReceiptHTML(data: ReceiptData): Promise<string> {
  // Generate QR code as base64 PNG
  let qrDataUrl = ''
  try {
    qrDataUrl = await QRCode.toDataURL(data.invoiceNumber, {
      width: 200, margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    })
  } catch { /* skip QR if fails */ }

  const itemRows = data.items.map(item => {
    return `
      <tr class="item-row">
        <td class="item-name">${esc(item.name)}</td>
        <td class="item-qty">${item.quantity}</td>
        <td class="item-price">Rs.${item.price.toFixed(2)}</td>
        <td class="item-total">Rs.${item.total.toFixed(2)}</td>
      </tr>`
  }).join('')

  const logoHtml = data.logoBase64
    ? `<img src="${data.logoBase64}" class="logo" alt="Store Logo" />`
    : `<div class="logo-placeholder">🏪</div>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Receipt — ${esc(data.invoiceNumber)}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    
    body {
      background: #e5e5e5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Courier New', monospace;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16px;
      min-height: 100vh;
    }

    /* ── Action bar (hidden on print) ─────────────── */
    .actions {
      display: flex;
      gap: 10px;
      margin-bottom: 16px;
    }
    .btn {
      padding: 8px 20px;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn-print { background: #16a34a; color: #fff; }
    .btn-close  { background: #64748b; color: #fff; }

    /* ── Receipt paper ────────────────────────────── */
    .receipt {
      background: #fff;
      width: 320px;
      padding: 10px 14px 8px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.18);
      position: relative;
    }

    /* Zigzag top & bottom */
    .receipt::before, .receipt::after {
      content: '';
      display: block;
      position: absolute;
      left: 0; right: 0;
      height: 10px;
      background-image:
        radial-gradient(circle at 10px -5px, transparent 9px, #e5e5e5 10px),
        radial-gradient(circle at 0px   -5px, transparent 9px, #e5e5e5 10px);
      background-size: 20px 10px;
    }
    .receipt::before { top: -10px; }
    .receipt::after  { bottom: -10px; transform: rotate(180deg); }

    /* ── Header ───────────────────────────────────── */
    .header { text-align: center; padding-bottom: 4px; }
    .logo   { width: 100%; height: auto; max-height: 110px; object-fit: contain; margin: 0 auto; display: block; border-radius: 4px; mix-blend-mode: multiply; }
    .logo-placeholder { font-size: 48px; text-align: center; margin-bottom: 2px; }
    .store-sub   { font-size: 10px; color: #444; line-height: 1.4; margin-top: 2px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }

    /* ── Dividers ─────────────────────────────────── */
    .div-double {
      border: none;
      border-top: 2px dashed #000;
      margin: 6px 0;
    }
    .div-single {
      border: none;
      border-top: 1px dashed #ccc;
      margin: 5px 0;
    }

    /* ── Invoice info ─────────────────────────────── */
    .receipt-title {
      text-align: center;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin: 2px 0 6px;
    }
    .meta { font-size: 9.5px; }
    .meta .row { display: flex; justify-content: space-between; padding: 1px 0; }
    .meta .row .label { color: #555; }
    .meta .row .val   { font-weight: 700; font-family: 'Courier New', monospace; }

    /* ── Items table ──────────────────────────────── */
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    thead th {
      font-size: 8.5px;
      text-transform: uppercase;
      font-weight: 800;
      letter-spacing: 0.5px;
      padding: 3px 0;
      color: #333;
      border-bottom: 1.5px solid #000;
    }
    thead th:first-child { text-align: left; }
    thead th:not(:first-child) { text-align: right; }

    .item-row td { padding: 3px 0; vertical-align: top; border-bottom: 1px dotted #eee; }
    td.item-name  { width: 44%; word-break: break-word; padding-right: 4px; font-weight: 600; line-height: 1.2; }
    td.item-qty   { text-align: right; width: 10%; font-family: 'Courier New', monospace; }
    td.item-price { text-align: right; width: 23%; padding: 0 4px; font-family: 'Courier New', monospace; }
    td.item-total { text-align: right; width: 23%; font-weight: 700; font-family: 'Courier New', monospace; }

    /* ── Totals ───────────────────────────────────── */
    .totals { font-size: 10px; margin-top: 2px; }
    .totals .row { display: flex; justify-content: space-between; padding: 2px 0; }
    .totals .row .label { color: #666; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
    .totals .row .val   { font-family: 'Courier New', monospace; font-weight: 700; }
    .totals .discount .val { color: #000; border-bottom: 1px dashed #000; }
    .totals .grand {
      font-size: 13px;
      font-weight: 900;
      padding: 6px 8px;
      background: #000;
      color: #fff;
      border-radius: 4px;
      margin-top: 6px;
      align-items: center;
    }
    .totals .grand .label { color: #fff; font-size: 10px; letter-spacing: 1px; }

    /* ── Payment ──────────────────────────────────── */
    .payment { font-size: 10px; margin-top: 4px; }
    .payment .row { display: flex; justify-content: space-between; padding: 1.5px 0; }
    .payment .row span:first-child { color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
    .payment .row span:last-child { font-family: 'Courier New', monospace; font-weight: 700; }
    .payment .change-row { font-size: 12px; font-weight: 900; color: #000; margin-top: 2px; }

    /* ── QR code ──────────────────────────────────── */
    .qr-wrap { text-align: center; margin: 8px 0 2px; }
    .qr-wrap img { width: 100px; height: 100px; }
    .qr-label { text-align: center; font-size: 8.5px; color: #999; letter-spacing: 0.5px; word-break: break-all; margin-top: 2px; font-family: 'Courier New', monospace; }

    /* ── Footer ───────────────────────────────────── */
    .footer { text-align: center; font-size: 9px; color: #666; line-height: 1.5; margin-top: 8px; }
    .footer strong { font-size: 10px; color: #000; text-transform: uppercase; letter-spacing: 1px; }
    .powered { text-align: center; font-size: 7.5px; color: #ccc; margin-top: 6px; text-transform: uppercase; letter-spacing: 1px;}

    /* ── Print styles ─────────────────────────────── */
    @media print {
      body { background: #fff; padding: 0; }
      .actions { display: none !important; }
      .receipt { box-shadow: none; width: 100%; padding: 4px 8px; }
      .receipt::before, .receipt::after { display: none; }
    }
  </style>
</head>
<body>

  <div class="actions">
    <button class="btn btn-print" onclick="window.print()">🖨️ Print</button>
    <button class="btn btn-close" onclick="window.close()">✕ Close</button>
  </div>

  <div class="receipt">

    <!-- ══ HEADER ══ -->
    <div class="header">
      ${logoHtml}
      <div class="store-sub">
        ${data.address1 ? esc(data.address1) + '<br>' : ''}
        ${data.address2 ? esc(data.address2) + '<br>' : ''}
        ${data.phone ? 'Phone: ' + esc(data.phone) : ''}
      </div>
    </div>

    <hr class="div-double">

    <!-- ══ INVOICE INFO ══ -->
    <div class="receipt-title">Sales Receipt</div>
    <div class="meta">
      <div class="row"><span class="label">Date:</span><span class="val">${esc(data.date)}</span></div>
      <div class="row"><span class="label">Time:</span><span class="val">${esc(data.time)}</span></div>
      <div class="row"><span class="label">Invoice:</span><span class="val">#${esc(data.invoiceNumber)}</span></div>
    </div>

    <hr class="div-double">

    <!-- ══ ITEMS ══ -->
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Qty</th>
          <th>Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <hr class="div-single">

    <!-- ══ TOTALS ══ -->
    <div class="totals">
      <div class="row"><span class="label">Subtotal:</span><span class="val">Rs. ${data.subtotal.toFixed(2)}</span></div>
      ${data.discount > 0 ? `<div class="row discount"><span class="label">Discount:</span><span class="val">- Rs. ${data.discount.toFixed(2)}</span></div>` : ''}
      ${data.taxAmount > 0 ? `<div class="row"><span class="label">Tax (${data.taxRate}%):</span><span class="val">Rs. ${data.taxAmount.toFixed(2)}</span></div>` : ''}
      <div class="row grand"><span>GRAND TOTAL:</span><span>Rs. ${data.grandTotal.toFixed(2)}</span></div>
    </div>

    <hr class="div-single">

    <!-- ══ PAYMENT ══ -->
    <div class="payment">
      <div class="row"><span>Payment Method:</span><span><b>${esc(data.paymentMethod)}</b></span></div>
      ${data.paymentMethod === 'Cash' ? `
      <div class="row"><span>Paid:</span><span>Rs. ${data.amountPaid.toFixed(2)}</span></div>
      <div class="row change-row"><span>Change:</span><span>Rs. ${data.change.toFixed(2)}</span></div>` : ''}
    </div>

    <!-- ══ QR CODE ══ -->
    ${qrDataUrl ? `
    <hr class="div-single">
    <div class="qr-wrap">
      <img src="${qrDataUrl}" alt="QR Code" />
    </div>
    <div class="qr-label">${esc(data.invoiceNumber)}</div>` : ''}

    <hr class="div-double">

    <!-- ══ FOOTER ══ -->
    <div class="footer">
      <strong>Thank you for shopping!</strong><br>
      Visit Again Soon! 😊<br>
      ════════════════════
    </div>
    <div class="powered">Powered by Al-Barkat Mart POS</div>

  </div>

</body>
</html>`
}

function esc(s: string): string {
  if (!s) return ''
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
