import { RentInternJob, NormalizedRole } from '../types/crm';
import { calculateJobPricing, CalculationResult } from './pricingService';

export interface ExtractedBriefData {
  client: string;
  pocName?: string;
  pocPhone?: string;
  role: string;
  normalizedRole: NormalizedRole;
  numberOfInterns: number;
  venue: string;
  area: string;
  city: string;
  remoteType: 'On-site' | 'Remote' | 'Hybrid';
  dates: string[];
  startTime: string;
  endTime: string;
  numberOfDays: number;
  durationHours: number;
  primaryTask: string;
  additionalTasks: string[];
  expectedDeliverables: string[];
  deliverableQuantity?: string;
  deliveryDeadline?: string;
  specialInstructions?: string;
  instagramUrl?: string;
  requiredSkills: string[];
  experienceRequirement?: string;
  equipmentRequired: string[];
  phoneRequirement?: string;
  cameraRequirement?: string;
  laptopRequirement?: string;
  askPhoneModel: boolean;
  askCameraModel: boolean;
  askPortfolio: boolean;
  askWorkSamples: boolean;
  askInstagram: boolean;
  askCollege: boolean;
  askYear: boolean;
  foodIncluded: boolean;
  travelIncluded: boolean;
  travelAmount: number;
  missingFields: string[];
  clarificationMessage: string;
  confidenceScore: number;
}

// Map informal client phrases to NormalizedRole
export function normalizeRoleHeuristic(text: string): NormalizedRole {
  const lower = text.toLowerCase();
  if (lower.includes('videograph') || lower.includes('video shoot') || lower.includes('camera person') || lower.includes('cameraman')) {
    return 'Videographer';
  }
  if (lower.includes('photograph') || lower.includes('photoshoot') || lower.includes('picture')) {
    return 'Photographer';
  }
  if (lower.includes('edit') && (lower.includes('reel') || lower.includes('video'))) {
    return 'Video Editor';
  }
  if (lower.includes('reel') || lower.includes('content') || lower.includes('creator') || lower.includes('story') || lower.includes('stories') || lower.includes('ugc')) {
    return 'Content Creator';
  }
  if (lower.includes('registration') || lower.includes('desk') || lower.includes('check in') || lower.includes('badge')) {
    return 'Event Registration';
  }
  if (lower.includes('stall') || lower.includes('booth') || lower.includes('exhibition') || lower.includes('expo')) {
    return 'Stall Support';
  }
  if (lower.includes('promot') || lower.includes('flyer') || lower.includes('pamphlet') || lower.includes('canvass')) {
    return 'Promoter';
  }
  if (lower.includes('survey') || lower.includes('research') || lower.includes('market study')) {
    return 'Research Intern';
  }
  if (lower.includes('data entry') || lower.includes('excel') || lower.includes('sheet compiling')) {
    return 'Data Entry';
  }
  if (lower.includes('graphic') || lower.includes('poster') || lower.includes('canva') || lower.includes('photoshop')) {
    return 'Graphic Design';
  }
  if (lower.includes('host') || lower.includes('emcee') || lower.includes('presenter') || lower.includes('anchor')) {
    return 'Host / Presenter';
  }
  if (lower.includes('event') || lower.includes('usher') || lower.includes('guest') || lower.includes('hospitality')) {
    return 'Event Support';
  }
  return 'Event Support';
}

// Generate the standardized WhatsApp Rent an Intern gig message
export function generateStandardizedWhatsAppGig(
  job: Partial<RentInternJob>,
  pricing?: CalculationResult
): string {
  const role = job.normalizedRole || job.role || 'Event Support';
  const pay = job.internPayment || pricing?.totalInternPayment || 1000;
  const payPerIntern = job.numberOfInterns && job.numberOfInterns > 1
    ? Math.round(pay / job.numberOfInterns)
    : pay;

  const venueStr = [job.location?.venue, job.location?.area].filter(Boolean).join(', ') || 'Kolkata';
  const dateStr = (job.dates && job.dates.length > 0) ? job.dates.join(', ') : 'Immediate';
  const timeStr = (job.startTime && job.endTime) ? `${job.startTime} to ${job.endTime}` : 'TBD';
  const brandStr = job.client || 'Client Event';

  // Scope bullets
  const scopeItems: string[] = [];
  if (job.primaryTask) scopeItems.push(`• ${job.primaryTask}`);
  if (job.additionalTasks && job.additionalTasks.length > 0) {
    job.additionalTasks.forEach((t) => scopeItems.push(`• ${t}`));
  }
  if (job.expectedDeliverables && job.expectedDeliverables.length > 0) {
    scopeItems.push(`• Expected deliverable: ${job.expectedDeliverables.join(', ')}`);
  }
  if (job.deliveryDeadline) {
    scopeItems.push(`• Delivery deadline: ${job.deliveryDeadline}`);
  }
  if (scopeItems.length === 0) {
    scopeItems.push(`• On-site gig duties and coordination`);
  }

  // Who should apply bullets
  const applyItems: string[] = [];
  applyItems.push(`• Interested in ${role}`);
  if (job.requiredSkills && job.requiredSkills.length > 0) {
    applyItems.push(`• Comfortable with ${job.requiredSkills.slice(0, 3).join(', ')}`);
  }
  applyItems.push(`• Reliable and available for the complete duration`);
  if (job.equipmentRequired && job.equipmentRequired.length > 0 && !job.equipmentRequired.includes('None')) {
    applyItems.push(`• Has access to ${job.equipmentRequired.join(', ')}`);
  }

  // Payment section
  let paymentText = `Payment: ₹${pay.toLocaleString('en-IN')}`;
  if (job.numberOfInterns && job.numberOfInterns > 1) {
    paymentText += ` (₹${payPerIntern.toLocaleString('en-IN')} per intern)`;
  }

  const paymentPerks: string[] = [];
  if (job.travelIncluded || (job.travelAmount && job.travelAmount > 0)) {
    paymentPerks.push(`₹${job.travelAmount || 200} travel allowance`);
  }
  if (job.foodIncluded) {
    paymentPerks.push(`Food / Meals provided on-site`);
  }
  if (job.otherReimbursement) {
    paymentPerks.push(job.otherReimbursement);
  }

  // Application DM questions (omit irrelevant questions)
  const dmQuestions: string[] = [
    '1. Your name and phone number',
    '2. College and year',
  ];

  let qIndex = 3;
  if (job.askPhoneModel) {
    dmQuestions.push(`${qIndex++}. Phone model (e.g. iPhone 13 / Samsung S23)`);
  }
  if (job.askCameraModel) {
    dmQuestions.push(`${qIndex++}. Camera model & lens details`);
  }
  if (job.askWorkSamples || job.askPortfolio) {
    dmQuestions.push(`${qIndex++}. Sample links to past work / portfolio`);
  }
  if (job.askInstagram) {
    dmQuestions.push(`${qIndex++}. Instagram profile handle / link`);
  }
  dmQuestions.push(`${qIndex}. Confirmation of complete availability for date & timing`);

  // Assemble the message
  let message = `🚨 RENT AN INTERN GIG | PAID ₹${payPerIntern.toLocaleString('en-IN')}\n\n`;
  message += `🎯 Role: ${role}\n\n`;
  message += `📍 Location: ${venueStr}\n`;
  message += `📅 Date: ${dateStr}\n`;
  message += `⏰ Time: ${timeStr}\n`;
  message += `🏷️ Brand/Event: ${brandStr}\n`;

  if (job.instagramUrl) {
    message += `🔗 Instagram/Page: ${job.instagramUrl}\n`;
  }

  message += `\nScope of Work:\n${scopeItems.join('\n')}\n\n`;
  message += `Who Should Apply:\n${applyItems.join('\n')}\n\n`;
  message += `${paymentText}\n`;

  if (paymentPerks.length > 0) {
    message += `Payment includes: ${paymentPerks.join(', ')}\n`;
  }

  message += `\nTo apply, DM:\n\n${dmQuestions.join('\n')}\n\n`;
  message += `Limited slots. Apply only if you are fully available.`;

  return message;
}

// Client-side fallback extraction (resilient against network or missing server key)
export function fallbackExtractBrief(
  brief: string,
  clarification?: string,
  existing?: Partial<ExtractedBriefData>
): ExtractedBriefData {
  const combined = `${brief} ${clarification || ''}`.trim();
  const lower = combined.toLowerCase();

  // Extract number of interns
  let numberOfInterns = existing?.numberOfInterns || 1;
  const matchKids = combined.match(/(\d+)\s*(people|interns?|persons?|girls?|boys?|kids?)/i);
  if (matchKids) {
    numberOfInterns = parseInt(matchKids[1], 10);
  } else if (/two\s*(people|interns?|persons?)/i.test(combined)) {
    numberOfInterns = 2;
  } else if (/three\s*(people|interns?|persons?)/i.test(combined)) {
    numberOfInterns = 3;
  } else if (/four\s*(people|interns?|persons?)/i.test(combined)) {
    numberOfInterns = 4;
  }

  // Extract Venue
  let venue = existing?.venue || '';
  let area = existing?.area || '';
  if (/taj\s*bengal/i.test(combined)) {
    venue = 'Taj Bengal';
    area = 'Alipore';
  } else if (/itc\s*sonar/i.test(combined)) {
    venue = 'ITC Sonar';
    area = 'EM Bypass';
  } else if (/itc\s*royal/i.test(combined)) {
    venue = 'ITC Royal Bengal';
    area = 'EM Bypass';
  } else if (/biswa\s*bangla/i.test(combined)) {
    venue = 'Biswa Bangla Mela Prangan';
    area = 'Park Circus';
  } else if (/park\s*street/i.test(combined)) {
    venue = 'Park Street Outlet';
    area = 'Park Street';
  } else if (/sector\s*v/i.test(combined) || /salt\s*lake/i.test(combined)) {
    venue = 'Salt Lake Tech Hub';
    area = 'Sector V';
  } else if (/ballygunge/i.test(combined)) {
    venue = 'Ballygunge Location';
    area = 'Ballygunge';
  }

  // Extract Dates
  const dates: string[] = existing?.dates && existing.dates.length > 0 ? [...existing.dates] : [];
  if (/tomorrow/i.test(combined) && !dates.includes('Tomorrow')) dates.push('Tomorrow');
  if (/saturday/i.test(combined) && !dates.includes('This Saturday')) dates.push('This Saturday');
  if (/sunday/i.test(combined) && !dates.includes('This Sunday')) dates.push('This Sunday');
  const dateMatch = combined.match(/(\d{1,2}(?:st|nd|rd|th)?\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*)/i);
  if (dateMatch && !dates.includes(dateMatch[1])) dates.push(dateMatch[1]);
  if (dates.length === 0) dates.push('Immediate / Upcoming');

  // Extract Timings
  let startTime = existing?.startTime || '03:00 PM';
  let endTime = existing?.endTime || '08:00 PM';
  const matchRange = combined.match(/(\d{1,2})(?::(\d{2}))?\s*(?:to|-)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (matchRange) {
    let s = parseInt(matchRange[1], 10);
    let e = parseInt(matchRange[3], 10);
    const pm = matchRange[5]?.toLowerCase() === 'pm' || s >= 12 || e <= 11;
    if (s < 12 && s >= 1 && s <= 8) s += 12;
    if (e < 12 && e >= 1 && e <= 11) e += 12;

    const sStr = s > 12 ? `${s - 12}:00 PM` : `${s}:00 ${s === 12 ? 'PM' : 'AM'}`;
    const eStr = e > 12 ? `${e - 12}:00 PM` : `${e}:00 ${e === 12 ? 'PM' : 'AM'}`;
    startTime = sStr;
    endTime = eStr;
  }

  // Normalized Role
  const normalizedRole = existing?.normalizedRole || normalizeRoleHeuristic(combined);

  // Client Name
  let client = existing?.client || '';
  if (/itc/i.test(combined)) client = 'ITC Sonar / Royal Bengal';
  else if (/taj/i.test(combined)) client = 'Taj Bengal';
  else if (/ace\s*blend/i.test(combined)) client = 'Ace Blend';
  else if (/annacat/i.test(combined)) client = 'AnnaCat';
  else if (/grisa/i.test(combined)) client = 'Grisa';
  else if (!client) client = 'Client Partner';

  // Tasks & Scope
  const primaryTask =
    existing?.primaryTask ||
    (normalizedRole === 'Content Creator'
      ? 'Shoot engaging reels and capture behind-the-scenes moments'
      : normalizedRole === 'Event Registration'
      ? 'Manage front desk registration and welcome guests'
      : normalizedRole === 'Stall Support'
      ? 'Manage stall visitor flow, distribute brochures, and record lead details'
      : 'Assist on-site event coordination and hospitality');

  const additionalTasks = existing?.additionalTasks || [
    'Coordinate with on-site supervisor for task handoff',
  ];

  // Equipment & Application Questions
  const isCreator = ['Content Creator', 'Videographer', 'Photographer', 'Video Editor'].includes(normalizedRole);
  const equipmentRequired = isCreator
    ? ['Smartphone with high-resolution camera (iPhone 12+ / Galaxy S)']
    : ['None'];

  const askPhoneModel = isCreator;
  const askWorkSamples = isCreator;
  const askCameraModel = normalizedRole === 'Videographer' || normalizedRole === 'Photographer';

  // Food & Travel
  const foodIncluded = /food|dinner|lunch|snacks|refreshments/i.test(combined);
  const travelIncluded = /travel|cab|reimburse/i.test(combined) || endTime.includes('PM');
  const travelAmount = travelIncluded ? 200 : 0;

  // Identify Missing Fields
  const missingFields: string[] = [];
  if (!venue) missingFields.push('Exact Venue / Location address');
  if (!combined.match(/\d/)) missingFields.push('Start & End Time');
  if (isCreator && !/reels?|posts?|deliverable|deliver/i.test(combined)) {
    missingFields.push('Number of reels or exact deliverables expected');
  }
  if (isCreator && !/phone|camera|equipment/i.test(combined)) {
    missingFields.push('Equipment requirement (phone or professional camera)');
  }
  if (!foodIncluded && !/no food/i.test(combined)) {
    missingFields.push('Whether food/refreshments will be provided');
  }

  // Very short WhatsApp clarification message
  let clarificationMessage = '';
  if (missingFields.length > 0) {
    const questions = missingFields.slice(0, 3).map((m, i) => `${i + 1}. ${m}?`);
    clarificationMessage = `Sure! Just need ${questions.length} quick details to line up the best interns:\n${questions.join('\n')}`;
  }

  return {
    client,
    role: existing?.role || normalizedRole,
    normalizedRole,
    numberOfInterns,
    venue: venue || 'Venue to be confirmed',
    area: area || 'Kolkata',
    city: 'Kolkata',
    remoteType: 'On-site',
    dates,
    startTime,
    endTime,
    numberOfDays: 1,
    durationHours: 5,
    primaryTask,
    additionalTasks,
    expectedDeliverables: existing?.expectedDeliverables || ['Raw footage / event tasks logged'],
    deliveryDeadline: isCreator ? 'Within 24 hours of shoot' : 'End of gig shift',
    requiredSkills: isCreator ? ['Reel Shoot', 'Punctuality'] : ['Hospitality', 'Punctuality'],
    equipmentRequired,
    askPhoneModel,
    askCameraModel,
    askPortfolio: false,
    askWorkSamples,
    askInstagram: isCreator,
    askCollege: true,
    askYear: true,
    foodIncluded,
    travelIncluded,
    travelAmount,
    missingFields,
    clarificationMessage,
    confidenceScore: 0.88,
  };
}

// Unified call to analyze brief (Server Gemini with client fallback)
export async function analyzeClientBrief(params: {
  brief: string;
  clarification?: string;
  existingJob?: Partial<ExtractedBriefData>;
}): Promise<ExtractedBriefData> {
  try {
    const res = await fetch('/api/ai/analyze-brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.data) {
        return {
          ...data.data,
          dates: Array.isArray(data.data.dates) ? data.data.dates : [data.data.dates || 'Immediate'],
          equipmentRequired: Array.isArray(data.data.equipmentRequired)
            ? data.data.equipmentRequired
            : [data.data.equipmentRequired || 'None'],
          requiredSkills: Array.isArray(data.data.requiredSkills) ? data.data.requiredSkills : [],
          additionalTasks: Array.isArray(data.data.additionalTasks) ? data.data.additionalTasks : [],
          expectedDeliverables: Array.isArray(data.data.expectedDeliverables)
            ? data.data.expectedDeliverables
            : [],
          missingFields: Array.isArray(data.data.missingFields) ? data.data.missingFields : [],
        };
      }
    }
  } catch (err) {
    console.warn('Server brief analysis failed, using fallback parser:', err);
  }

  // Graceful client fallback
  return fallbackExtractBrief(params.brief, params.clarification, params.existingJob);
}
