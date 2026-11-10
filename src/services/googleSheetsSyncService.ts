import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { Lead, LeadStatus, resolveLeadStatus, LEAD_STATUS_OPTIONS } from '../types/crm';
import { logActivity } from './firestoreService';
import { getGoogleAccessToken } from '../lib/auth/AuthContext';

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  spreadsheetUrl: string;
  sheetTabName: string;
  range?: string;
  lastSyncedAt?: string;
  lastSyncStatus?: 'success' | 'error';
  lastSyncCount?: number;
  lastSyncSummary?: string;
  autoSyncEnabled?: boolean;
}

export interface SheetRowCandidate {
  name: string;
  email: string;
  phone: string;
  city: string;
  responsibilities: string;
  cvUrl?: string;
  status: string;
  college?: string;
  course?: string;
  collegeYear?: string;
  hasLaptop?: string;
  laptopModel?: string;
  willingHazraTraining?: string;
  device?: string;
  commitment?: string;
  brandAssigned?: string;
  batchNumber?: number;
  placementCompany?: string;
  source?: string;
  timestamp?: string;
  rawRowIndex: number;
}

export interface SyncDiffResult {
  totalSheetRows: number;
  toCreate: SheetRowCandidate[];
  toUpdate: {
    existingLead: Lead;
    incoming: SheetRowCandidate;
    changes: string[];
  }[];
  unchanged: {
    existingLead: Lead;
    incoming: SheetRowCandidate;
  }[];
  toRemove: Lead[];
  rawHeaders: string[];
}

const SETTINGS_DOC_PATH = 'settings/googleSheetsConfig';

/**
 * Extract clean Google Spreadsheet ID from URL or bare ID
 */
export function extractSpreadsheetId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  // Matching: https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit...
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // If already an ID without slashes
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    return trimmed;
  }
  return trimmed;
}

/**
 * Fetch saved Google Sheets config from Firestore
 */
export async function getSavedGoogleSheetsConfig(): Promise<GoogleSheetsConfig | null> {
  try {
    const snap = await getDoc(doc(db, 'settings', 'googleSheetsConfig'));
    if (snap.exists()) {
      return snap.data() as GoogleSheetsConfig;
    }
  } catch (err) {
    console.warn('Failed to load Google Sheets config from Firestore:', err);
  }
  return null;
}

/**
 * Save Google Sheets config to Firestore
 */
export async function saveGoogleSheetsConfig(config: Partial<GoogleSheetsConfig>): Promise<void> {
  try {
    await setDoc(doc(db, 'settings', 'googleSheetsConfig'), config, { merge: true });
  } catch (err) {
    console.error('Failed to save Google Sheets config:', err);
    throw err;
  }
}

/**
 * Fetch sheet tabs/metadata via Google Sheets REST API
 */
export async function fetchSpreadsheetTabs(
  spreadsheetId: string,
  accessToken?: string | null
): Promise<{ title: string; sheets: string[] }> {
  const token = accessToken || getGoogleAccessToken();
  if (!token) {
    throw new Error('Google authentication required. Please connect your Google account.');
  }

  const cleanId = extractSpreadsheetId(spreadsheetId);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?fields=properties.title,sheets.properties.title`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    let message = `Failed to fetch spreadsheet (${response.status})`;
    try {
      const parsed = JSON.parse(errorBody);
      if (parsed.error?.message) {
        message = parsed.error.message;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const data = await response.json();
  const sheets: string[] = (data.sheets || []).map((s: any) => s.properties?.title || '').filter(Boolean);
  return {
    title: data.properties?.title || 'Google Sheet',
    sheets,
  };
}

/**
 * Fetch values from a specific tab range via Google Sheets REST API
 */
export async function fetchSpreadsheetValues(
  spreadsheetId: string,
  tabName: string,
  accessToken?: string | null
): Promise<string[][]> {
  const token = accessToken || getGoogleAccessToken();
  const cleanId = extractSpreadsheetId(spreadsheetId);

  // If token is available, use official Google Sheets REST API
  if (token) {
    const range = encodeURIComponent(`${tabName}!A1:Z3000`);
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${range}?valueRenderOption=FORMATTED_VALUE`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      let message = `Failed to read sheet data (${response.status})`;
      try {
        const parsed = JSON.parse(errorBody);
        if (parsed.error?.message) {
          message = parsed.error.message;
        }
      } catch {
        // ignore
      }
      throw new Error(message);
    }

    const json = await response.json();
    return json.values || [];
  }

  // Fallback: Try public CSV export if access token not present
  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${cleanId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
      tabName
    )}`;
    const res = await fetch(csvUrl);
    if (!res.ok) {
      throw new Error('Please sign in with Google to access this private spreadsheet.');
    }
    const text = await res.text();
    return parseCsvToRows(text);
  } catch (err: any) {
    throw new Error(err.message || 'Authentication required to read Google Sheet.');
  }
}

/**
 * Standard CSV parser for fallback
 */
export function parseCsvToRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let insideQuote = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === ',' && !insideQuote) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !insideQuote) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentVal.trim());
      if (currentRow.some((c) => c !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }

  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some((c) => c !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Intelligent Column Index Detection
 */
export function detectColumnMapping(headers: string[]) {
  const cleanHeaders = headers.map((h) => (h || '').toLowerCase().trim());

  const findIdx = (keywords: string[]) => {
    return cleanHeaders.findIndex((h) =>
      keywords.some((k) => h === k || h.includes(k))
    );
  };

  return {
    timestamp: findIdx(['timestamp', 'applied on', 'date of application', 'date']),
    name: findIdx(['name', 'full name', 'applicant name', 'candidate name', 'student name']),
    email: findIdx(['email', 'email address', 'mail id', 'mail']),
    phone: findIdx(['phone', 'mobile', 'contact', 'whatsapp', 'number', 'phone number', 'contact number']),
    city: findIdx(['city', 'location', 'town', 'current location', 'native']),
    responsibilities: findIdx([
      'responsibilities',
      'role',
      'domain',
      'skills',
      'interest',
      'track',
      'department',
      'designation',
      'what responsibilities',
    ]),
    cvUrl: findIdx(['cv', 'resume', 'drive link', 'cv link', 'resume link', 'google drive', 'portfolio / cv']),
    status: findIdx(['status', 'application status', 'pipeline status', 'stage', 'lead status']),
    college: findIdx(['college', 'university', 'institute', 'institution', 'college name']),
    course: findIdx(['course', 'degree', 'qualification', 'stream', 'branch']),
    collegeYear: findIdx(['year', 'college year', 'graduation year', 'grad year', 'year of study']),
    willingHazraTraining: findIdx([
      'hazra',
      'willing hazra',
      'hazra training',
      'office training',
      'willing to come to hazra',
      'offline training',
    ]),
    hasLaptop: findIdx(['has laptop', 'laptop', 'own laptop', 'personal laptop', 'do you have a laptop']),
    laptopModel: findIdx(['laptop model', 'laptop specs', 'laptop configuration', 'model']),
    device: findIdx(['device', 'phone model', 'mobile phone', 'android', 'iphone']),
    commitment: findIdx(['commitment', 'hours', 'duration', 'time commitment', 'commitment period']),
    brandAssigned: findIdx(['brand', 'brand assigned', 'client', 'assigned brand', 'company assigned']),
    batchNumber: findIdx(['batch', 'batch number', 'cohort', 'training batch']),
    placementCompany: findIdx(['placement company', 'company placed', 'placed company', 'hiring company']),
    portfolioLink: findIdx(['portfolio', 'portfolio link', 'behance', 'github', 'website', 'dribbble']),
    source: findIdx(['source', 'lead source', 'referral', 'where did you hear', 'how did you hear', 'how did you hear about us', 'where did you hear about us']),
  };
}

/**
 * Normalizes phone numbers for accurate deduplication across formats
 */
export function normalizePhone(rawPhone?: string): string {
  if (!rawPhone) return '';
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

/**
 * Normalizes email address
 */
export function normalizeEmail(rawEmail?: string): string {
  if (!rawEmail) return '';
  return rawEmail.trim().toLowerCase();
}

/**
 * Convert sheet matrix into structured candidate records
 */
export function parseSheetRowsToCandidates(rows: string[][]): {
  candidates: SheetRowCandidate[];
  headers: string[];
} {
  if (!rows || rows.length < 2) {
    return { candidates: [], headers: [] };
  }

  const headers = rows[0].map((h) => h.trim());
  const map = detectColumnMapping(headers);

  const candidates: SheetRowCandidate[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const name = (map.name !== -1 ? row[map.name] : row[0])?.trim() || '';
    const email = (map.email !== -1 ? row[map.email] : '')?.trim() || '';
    const phone = (map.phone !== -1 ? row[map.phone] : '')?.trim() || '';

    // Must have at least a name or email or phone to be a valid applicant row
    if (!name && !email && !phone) continue;

    const city = (map.city !== -1 ? row[map.city] : '')?.trim() || 'Kolkata';
    const responsibilities = (map.responsibilities !== -1 ? row[map.responsibilities] : '')?.trim() || 'Creative Intern';
    const cvUrl = (map.cvUrl !== -1 ? row[map.cvUrl] : '')?.trim() || undefined;
    const status = (map.status !== -1 ? row[map.status] : '')?.trim() || 'In Review';
    const college = (map.college !== -1 ? row[map.college] : '')?.trim() || undefined;
    const course = (map.course !== -1 ? row[map.course] : '')?.trim() || undefined;
    const collegeYear = (map.collegeYear !== -1 ? row[map.collegeYear] : '')?.trim() || undefined;
    const willingHazraTraining = (map.willingHazraTraining !== -1 ? row[map.willingHazraTraining] : '')?.trim() || undefined;
    const hasLaptop = (map.hasLaptop !== -1 ? row[map.hasLaptop] : '')?.trim() || undefined;
    const laptopModel = (map.laptopModel !== -1 ? row[map.laptopModel] : '')?.trim() || undefined;
    const device = (map.device !== -1 ? row[map.device] : '')?.trim() || undefined;
    const commitment = (map.commitment !== -1 ? row[map.commitment] : '')?.trim() || undefined;
    const brandAssigned = (map.brandAssigned !== -1 ? row[map.brandAssigned] : '')?.trim() || undefined;
    const placementCompany = (map.placementCompany !== -1 ? row[map.placementCompany] : '')?.trim() || undefined;
    const timestamp = (map.timestamp !== -1 ? row[map.timestamp] : '')?.trim() || undefined;
    const source = (map.source !== -1 ? row[map.source] : '')?.trim() || 'Google Sheet Master';

    let batchNumber: number | undefined = undefined;
    if (map.batchNumber !== -1 && row[map.batchNumber]) {
      const parsedBatch = parseInt(row[map.batchNumber].replace(/\D/g, ''), 10);
      if (!isNaN(parsedBatch)) batchNumber = parsedBatch;
    }

    candidates.push({
      name,
      email,
      phone,
      city,
      responsibilities,
      cvUrl,
      status,
      college,
      course,
      collegeYear,
      willingHazraTraining,
      hasLaptop,
      laptopModel,
      device,
      commitment,
      brandAssigned,
      batchNumber,
      placementCompany,
      source,
      timestamp,
      rawRowIndex: r + 1,
    });
  }

  return { candidates, headers };
}

/**
 * Compare Google Sheet candidates with existing Firestore Leads
 */
export function computeSyncDiff(
  sheetCandidates: SheetRowCandidate[],
  existingLeads: Lead[],
  headers: string[]
): SyncDiffResult {
  const toCreate: SheetRowCandidate[] = [];
  const toUpdate: {
    existingLead: Lead;
    incoming: SheetRowCandidate;
    changes: string[];
  }[] = [];
  const unchanged: {
    existingLead: Lead;
    incoming: SheetRowCandidate;
  }[] = [];
  const matchedLeadIds = new Set<string>();

  // Build lookup maps for fast matching
  const emailMap = new Map<string, Lead>();
  const phoneMap = new Map<string, Lead>();

  existingLeads.forEach((lead) => {
    if (lead.email) {
      emailMap.set(normalizeEmail(lead.email), lead);
    }
    const cleanP = normalizePhone(lead.phone);
    if (cleanP) {
      phoneMap.set(cleanP, lead);
    }
  });

  sheetCandidates.forEach((candidate) => {
    const cleanE = normalizeEmail(candidate.email);
    const cleanP = normalizePhone(candidate.phone);

    // Primary match: Normalized Email
    let match: Lead | undefined = undefined;
    if (cleanE && emailMap.has(cleanE)) {
      match = emailMap.get(cleanE);
    } else if (cleanP && phoneMap.has(cleanP)) {
      match = phoneMap.get(cleanP);
    }

    if (!match) {
      toCreate.push(candidate);
    } else {
      matchedLeadIds.add(match.id);
      const changes: string[] = [];

      // Check for notable updates
      const resolvedIncomingStatus = resolveLeadStatus(candidate.status);
      if (candidate.status && resolvedIncomingStatus !== match.status) {
        changes.push(`Status: "${match.status}" ➔ "${resolvedIncomingStatus}"`);
      }
      if (candidate.phone && normalizePhone(candidate.phone) !== normalizePhone(match.phone)) {
        changes.push(`Phone: ${match.phone || 'None'} ➔ ${candidate.phone}`);
      }
      if (candidate.cvUrl && candidate.cvUrl !== match.cvUrl) {
        changes.push(`CV link updated`);
      }
      if (candidate.brandAssigned && candidate.brandAssigned !== match.brandAssigned) {
        changes.push(`Brand: ${match.brandAssigned || 'None'} ➔ ${candidate.brandAssigned}`);
      }
      if (candidate.placementCompany && candidate.placementCompany !== match.placementCompany) {
        changes.push(`Placement Company: ${match.placementCompany || 'None'} ➔ ${candidate.placementCompany}`);
      }
      if (candidate.batchNumber && candidate.batchNumber !== match.batchNumber) {
        changes.push(`Batch: ${match.batchNumber || 'None'} ➔ ${candidate.batchNumber}`);
      }
      if (candidate.city && candidate.city.toLowerCase() !== (match.city || '').toLowerCase()) {
        changes.push(`City: ${match.city || 'None'} ➔ ${candidate.city}`);
      }

      if (changes.length > 0) {
        toUpdate.push({
          existingLead: match,
          incoming: candidate,
          changes,
        });
      } else {
        unchanged.push({
          existingLead: match,
          incoming: candidate,
        });
      }
    }
  });

  // Any lead in the CRM that does NOT exist in the Google Sheet (for exact mirror)
  const toRemove = existingLeads.filter((lead) => !matchedLeadIds.has(lead.id));

  return {
    totalSheetRows: sheetCandidates.length,
    toCreate,
    toUpdate,
    unchanged,
    toRemove,
    rawHeaders: headers,
  };
}

function cleanForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        clean[key] = cleanForFirestore(value);
      } else {
        clean[key] = value;
      }
    }
  }
  return clean;
}

function safeIsoDate(val?: string, fallback = new Date().toISOString()): string {
  if (!val) return fallback;
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return fallback;
    return d.toISOString();
  } catch {
    return fallback;
  }
}

/**
 * Apply the calculated diff to Firestore
 */
export async function applySyncDiffToFirestore(
  diff: SyncDiffResult,
  options: {
    updateExistingStatus: boolean;
    updateExistingFields: boolean;
    updateStudentRecords: boolean;
    removeLeadsNotInSheet?: boolean;
    sheetTitle?: string;
  }
): Promise<{
  createdCount: number;
  updatedCount: number;
  removedCount: number;
  totalSynced: number;
}> {
  const now = new Date().toISOString();
  let createdCount = 0;
  let updatedCount = 0;
  let removedCount = 0;

  // Find max current lead ID suffix to maintain numbering (e.g. LD-116...)
  const leadsSnap = await getDocs(collection(db, 'leads'));
  let maxIdNum = 115;
  leadsSnap.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.leadId && data.leadId.startsWith('LD-')) {
      const num = parseInt(data.leadId.replace('LD-', ''), 10);
      if (!isNaN(num) && num > maxIdNum) {
        maxIdNum = num;
      }
    }
  });

  // Batch operations in chunks of 350 to respect Firestore 500 limit
  const batches: ReturnType<typeof writeBatch>[] = [];
  let currentBatch = writeBatch(db);
  let opCount = 0;

  const pushOp = () => {
    opCount++;
    if (opCount >= 350) {
      batches.push(currentBatch);
      currentBatch = writeBatch(db);
      opCount = 0;
    }
  };

  // 1. Remove non-sheet leads if mirror mode enabled (defaults to true)
  if (options.removeLeadsNotInSheet !== false && diff.toRemove && diff.toRemove.length > 0) {
    for (const lead of diff.toRemove) {
      currentBatch.delete(doc(db, 'leads', lead.id));
      pushOp();
      removedCount++;
    }
  }

  // 2. Process New Leads
  for (const candidate of diff.toCreate) {
    maxIdNum++;
    const idSuffix = String(maxIdNum).padStart(3, '0');
    const leadId = `LD-${idSuffix}`;
    const docId = `lead-${candidate.email ? candidate.email.replace(/[^a-zA-Z0-9]/g, '_') : `sheet_${idSuffix}`}`;

    const leadRecord = cleanForFirestore({
      id: docId,
      leadId,
      name: candidate.name,
      email: candidate.email || `candidate_${idSuffix}@internshome.com`,
      phone: candidate.phone,
      city: candidate.city || 'Kolkata',
      cvUrl: candidate.cvUrl || '',
      willingHazraTraining: candidate.willingHazraTraining,
      hasLaptop: candidate.hasLaptop,
      laptopModel: candidate.laptopModel,
      device: candidate.device,
      brandAssigned: candidate.brandAssigned,
      batchNumber: candidate.batchNumber,
      placementCompany: candidate.placementCompany,
      college: candidate.college || 'University Partner',
      course: candidate.course || 'Undergraduate Degree',
      graduationYear: candidate.collegeYear || '2026',
      source: candidate.source || 'Google Sheet Master',
      status: resolveLeadStatus(candidate.status),
      interestArea: candidate.responsibilities || 'Creative Intern',
      notes: [
        `Imported from Google Sheet: ${options.sheetTitle || 'Master CRM Sheet'} (Row ${candidate.rawRowIndex})`,
        candidate.status ? `Sheet Status: ${candidate.status}` : '',
        candidate.commitment ? `Commitment: ${candidate.commitment}` : '',
        candidate.willingHazraTraining ? `Hazra Office: ${candidate.willingHazraTraining}` : '',
        candidate.hasLaptop ? `Laptop: ${candidate.hasLaptop} ${candidate.laptopModel ? `(${candidate.laptopModel})` : ''}` : '',
        candidate.brandAssigned ? `Brand: ${candidate.brandAssigned}` : '',
        candidate.placementCompany ? `Placement: ${candidate.placementCompany}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      createdAt: safeIsoDate(candidate.timestamp, now),
      updatedAt: now,
    });

    currentBatch.set(doc(db, 'leads', docId), leadRecord, { merge: true });
    pushOp();
    createdCount++;
  }

  // 2. Process Updates for Existing Leads
  for (const item of diff.toUpdate) {
    const leadRef = doc(db, 'leads', item.existingLead.id);
    const updates: Record<string, any> = {
      updatedAt: now,
    };

    if (options.updateExistingStatus && item.incoming.status) {
      updates.status = resolveLeadStatus(item.incoming.status);
    }

    if (options.updateExistingFields) {
      if (item.incoming.phone) updates.phone = item.incoming.phone;
      if (item.incoming.cvUrl) updates.cvUrl = item.incoming.cvUrl;
      if (item.incoming.city) updates.city = item.incoming.city;
      if (item.incoming.brandAssigned) updates.brandAssigned = item.incoming.brandAssigned;
      if (item.incoming.batchNumber !== undefined) updates.batchNumber = item.incoming.batchNumber;
      if (item.incoming.placementCompany) updates.placementCompany = item.incoming.placementCompany;
      if (item.incoming.college && !item.existingLead.college) updates.college = item.incoming.college;
      if (item.incoming.course && !item.existingLead.course) updates.course = item.incoming.course;
      if (item.incoming.collegeYear) updates.graduationYear = item.incoming.collegeYear;
      if (item.incoming.willingHazraTraining) updates.willingHazraTraining = item.incoming.willingHazraTraining;
      if (item.incoming.hasLaptop) updates.hasLaptop = item.incoming.hasLaptop;
      if (item.incoming.laptopModel) updates.laptopModel = item.incoming.laptopModel;
      if (item.incoming.device) updates.device = item.incoming.device;
    }

    // Append sync note
    if (item.changes.length > 0) {
      const syncNote = `\n[Google Sheet Synced ${new Date().toLocaleDateString('en-IN')}: ${item.changes.join(', ')}]`;
      updates.notes = (item.existingLead.notes || '') + syncNote;
    }

    currentBatch.set(leadRef, cleanForFirestore(updates), { merge: true });
    pushOp();
    updatedCount++;

    // Optional student sync if lead is linked to student
    if (options.updateStudentRecords && item.existingLead.studentId) {
      const studentRef = doc(db, 'students', item.existingLead.studentId);
      const studentUpdates: Record<string, any> = { updatedAt: now };
      if (item.incoming.phone) studentUpdates.phone = item.incoming.phone;
      if (item.incoming.city) studentUpdates.location = item.incoming.city;
      if (item.incoming.brandAssigned) studentUpdates.assignedBrand = item.incoming.brandAssigned;
      if (item.incoming.batchNumber) studentUpdates.batchNumber = item.incoming.batchNumber;
      if (item.incoming.placementCompany) studentUpdates.placementCompany = item.incoming.placementCompany;

      currentBatch.set(studentRef, cleanForFirestore(studentUpdates), { merge: true });
      pushOp();
    }
  }

  // Push final batch
  if (opCount > 0) {
    batches.push(currentBatch);
  }

  // Commit all batches
  for (const b of batches) {
    await b.commit();
  }

  // Activity Log
  try {
    await logActivity({
      entityType: 'lead',
      entityId: 'google-sheets-sync',
      entityTitle: options.sheetTitle || 'Google Sheet Sync',
      action: 'Synced Google Sheet',
      actorName: 'Google Sheets Integration',
      actorRole: 'Administrator',
      details: `Synced ${diff.totalSheetRows} rows: ${createdCount} new leads created, ${updatedCount} leads updated, ${removedCount} non-sheet leads removed for 1:1 parity.`,
    });
  } catch (err) {
    console.warn('Could not log sync activity:', err);
  }

  // Update sync settings metadata
  try {
    await saveGoogleSheetsConfig({
      lastSyncedAt: now,
      lastSyncStatus: 'success',
      lastSyncCount: createdCount + updatedCount,
      lastSyncSummary: `${createdCount} created, ${updatedCount} updated, ${removedCount} non-sheet leads removed (exact mirror).`,
    });
  } catch (err) {
    console.warn('Could not save google sheets config metadata:', err);
  }

  return {
    createdCount,
    updatedCount,
    removedCount,
    totalSynced: createdCount + updatedCount,
  };
}
