/**
 * gen-samples.ts — Generates sample invoice PDF & PNG files for INVOICE INQUEST.
 *
 * Run with:  npx tsx scripts/gen-samples.ts
 *
 * Produces 6 PDFs + 1 PNG in public/samples/.
 */

import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

// ── Constants ────────────────────────────────────────────────
const SAMPLES_DIR = path.resolve(__dirname, '..', 'public', 'samples');
const BILL_TO = {
  name: 'TechCorp Global Inc.',
  addr1: '100 Innovation Way, Floor 12',
  addr2: 'San Francisco, CA 94105, USA',
};

// ── Colour palettes per vendor ───────────────────────────────
interface Palette {
  primary: [number, number, number];
  accent: [number, number, number];
  bg: [number, number, number];
}

const PALETTES: Record<string, Palette> = {
  acme:      { primary: [0.10, 0.25, 0.52], accent: [0.80, 0.16, 0.16], bg: [0.97, 0.97, 1.0] },
  pinnacle:  { primary: [0.12, 0.38, 0.24], accent: [0.60, 0.48, 0.15], bg: [0.98, 0.98, 0.96] },
  eurolog:   { primary: [0.15, 0.15, 0.15], accent: [0.00, 0.40, 0.75], bg: [1.0, 1.0, 1.0] },
  cloudnine: { primary: [0.08, 0.35, 0.60], accent: [0.10, 0.60, 0.85], bg: [0.96, 0.98, 1.0] },
  quickprint:{ primary: [0.55, 0.10, 0.40], accent: [0.90, 0.35, 0.10], bg: [1.0, 0.98, 0.96] },
};

// ── Helper: format currency ──────────────────────────────────
function fmtCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$', EUR: '€', GBP: '£', JPY: '¥', SGD: 'S$',
  };
  const sym = symbols[currency] || currency + ' ';
  if (currency === 'JPY') return `${sym}${amount.toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
  return `${sym}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ── Helper: draw a line ──────────────────────────────────────
function drawHLine(page: PDFPage, x: number, y: number, w: number, colour: [number, number, number], thickness = 1) {
  page.drawLine({
    start: { x, y },
    end: { x: x + w, y },
    thickness,
    color: rgb(colour[0], colour[1], colour[2]),
  });
}

// ── Helper: right-aligned text ───────────────────────────────
function drawRight(page: PDFPage, text: string, x: number, y: number, font: PDFFont, size: number, colour: [number, number, number]) {
  const tw = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: x - tw, y, font, size, color: rgb(colour[0], colour[1], colour[2]) });
}

// ── Invoice line item type ───────────────────────────────────
interface InvLineItem {
  description: string;
  qty: number;
  unitPrice: number;
  amount: number;
}

interface InvoiceSpec {
  filename: string;
  palette: Palette;
  vendor: { name: string; addr1: string; addr2: string; taxId: string };
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  poReference: string | null;
  currency: string;
  lineItems: InvLineItem[];
  subtotal: number;
  taxLabel: string;
  taxAmount: number;
  total: number;
  bankLast4: string;
  paymentTerms: string;
  notes?: string;
}

// ── Core PDF builder ─────────────────────────────────────────
async function buildInvoicePdf(spec: InvoiceSpec): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]); // US Letter
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const { palette } = spec;
  const { width } = page.getSize();
  const margin = 50;
  const contentW = width - 2 * margin;
  let y = 742;

  // ── Background ─────────────────────────────────────────────
  page.drawRectangle({
    x: 0, y: 0, width: 612, height: 792,
    color: rgb(palette.bg[0], palette.bg[1], palette.bg[2]),
  });

  // ── Vendor header ──────────────────────────────────────────
  page.drawText(spec.vendor.name, { x: margin, y, font: helveticaBold, size: 16, color: rgb(palette.primary[0], palette.primary[1], palette.primary[2]) });
  y -= 16;
  page.drawText(spec.vendor.addr1, { x: margin, y, font: helvetica, size: 9, color: rgb(0.3, 0.3, 0.3) });
  y -= 12;
  page.drawText(spec.vendor.addr2, { x: margin, y, font: helvetica, size: 9, color: rgb(0.3, 0.3, 0.3) });
  y -= 12;
  page.drawText(`Tax ID: ${spec.vendor.taxId}`, { x: margin, y, font: helvetica, size: 9, color: rgb(0.3, 0.3, 0.3) });

  // ── INVOICE title (right side) ─────────────────────────────
  drawRight(page, 'INVOICE', width - margin, 742, helveticaBold, 22, palette.accent);

  // ── Invoice meta block (right side) ────────────────────────
  const metaX = width - margin;
  let metaY = 716;
  const metaSize = 9;
  const metaLabelColor: [number, number, number] = [0.4, 0.4, 0.4];
  const metaValueColor: [number, number, number] = [0.1, 0.1, 0.1];

  const drawMetaRow = (label: string, value: string) => {
    drawRight(page, value, metaX, metaY, helveticaBold, metaSize, metaValueColor);
    drawRight(page, label, metaX - helveticaBold.widthOfTextAtSize(value, metaSize) - 8, metaY, helvetica, metaSize, metaLabelColor);
    metaY -= 14;
  };

  drawMetaRow('Invoice #:', spec.invoiceNumber);
  drawMetaRow('Date:', fmtDate(spec.invoiceDate));
  drawMetaRow('Due Date:', fmtDate(spec.dueDate));
  if (spec.poReference) {
    drawMetaRow('PO Reference:', spec.poReference);
  }

  // ── Separator ──────────────────────────────────────────────
  y -= 20;
  drawHLine(page, margin, y, contentW, palette.primary, 2);
  y -= 25;

  // ── Bill To ────────────────────────────────────────────────
  page.drawText('BILL TO:', { x: margin, y, font: helveticaBold, size: 10, color: rgb(palette.primary[0], palette.primary[1], palette.primary[2]) });
  y -= 14;
  page.drawText(BILL_TO.name, { x: margin, y, font: helveticaBold, size: 10, color: rgb(0.1, 0.1, 0.1) });
  y -= 13;
  page.drawText(BILL_TO.addr1, { x: margin, y, font: helvetica, size: 9, color: rgb(0.3, 0.3, 0.3) });
  y -= 12;
  page.drawText(BILL_TO.addr2, { x: margin, y, font: helvetica, size: 9, color: rgb(0.3, 0.3, 0.3) });
  y -= 30;

  // ── Line items table ───────────────────────────────────────
  // Header bar
  page.drawRectangle({
    x: margin, y: y - 4, width: contentW, height: 18,
    color: rgb(palette.primary[0], palette.primary[1], palette.primary[2]),
  });

  const colDesc = margin + 5;
  const colQty = margin + 310;
  const colUnit = margin + 370;
  const colAmt = width - margin - 5;
  const headerY = y;
  const headerColor: [number, number, number] = [1, 1, 1];

  page.drawText('Description', { x: colDesc, y: headerY, font: helveticaBold, size: 9, color: rgb(headerColor[0], headerColor[1], headerColor[2]) });
  page.drawText('Qty', { x: colQty, y: headerY, font: helveticaBold, size: 9, color: rgb(headerColor[0], headerColor[1], headerColor[2]) });
  page.drawText('Unit Price', { x: colUnit, y: headerY, font: helveticaBold, size: 9, color: rgb(headerColor[0], headerColor[1], headerColor[2]) });
  drawRight(page, 'Amount', colAmt, headerY, helveticaBold, 9, headerColor);

  y -= 22;

  // Rows
  for (let i = 0; i < spec.lineItems.length; i++) {
    const item = spec.lineItems[i];
    // Alternate row background
    if (i % 2 === 0) {
      page.drawRectangle({
        x: margin, y: y - 5, width: contentW, height: 16,
        color: rgb(0.95, 0.95, 0.97),
      });
    }
    const rowColor: [number, number, number] = [0.15, 0.15, 0.15];
    page.drawText(item.description, { x: colDesc, y, font: helvetica, size: 9, color: rgb(rowColor[0], rowColor[1], rowColor[2]) });
    page.drawText(String(item.qty), { x: colQty, y, font: helvetica, size: 9, color: rgb(rowColor[0], rowColor[1], rowColor[2]) });
    page.drawText(fmtCurrency(item.unitPrice, spec.currency), { x: colUnit, y, font: helvetica, size: 9, color: rgb(rowColor[0], rowColor[1], rowColor[2]) });
    drawRight(page, fmtCurrency(item.amount, spec.currency), colAmt, y, helvetica, 9, rowColor);
    y -= 18;
  }

  // ── Totals section ─────────────────────────────────────────
  y -= 10;
  drawHLine(page, margin + 300, y, contentW - 300, [0.7, 0.7, 0.7]);
  y -= 18;

  const totalsLabelX = margin + 360;
  const totalsValueX = colAmt;
  const totColor: [number, number, number] = [0.2, 0.2, 0.2];

  page.drawText('Subtotal:', { x: totalsLabelX, y, font: helvetica, size: 10, color: rgb(totColor[0], totColor[1], totColor[2]) });
  drawRight(page, fmtCurrency(spec.subtotal, spec.currency), totalsValueX, y, helvetica, 10, totColor);
  y -= 16;

  page.drawText(spec.taxLabel, { x: totalsLabelX, y, font: helvetica, size: 10, color: rgb(totColor[0], totColor[1], totColor[2]) });
  drawRight(page, fmtCurrency(spec.taxAmount, spec.currency), totalsValueX, y, helvetica, 10, totColor);
  y -= 4;
  drawHLine(page, margin + 300, y, contentW - 300, [0.7, 0.7, 0.7]);
  y -= 18;

  // Total highlighted
  page.drawRectangle({
    x: margin + 300, y: y - 6, width: contentW - 300, height: 22,
    color: rgb(palette.primary[0], palette.primary[1], palette.primary[2]),
  });
  page.drawText('TOTAL DUE:', { x: totalsLabelX, y, font: helveticaBold, size: 11, color: rgb(1, 1, 1) });
  drawRight(page, fmtCurrency(spec.total, spec.currency), totalsValueX, y, helveticaBold, 11, [1, 1, 1]);
  y -= 30;

  // ── Currency note ──────────────────────────────────────────
  page.drawText(`All amounts in ${spec.currency}`, { x: margin, y, font: helvetica, size: 8, color: rgb(0.5, 0.5, 0.5) });
  y -= 25;

  // ── Payment info ───────────────────────────────────────────
  drawHLine(page, margin, y, contentW, [0.85, 0.85, 0.85]);
  y -= 18;

  page.drawText('PAYMENT INFORMATION', { x: margin, y, font: helveticaBold, size: 10, color: rgb(palette.primary[0], palette.primary[1], palette.primary[2]) });
  y -= 15;
  page.drawText(`Payment Terms: ${spec.paymentTerms}`, { x: margin, y, font: helvetica, size: 9, color: rgb(0.3, 0.3, 0.3) });
  y -= 13;
  page.drawText(`Bank Account: ****${spec.bankLast4}`, { x: margin, y, font: helvetica, size: 9, color: rgb(0.3, 0.3, 0.3) });

  // ── Notes ──────────────────────────────────────────────────
  if (spec.notes) {
    y -= 25;
    page.drawText('Notes:', { x: margin, y, font: helveticaBold, size: 9, color: rgb(0.3, 0.3, 0.3) });
    y -= 13;
    // Word wrap notes at ~90 chars per line
    const words = spec.notes.split(' ');
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (helvetica.widthOfTextAtSize(test, 9) > contentW - 10) {
        page.drawText(line, { x: margin, y, font: helvetica, size: 9, color: rgb(0.4, 0.4, 0.4) });
        y -= 12;
        line = word;
      } else {
        line = test;
      }
    }
    if (line) {
      page.drawText(line, { x: margin, y, font: helvetica, size: 9, color: rgb(0.4, 0.4, 0.4) });
    }
  }

  // ── Footer ─────────────────────────────────────────────────
  page.drawText('Thank you for your business.', {
    x: margin, y: 40, font: helvetica, size: 9,
    color: rgb(palette.accent[0], palette.accent[1], palette.accent[2]),
  });

  return doc.save();
}

// ── Invoice specifications ───────────────────────────────────

const INVOICES: InvoiceSpec[] = [
  // 01 — Happy path
  {
    filename: '01_happy_path_clean.pdf',
    palette: PALETTES.acme,
    vendor: {
      name: 'Acme Industrial Supplies Ltd',
      addr1: '742 Commerce Blvd, Suite 200',
      addr2: 'Houston, TX 77001, USA',
      taxId: 'US-EIN-84-1234567',
    },
    invoiceNumber: 'INV-2026-0451',
    invoiceDate: '2026-10-28',
    dueDate: '2026-11-27',
    poReference: 'PO-2026-001',
    currency: 'USD',
    lineItems: [
      { description: 'Industrial Safety Gloves (Box of 100)', qty: 50, unitPrice: 24.99, amount: 1249.50 },
    ],
    subtotal: 1249.50,
    taxLabel: 'Sales Tax (8%):',
    taxAmount: 99.96,
    total: 1349.46,
    bankLast4: '4521',
    paymentTerms: 'Net 30',
  },

  // 02 — Split PO Instalment 2
  {
    filename: '02_split_po_instalment_2.pdf',
    palette: PALETTES.pinnacle,
    vendor: {
      name: 'Pinnacle Office Furnishings Inc.',
      addr1: '1500 Design District Drive',
      addr2: 'Dallas, TX 75207, USA',
      taxId: 'US-EIN-92-7654321',
    },
    invoiceNumber: 'INV-POF-0088',
    invoiceDate: '2026-09-15',
    dueDate: '2026-10-15',
    poReference: 'PO-2026-004',
    currency: 'USD',
    lineItems: [
      { description: 'Executive Standing Desk (Electric)', qty: 10, unitPrice: 899.00, amount: 8990.00 },
    ],
    subtotal: 8990.00,
    taxLabel: 'Tax (7%):',
    taxAmount: 629.30,
    total: 9619.30,
    bankLast4: '8812',
    paymentTerms: 'Net 30',
    notes: 'Instalment 2 of 3 for PO-2026-004.',
  },

  // 02b — Split PO Instalment 3 (overbill)
  {
    filename: '02b_split_po_instalment_3_overbill.pdf',
    palette: PALETTES.pinnacle,
    vendor: {
      name: 'Pinnacle Office Furnishings Inc.',
      addr1: '1500 Design District Drive',
      addr2: 'Dallas, TX 75207, USA',
      taxId: 'US-EIN-92-7654321',
    },
    invoiceNumber: 'INV-POF-0089',
    invoiceDate: '2026-11-01',
    dueDate: '2026-12-01',
    poReference: 'PO-2026-004',
    currency: 'USD',
    lineItems: [
      { description: 'Ergonomic Mesh Office Chair', qty: 10, unitPrice: 549.00, amount: 5490.00 },
      { description: 'Monitor Arm (Dual)', qty: 10, unitPrice: 189.00, amount: 1890.00 },
      { description: 'Executive Standing Desk (Electric)', qty: 5, unitPrice: 899.00, amount: 4495.00 },
      { description: 'Installation & Setup', qty: 1, unitPrice: 1625.00, amount: 1625.00 },
    ],
    subtotal: 13500.00,
    taxLabel: 'Tax (7%):',
    taxAmount: 945.00,
    total: 14445.00,
    bankLast4: '8812',
    paymentTerms: 'Net 30',
    notes: 'Final instalment (3 of 3) for PO-2026-004. Includes installation and setup charges.',
  },

  // 03 — Near duplicate
  {
    filename: '03_near_duplicate.pdf',
    palette: PALETTES.acme,
    vendor: {
      name: 'Acme Industrial Supplies Ltd',
      addr1: '742 Commerce Blvd, Suite 200',
      addr2: 'Houston, TX 77001, USA',
      taxId: 'US-EIN-84-1234567',
    },
    invoiceNumber: 'INV 2041 ',
    invoiceDate: '2026-10-18',
    dueDate: '2026-11-17',
    poReference: 'PO-2026-001',
    currency: 'USD',
    lineItems: [
      { description: 'Industrial Safety Gloves (Box of 100)', qty: 50, unitPrice: 24.99, amount: 1249.50 },
    ],
    subtotal: 1249.50,
    taxLabel: 'Sales Tax (8%):',
    taxAmount: 99.96,
    total: 1349.46,
    bankLast4: '4521',
    paymentTerms: 'Net 30',
  },

  // 04 — Missing fields (EuroLogistik, German style)
  {
    filename: '04_missing_fields.pdf',
    palette: PALETTES.eurolog,
    vendor: {
      name: 'EuroLogistik GmbH',
      addr1: 'Industriestraße 45',
      addr2: '60329 Frankfurt, Germany',
      taxId: 'DE-VAT-DE123456789',
    },
    invoiceNumber: '',  // missing!
    invoiceDate: '2026-10-25',
    dueDate: '',  // missing!
    poReference: null,
    currency: 'EUR',
    lineItems: [
      { description: 'Logistics services - October', qty: 1, unitPrice: 4500.00, amount: 4500.00 },
    ],
    subtotal: 4500.00,
    taxLabel: '',  // missing!
    taxAmount: 0,
    total: 0,  // missing!
    bankLast4: '3344',
    paymentTerms: '60 Tage netto',
    notes: 'Rechnung für Logistikdienstleistungen Oktober 2026. Zahlungsbedingungen: 60 Tage netto.',
  },

  // 05 — Scanned / implied PO (CloudNine) — will also generate PNG
  {
    filename: '05_scanned_implied_po_source.pdf',
    palette: PALETTES.cloudnine,
    vendor: {
      name: 'CloudNine Hosting Services',
      addr1: '2200 Cloud Ave, Suite 800',
      addr2: 'San Jose, CA 95110, USA',
      taxId: 'US-EIN-55-9876543',
    },
    invoiceNumber: 'INV-C9-2026-112',
    invoiceDate: '2026-10-30',
    dueDate: '2026-11-14',
    poReference: null,
    currency: 'USD',
    lineItems: [
      { description: 'Cloud Hosting - Annual Enterprise Plan', qty: 1, unitPrice: 18000.00, amount: 18000.00 },
      { description: 'DDoS Protection Add-on', qty: 1, unitPrice: 3600.00, amount: 3600.00 },
    ],
    subtotal: 21600.00,
    taxLabel: 'Tax (Exempt):',
    taxAmount: 0,
    total: 21600.00,
    bankLast4: '9934',
    paymentTerms: 'Net 15',
    notes: 'As per our quote of March 2026. Annual hosting and security services.',
  },

  // 06 — Unapproved vendor
  {
    filename: '06_unapproved_vendor.pdf',
    palette: PALETTES.quickprint,
    vendor: {
      name: 'QuickPrint Promotional Materials',
      addr1: '88 Print Lane',
      addr2: 'Orlando, FL 32801, USA',
      taxId: 'US-EIN-33-1112233',
    },
    invoiceNumber: 'INV-QP-8831',
    invoiceDate: '2026-10-22',
    dueDate: '2026-11-21',
    poReference: 'PO-2026-007',
    currency: 'USD',
    lineItems: [
      { description: 'Custom Branded Notebooks (500 units)', qty: 1, unitPrice: 2250.00, amount: 2250.00 },
    ],
    subtotal: 2250.00,
    taxLabel: 'Sales Tax (6%):',
    taxAmount: 135.00,
    total: 2385.00,
    bankLast4: '5599',
    paymentTerms: 'Net 30',
    notes: 'Custom branded notebooks with company logo, 80gsm recycled paper.',
  },
];

// ── Custom builder for invoice 04 (missing fields, German style) ──
async function buildMissingFieldsPdf(spec: InvoiceSpec): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const { palette } = spec;
  const { width } = page.getSize();
  const margin = 50;
  const contentW = width - 2 * margin;
  let y = 790;

  // Background
  page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(1, 1, 1) });

  // Vendor header
  page.drawText(spec.vendor.name, { x: margin, y, font: helveticaBold, size: 14, color: rgb(palette.primary[0], palette.primary[1], palette.primary[2]) });
  y -= 15;
  page.drawText(spec.vendor.addr1, { x: margin, y, font: helvetica, size: 9, color: rgb(0.3, 0.3, 0.3) });
  y -= 12;
  page.drawText(spec.vendor.addr2, { x: margin, y, font: helvetica, size: 9, color: rgb(0.3, 0.3, 0.3) });
  y -= 12;
  page.drawText(`USt-IdNr: DE123456789`, { x: margin, y, font: helvetica, size: 9, color: rgb(0.3, 0.3, 0.3) });

  // Title — "Rechnung" (no invoice number)
  drawRight(page, 'RECHNUNG', width - margin, 790, helveticaBold, 20, palette.accent);
  drawRight(page, `Datum: 25.10.2026`, width - margin, 768, helvetica, 9, [0.3, 0.3, 0.3]);

  y -= 30;
  drawHLine(page, margin, y, contentW, palette.primary, 1.5);
  y -= 20;

  // Bill To
  page.drawText('Rechnungsempfänger:', { x: margin, y, font: helveticaBold, size: 9, color: rgb(0.3, 0.3, 0.3) });
  y -= 14;
  page.drawText(BILL_TO.name, { x: margin, y, font: helveticaBold, size: 10, color: rgb(0.1, 0.1, 0.1) });
  y -= 13;
  page.drawText(BILL_TO.addr1, { x: margin, y, font: helvetica, size: 9, color: rgb(0.3, 0.3, 0.3) });
  y -= 12;
  page.drawText(BILL_TO.addr2, { x: margin, y, font: helvetica, size: 9, color: rgb(0.3, 0.3, 0.3) });
  y -= 30;

  // Line items table
  page.drawRectangle({ x: margin, y: y - 4, width: contentW, height: 18, color: rgb(0.15, 0.15, 0.15) });
  const colDesc = margin + 5;
  const colAmt = width - margin - 5;
  page.drawText('Beschreibung', { x: colDesc, y, font: helveticaBold, size: 9, color: rgb(1, 1, 1) });
  drawRight(page, 'Betrag', colAmt, y, helveticaBold, 9, [1, 1, 1]);
  y -= 22;

  for (const item of spec.lineItems) {
    page.drawText(item.description, { x: colDesc, y, font: helvetica, size: 9, color: rgb(0.15, 0.15, 0.15) });
    drawRight(page, `\u20AC${item.amount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}`, colAmt, y, helvetica, 9, [0.15, 0.15, 0.15]);
    y -= 18;
  }

  y -= 10;
  drawHLine(page, margin + 280, y, contentW - 280, [0.7, 0.7, 0.7]);
  y -= 18;

  // Only subtotal shown — no tax, no total (deliberately missing)
  page.drawText('Zwischensumme:', { x: margin + 320, y, font: helvetica, size: 10, color: rgb(0.2, 0.2, 0.2) });
  drawRight(page, `\u20AC4.500,00`, colAmt, y, helvetica, 10, [0.2, 0.2, 0.2]);

  // Payment info
  y -= 40;
  drawHLine(page, margin, y, contentW, [0.85, 0.85, 0.85]);
  y -= 18;
  page.drawText('Zahlungsinformationen', { x: margin, y, font: helveticaBold, size: 10, color: rgb(0.15, 0.15, 0.15) });
  y -= 14;
  page.drawText('Zahlungsbedingungen: 60 Tage netto', { x: margin, y, font: helvetica, size: 9, color: rgb(0.3, 0.3, 0.3) });
  y -= 13;
  page.drawText('Konto: ****3344', { x: margin, y, font: helvetica, size: 9, color: rgb(0.3, 0.3, 0.3) });

  // Notes
  y -= 25;
  page.drawText(spec.notes || '', { x: margin, y, font: helvetica, size: 9, color: rgb(0.4, 0.4, 0.4) });

  return doc.save();
}

// ── Scanned PNG builder ──────────────────────────────────────
async function buildScannedPng(spec: InvoiceSpec): Promise<Buffer> {
  const W = 1700;
  const H = 2200;

  // Build SVG with all text content laid out like an invoice
  const escXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const p = spec.palette;
  const primaryHex = `rgb(${Math.round(p.primary[0] * 255)},${Math.round(p.primary[1] * 255)},${Math.round(p.primary[2] * 255)})`;
  const accentHex = `rgb(${Math.round(p.accent[0] * 255)},${Math.round(p.accent[1] * 255)},${Math.round(p.accent[2] * 255)})`;

  let svgLines = '';
  let sy = 120;
  const addText = (x: number, text: string, opts: { size?: number; bold?: boolean; color?: string; anchor?: string } = {}) => {
    const size = opts.size || 28;
    const weight = opts.bold ? 'bold' : 'normal';
    const color = opts.color || '#333';
    const anchor = opts.anchor || 'start';
    svgLines += `<text x="${x}" y="${sy}" font-family="Helvetica, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}">${escXml(text)}</text>\n`;
  };
  const nextLine = (gap = 40) => { sy += gap; };

  // Vendor header
  addText(130, spec.vendor.name, { size: 42, bold: true, color: primaryHex });
  nextLine(35);
  addText(130, spec.vendor.addr1, { size: 24, color: '#666' });
  nextLine(30);
  addText(130, spec.vendor.addr2, { size: 24, color: '#666' });
  nextLine(30);
  addText(130, `EIN: 55-9876543`, { size: 24, color: '#666' });

  // Title
  addText(1570, 'INVOICE', { size: 56, bold: true, color: accentHex, anchor: 'end' });
  sy = 180;
  addText(1570, `Invoice: ${spec.invoiceNumber}`, { size: 24, color: '#333', anchor: 'end' });
  nextLine(30);
  addText(1570, `Date: Oct 30, 2026`, { size: 24, color: '#333', anchor: 'end' });
  nextLine(30);
  addText(1570, `Due: Nov 14, 2026`, { size: 24, color: '#333', anchor: 'end' });

  // Separator
  sy = 340;
  svgLines += `<line x1="130" y1="${sy}" x2="1570" y2="${sy}" stroke="${primaryHex}" stroke-width="3"/>\n`;
  nextLine(50);

  // Bill To
  addText(130, 'BILL TO:', { size: 26, bold: true, color: primaryHex });
  nextLine(35);
  addText(130, BILL_TO.name, { size: 28, bold: true, color: '#222' });
  nextLine(30);
  addText(130, BILL_TO.addr1, { size: 24, color: '#555' });
  nextLine(28);
  addText(130, BILL_TO.addr2, { size: 24, color: '#555' });
  nextLine(60);

  // Table header
  svgLines += `<rect x="130" y="${sy - 30}" width="1440" height="42" fill="${primaryHex}"/>\n`;
  addText(145, 'Description', { size: 24, bold: true, color: '#fff' });
  addText(950, 'Qty', { size: 24, bold: true, color: '#fff' });
  addText(1100, 'Unit Price', { size: 24, bold: true, color: '#fff' });
  addText(1555, 'Amount', { size: 24, bold: true, color: '#fff', anchor: 'end' });
  nextLine(50);

  // Rows
  for (const item of spec.lineItems) {
    addText(145, item.description, { size: 24, color: '#222' });
    addText(965, String(item.qty), { size: 24, color: '#222' });
    addText(1100, fmtCurrency(item.unitPrice, spec.currency), { size: 24, color: '#222' });
    addText(1555, fmtCurrency(item.amount, spec.currency), { size: 24, color: '#222', anchor: 'end' });
    nextLine(40);
  }

  // Totals
  nextLine(20);
  svgLines += `<line x1="900" y1="${sy}" x2="1570" y2="${sy}" stroke="#bbb" stroke-width="1"/>\n`;
  nextLine(35);
  addText(1050, 'Subtotal:', { size: 26, color: '#333' });
  addText(1555, fmtCurrency(spec.subtotal, spec.currency), { size: 26, color: '#333', anchor: 'end' });
  nextLine(35);
  addText(1050, 'Tax: $0.00 (Exempt)', { size: 26, color: '#333' });
  nextLine(10);
  svgLines += `<line x1="900" y1="${sy}" x2="1570" y2="${sy}" stroke="#bbb" stroke-width="1"/>\n`;
  nextLine(35);

  svgLines += `<rect x="900" y="${sy - 30}" width="670" height="44" fill="${primaryHex}"/>\n`;
  addText(1050, 'Total:', { size: 28, bold: true, color: '#fff' });
  addText(1555, fmtCurrency(spec.total, spec.currency), { size: 28, bold: true, color: '#fff', anchor: 'end' });
  nextLine(70);

  addText(130, `All amounts in ${spec.currency}`, { size: 20, color: '#999' });
  nextLine(50);

  // Payment
  svgLines += `<line x1="130" y1="${sy}" x2="1570" y2="${sy}" stroke="#ddd" stroke-width="1"/>\n`;
  nextLine(35);
  addText(130, 'PAYMENT INFORMATION', { size: 26, bold: true, color: primaryHex });
  nextLine(35);
  addText(130, `Payment Terms: ${spec.paymentTerms}`, { size: 24, color: '#555' });
  nextLine(30);
  addText(130, `Wire to account ending ${spec.bankLast4}`, { size: 24, color: '#555' });
  nextLine(50);

  // Notes
  addText(130, 'Notes:', { size: 24, bold: true, color: '#555' });
  nextLine(30);
  addText(130, spec.notes || '', { size: 22, color: '#666' });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  ${svgLines}
</svg>`;

  // Render SVG to PNG, then apply scan effects
  const cleanPng = await sharp(Buffer.from(svg))
    .png()
    .toBuffer();

  // Apply scan effects: slight blur, yellowish tint, noise via modulate
  const scannedPng = await sharp(cleanPng)
    .blur(1.2)
    .modulate({ brightness: 0.96, saturation: 0.85 })
    .tint({ r: 252, g: 248, b: 230 })
    .jpeg({ quality: 72 })  // lossy compression to simulate scan artefacts
    .toBuffer();

  // Convert back to PNG
  const finalPng = await sharp(scannedPng)
    .png()
    .toBuffer();

  return finalPng;
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  console.log('🏭 INVOICE INQUEST — Sample Generator');
  console.log('=====================================\n');

  // Ensure output directory
  fs.mkdirSync(SAMPLES_DIR, { recursive: true });
  console.log(`📁 Output directory: ${SAMPLES_DIR}\n`);

  for (const spec of INVOICES) {
    try {
      if (spec.filename === '04_missing_fields.pdf') {
        // Special German-style layout with missing fields
        const pdfBytes = await buildMissingFieldsPdf(spec);
        const outPath = path.join(SAMPLES_DIR, spec.filename);
        fs.writeFileSync(outPath, pdfBytes);
        console.log(`✅ ${spec.filename} (${(pdfBytes.length / 1024).toFixed(1)} KB)`);
      } else if (spec.filename === '05_scanned_implied_po_source.pdf') {
        // Build both the source PDF and the scanned PNG
        const pdfBytes = await buildInvoicePdf(spec);
        // We don't save the source PDF — only the PNG is needed
        console.log(`   Built source for scanned invoice (${(pdfBytes.length / 1024).toFixed(1)} KB)`);

        const pngBuffer = await buildScannedPng(spec);
        const pngPath = path.join(SAMPLES_DIR, '05_scanned_implied_po.png');
        fs.writeFileSync(pngPath, pngBuffer);
        console.log(`✅ 05_scanned_implied_po.png (${(pngBuffer.length / 1024).toFixed(1)} KB)`);
      } else {
        // Standard PDF
        const pdfBytes = await buildInvoicePdf(spec);
        const outPath = path.join(SAMPLES_DIR, spec.filename);
        fs.writeFileSync(outPath, pdfBytes);
        console.log(`✅ ${spec.filename} (${(pdfBytes.length / 1024).toFixed(1)} KB)`);
      }
    } catch (err) {
      console.error(`❌ Failed to generate ${spec.filename}:`, err);
    }
  }

  console.log('\n🎉 Sample generation complete!');
  console.log(`   Generated files in: ${SAMPLES_DIR}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
