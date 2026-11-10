/**
 * Utilities for formatting Batch names, numbers, sorting, and dates.
 */

export function getBatchNumber(batch?: { name?: string; batchId?: string } | null): number {
  if (!batch) return 0;
  const name = batch.name || '';
  const batchId = batch.batchId || '';

  const matchBatch = name.match(/(?:batch|cohort)\s*#?\s*(\d+)/i);
  if (matchBatch && matchBatch[1]) {
    return parseInt(matchBatch[1], 10);
  }

  const matchId = batchId.match(/(\d+)/);
  if (matchId && matchId[1]) {
    return parseInt(matchId[1], 10);
  }

  const matchNum = name.match(/#?(\d+)/);
  if (matchNum && matchNum[1]) {
    return parseInt(matchNum[1], 10);
  }

  return 0;
}

export function getBatchDisplayTitle(batch?: { name?: string; batchId?: string } | null): string {
  if (!batch) return 'Batch';
  const num = getBatchNumber(batch);
  if (num > 0) {
    return `Batch ${num}`;
  }
  return batch.name || 'Batch';
}

/**
 * Sorts batches strictly in descending order: Batch 5 -> Batch 4 -> Batch 3 -> Batch 2 -> Batch 1
 */
export function sortBatchesDescending<T extends { name?: string; batchId?: string; startDate?: string }>(
  batches: T[]
): T[] {
  return [...batches].sort((a, b) => {
    const numA = getBatchNumber(a);
    const numB = getBatchNumber(b);
    if (numA !== numB) {
      return numB - numA; // 5, 4, 3, 2, 1
    }
    // Fallback to start date descending
    return (b.startDate || '').localeCompare(a.startDate || '');
  });
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Formats date range compactly to prevent awkward line breaks on cards.
 * e.g. "2026-04-01" to "2026-04-28" -> "1 – 28 Apr 2026"
 * e.g. "2025-10-01" to "2025-11-25" -> "1 Oct – 25 Nov 2025"
 */
export function formatCohortDateRange(startDate?: string, endDate?: string): string {
  if (!startDate && !endDate) return 'TBD';
  if (startDate && !endDate) return `Starts ${startDate}`;
  if (!startDate && endDate) return `Ends ${endDate}`;

  try {
    const sParts = startDate!.split('-');
    const eParts = endDate!.split('-');

    if (sParts.length === 3 && eParts.length === 3) {
      const sYear = sParts[0];
      const sMonth = parseInt(sParts[1], 10) - 1;
      const sDay = parseInt(sParts[2], 10);

      const eYear = eParts[0];
      const eMonth = parseInt(eParts[1], 10) - 1;
      const eDay = parseInt(eParts[2], 10);

      const sMonthName = MONTHS[sMonth] || '';
      const eMonthName = MONTHS[eMonth] || '';

      if (sYear === eYear) {
        if (sMonth === eMonth) {
          // Same month & year: "1 – 28 Apr 2026"
          return `${sDay} – ${eDay} ${sMonthName} ${sYear}`;
        }
        // Same year, different months: "1 Oct – 25 Nov 2025"
        return `${sDay} ${sMonthName} – ${eDay} ${eMonthName} ${sYear}`;
      }
      // Different years
      return `${sDay} ${sMonthName} '${sYear.slice(2)} – ${eDay} ${eMonthName} '${eYear.slice(2)}`;
    }
  } catch {
    // fallback
  }

  return `${startDate} – ${endDate}`;
}
