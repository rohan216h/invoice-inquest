// ============================================================
// INVOICE INQUEST — Utility Functions
// ============================================================

/**
 * Compute the Levenshtein edit distance between two strings.
 */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  // Early exits
  if (m === 0) return n;
  if (n === 0) return m;

  // Use two-row approach for memory efficiency
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);

  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,       // deletion
        curr[j - 1] + 1,   // insertion
        prev[j - 1] + cost  // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}

/**
 * Tokenize a string: lowercase, strip punctuation, split on whitespace.
 */
function tokenize(s: string): Set<string> {
  const cleaned = s
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .trim();
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  return new Set(tokens);
}

/**
 * Compute token-based Jaccard similarity between two strings.
 * Returns 0-1 where 1 = identical token sets.
 */
export function tokenJaccard(a: string, b: string): number {
  const setA = tokenize(a);
  const setB = tokenize(b);

  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Normalize an invoice number for comparison:
 * - Uppercase
 * - Remove spaces, hyphens, dots
 * - Remove leading zeros after letter sequences (e.g. INV-00042 → INV42)
 */
export function normalizeInvoiceNumber(raw: string): string {
  let normalized = raw.toUpperCase().replace(/[\s\-\.]/g, '');
  // Remove leading zeros after letter sequences: "INV00042" → "INV42"
  normalized = normalized.replace(/([A-Z]+)0+(\d)/, '$1$2');
  return normalized;
}

/**
 * Find the best fuzzy match for a query among candidates using token Jaccard.
 * Returns the best match and its score.
 */
export function fuzzyMatch(
  query: string,
  candidates: string[]
): { match: string; score: number } {
  let bestMatch = '';
  let bestScore = 0;

  for (const candidate of candidates) {
    const score = tokenJaccard(query, candidate);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = candidate;
    }
  }

  return { match: bestMatch, score: bestScore };
}

/**
 * Parse various date format strings into ISO YYYY-MM-DD.
 * Supports:
 *   - YYYY-MM-DD, YYYY/MM/DD
 *   - DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
 *   - MM/DD/YYYY (ambiguous → treated as US format if month > 12)
 *   - "Month DD, YYYY" (e.g. "January 15, 2026")
 *   - "DD Month YYYY" (e.g. "15 January 2026")
 * Returns null if unparseable.
 */
export function parseDate(dateStr: string): string | null {
  if (!dateStr || !dateStr.trim()) return null;

  const s = dateStr.trim();

  // ISO format: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return formatISODate(parseInt(y), parseInt(m), parseInt(d));
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (dmyMatch) {
    const [, p1, p2, y] = dmyMatch;
    const n1 = parseInt(p1);
    const n2 = parseInt(p2);
    const year = parseInt(y);

    // If first number > 12, it must be a day (DD/MM/YYYY)
    if (n1 > 12) {
      return formatISODate(year, n2, n1);
    }
    // If second number > 12, it must be a day → MM/DD/YYYY
    if (n2 > 12) {
      return formatISODate(year, n1, n2);
    }
    // Ambiguous: assume DD/MM/YYYY (non-US convention for invoice systems)
    return formatISODate(year, n2, n1);
  }

  // Month name formats
  const months: Record<string, number> = {
    january: 1, february: 2, march: 3, april: 4,
    may: 5, june: 6, july: 7, august: 8,
    september: 9, october: 10, november: 11, december: 12,
    jan: 1, feb: 2, mar: 3, apr: 4,
    jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  };

  // "Month DD, YYYY" or "Month DD YYYY"
  const mdyNameMatch = s.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (mdyNameMatch) {
    const [, monthName, d, y] = mdyNameMatch;
    const month = months[monthName.toLowerCase()];
    if (month) {
      return formatISODate(parseInt(y), month, parseInt(d));
    }
  }

  // "DD Month YYYY"
  const dmyNameMatch = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (dmyNameMatch) {
    const [, d, monthName, y] = dmyNameMatch;
    const month = months[monthName.toLowerCase()];
    if (month) {
      return formatISODate(parseInt(y), month, parseInt(d));
    }
  }

  return null;
}

/**
 * Format year/month/day into ISO date string, with validation.
 */
function formatISODate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
    return null;
  }
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/**
 * Format a number as currency string.
 */
export function formatCurrency(amount: number, currency: string): string {
  const currencySymbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    SGD: 'S$',
    AUD: 'A$',
    CAD: 'C$',
  };

  const symbol = currencySymbols[currency.toUpperCase()] ?? `${currency} `;

  // JPY typically has no decimal places
  if (currency.toUpperCase() === 'JPY') {
    return `${symbol}${Math.round(amount).toLocaleString('en-US')}`;
  }

  return `${symbol}${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Calculate the number of days between two ISO date strings.
 * Returns absolute value (always positive).
 */
export function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffMs = Math.abs(d2.getTime() - d1.getTime());
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}
