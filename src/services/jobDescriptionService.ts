import { db } from '../lib/firebase/config';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { CompleteJobDescription, JobCategory, ClarificationQuestion } from '../types/crm';

export interface AnalyzeBriefRequest {
  brief: string;
  jobCategory: JobCategory;
  company?: {
    name: string;
    website?: string;
    logoUrl?: string;
    location?: string;
    about?: string;
  };
  clarification?: string;
  existingJob?: any;
}

export interface AnalyzeBriefResult {
  extractedData: any;
  clarificationQuestions: ClarificationQuestion[];
  missingFields: string[];
  clarificationMessage: string;
}

// -------------------------------------------------------------
// Intelligent Entity Detection for Raw Briefs
// -------------------------------------------------------------
export function detectBriefEntities(brief: string) {
  const text = (brief || '').trim();

  // 1. Detect Timings (e.g. "7am - 11am", "7 am to 11 am", "4pm - 9pm", "10am to 7pm", "4 to 9")
  let startTime = '';
  let endTime = '';
  let durationHours = 4;
  let hasTimings = false;

  const timeRangeMatch = text.match(/(?:from\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:-|–|—|to)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);

  if (timeRangeMatch) {
    hasTimings = true;
    const rawStart = timeRangeMatch[1].trim();
    const rawEnd = timeRangeMatch[2].trim();

    const normalizeTime = (t: string, refAmPm?: string) => {
      let isPm = /pm/i.test(t);
      let isAm = /am/i.test(t);
      if (!isAm && !isPm && refAmPm) {
        isPm = /pm/i.test(refAmPm);
        isAm = /am/i.test(refAmPm);
      }
      const numMatch = t.match(/(\d{1,2})(?::(\d{2}))?/);
      if (!numMatch) return t;
      let hours = parseInt(numMatch[1], 10);
      const mins = numMatch[2] || '00';
      if (isPm && hours < 12) hours += 12;
      if (isAm && hours === 12) hours = 0;
      const displayHours = hours % 12 || 12;
      const suffix = hours >= 12 ? 'PM' : 'AM';
      return `${String(displayHours).padStart(2, '0')}:${mins} ${suffix}`;
    };

    const refSuffix = /pm/i.test(rawEnd) ? 'pm' : /am/i.test(rawEnd) ? 'am' : undefined;
    startTime = normalizeTime(rawStart, refSuffix);
    endTime = normalizeTime(rawEnd);

    const parseHour = (str: string) => {
      const match = str.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/);
      if (!match) return 4;
      let h = parseInt(match[1], 10);
      if (match[3] === 'PM' && h < 12) h += 12;
      if (match[3] === 'AM' && h === 12) h = 0;
      return h + parseInt(match[2], 10) / 60;
    };
    const s = parseHour(startTime);
    const e = parseHour(endTime);
    durationHours = e > s ? e - s : 4;
  }

  // 2. Detect Dates
  let dates: string[] = [];
  let numberOfDays = 1;
  const dateMatch = text.match(/\b(\d{1,2}(?:st|nd|rd|th)?\s*(?:&|and|,)\s*\d{1,2}(?:st|nd|rd|th)?\s*(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?))\b/i)
    || text.match(/\b(\d{1,2}(?:st|nd|rd|th)?\s*(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?))\b/i);

  if (dateMatch) {
    dates = [dateMatch[1].trim()];
    if (/&|and|,/i.test(dateMatch[1])) {
      numberOfDays = 2;
    }
  } else if (/tomorrow/i.test(text)) {
    dates = ['Tomorrow'];
  } else if (/this saturday/i.test(text)) {
    dates = ['This Saturday'];
  } else if (/this sunday/i.test(text)) {
    dates = ['This Sunday'];
  }

  // 3. Detect Venue
  let venue = '';
  const venueMatch = text.match(/(?:at|venue|location)\s+([A-Z0-9][a-zA-Z0-9\s,&/'-]+(?:Arena|Hotel|Cafe|Club|Park|Bhavan|Mela|Hub|Center|Centre|Plaza|Street|Avenue|Stadium|Kolkata))/i)
    || text.match(/at\s+([A-Z][a-zA-Z0-9\s]+?)(?:,|\.|\s+for|\s+from|\s+on|\s*$)/i);
  if (venueMatch) {
    venue = venueMatch[1].trim();
  }

  // 4. Detect Content Coverage / Shooting
  const isContentCoverageOrShoot = /content coverage|coverage|shoot|shooting|videographer|bts|video shoot|cameraman|photographer|reels shoot/i.test(text);

  // 5. Detect Number of Interns
  let numberOfInterns = 1;
  let hasInternCount = false;
  const countMatch = text.match(/(\d+)\s*(?:people|person|interns?|creators?|kids?|photographers?|videographers?|ppl)/i);
  if (countMatch) {
    numberOfInterns = parseInt(countMatch[1], 10);
    hasInternCount = true;
  }

  // 6. Fixed InternsHome rate (Zero guessing)
  let internRatePerDay = 1000;
  if (durationHours <= 3) internRatePerDay = 1000;
  else if (durationHours < 5) internRatePerDay = Math.round(1000 + (durationHours - 3) * 375);
  else if (durationHours === 5) internRatePerDay = 1750;
  else if (durationHours < 8) internRatePerDay = Math.round(1750 + (durationHours - 5) * 350);
  else internRatePerDay = 2800;

  const totalInternPayPerDay = internRatePerDay + 200; // includes ₹200 travel

  return {
    hasTimings,
    startTime: startTime || '04:00 PM',
    endTime: endTime || '09:00 PM',
    durationHours,
    hasDates: dates.length > 0,
    dates: dates.length > 0 ? dates : ['Upcoming'],
    numberOfDays,
    hasVenue: !!venue,
    venue: venue || '',
    isContentCoverageOrShoot,
    hasInternCount,
    numberOfInterns,
    internPaymentPerKidPerDay: totalInternPayPerDay,
  };
}

/**
 * Calls server-side Gemini to analyze brief and return structured data + clarifying questions
 */
export async function analyzeBriefWithAi(req: AnalyzeBriefRequest): Promise<AnalyzeBriefResult> {
  const detected = detectBriefEntities(req.brief);

  try {
    const res = await fetch('/api/ai/analyze-brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });

    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}`);
    }

    const json = await res.json();
    if (!json.success || !json.data) {
      throw new Error(json.error || 'Failed to analyze brief');
    }

    const data = json.data;
    let questions: ClarificationQuestion[] = Array.isArray(data.clarificationQuestions)
      ? data.clarificationQuestions
      : generateSmartQuestions(req.jobCategory, detected);

    // Enforce strict post-filtering for BOTH renter and normal categories
    questions = questions.filter((q) => {
      const t = (String(q.question || '') + ' ' + String(q.id || '') + ' ' + String(q.context || '')).toLowerCase();
      // 1. NEVER ask budget / commercial / costs (InternsHome has standard fixed rates)
      if (
        t.includes('budget') ||
        t.includes('commercial') ||
        t.includes('cost') ||
        t.includes('payout') ||
        t.includes('rate') ||
        t.includes('fee') ||
        t.includes('price') ||
        t.includes('stipend') ||
        t.includes('salary') ||
        t.includes('compensation') ||
        t.includes('how much')
      ) {
        return false;
      }

      // 2. NEVER ask shift timings if detected in brief
      if (detected.hasTimings) {
        if (
          t.includes('timing') ||
          t.includes('shift') ||
          t.includes('hours') ||
          t.includes('schedule') ||
          t.includes('call time') ||
          t.includes('start time') ||
          t.includes('end time') ||
          t.includes('daily hours') ||
          t.includes('what time') ||
          t.includes('exact time') ||
          t.includes('time slot')
        ) {
          return false;
        }
      }

      // 3. For content coverage / shoot: deliverable MUST be shooting (never editing!)
      if (detected.isContentCoverageOrShoot) {
        if (
          t.includes('edit') ||
          t.includes('editing') ||
          t.includes('post-production') ||
          t.includes('reels edit') ||
          t.includes('turnaround time') ||
          t.includes('software for edit')
        ) {
          return false;
        }
      }

      // 4. NEVER ask venue if detected
      if (detected.hasVenue) {
        if (t.includes('venue') || t.includes('where is') || t.includes('exact location') || t.includes('office address')) {
          return false;
        }
      }

      // 5. NEVER ask dates if detected
      if (detected.hasDates) {
        if (t.includes('date') || t.includes('when is') || t.includes('which day')) {
          return false;
        }
      }

      return true;
    });

    if (questions.length === 0) {
      questions = generateSmartQuestions(req.jobCategory, detected);
    }

    return {
      extractedData: {
        ...data,
        dates: detected.hasDates ? detected.dates : data.dates,
        startTime: detected.hasTimings ? detected.startTime : data.startTime,
        endTime: detected.hasTimings ? detected.endTime : data.endTime,
        venue: detected.hasVenue ? detected.venue : data.venue,
        numberOfInterns: detected.hasInternCount ? detected.numberOfInterns : (data.numberOfInterns || 1),
      },
      clarificationQuestions: questions,
      missingFields: data.missingFields || [],
      clarificationMessage: data.clarificationMessage || '',
    };
  } catch (err: any) {
    console.warn('AI brief analysis failed, using structured local fallback:', err);
    return getLocalAnalysisFallback(req.brief, req.jobCategory, req.company, detected);
  }
}

/**
 * Calls server-side Gemini to generate complete, polished Job Description
 */
export async function generateCompleteJdWithAi(params: {
  jobCategory: JobCategory;
  company: {
    name: string;
    website?: string;
    logoUrl?: string;
    location?: string;
    about?: string;
  };
  rawBrief: string;
  extractedData: any;
  userAnswers: Record<string, string>;
}): Promise<CompleteJobDescription> {
  const d = detectBriefEntities(params.rawBrief);

  try {
    const res = await fetch('/api/ai/generate-complete-jd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}`);
    }

    const json = await res.json();
    if (!json.success || !json.data) {
      throw new Error(json.error || 'Failed to generate complete JD');
    }

    const data = json.data;
    const now = new Date().toISOString();

    const cLoc = d.hasVenue ? d.venue : (data.locationAddress || params.company.location || 'Kolkata, West Bengal');
    const timings = d.hasTimings ? `${d.startTime} - ${d.endTime}` : (data.timings || 'Standard Shift');
    const duration = d.hasDates ? `${d.dates.join(', ')} (${d.numberOfDays} Day${d.numberOfDays > 1 ? 's' : ''})` : (data.durationOrDates || 'Event Shift');

    const fixedPayText = params.jobCategory === 'normal'
      ? (data.compensationText || '₹12,000 - ₹15,000 / month')
      : `₹${d.internPaymentPerKidPerDay.toLocaleString()} / day per intern (Fixed Rate: ₹${(d.internPaymentPerKidPerDay - 200).toLocaleString()} base pay + ₹200 travel allowance)`;

    return {
      id: `jd-${Date.now()}`,
      jobCategory: params.jobCategory,
      jobTitle: data.jobTitle || (d.isContentCoverageOrShoot ? 'Event Content Creator & Videographer (Shooting Coverage)' : 'Event Support Intern'),
      companyName: params.company.name || 'Partner Company',
      companyLogoUrl: params.company.logoUrl || '',
      companyWebsite: params.company.website || '',
      companyLocation: params.company.location || 'Kolkata, India',
      companyAbout: data.companyAbout || params.company.about || '',
      department: data.department || (params.jobCategory === 'renter' ? 'On-ground Content Production' : 'Marketing & Growth'),
      employmentType: data.employmentType || (params.jobCategory === 'renter' ? `${d.numberOfDays}-Day Event Contract (Gig)` : '3-Month Internship (PPO Eligible)'),
      workMode: data.workMode || 'On-site',
      locationAddress: cLoc,
      openings: d.numberOfInterns,
      durationOrDates: duration,
      timings: timings,
      compensationText: fixedPayText,
      compensationAmount: d.internPaymentPerKidPerDay * d.numberOfDays,
      roleSummary: data.roleSummary || (d.isContentCoverageOrShoot
        ? `InternsHome is deploying an on-ground Content Creator & Videographer for ${params.company.name || 'our partner'} to shoot dynamic action footage and participant BTS coverage at ${cLoc}.`
        : 'Exciting opportunity to join the team and make an immediate impact.'),
      responsibilities: Array.isArray(data.responsibilities) && data.responsibilities.length > 0
        ? data.responsibilities
        : (d.isContentCoverageOrShoot
          ? [
              `Capture high-energy 4K vertical footage across all event stations during the ${timings} shift`,
              'Capture athlete PRs, high-intensity workout reps, candid sweat moments, and finish line celebrations',
              'Maintain steady gimbal framing, dynamic tracking shots, and sharp autofocus throughout',
              `Hand over all raw organized vertical clips via AirDrop or shared Google Drive folder right at ${d.endTime} on-site`,
            ]
          : ['Execute assigned operational and guest coordination tasks']),
      requirements: Array.isArray(data.requirements) && data.requirements.length > 0
        ? data.requirements
        : (d.isContentCoverageOrShoot
          ? [
              'Smartphone with 4K 60fps video capability (iPhone 13/14/15/16 preferred) or DSLR/Mirrorless camera',
              'Gimbal, stabilizer, or steady hand-held action tracking skills',
              'High energy and proactive on-ground presence in fitness/sports environments',
              `Punctual arrival 15 minutes before the ${d.startTime} start time`,
            ]
          : ['College student or recent graduate in Kolkata', 'Punctual and reliable execution']),
      preferredSkills: data.preferredSkills || (d.isContentCoverageOrShoot ? ['4K 60fps Mobile Videography', 'Sports / Athletic Action Tracking', 'Gimbal Stabilization'] : []),
      equipmentNeeded: data.equipmentNeeded || (d.isContentCoverageOrShoot ? ['iPhone (4K 60fps) or DSLR with stabilizer'] : ['Smart casual attire']),
      deliverables: data.deliverables || (d.isContentCoverageOrShoot ? [`30–50 high-resolution raw 4K vertical video clips (delivered on-site by ${d.endTime})`] : ['Event guest support checklist']),
      perksAndBenefits: Array.isArray(data.perksAndBenefits) && data.perksAndBenefits.length > 0
        ? data.perksAndBenefits
        : [
            'Official Gig Completion Certificate & Creator Network Badge',
            'Direct creator portfolio credit and client recommendation',
            'Guaranteed next-day payout directly to bank/UPI',
            'Food & refreshments provided on-site',
          ],
      selectionProcess: data.selectionProcess || ['Step 1: Creator Gear Verification', 'Step 2: Quick WhatsApp Briefing', 'Step 3: On-ground Deployment'],
      contactEmail: data.contactEmail || 'careers@internshome.com',
      applicationDeadline: data.applicationDeadline || 'Immediate Start (Spots confirmed on rolling basis)',
      rawBrief: params.rawBrief,
      answeredQuestions: Object.entries(params.userAnswers).map(([k, v]) => ({ question: k, answer: v })),
      whatsappText: data.whatsappText || generateFallbackWhatsAppText(data, params.company, d),
      createdAt: now,
      updatedAt: now,
      status: 'Published',
    };
  } catch (err) {
    console.warn('AI full JD generation failed, synthesizing with template:', err);
    return synthesizeLocalCompleteJd(params, d);
  }
}

/**
 * Real-time subscription to saved Job Descriptions from Firestore
 */
export function subscribeJobDescriptions(callback: (jds: CompleteJobDescription[]) => void): () => void {
  const colRef = collection(db, 'jobDescriptions');
  const q = query(colRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: CompleteJobDescription[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      callback(items);
    },
    (err) => {
      console.warn('subscribeJobDescriptions error:', err);
      callback([]);
    }
  );
}

/**
 * Save Job Description to Firestore
 */
export async function saveJobDescriptionToFirestore(jd: CompleteJobDescription): Promise<string> {
  const docId = jd.id || `jd-${Date.now()}`;
  const docRef = doc(db, 'jobDescriptions', docId);
  const data = {
    ...jd,
    id: docId,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(docRef, data, { merge: true });
  return docId;
}

/**
 * Delete Job Description from Firestore
 */
export async function deleteJobDescriptionFromFirestore(id: string): Promise<void> {
  await deleteDoc(doc(db, 'jobDescriptions', id));
}

// -------------------------------------------------------------
// Smart Questions Generator
// -------------------------------------------------------------

function generateSmartQuestions(category: JobCategory, d: ReturnType<typeof detectBriefEntities>): ClarificationQuestion[] {
  if (category === 'normal') {
    return [
      {
        id: 'work_mode',
        question: 'What is the work mode and office location?',
        context: 'Specifies whether on-site attendance in Kolkata is required.',
        suggestedOptions: ['On-site (Kolkata Office)', 'Hybrid (3 days office, 2 remote)', '100% Remote / Work from Home'],
      },
      {
        id: 'duration',
        question: 'What is the expected internship duration?',
        context: 'Matches candidates with appropriate college semester availability.',
        suggestedOptions: ['3 Months (Immediate Start)', '6 Months Internship', 'Full-Time Permanent', 'Flexible Duration'],
      },
      {
        id: 'perks',
        question: 'Does this role offer a Pre-Placement Offer (PPO)?',
        context: 'Highlights long-term career growth.',
        suggestedOptions: ['PPO Available for Top Performers', 'Certificate + LOR only', 'Performance Bonus Included'],
      },
      {
        id: 'skills',
        question: 'Are there any specific tool or software requirements?',
        context: 'Required tools for day-1 readiness.',
        suggestedOptions: ['Canva & Meta Ads', 'Figma & UI Design', 'Excel & Google Sheets', 'Premiere Pro / CapCut', 'No software prereqs'],
      },
    ];
  }

  // RENTER GIG: Strictly operational questions (NEVER ask for budget!)
  const questions: ClarificationQuestion[] = [];

  // Q1: Number of creators
  if (!d.hasInternCount) {
    questions.push({
      id: 'intern_count',
      question: 'How many content creators / videographers are needed on ground?',
      context: 'Multi-station athletic and event coverage often benefits from 2+ creators.',
      suggestedOptions: [
        '1 Creator (Solo roaming coverage)',
        '2 Creators (1 for athlete workouts, 1 for finish line & BTS)',
        '3 Creators (Multi-angle arena coverage)',
      ],
    });
  }

  // Q2: Deliverables (Shooting focus for content coverage!)
  if (d.isContentCoverageOrShoot) {
    questions.push({
      id: 'shooting_deliverables',
      question: 'What is the expected shooting deliverable and footage handover method?',
      context: 'Since this is on-ground content coverage, clarify raw footage requirements.',
      suggestedOptions: [
        `Raw 4K vertical clips handed over on-site at ${d.hasTimings ? d.endTime : 'wrap-up'} (AirDrop / Drive)`,
        'Continuous athlete workout & exercise rep coverage (30-50 raw clips)',
        'Raw video clips + high-resolution action photos',
        'Raw footage uploaded to Google Drive within 4 hours',
      ],
    });

    questions.push({
      id: 'equipment',
      question: 'What camera / smartphone gear is preferred for the shoot?',
      context: 'Ensures we deploy a creator with the right device and stabilization.',
      suggestedOptions: [
        'iPhone 14/15/16 (4K 60fps) with Gimbal / Stabilizer',
        'Professional DSLR / Mirrorless (e.g. Sony A7 III/IV, 4K 60/120fps)',
        'Action Camera (GoPro / Insta360) + Smartphone',
        'Any good smartphone camera with 1080p/4K capability',
      ],
    });

    questions.push({
      id: 'focus_areas',
      question: 'Are there specific moments or workout stations to prioritize?',
      context: 'Helps the creator capture the most impactful highlights.',
      suggestedOptions: [
        'All workout stations (SkiErg, Sled, Burpees, Wall balls, Running)',
        'Athlete candid grit, PRs & sweat close-ups',
        'Finish line celebrations, partner high-fives & medals',
        'General dynamic chronological event BTS',
      ],
    });
  } else {
    questions.push({
      id: 'gig_deliverables',
      question: 'What are the main expected on-ground deliverables?',
      context: 'Clarifies key tasks for the interns during their shift.',
      suggestedOptions: [
        'Guest registration and badge distribution',
        'Stall visitor interaction and product demos',
        'Lead collection and attendee contact verification',
        'Crowd coordination and queue management',
      ],
    });

    questions.push({
      id: 'dress_code',
      question: 'Is there a specific dress code or attire required?',
      context: 'Ensures uniform appearance on ground.',
      suggestedOptions: [
        'All Black Attire (Polo / T-shirt + Jeans)',
        'Company Branded T-shirt (provided on-site)',
        'Smart Casuals',
        'No specific dress code',
      ],
    });
  }

  // Only ask timings if NOT in brief
  if (!d.hasTimings) {
    questions.unshift({
      id: 'timings',
      question: 'What are the exact event / shift timings?',
      context: 'Required to schedule interns and assign shifts.',
      suggestedOptions: [
        '07:00 AM - 11:00 AM (Morning Slot)',
        '04:00 PM - 09:00 PM (Evening Gig)',
        '10:00 AM - 07:00 PM (Full Day)',
        '02:00 PM - 06:00 PM (Half Day)',
      ],
    });
  }

  // Only ask venue if NOT in brief
  if (!d.hasVenue) {
    questions.push({
      id: 'venue_location',
      question: 'Where is the exact event venue / location in Kolkata?',
      context: 'Needed for assigning nearby interns and travel calculation.',
      suggestedOptions: [
        'Ballygunge / South Kolkata',
        'Park Street / Central Kolkata',
        'Salt Lake / Newtown',
        'Alipore / Hazra',
      ],
    });
  }

  return questions.slice(0, 4);
}

function getLocalAnalysisFallback(brief: string, category: JobCategory, company?: any, detected?: any): AnalyzeBriefResult {
  const d = detected || detectBriefEntities(brief);
  const isNormal = category === 'normal';
  const cLoc = d.hasVenue ? d.venue : (company?.location || 'Kolkata');

  return {
    extractedData: {
      client: company?.name || 'Partner Brand',
      jobTitle: isNormal ? 'Growth & Marketing Intern' : (d.isContentCoverageOrShoot ? 'On-ground Content Creator & Videographer' : 'Event Support Intern'),
      role: isNormal ? 'Marketing Intern' : 'Content Creator',
      normalizedRole: isNormal ? 'Marketing Support' : 'Content Creator',
      venue: cLoc,
      workMode: 'On-site',
      numberOfInterns: d.numberOfInterns,
      dates: d.dates,
      startTime: d.startTime,
      endTime: d.endTime,
      durationHours: d.durationHours,
      primaryTask: d.isContentCoverageOrShoot ? 'On-ground content capture and shooting coverage' : brief.slice(0, 120),
      missingFields: isNormal ? ['Work Mode', 'Duration'] : ['Equipment Preference', 'Handover Method'],
    },
    clarificationQuestions: generateSmartQuestions(category, d),
    missingFields: isNormal ? ['Work Mode', 'Duration'] : ['Equipment Preference', 'Handover Method'],
    clarificationMessage: 'Hi! Could you please confirm the preferred shooting camera and raw footage handover method?',
  };
}

function synthesizeLocalCompleteJd(params: any, d: ReturnType<typeof detectBriefEntities>): CompleteJobDescription {
  const isNormal = params.jobCategory === 'normal';
  const now = new Date().toISOString();
  const cLoc = d.hasVenue ? d.venue : (params.company.location || 'Kolkata, West Bengal');
  const timings = d.hasTimings ? `${d.startTime} - ${d.endTime}` : '07:00 AM - 11:00 AM';
  const duration = d.hasDates ? `${d.dates.join(', ')} (${d.numberOfDays} Day${d.numberOfDays > 1 ? 's' : ''})` : 'Event Shift';

  const fixedRateText = isNormal
    ? '₹12,000 - ₹15,000 / month'
    : `₹${d.internPaymentPerKidPerDay.toLocaleString()} / day per intern (₹${(d.internPaymentPerKidPerDay - 200).toLocaleString()} base pay + ₹200 travel allowance)`;

  return {
    id: `jd-${Date.now()}`,
    jobCategory: params.jobCategory,
    jobTitle: isNormal ? 'Marketing & Operations Intern' : (d.isContentCoverageOrShoot ? 'Event Content Creator & Videographer (Shooting Coverage)' : 'Event Support Intern'),
    companyName: params.company.name || 'Partner Company',
    companyLogoUrl: params.company.logoUrl || '',
    companyWebsite: params.company.website || '',
    companyLocation: params.company.location || 'Kolkata, India',
    companyAbout: params.company.about || `${params.company.name || 'The company'} is a fast-growing brand in Kolkata partnering with InternsHome.`,
    department: isNormal ? 'Marketing & Operations' : 'On-ground Content Production',
    employmentType: isNormal ? '3-Month Internship (PPO Eligible)' : `${d.numberOfDays}-Day Event Contract (Gig)`,
    workMode: 'On-site',
    locationAddress: cLoc,
    openings: d.numberOfInterns,
    durationOrDates: duration,
    timings: timings,
    compensationText: fixedRateText,
    compensationAmount: d.internPaymentPerKidPerDay * d.numberOfDays,
    roleSummary: d.isContentCoverageOrShoot
      ? `InternsHome is deploying an on-ground Content Creator & Videographer for ${params.company.name || 'our partner'} to shoot dynamic action footage and participant BTS coverage at ${cLoc}.`
      : `InternsHome is hiring on behalf of ${params.company.name || 'our partner'} for an on-ground event support role at ${cLoc}.`,
    responsibilities: d.isContentCoverageOrShoot
      ? [
          `Capture high-energy 4K vertical footage across all event stations during the ${timings} shift`,
          'Capture athlete PRs, high-intensity workout reps, candid sweat moments, and finish line celebrations',
          'Maintain steady gimbal framing, dynamic tracking shots, and sharp autofocus throughout',
          `Hand over all raw organized vertical clips via AirDrop or shared Google Drive folder right at ${d.endTime} on-site`,
        ]
      : ['Execute assigned operational and guest coordination tasks'],
    requirements: d.isContentCoverageOrShoot
      ? [
          'Smartphone with 4K 60fps video capability (iPhone 13/14/15/16 preferred) or DSLR/Mirrorless camera',
          'Gimbal, stabilizer, or steady hand-held action tracking skills',
          'High energy and proactive on-ground presence in fitness/sports environments',
          `Punctual arrival 15 minutes before the ${d.startTime} start time`,
        ]
      : ['College student or recent graduate in Kolkata', 'Punctual and reliable execution'],
    preferredSkills: d.isContentCoverageOrShoot ? ['4K 60fps Mobile Videography', 'Sports / Athletic Action Tracking', 'Gimbal Stabilization'] : [],
    equipmentNeeded: d.isContentCoverageOrShoot ? ['iPhone (4K 60fps) or DSLR with stabilizer'] : ['Smart casual attire'],
    deliverables: d.isContentCoverageOrShoot ? [`30–50 high-resolution raw 4K vertical video clips (delivered on-site by ${d.endTime})`] : ['Event guest support checklist'],
    perksAndBenefits: [
      'Official Gig Completion Certificate & Creator Network Badge',
      'Direct creator portfolio credit and client recommendation',
      'Guaranteed next-day payout directly to bank/UPI',
      'Food & refreshments provided on-site',
    ],
    selectionProcess: ['Step 1: Creator Gear Verification', 'Step 2: Quick WhatsApp Briefing', 'Step 3: On-ground Deployment'],
    contactEmail: 'careers@internshome.com',
    applicationDeadline: 'Immediate Deployment (Spots confirmed on rolling basis)',
    rawBrief: params.rawBrief,
    answeredQuestions: Object.entries(params.userAnswers || {}).map(([k, v]) => ({ question: k, answer: String(v) })),
    whatsappText: generateFallbackWhatsAppText({}, params.company, d),
    createdAt: now,
    updatedAt: now,
    status: 'Published',
  };
}

function generateFallbackWhatsAppText(jd: any, company: any, d?: any): string {
  const isShoot = d?.isContentCoverageOrShoot;
  return `📢 *CREATOR DEPLOYMENT: ${jd.jobTitle || 'Event Content Creator (Shooting Coverage)'}*
🏢 *Event / Client:* ${company?.name || 'InternsHome Partner'}
📍 *Venue:* ${d?.hasVenue ? d.venue : 'Ballygunge Arena, Kolkata'} (On-site)
📅 *Dates:* ${d?.hasDates ? d.dates.join(', ') : 'Upcoming'}
⏰ *Timings:* ${d?.hasTimings ? `${d.startTime} - ${d.endTime}` : '07:00 AM - 11:00 AM'}
💰 *Fixed Pay:* ${jd.compensationText || `₹${d?.internPaymentPerKidPerDay || 1575}/day`}

🎬 *Shooting Deliverables:*
• 30-50 high-resolution raw 4K vertical clips (delivered on-site at wrap-up)
• High-energy athlete workout rep coverage and PR celebrations
• Full raw footage handover via AirDrop / Google Drive

📱 *Gear Required:*
• iPhone (4K 60fps) or DSLR with stabilizer

✨ *Perks:* Direct UPI Payout + Food Provided + Event Access

👉 *To Confirm Slot:* Reply with your phone/camera model and link to recent video samples!`;
}
