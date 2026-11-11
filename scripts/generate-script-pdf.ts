import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

async function generateScriptPdf() {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Page dimensions
  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;

  // Colors
  const navyDark = rgb(10 / 255, 14 / 255, 26 / 255);
  const navyCard = rgb(15 / 255, 22 / 255, 41 / 255);
  const emerald = rgb(16 / 255, 185 / 255, 129 / 255);
  const sky = rgb(56 / 255, 189 / 255, 248 / 255);
  const amber = rgb(245 / 255, 158 / 255, 11 / 255);
  const rose = rgb(244 / 255, 63 / 255, 94 / 255);
  const textDark = rgb(30 / 255, 41 / 255, 59 / 255);
  const textMuted = rgb(100 / 255, 116 / 255, 139 / 255);
  const borderLight = rgb(226 / 255, 232 / 255, 240 / 255);
  const bgLight = rgb(248 / 255, 250 / 255, 252 / 255);
  const white = rgb(1, 1, 1);

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  function addNewPage() {
    currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;
    drawRunningHeader();
  }

  function drawRunningHeader() {
    currentPage.drawText('INVOICE INQUEST — Presentation Video Script & On-Screen Guide', {
      x: margin,
      y: pageHeight - 30,
      size: 8,
      font: fontRegular,
      color: textMuted,
    });
    currentPage.drawLine({
      start: { x: margin, y: pageHeight - 35 },
      end: { x: pageWidth - margin, y: pageHeight - 35 },
      thickness: 0.5,
      color: borderLight,
    });
  }

  function checkSpace(neededHeight: number) {
    if (y - neededHeight < margin + 30) {
      addNewPage();
    }
  }

  // Helper: Wrap text into lines
  function wrapText(text: string, maxWidth: number, fontSize: number, font: typeof fontRegular): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);
      if (width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  // Draw Title Banner on first page
  currentPage.drawRectangle({
    x: margin,
    y: y - 85,
    width: contentWidth,
    height: 85,
    color: navyDark,
  });

  currentPage.drawText('INVOICE INQUEST', {
    x: margin + 18,
    y: y - 28,
    size: 20,
    font: fontBold,
    color: white,
  });

  currentPage.drawText('AI Solutions Analyst Take-Home Case Study — Video Presentation Script', {
    x: margin + 18,
    y: y - 46,
    size: 10,
    font: fontBold,
    color: emerald,
  });

  currentPage.drawText('Target Duration: 4:30 – 5:30 Min  •  Core Thesis: AI Extracts Data; Deterministic Code Decides', {
    x: margin + 18,
    y: y - 66,
    size: 8.5,
    font: fontRegular,
    color: sky,
  });

  y -= 105;

  // Function to print Section Header
  function drawSectionHeader(title: string, subtitle?: string) {
    checkSpace(45);
    currentPage.drawRectangle({
      x: margin,
      y: y - 22,
      width: contentWidth,
      height: 22,
      color: bgLight,
      borderColor: borderLight,
      borderWidth: 0.5,
    });

    currentPage.drawText(title, {
      x: margin + 10,
      y: y - 15,
      size: 11,
      font: fontBold,
      color: navyDark,
    });

    if (subtitle) {
      currentPage.drawText(subtitle, {
        x: pageWidth - margin - fontRegular.widthOfTextAtSize(subtitle, 8.5) - 10,
        y: y - 14,
        size: 8.5,
        font: fontItalic,
        color: textMuted,
      });
    }

    y -= 32;
  }

  // Function to print Paragraph
  function drawParagraph(text: string, options: { fontSize?: number; font?: typeof fontRegular; color?: typeof textDark; indent?: number; lineSpacing?: number } = {}) {
    const fontSize = options.fontSize || 9.5;
    const font = options.font || fontRegular;
    const color = options.color || textDark;
    const indent = options.indent || 0;
    const lineSpacing = options.lineSpacing || 13;

    const lines = wrapText(text, contentWidth - indent, fontSize, font);
    checkSpace(lines.length * lineSpacing + 4);

    for (const line of lines) {
      currentPage.drawText(line, {
        x: margin + indent,
        y,
        size: fontSize,
        font,
        color,
      });
      y -= lineSpacing;
    }
    y -= 4;
  }

  // Function to print On-Screen Choreography Box
  function drawActionBox(steps: string[]) {
    const bulletSpacing = 14;
    let totalHeight = 24;
    const allLines: { step: string; wrapped: string[] }[] = [];

    for (const step of steps) {
      const wrapped = wrapText(step, contentWidth - 30, 9, fontRegular);
      allLines.push({ step, wrapped });
      totalHeight += wrapped.length * 12 + 4;
    }

    checkSpace(totalHeight + 10);

    // Box background
    currentPage.drawRectangle({
      x: margin,
      y: y - totalHeight,
      width: contentWidth,
      height: totalHeight,
      color: rgb(240 / 255, 249 / 255, 255 / 255), // light sky tint
      borderColor: rgb(186 / 255, 230 / 255, 253 / 255),
      borderWidth: 0.8,
    });

    let currentY = y - 16;
    currentPage.drawText('ON-SCREEN ACTIONS (What to tap and show):', {
      x: margin + 12,
      y: currentY,
      size: 8.5,
      font: fontBold,
      color: rgb(3 / 255, 105 / 255, 161 / 255), // sky dark
    });
    currentY -= 14;

    for (const item of allLines) {
      for (let i = 0; i < item.wrapped.length; i++) {
        const line = item.wrapped[i];
        if (i === 0) {
          currentPage.drawText('•', {
            x: margin + 14,
            y: currentY,
            size: 9,
            font: fontBold,
            color: rgb(2 / 255, 132 / 255, 199 / 255),
          });
        }
        currentPage.drawText(line, {
          x: margin + 26,
          y: currentY,
          size: 9,
          font: fontRegular,
          color: textDark,
        });
        currentY -= 12;
      }
      currentY -= 3;
    }

    y -= totalHeight + 10;
  }

  // Function to print Spoken Script Box
  function drawScriptBox(scriptText: string) {
    const fontSize = 9.5;
    const lines = wrapText(scriptText, contentWidth - 32, fontSize, fontItalic);
    const boxHeight = lines.length * 13 + 30;

    checkSpace(boxHeight + 10);

    currentPage.drawRectangle({
      x: margin,
      y: y - boxHeight,
      width: contentWidth,
      height: boxHeight,
      color: rgb(240 / 255, 253 / 255, 244 / 255), // light emerald tint
      borderColor: rgb(187 / 255, 247 / 255, 208 / 255),
      borderWidth: 0.8,
    });

    let currentY = y - 16;
    currentPage.drawText('SPOKEN VOICEOVER SCRIPT (Say this clearly):', {
      x: margin + 12,
      y: currentY,
      size: 8.5,
      font: fontBold,
      color: rgb(21 / 255, 128 / 255, 61 / 255), // emerald dark
    });
    currentY -= 15;

    for (const line of lines) {
      currentPage.drawText(line, {
        x: margin + 16,
        y: currentY,
        size: fontSize,
        font: fontItalic,
        color: navyDark,
      });
      currentY -= 13;
    }

    y -= boxHeight + 14;
  }

  // ================= CONTENT RENDERING =================

  // --- PRE-RECORDING CHECKLIST ---
  drawSectionHeader('PRE-RECORDING CHECKLIST & SETUP', 'Ready in 2 Minutes');
  drawParagraph('1. Open your live deployment URL (or localhost:3000) in Chrome in Full-Screen mode (F11).', { font: fontRegular });
  drawParagraph('2. Audio: Use a clean headset or microphone with no background noise. Speak at an executive cadence.', { font: fontRegular });
  drawParagraph('3. Mouse Movement: Move your cursor deliberately; avoid erratic or rapid clicking.', { font: fontRegular });
  y -= 6;

  // --- TIMESTAMPS OVERVIEW TABLE ---
  drawSectionHeader('VIDEO BREAKDOWN AT A GLANCE', '5-Minute Total Arc');
  const tableData = [
    ['0:00 - 0:45', 'Hook & Architectural Thesis', 'Hero view, highlight deterministic thesis vs LLM unpredictability'],
    ['0:45 - 2:30', 'Automated Live Demo Script', 'Press R; showcase 5 edge cases, streaming SSE & rubber stamps'],
    ['2:30 - 3:15', 'Interactive Tolerance Lab', 'Drag sliders; show instant ~2ms client-side re-evaluation'],
    ['3:15 - 4:00', 'Operations Dashboard', 'Navigate to /dashboard; show STP rate, Money Saved ticker & CSV export'],
    ['4:00 - 4:45', 'Rulebook & Procurement Ledger', 'Navigate to /rules; inspect PO 3-way match & unapproved vendor block'],
    ['4:45 - 5:15', 'Architecture, Command Palette & Wrap', 'Navigate to /about; show tri-tier fallback, press Ctrl+K & wrap up'],
  ];

  for (const row of tableData) {
    checkSpace(18);
    currentPage.drawText(row[0], { x: margin + 4, y, size: 8.5, font: fontBold, color: emerald });
    currentPage.drawText(row[1], { x: margin + 85, y, size: 8.5, font: fontBold, color: navyDark });
    currentPage.drawText(row[2], { x: margin + 250, y, size: 8, font: fontRegular, color: textMuted });
    currentPage.drawLine({ start: { x: margin, y: y - 3 }, end: { x: pageWidth - margin, y: y - 3 }, thickness: 0.3, color: borderLight });
    y -= 15;
  }
  y -= 10;

  // --- SEGMENT 1 ---
  drawSectionHeader('SEGMENT 1: THE HOOK & CORE THESIS (0:00 - 0:45)', 'Hero Screen (/)');
  drawActionBox([
    '0:00: Start on Home screen (/). Let the deep navy background and aurora mesh sit for 2 seconds.',
    '0:10: Move cursor across the top badge: "Deterministic Rules • AI Extraction".',
    '0:25: Scroll slightly down to highlight the Sample Invoices Lab with the 7 edge-case scenario cards.',
  ]);
  drawScriptBox(
    `"Hello! I am excited to present INVOICE INQUEST — an enterprise accounts-payable intake and audit engine built for the AI Solutions Analyst role. Before diving in, I want to emphasize our core architectural principle: Large Language Models are probabilistic and prone to hallucination. But in accounts payable, financial clearance decisions must be 100% deterministic, explainable, and provable in an audit court. That is why in INVOICE INQUEST: AI extracts the facts; pure deterministic code decides whether money leaves the bank account. Let us see it in action."`
  );

  // --- SEGMENT 2 ---
  drawSectionHeader('SEGMENT 2: THE EDGE CASES WALKTHROUGH (0:45 - 2:30)', 'Sample Lab or Demo Runner');
  drawActionBox([
    'CRITICAL PRESENTATION TIP: You have TWO ways to trigger the samples:',
    '• OPTION A (RECOMMENDED FOR VIDEO): Click the cards in the "Sample Invoices Lab" row one by one at your own pace! Each invoice will stay on screen as long as you want to speak.',
    '• OPTION B (HANDS-FREE RUNNER): Click "Run Demo Script" (or press R). The button turns to "Stop Auto-Run", allowing you to pause anytime.',
    'When a sample is selected, the screen splits: Document Preview & Extracted Fields on left; 10-Stage Pipeline & Verdict on right.',
  ]);

  // Scenario 1
  drawParagraph('Scenario 1: Clean Baseline Match (Click "Happy Path" / 01_happy_path_clean.pdf)', { font: fontBold, color: navyDark });
  drawActionBox([
    'Click the first card: "Happy Path" (01_happy_path_clean.pdf) in the Sample Lab.',
    'Point cursor to left panel: show Acme Industrial PDF preview and "Engine: Gemini 2.5 Flash" badge.',
    'Point to right panel: watch glowing photon packet travel along the 10 stage nodes.',
    'Watch green APPROVED rubber stamp slam down with confetti explosion! Show the Rule Trace table.',
  ]);
  drawScriptBox(
    `"The demo script starts with our baseline Happy Path. The system ingests a clean PDF from Acme Industrial Supplies. Our multimodal AI extracts the headers and line items. The 10-stage pipeline validates the file, normalises tax, validates supplier approval, matches the PO, and audits math down to the cent. With zero variances, the engine issues a green APPROVED stamp with straight-through processing clearance."`
  );

  // Scenario 2
  drawParagraph('Scenario 2: Cumulative PO Overbilling (Click "Split PO #3 Overbill" in Sample Lab)', { font: fontBold, color: navyDark });
  drawActionBox([
    'Click the 3rd card: "Split PO #3 Overbill" (02b_split_po_instalment_3_overbill.pdf).',
    'Point to Stage 8 (Tolerance) turning amber. Show rubber stamp: amber NEEDS REVIEW.',
    'Point out the exact calculated overage: "PO Ceiling Exceeded: Overbilled by $1,330.00".',
    'Explain how this invoice remains on screen so you can speak at your natural pace.',
  ]);
  drawScriptBox(
    `"Next, let us evaluate our second scenario: a multi-stage instalment against a $32,740 purchase order. Instalments 1 and 2 had already consumed over $20,000. This 3rd instalment bills $14,445. Individually, the invoice looks fine — but our cumulative encumbrance check detects that total billing will reach $34,070, exceeding the contracted ceiling by $1,330. The system halts auto-approval and tags it NEEDS REVIEW for procurement manager authorization."`
  );

  // Scenario 3
  drawParagraph('Scenario 3: Anti-Fraud Near-Duplicate (Click "Near-Duplicate" in Sample Lab)', { font: fontBold, color: navyDark });
  drawActionBox([
    'Click the 4th card: "Near-Duplicate" (03_near_duplicate.pdf) in the Sample Lab.',
    'Stage 9 (Duplicate Check) turns red. Watch rubber stamp slam down with red pulse: REJECTED.',
    'Scroll down to the "Anti-Fraud Duplicate Investigation: Side-by-Side Evidence" panel to show comparison.',
  ]);
  drawScriptBox(
    `"Next is an AP nightmare: an anti-fraud near-duplicate. A vendor submits 'INV 2041 ' with a space and no hyphen, three days after receiving payment for 'INV-2041'. Traditional keyword queries miss this. But our normalisation engine strips whitespace, and our fuzzy duplicate detective flags identical supplier, identical dollar amounts, and identical line items. The invoice is automatically REJECTED, payment is held, and the AP specialist sees side-by-side evidence comparing both submissions."`
  );

  // Scenario 4
  drawParagraph('Scenario 4: Missing Critical Headers (Click "Missing Headers" in Sample Lab)', { font: fontBold, color: navyDark });
  drawActionBox([
    'Click the 5th card: "Missing Headers" (04_missing_fields.pdf) in the Sample Lab.',
    'Stage 4 (Completeness) fails. Rubber stamp lands: blue INFO REQUESTED.',
    'Scroll down to the blue "Auto-Drafted Vendor Clarification Request" card.',
    'Click "Copy Email Draft" button (toast confirms: "Copied to Clipboard!").',
  ]);
  drawScriptBox(
    `"In Scenario 4, EuroLogistik submits an invoice with missing mandatory fields: no invoice number and no grand total. Under our precedence hierarchy, regulatory incompleteness takes precedence: verdict is INFO REQUESTED. Rather than having an AP clerk draft an email from scratch, the system auto-drafts a professional, specific clarification request detailing the exact missing headers, ready to copy and send in one click."`
  );

  // Scenario 5
  drawParagraph('Scenario 5: Scanned Implied PO + BEC Fraud Flag (Click "Scanned + Bank Mismatch" in Sample Lab)', { font: fontBold, color: navyDark });
  drawActionBox([
    'Click the 6th card: "Scanned + Bank Mismatch" (05_scanned_implied_po.png) in the Sample Lab.',
    'Show the scanned, rotated, yellowed PNG receipt in the left preview panel.',
    'Show Stage 6 (PO Match) green (Inferred PO with 88% confidence via token Jaccard).',
    'Show Stage 5 (Vendor Check) amber with BANK DETAILS CHANGED. Final verdict: NEEDS REVIEW.',
  ]);
  drawScriptBox(
    `"Finally, our most challenging edge case: a scanned, rotated, noisy image receipt with NO explicit PO number — only referencing 'our quote of March'. Our inference engine links line descriptions and amounts to PO-2026-005 with 88% confidence. But our vendor security check detects that the remittance bank account ending in 9934 differs from the registered master ending in 2256. This triggers a Business Email Compromise fraud flag. Even though the numbers match, the system refuses to auto-pay and routes it to human review for dual-call callback verification."`
  );

  // --- SEGMENT 3 ---
  drawSectionHeader('SEGMENT 3: LIVE INTERACTIVE TOLERANCE LAB (2:30 - 3:15)', 'Instant In-Browser Modeling');
  drawActionBox([
    'Stay on Scenario 5 or click "02b_split_po_instalment_3_overbill.pdf" in Sample Lab.',
    'Scroll below the verdict to the Tolerance & Sensitivity Lab card.',
    'Hover over the 4 sliders: Amount Tolerance, Absolute Cap, Duplicate Sensitivity, PO Inference Bar.',
    'Drag the Amount Tolerance slider to 12% or Absolute Cap to $500.',
    'Point out the live decision status banner updating in ~2ms with zero page reloads!',
    'Click "Reset Defaults" to restore original policy baseline.',
  ]);
  drawScriptBox(
    `"One of the most valuable features for finance leadership is our interactive Tolerance Lab. Accounts-payable policies are not static. Finance teams often need to test policy adjustments — for instance: 'What happens if we increase variance tolerance to 10% to accommodate fuel surcharges?' Because our entire engine is pure TypeScript, we re-evaluate stages 3 through 10 directly in browser memory. As I drag the slider, the verdict recalculates in under 2 milliseconds, giving AP directors instantaneous policy simulation with zero server round-trips."`
  );

  // --- SEGMENT 4 ---
  drawSectionHeader('SEGMENT 4: EXECUTIVE OPERATIONS DASHBOARD (3:15 - 4:00)', '/dashboard');
  drawActionBox([
    'Click "Dashboard" in the top navigation bar (observe animated pill transition).',
    'Point to CountUp KPI cards: Invoices Processed, STP Rate, Disbursement Risk Protected Ticker.',
    'Scroll smoothly across the 3 Recharts: Status Donut, Risk Histogram, Top Flagged Rules.',
    'In Ingestion Ledger table: type "Acme" in search bar, filter by "Needs Review", then reset.',
    'Click any row in the table: Slide-Over Trace Drawer opens with full 10-stage execution history.',
    'Click "Export CSV" button (show the generated .csv file downloaded).',
  ]);
  drawScriptBox(
    `"Next, let us step into the shoes of the VP of Finance in the Executive Operations Dashboard. Here, leadership tracks operational efficiency: our Straight-Through Processing rate, average processing speed of 3 seconds per invoice, and our Disbursement Risk Protected ticker — tracking exact dollar values saved from duplicate disbursements or overbilling breaches. Interactive charts display risk distributions, the filterable ledger allows instant search across historical runs, and clicking any record opens the immutable audit trace. Everything can be exported to CSV with one click."`
  );

  // --- SEGMENT 5 ---
  drawSectionHeader('SEGMENT 5: RULEBOOK, PO LEDGER & VENDOR MASTER (4:00 - 4:45)', '/rules');
  drawActionBox([
    'Click "Rulebook & Ledger" (/rules) in the top nav.',
    'Show Section 1: 8 human-readable rule cards with severity badges (FAIL, WARN, INFO) and precedence.',
    'Scroll to Section 2: Purchase Order Ledger. Click PO-2026-004 to expand lines & show 3-way match received quantities.',
    'Scroll to Section 3: Vendor Master Registry. Point to unapproved vendor QuickPrint in red, and CloudNine bank update.',
  ]);
  drawScriptBox(
    `"Transparency is meaningless if rules are buried in black-box code. On the Rulebook page, every business rule is documented in human-readable prose explaining why it exists, its failure severity, and its execution precedence. Below the rules, we expose the underlying procurement databases: our Purchase Order ledger — complete with 3-way goods receipt tracking — and our Vendor Master registry, highlighting unapproved suppliers like QuickPrint in red, and flagging entities with recent banking modifications."`
  );

  // --- SEGMENT 6 ---
  drawSectionHeader('SEGMENT 6: ARCHITECTURE, COMMAND PALETTE & WRAP-UP (4:45 - 5:15)', '/about & Home');
  drawActionBox([
    'Click "Architecture & Assumptions" (/about) in the navigation.',
    'Point out the End-to-End Processing Flowchart and the Core Design Decisions cards.',
    'Press "Ctrl + K" (or "Cmd + K") to open the Command Palette. Press down arrow twice, then hit Escape.',
    'Navigate back to Home screen (/) for closing remarks.',
  ]);
  drawScriptBox(
    `"Finally, on our Architecture page, we document every assumption and our tri-tier fallback architecture: Tier 1 uses Google Gemini 2.5 Flash Vision for multimodal extraction; Tier 2 provides an on-premise heuristic regex parser with pdf-parse when offline; and Tier 3 guarantees zero-failure demos via pre-computed ground-truth fixtures. With global keyboard shortcuts, a Command Palette, and 24 comprehensive unit tests verifying everything from Jaccard token similarity to cumulative PO thresholds, INVOICE INQUEST bridges generative AI with enterprise financial governance. Thank you for your time!"`
  );

  // --- PRO-TIPS ---
  drawSectionHeader('3 GOLDEN PRO-TIPS FOR YOUR RECORDING', 'Stand Out As Senior');
  drawParagraph('1. Let the Stepper Flow: When you click "Run Demo Script", do not click around wildly. Let the automated 2-second pauses run their course so the viewer can absorb the stage progressions.', { font: fontRegular });
  drawParagraph('2. Steer with your Cursor: When you mention "Tara the Tolerance Analyst" or the "BEC Bank Fraud Flag", circle your mouse pointer smoothly over that specific card so the viewer follows.', { font: fontRegular });
  drawParagraph('3. Speak Finance Fluently: Use authentic AP terminology: "Straight-Through Processing (STP)", "Cumulative Encumbrance", "Three-Way Match", "Business Email Compromise (BEC)". It signals immediate domain authority.', { font: fontRegular });

  // Add Page Numbers to all pages
  const totalPages = pdfDoc.getPageCount();
  for (let i = 0; i < totalPages; i++) {
    const page = pdfDoc.getPage(i);
    const pageStr = `Page ${i + 1} of ${totalPages}`;
    page.drawText(pageStr, {
      x: pageWidth - margin - fontRegular.widthOfTextAtSize(pageStr, 8),
      y: 20,
      size: 8,
      font: fontRegular,
      color: textMuted,
    });
    page.drawText('INVOICE INQUEST • Confidential Interview Material', {
      x: margin,
      y: 20,
      size: 8,
      font: fontRegular,
      color: textMuted,
    });
  }

  const pdfBytes = await pdfDoc.save();

  // Save to project root and public folder
  const rootPath = path.join(process.cwd(), 'INVOICE_INQUEST_Video_Presentation_Script.pdf');
  const publicPath = path.join(process.cwd(), 'public', 'INVOICE_INQUEST_Video_Presentation_Script.pdf');

  fs.writeFileSync(rootPath, pdfBytes);
  fs.writeFileSync(publicPath, pdfBytes);

  console.log(`✅ PDF generated successfully!`);
  console.log(`📄 Saved to: ${rootPath} (${(pdfBytes.length / 1024).toFixed(1)} KB)`);
  console.log(`🌐 Also accessible at: ${publicPath}`);
}

generateScriptPdf().catch((err) => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});

