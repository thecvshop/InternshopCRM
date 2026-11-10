/**
 * Utility functions for identifying duplicate records in CRM (Students & Leads)
 */

export interface DuplicateGroup<T> {
  id: string;
  matchType: 'phone' | 'email' | 'name' | 'multiple';
  matchValue: string;
  matchReason: string;
  items: T[];
}

export function normalizePhone(rawPhone?: string): string {
  if (!rawPhone) return '';
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length < 8) return '';
  // If Indian 10-digit number with 91 or 0 prefix, take last 10 digits
  if (digits.length >= 10) {
    const last10 = digits.slice(-10);
    // Ignore invalid repetitive test numbers
    if (/^(\d)\1{9}$/.test(last10) || last10 === '1234567890') return '';
    return last10;
  }
  return digits;
}

export function normalizeEmail(rawEmail?: string): string {
  if (!rawEmail) return '';
  const clean = rawEmail.trim().toLowerCase();
  if (!clean.includes('@') || !clean.includes('.')) return '';
  if (clean.includes('example.com') || clean.includes('test.com')) return '';
  return clean;
}

export function normalizeName(rawName?: string): string {
  if (!rawName) return '';
  const clean = rawName.trim().toLowerCase().replace(/\s+/g, ' ');
  if (clean.length < 3) return '';
  return clean;
}

export interface DuplicateDetectionResult<T> {
  // Map of item ID to duplicate reasons
  duplicateIdMap: Map<string, string[]>;
  // Array of grouped duplicate clusters
  groups: DuplicateGroup<T>[];
  // Total duplicate items (items that appear in groups beyond the primary 1)
  totalDuplicateCount: number;
}

export function detectDuplicates<T extends { id: string }>(
  items: T[],
  extract: (item: T) => { name?: string; email?: string; phone?: string }
): DuplicateDetectionResult<T> {
  const phoneMap = new Map<string, T[]>();
  const emailMap = new Map<string, T[]>();
  const nameMap = new Map<string, T[]>();

  for (const item of items) {
    const { name, email, phone } = extract(item);

    const normPhone = normalizePhone(phone);
    if (normPhone) {
      if (!phoneMap.has(normPhone)) phoneMap.set(normPhone, []);
      phoneMap.get(normPhone)!.push(item);
    }

    const normEmail = normalizeEmail(email);
    if (normEmail) {
      if (!emailMap.has(normEmail)) emailMap.set(normEmail, []);
      emailMap.get(normEmail)!.push(item);
    }

    const normName = normalizeName(name);
    if (normName) {
      if (!nameMap.has(normName)) nameMap.set(normName, []);
      nameMap.get(normName)!.push(item);
    }
  }

  const groups: DuplicateGroup<T>[] = [];
  const duplicateIdMap = new Map<string, string[]>();
  const seenGroupKeys = new Set<string>();

  // Process Phone Duplicates
  for (const [phoneKey, groupItems] of phoneMap.entries()) {
    if (groupItems.length > 1) {
      const groupKey = `phone:${phoneKey}`;
      if (!seenGroupKeys.has(groupKey)) {
        seenGroupKeys.add(groupKey);
        groups.push({
          id: groupKey,
          matchType: 'phone',
          matchValue: phoneKey,
          matchReason: `Matching Phone: ...${phoneKey.slice(-4)}`,
          items: groupItems,
        });

        for (const item of groupItems) {
          const list = duplicateIdMap.get(item.id) || [];
          list.push(`Matching Phone (...${phoneKey.slice(-4)})`);
          duplicateIdMap.set(item.id, list);
        }
      }
    }
  }

  // Process Email Duplicates
  for (const [emailKey, groupItems] of emailMap.entries()) {
    if (groupItems.length > 1) {
      const groupKey = `email:${emailKey}`;
      if (!seenGroupKeys.has(groupKey)) {
        seenGroupKeys.add(groupKey);
        groups.push({
          id: groupKey,
          matchType: 'email',
          matchValue: emailKey,
          matchReason: `Matching Email: ${emailKey}`,
          items: groupItems,
        });

        for (const item of groupItems) {
          const list = duplicateIdMap.get(item.id) || [];
          if (!list.some((r) => r.startsWith('Matching Email'))) {
            list.push(`Matching Email (${emailKey})`);
            duplicateIdMap.set(item.id, list);
          }
        }
      }
    }
  }

  // Process Name Duplicates (only if email & phone didn't already group them or if strictly identical name)
  for (const [nameKey, groupItems] of nameMap.entries()) {
    if (groupItems.length > 1) {
      const groupKey = `name:${nameKey}`;
      // Check if already captured together in a phone or email group
      const firstId = groupItems[0].id;
      const alreadyCapturedTogether = groupItems.slice(1).every((other) => {
        return groups.some((g) => g.items.some((i) => i.id === firstId) && g.items.some((i) => i.id === other.id));
      });

      if (!alreadyCapturedTogether && !seenGroupKeys.has(groupKey)) {
        seenGroupKeys.add(groupKey);
        groups.push({
          id: groupKey,
          matchType: 'name',
          matchValue: nameKey,
          matchReason: `Identical Name: "${groupItems[0].id ? extract(groupItems[0]).name : nameKey}"`,
          items: groupItems,
        });

        for (const item of groupItems) {
          const list = duplicateIdMap.get(item.id) || [];
          if (!list.some((r) => r.startsWith('Identical Name'))) {
            list.push(`Identical Name`);
            duplicateIdMap.set(item.id, list);
          }
        }
      }
    }
  }

  // Count surplus duplicate items across all groups
  let totalDuplicates = 0;
  for (const g of groups) {
    totalDuplicates += g.items.length - 1;
  }

  return {
    duplicateIdMap,
    groups,
    totalDuplicateCount: totalDuplicates,
  };
}
