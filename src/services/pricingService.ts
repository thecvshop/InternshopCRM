import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { PricingRule, NormalizedRole } from '../types/crm';
import { logActivity } from './firestoreService';

export const DEFAULT_PRICING_RULES: PricingRule[] = [
  {
    id: 'pr-default',
    roleCategory: 'Default',
    minDurationHours: 3,
    maxDurationHours: 12,
    baseInternPayment: 1000, // up to 4 hours
    additionalHourRate: 200, // per hour beyond 4 hours
    clientRate: 1500, // base client billing up to 4 hrs
    internRate: 1000,
    weekendMultiplier: 1.0,
    lateNightRule: {
      startAfter: '20:00',
      bonus: 200, // travel allowance after 8 PM
    },
    travelRule: {
      defaultTravel: 0,
      conditionNotes: '₹200 added if location is distant or late night',
    },
    effectiveFrom: '2025-01-01',
    active: true,
  },
  {
    id: 'pr-content-creator',
    roleCategory: 'Content Creator',
    minDurationHours: 3,
    maxDurationHours: 10,
    baseInternPayment: 1200, // 3-4 hours
    additionalHourRate: 250,
    clientRate: 1800,
    internRate: 1200,
    weekendMultiplier: 1.0,
    lateNightRule: {
      startAfter: '20:00',
      bonus: 200,
    },
    travelRule: {
      defaultTravel: 0,
      conditionNotes: 'Include travel if shoot involves multiple spots',
    },
    effectiveFrom: '2025-01-01',
    active: true,
  },
  {
    id: 'pr-videographer',
    roleCategory: 'Videographer',
    minDurationHours: 4,
    maxDurationHours: 10,
    baseInternPayment: 1750, // 4-5 hours standard
    additionalHourRate: 300,
    clientRate: 2500,
    internRate: 1750,
    weekendMultiplier: 1.0,
    lateNightRule: {
      startAfter: '20:00',
      bonus: 200,
    },
    travelRule: {
      defaultTravel: 200,
      conditionNotes: 'Equipment carry allowance ₹200 standard',
    },
    effectiveFrom: '2025-01-01',
    active: true,
  },
  {
    id: 'pr-photographer',
    roleCategory: 'Photographer',
    minDurationHours: 4,
    maxDurationHours: 10,
    baseInternPayment: 1500,
    additionalHourRate: 250,
    clientRate: 2200,
    internRate: 1500,
    weekendMultiplier: 1.0,
    lateNightRule: {
      startAfter: '20:00',
      bonus: 200,
    },
    travelRule: {
      defaultTravel: 200,
      conditionNotes: 'Equipment carry allowance ₹200',
    },
    effectiveFrom: '2025-01-01',
    active: true,
  },
  {
    id: 'pr-event-support',
    roleCategory: 'Event Support',
    minDurationHours: 4,
    maxDurationHours: 12,
    baseInternPayment: 1000,
    additionalHourRate: 150,
    clientRate: 1400,
    internRate: 1000,
    weekendMultiplier: 1.0,
    lateNightRule: {
      startAfter: '21:00',
      bonus: 250,
    },
    travelRule: {
      defaultTravel: 0,
      conditionNotes: 'Food must be provided by event client',
    },
    effectiveFrom: '2025-01-01',
    active: true,
  },
  {
    id: 'pr-event-registration',
    roleCategory: 'Event Registration',
    minDurationHours: 4,
    maxDurationHours: 10,
    baseInternPayment: 1000,
    additionalHourRate: 150,
    clientRate: 1400,
    internRate: 1000,
    weekendMultiplier: 1.0,
    lateNightRule: {
      startAfter: '21:00',
      bonus: 200,
    },
    travelRule: {
      defaultTravel: 0,
    },
    effectiveFrom: '2025-01-01',
    active: true,
  },
  {
    id: 'pr-stall-support',
    roleCategory: 'Stall Support',
    minDurationHours: 6,
    maxDurationHours: 12,
    baseInternPayment: 1200,
    additionalHourRate: 150,
    clientRate: 1600,
    internRate: 1200,
    weekendMultiplier: 1.1,
    lateNightRule: {
      startAfter: '20:00',
      bonus: 200,
    },
    travelRule: {
      defaultTravel: 0,
    },
    effectiveFrom: '2025-01-01',
    active: true,
  },
];

// Helper to parse time strings like "4:00 PM", "04:00 PM", "16:00", "4 PM", "4 to 9", etc.
export function parseTimeStringTo24Hours(timeStr: string): number | null {
  if (!timeStr) return null;
  const clean = timeStr.trim().toLowerCase();

  // Try matching 12-hour format e.g. "4:30 pm" or "4 pm"
  const match12 = clean.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = match12[2] ? parseInt(match12[2], 10) : 0;
    const period = match12[3];

    if (period === 'pm' && hours < 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    return hours + minutes / 60;
  }

  // Try matching 24-hour format e.g. "16:00"
  const match24 = clean.match(/(\d{1,2}):(\d{2})/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    return hours + minutes / 60;
  }

  // Try raw integer e.g. "4" or "9"
  const matchNum = clean.match(/^(\d{1,2})$/);
  if (matchNum) {
    let num = parseInt(matchNum[1], 10);
    // If between 1 and 6, often PM in typical shift contexts, or assume 24h
    if (num >= 1 && num <= 6) num += 12;
    return num;
  }

  return null;
}

// Calculate duration in hours from start and end time strings
export function calculateDurationHours(startTime: string, endTime: string): number {
  const start = parseTimeStringTo24Hours(startTime);
  const end = parseTimeStringTo24Hours(endTime);

  if (start === null || end === null) return 4; // fallback standard 4 hours

  let duration = end - start;
  if (duration <= 0) {
    // Overnight or passed midnight
    duration += 24;
  }
  return Math.max(1, Math.round(duration * 10) / 10);
}

// Subscribe to pricing rules in Firestore
export function subscribePricingRules(callback: (rules: PricingRule[]) => void) {
  const colRef = collection(db, 'pricingRules');
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.empty) {
        callback(DEFAULT_PRICING_RULES);
      } else {
        const list: PricingRule[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as PricingRule);
        });
        callback(list.length > 0 ? list : DEFAULT_PRICING_RULES);
      }
    },
    (err) => {
      console.warn('subscribePricingRules fallback to defaults:', err);
      callback(DEFAULT_PRICING_RULES);
    }
  );
}

// Seed default rules if Firestore collection is empty
export async function seedDefaultPricingRules() {
  const colRef = collection(db, 'pricingRules');
  const snap = await getDocs(colRef);
  if (snap.empty) {
    const batch = writeBatch(db);
    for (const rule of DEFAULT_PRICING_RULES) {
      batch.set(doc(db, 'pricingRules', rule.id), rule);
    }
    await batch.commit();
  }
}

// Save or update a pricing rule
export async function savePricingRule(rule: PricingRule) {
  const docRef = doc(db, 'pricingRules', rule.id);
  await setDoc(docRef, rule, { merge: true });
}

// Delete a pricing rule
export async function deletePricingRule(ruleId: string) {
  await deleteDoc(doc(db, 'pricingRules', ruleId));
}

// Calculate exact Intern Payment & Client Charge
export interface CalculationResult {
  ruleId: string;
  durationHours: number;
  numberOfInterns: number;
  numberOfDays: number;
  basePay: number;
  additionalHoursPay: number;
  overtimePay: number;
  travelAllowance: number;
  totalInternPayment: number;
  totalClientCharge: number;
  totalClientCommercial: number;
  perInternPay: number;
  perInternClientCharge: number;
  breakdownNotes: string;
}

export function calculateJobPricing(params: {
  role: string;
  normalizedRole?: string;
  startTime: string;
  endTime: string;
  numberOfInterns?: number;
  numberOfDays?: number;
  travelIncluded?: boolean;
  travelAmountOverride?: number;
  pricingRules?: PricingRule[];
}): CalculationResult {
  const rules = params.pricingRules && params.pricingRules.length > 0
    ? params.pricingRules
    : DEFAULT_PRICING_RULES;

  const targetRole = (params.normalizedRole || params.role || '').toLowerCase();
  const rule =
    rules.find((r) => r.active && r.roleCategory.toLowerCase() === targetRole) ||
    rules.find((r) => r.active && r.roleCategory === 'Default') ||
    DEFAULT_PRICING_RULES[0];

  const durationHours = calculateDurationHours(params.startTime, params.endTime);
  const numberOfInterns = Math.max(1, params.numberOfInterns || 1);
  const numberOfDays = Math.max(1, params.numberOfDays || 1);

  // Base tier up to 4 hours
  const baseHours = 4;
  const basePay = rule.baseInternPayment;
  const baseClient = rule.clientRate;

  // Additional hours beyond base
  const extraHours = Math.max(0, durationHours - baseHours);
  const additionalHoursPay = extraHours * rule.additionalHourRate;
  const additionalHoursClient = extraHours * (rule.additionalHourRate * 1.4);

  // Check late night rule
  let lateNightBonus = 0;
  const endHoursNum = parseTimeStringTo24Hours(params.endTime);
  if (endHoursNum !== null && endHoursNum >= 20) {
    lateNightBonus = rule.lateNightRule?.bonus || 200;
  }

  // Travel calculation
  let travelAllowance = 0;
  if (params.travelAmountOverride !== undefined) {
    travelAllowance = params.travelAmountOverride;
  } else if (params.travelIncluded || rule.travelRule.defaultTravel > 0 || lateNightBonus > 0) {
    travelAllowance = Math.max(rule.travelRule.defaultTravel, lateNightBonus);
  }

  // Total for 1 intern for 1 day
  const singleInternDailyPay = basePay + additionalHoursPay + travelAllowance;
  const singleInternDailyClient = baseClient + additionalHoursClient + travelAllowance;

  // Grand totals across all interns and days
  const totalInternPayment = singleInternDailyPay * numberOfInterns * numberOfDays;
  const totalClientCharge = singleInternDailyClient * numberOfInterns * numberOfDays;

  const breakdownNotes = `${durationHours} hrs × ${numberOfInterns} intern(s) (${rule.roleCategory} rate: ₹${basePay} base + ₹${additionalHoursPay} extra + ₹${travelAllowance} travel)`;

  return {
    ruleId: rule.id,
    durationHours,
    numberOfInterns,
    numberOfDays,
    basePay,
    additionalHoursPay,
    overtimePay: 0,
    travelAllowance,
    totalInternPayment,
    totalClientCharge,
    totalClientCommercial: totalClientCharge,
    perInternPay: singleInternDailyPay,
    perInternClientCharge: singleInternDailyClient,
    breakdownNotes,
  };
}
