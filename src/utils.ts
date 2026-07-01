import { Product } from './data';

/**
 * Calculates Levenshtein Distance between two strings to find near matches.
 */
function getLevenshteinDistance(a: string, b: string): number {
  const tmp = [];
  for (let i = 0; i <= a.length; i++) {
    tmp[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    tmp[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return tmp[a.length][b.length];
}

/**
 * Fuzzy search on Product list. Returns matching products sorted by score.
 */
export function fuzzySearchProducts(query: string, products: Product[]): Product[] {
  if (!query) return products;
  const cleanQuery = query.trim().toUpperCase();

  // 1. Check direct substring matches (highest priority)
  const directMatches = products.filter(
    (p) =>
      p.partNo.toUpperCase().includes(cleanQuery) ||
      p.partName.toUpperCase().includes(cleanQuery) ||
      p.customer.toUpperCase().includes(cleanQuery)
  );

  if (directMatches.length > 0) {
    return directMatches;
  }

  // 2. Fallback to Levenshtein distance for close matches (fuzzy)
  const scored = products.map((p) => {
    const d1 = getLevenshteinDistance(cleanQuery, p.partNo.toUpperCase());
    const d2 = getLevenshteinDistance(cleanQuery, p.partName.toUpperCase());
    const minDistance = Math.min(d1, d2);
    return { product: p, score: minDistance };
  });

  // Sort by smallest distance (highest similarity)
  scored.sort((a, b) => a.score - b.score);
  return scored.filter((s) => s.score < 8).map((s) => s.product);
}

/**
 * Generates an automatic unique label ID like: LBL-260701-001
 */
export function generateLabelId(existingLabels: string[] = []): string {
  const date = new Date();
  const year = String(date.getFullYear()).substring(2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const prefix = `LBL-${year}${month}${day}-`;

  let counter = 1;
  while (true) {
    const candidate = `${prefix}${String(counter).padStart(3, '0')}`;
    if (!existingLabels.includes(candidate)) {
      return candidate;
    }
    counter++;
  }
}

/**
 * Parses a copy-pasted TSV or uploaded CSV into Product definitions safely.
 */
export function parseImportData(rawText: string): Partial<Product>[] {
  const rows = rawText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const imported: Partial<Product>[] = [];
  const seenIds = new Set<string>();

  for (const row of rows) {
    // Determine the column splitting logic based on presence of pipes, tabs, or commas.
    let cols: string[];
    if (row.includes('|')) {
      cols = row.split('|').map((val) => val.trim());
    } else if (row.includes('\t')) {
      cols = row.split('\t').map((val) => val.trim());
    } else {
      cols = row.split(',').map((val) => val.trim());
    }

    if (cols.length >= 2) {
      const customer = cols[0];
      const partNo = cols[1];

      // Skip headers and invalid entries
      if (
        !customer || 
        !partNo || 
        customer.toLowerCase() === 'customer' || 
        partNo.toLowerCase() === 'part_no' || 
        partNo === '|' || 
        customer === '|'
      ) {
        continue;
      }

      // Read columns with safe fallbacks
      const partName = cols[2] || '';
      const fullBox = parseInt(cols[3], 10) || 100;
      const sapNo = cols[4] || `SAP-${Math.floor(Math.random() * 1000000)}`;
      const zone = cols[5] || 'General';
      const packageType = cols[6] || 'Box';
      const begStock = parseInt(cols[7], 10) || 0;

      const finalId = `${customer}-${partNo}`;

      // Prevent adding duplicate entries within the same import list
      if (!seenIds.has(finalId)) {
        seenIds.add(finalId);
        imported.push({
          id: finalId,
          sapNo,
          zone,
          customer,
          partNo,
          partName,
          fullBox,
          packageType,
          beginningStock: begStock,
          inboundQty: 0,
          outboundQty: 0,
          currentStock: begStock,
        });
      }
    }
  }
  return imported;
}

/**
 * Standard Attendance Working Hours and OT Calculator.
 * Shifts default cut-off: 30 minutes.
 * Examples from user:
 * - 08:30-17:30, checkin 08:20, checkout 20:31 -> Work: 8h, OT: 2.5h (2h 30m)
 * - 08:30-17:30, checkin 06:00, checkout 17:30 -> Work: 8h, OT: 2.5h (2h 30m)
 * - 08:30-17:30, checkin 05:20, checkout 20:40 -> Work: 8h, OT: 5.0h (5h 0m)
 */
export function calculateAttendanceHours(
  checkInStr: string,
  checkOutStr: string,
  shiftInStr = '08:30',
  shiftOutStr = '17:30'
): { workHours: number; otHours: number } {
  if (!checkInStr || !checkOutStr) {
    return { workHours: 0, otHours: 0 };
  }

  // Parse strings to absolute minutes
  const parseToMins = (str: string) => {
    const [h, m] = str.split(':').map(Number);
    return h * 60 + m;
  };

  const actualIn = parseToMins(checkInStr);
  const actualOut = parseToMins(checkOutStr);
  const shiftIn = parseToMins(shiftInStr);
  const shiftOut = parseToMins(shiftOutStr);

  // Core work duration: standard shift has 8 hours work and 1 hour break (540 total minutes)
  // Check if they attended during the shift
  if (actualIn >= shiftOut || actualOut <= shiftIn) {
    return { workHours: 0, otHours: 0 };
  }

  const workHours = 8.0;

  // 1. Early OT calculation (early check-in counts directly with NO 30-min deduction)
  let earlyOTMinutes = 0;
  if (actualIn < shiftIn) {
    earlyOTMinutes = shiftIn - actualIn;
  }

  // 2. Late OT calculation (Late check-out counts only if >= 30 minutes after shift end, first 30 mins deducted)
  let lateOTMinutes = 0;
  if (actualOut > shiftOut) {
    const lateDiff = actualOut - shiftOut;
    if (lateDiff >= 30) {
      lateOTMinutes = lateDiff - 30;
    }
  }

  const totalOTMinutes = earlyOTMinutes + lateOTMinutes;

  // "ตัดรอบ ทุก 30 นาที" -> Round down to the nearest 30 mins block (0.5 hour)
  const otHours = Math.floor(totalOTMinutes / 30) * 0.5;

  return { workHours, otHours: Math.max(0, otHours) };
}

/**
 * Downloads a list of objects as a nicely formatted CSV file.
 */
export function exportToCSV(filename: string, headers: string[], rows: string[][]) {
  // UTF-8 BOM to display Thai characters correctly in Excel
  const BOM = '\uFEFF';
  const content = [
    headers.join(','),
    ...rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
