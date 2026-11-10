import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
  limit,
} from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { RentInternJob, RentInternJobStatus, NormalizedRole } from '../types/crm';
import { logActivity } from './firestoreService';

const COLLECTION_NAME = 'rentInternJobs';

export const INITIAL_DEMO_JOBS: RentInternJob[] = [
  {
    id: 'rai-job-demo-1',
    jobId: 'RAI-2026-001',
    jobTitle: 'Event Registration & UGC Content Support',
    client: 'ITC Sonar',
    clientContact: {
      pocName: 'Ananya Sen',
      pocPhone: '98301 23456',
    },
    role: 'Event Support & Reels',
    normalizedRole: 'Event Support',
    numberOfInterns: 2,
    jobType: 'Event',
    location: {
      venue: 'ITC Sonar, JBS Haldane Ave',
      area: 'EM Bypass',
      city: 'Kolkata',
      remoteType: 'On-site',
    },
    dateType: 'single',
    dates: ['28-Sep'],
    startTime: '03:00 PM',
    endTime: '09:00 PM',
    numberOfDays: 1,
    durationHours: 6,
    primaryTask: 'Help with guest registration at the desk and ushering attendees',
    additionalTasks: ['Capture short behind-the-scenes clips and guest reactions for reels'],
    expectedDeliverables: ['Raw video footage transferred to drive by same night'],
    deliverableQuantity: '15-20 video clips',
    deliveryDeadline: 'Same night by 11:30 PM',
    specialInstructions: 'Formal smart casual black dress code',
    requiredSkills: ['Guest Hospitality', 'Smartphone Videography', 'Punctuality'],
    experienceRequirement: 'Prior event or college fest coordination preferred',
    equipmentRequired: ['Smartphone with decent 1080p camera'],
    phoneRequirement: 'iPhone 12+ or equivalent Samsung Galaxy',
    askPhoneModel: true,
    askCameraModel: false,
    askPortfolio: false,
    askWorkSamples: true,
    askInstagram: false,
    askCollege: true,
    askYear: true,
    clientCommercial: 3600,
    internPayment: 2600,
    travelIncluded: true,
    travelAmount: 400,
    foodIncluded: true,
    paymentNotes: '₹1,100 pay + ₹200 travel per intern',
    jobOwner: 'Operations Team',
    createdBy: 'Operations',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'Ready for Review',
    priority: 'High',
    source: 'WhatsApp',
    originalClientBrief: 'Need 2 interns for an event at ITC Sonar this Sunday from 3 PM to 9 PM. They need to help with guest registrations and shoot a few reels.',
    clientClarifications: [
      {
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        text: 'Food is provided. They just need good phones to shoot 15-20 short raw clips. Dinner provided.',
      },
    ],
    generatedGigText: `🚨 RENT AN INTERN GIG | PAID ₹2,600

🎯 Role: Event Support

📍 Location: ITC Sonar, JBS Haldane Ave, EM Bypass
📅 Date: 28-Sep
⏰ Time: 03:00 PM to 09:00 PM
🏷️ Brand/Event: ITC Sonar Event

Scope of Work:
• Help with guest registration at the desk and ushering attendees
• Capture short behind-the-scenes clips and guest reactions for reels
• Expected deliverable: Raw video footage transferred to drive
• Delivery deadline: Same night by 11:30 PM

Who Should Apply:
• Interested in Hospitality & Event Coordination
• Comfortable with Guest Hospitality, Smartphone Videography
• Reliable and available for the complete duration
• Has access to Smartphone with decent 1080p camera

Payment: ₹2,600 (₹1,300 per intern)
Payment includes: Dinner included, ₹200 travel allowance included

To apply, DM:

1. Your name and phone number
2. College and year
3. Phone model (iPhone/Android)
4. Samples of any reel or video clips
5. Confirmation of availability

Limited slots. Apply only if you are fully available.`,
    missingFields: [],
    clarificationMessage: '',
  },
  {
    id: 'rai-job-demo-2',
    jobId: 'RAI-2026-002',
    jobTitle: 'Café UGC Reel Shoot & Food Styling',
    client: 'Ace Blend & Café Bistro',
    clientContact: {
      pocName: 'Prajay',
      pocPhone: '77109 52379',
    },
    role: 'Content Creator',
    normalizedRole: 'Content Creator',
    numberOfInterns: 1,
    jobType: 'Gig',
    location: {
      venue: 'Park Street Outlet',
      area: 'Park Street',
      city: 'Kolkata',
      remoteType: 'On-site',
    },
    dateType: 'single',
    dates: ['30-Sep'],
    startTime: '02:00 PM',
    endTime: '06:00 PM',
    numberOfDays: 1,
    durationHours: 4,
    primaryTask: 'Shoot aesthetic reels covering seasonal menu tasting & interior vibe',
    additionalTasks: ['Edit 2 finished trending format Instagram reels with audio'],
    expectedDeliverables: ['2 edited reels with captions & cover images'],
    deliverableQuantity: '2 edited reels',
    deliveryDeadline: 'Within 24 hours of shoot',
    specialInstructions: 'Trendy aesthetic editing style',
    requiredSkills: ['Reel Editing', 'CapCut/VN', 'Food Aesthetics'],
    experienceRequirement: 'Must have edited public reels before',
    equipmentRequired: ['iPhone or high-end smartphone with stabilizer or steady hands'],
    phoneRequirement: 'iPhone 13 or better',
    askPhoneModel: true,
    askCameraModel: false,
    askPortfolio: false,
    askWorkSamples: true,
    askInstagram: true,
    askCollege: true,
    askYear: true,
    clientCommercial: 2200,
    internPayment: 1400,
    travelIncluded: true,
    travelAmount: 200,
    foodIncluded: true,
    paymentNotes: 'Food tasting included on the house',
    jobOwner: 'Creative Lead',
    createdBy: 'Operations',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'Approved',
    priority: 'Medium',
    source: 'WhatsApp',
    originalClientBrief: 'Need 1 creative girl or boy to shoot 2 cool reels for our new menu at Park Street café. 2 PM to 6 PM.',
    clientClarifications: [],
    generatedGigText: `🚨 RENT AN INTERN GIG | PAID ₹1,400

🎯 Role: Content Creator

📍 Location: Park Street Outlet, Park Street
📅 Date: 30-Sep
⏰ Time: 02:00 PM to 06:00 PM
🏷️ Brand/Event: Ace Blend & Café Bistro

Scope of Work:
• Shoot aesthetic reels covering seasonal menu tasting & interior vibe
• Edit 2 finished trending format Instagram reels with audio
• Expected deliverable: 2 edited reels with captions
• Delivery deadline: Within 24 hours of shoot

Who Should Apply:
• Interested in Content Creation & Food Aesthetics
• Comfortable with Reel Editing, CapCut/VN
• Reliable and available for the complete duration
• Has access to iPhone or high-end smartphone

Payment: ₹1,400
Payment includes: Food tasting on the house, ₹200 travel allowance

To apply, DM:

1. Your name and phone number
2. College and year
3. Phone model
4. Links to past reels/Instagram profile
5. Confirmation of availability

Limited slots. Apply only if you are fully available.`,
    missingFields: [],
    clarificationMessage: '',
  },
];

// Subscribe to Rent an Intern Jobs from Firestore
export function subscribeRentInternJobs(callback: (jobs: RentInternJob[]) => void) {
  const colRef = collection(db, COLLECTION_NAME);
  const q = query(colRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        callback(INITIAL_DEMO_JOBS);
      } else {
        const list: RentInternJob[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as RentInternJob);
        });
        // Merge demo if not in list
        const ids = new Set(list.map((j) => j.id));
        const merged = [...list];
        for (const demo of INITIAL_DEMO_JOBS) {
          if (!ids.has(demo.id)) {
            merged.push(demo);
          }
        }
        callback(merged);
      }
    },
    (err) => {
      console.warn('subscribeRentInternJobs fallback to demo:', err);
      callback(INITIAL_DEMO_JOBS);
    }
  );
}

// Generate the next Job ID sequence: RAI-2026-001, etc.
export async function generateNextJobId(): Promise<string> {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const snap = await getDocs(colRef);
    const count = snap.size + INITIAL_DEMO_JOBS.length + 1;
    const year = new Date().getFullYear();
    const pad = String(count).padStart(3, '0');
    return `RAI-${year}-${pad}`;
  } catch (err) {
    const year = new Date().getFullYear();
    const random = Math.floor(100 + Math.random() * 900);
    return `RAI-${year}-${random}`;
  }
}

// Save or Create a Job in Firestore
export async function saveRentInternJob(job: Partial<RentInternJob>): Promise<RentInternJob> {
  const now = new Date().toISOString();
  let id = job.id;
  if (!id) {
    const docRef = doc(collection(db, COLLECTION_NAME));
    id = docRef.id;
  }

  let jobId = job.jobId;
  if (!jobId) {
    jobId = await generateNextJobId();
  }

  const completeJob: RentInternJob = {
    id,
    jobId,
    jobTitle: job.jobTitle || `${job.normalizedRole || 'Rent an Intern'} for ${job.client || 'Client'}`,
    client: job.client || 'Client',
    clientContact: job.clientContact || { pocName: '', pocPhone: '' },
    role: job.role || 'Intern',
    normalizedRole: job.normalizedRole || 'Event Support',
    numberOfInterns: job.numberOfInterns || 1,
    jobType: job.jobType || 'Gig',
    location: job.location || {
      venue: '',
      area: '',
      city: 'Kolkata',
      remoteType: 'On-site',
    },
    dateType: job.dateType || 'single',
    dates: job.dates && job.dates.length > 0 ? job.dates : ['Immediate'],
    startTime: job.startTime || '02:00 PM',
    endTime: job.endTime || '06:00 PM',
    numberOfDays: job.numberOfDays || 1,
    durationHours: job.durationHours || 4,
    primaryTask: job.primaryTask || '',
    additionalTasks: job.additionalTasks || [],
    expectedDeliverables: job.expectedDeliverables || [],
    deliverableQuantity: job.deliverableQuantity || '',
    deliveryDeadline: job.deliveryDeadline || '',
    specialInstructions: job.specialInstructions || '',
    instagramUrl: job.instagramUrl || '',
    requiredSkills: job.requiredSkills || [],
    experienceRequirement: job.experienceRequirement || '',
    equipmentRequired: job.equipmentRequired || ['None'],
    phoneRequirement: job.phoneRequirement || '',
    cameraRequirement: job.cameraRequirement || '',
    laptopRequirement: job.laptopRequirement || '',
    softwareRequirement: job.softwareRequirement || '',
    languageRequirement: job.languageRequirement || '',
    dressCode: job.dressCode || '',
    otherRequirement: job.otherRequirement || '',
    askPhoneModel: job.askPhoneModel ?? false,
    askCameraModel: job.askCameraModel ?? false,
    askPortfolio: job.askPortfolio ?? false,
    askWorkSamples: job.askWorkSamples ?? false,
    askInstagram: job.askInstagram ?? false,
    askCollege: job.askCollege ?? true,
    askYear: job.askYear ?? true,
    additionalApplicationQuestion: job.additionalApplicationQuestion || '',
    clientCommercial: job.clientCommercial || 1500,
    internPayment: job.internPayment || 1000,
    travelIncluded: job.travelIncluded ?? false,
    travelAmount: job.travelAmount || 0,
    foodIncluded: job.foodIncluded ?? false,
    otherReimbursement: job.otherReimbursement || '',
    paymentNotes: job.paymentNotes || '',
    pricingCalculation: job.pricingCalculation,
    jobOwner: job.jobOwner || 'Operations',
    createdBy: job.createdBy || 'Operations Team',
    createdAt: job.createdAt || now,
    updatedAt: now,
    status: job.status || 'Draft',
    priority: job.priority || 'Medium',
    source: job.source || 'WhatsApp',
    internalNotes: job.internalNotes || '',
    originalClientBrief: job.originalClientBrief || '',
    clientClarifications: job.clientClarifications || [],
    generatedGigText: job.generatedGigText || '',
    missingFields: job.missingFields || [],
    clarificationMessage: job.clarificationMessage || '',
    aiExtractionConfidence: job.aiExtractionConfidence,
  };

  await setDoc(doc(db, COLLECTION_NAME, id), completeJob, { merge: true });

  await logActivity({
    entityType: 'rent_intern_job',
    entityId: id,
    entityTitle: completeJob.jobTitle,
    action: job.createdAt ? 'Rent an Intern Job Updated' : 'Rent an Intern Job Created',
    actorName: 'Operations Team',
    actorRole: 'Operations',
    details: `Job ${completeJob.jobId} (${completeJob.status}) saved in Firestore`,
  });

  return completeJob;
}

// Update specific fields of a job
export async function updateRentInternJob(id: string, updates: Partial<RentInternJob>) {
  const docRef = doc(db, COLLECTION_NAME, id);
  const updatedData = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await updateDoc(docRef, updatedData);

  await logActivity({
    entityType: 'rent_intern_job',
    entityId: id,
    entityTitle: `Job ${id}`,
    action: 'Rent an Intern Job Updated',
    actorName: 'Operations Team',
    actorRole: 'Operations',
    details: `Updated job fields: ${Object.keys(updates).join(', ')}`,
  });
}

// Delete a job
export async function deleteRentInternJob(id: string, jobId?: string) {
  await deleteDoc(doc(db, COLLECTION_NAME, id));
  await logActivity({
    entityType: 'rent_intern_job',
    entityId: id,
    entityTitle: jobId || id,
    action: 'Rent an Intern Job Deleted',
    actorName: 'Operations Team',
    actorRole: 'Operations',
    details: `Deleted job ${jobId || id}`,
  });
}

// Generate the next sequential Rent an Intern Job ID (e.g. RAI-2026-004)
export async function getNextJobId(): Promise<string> {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('jobId', 'desc'), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const topJob = snap.docs[0].data() as RentInternJob;
      if (topJob.jobId && topJob.jobId.startsWith('RAI-')) {
        const parts = topJob.jobId.split('-');
        const lastNum = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastNum)) {
          const year = new Date().getFullYear();
          return `RAI-${year}-${String(lastNum + 1).padStart(3, '0')}`;
        }
      }
    }
  } catch (err) {
    console.debug('Failed to get next sequential ID:', err);
  }
  const year = new Date().getFullYear();
  const rand = Math.floor(100 + Math.random() * 900);
  return `RAI-${year}-${rand}`;
}

