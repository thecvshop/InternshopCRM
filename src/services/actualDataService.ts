import {
  collection,
  writeBatch,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { ACTUAL_APPLICANTS_DATA, RawCsvApplicant } from '../data/actualRecords';
import { PARTNER_COMPANY_ROLES } from '../data/partnerCompanyRoles';
import {
  Student,
  Lead,
  Company,
  TrainingBatch,
  Placement,
  Portfolio,
  StudentStage,
  PlacementReadiness,
  LeadStatus,
  LEAD_STATUS_OPTIONS,
  resolveLeadStatus,
} from '../types/crm';
import { logActivity } from './firestoreService';

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

export async function clearAllCollections() {
  const collectionNames = [
    'students',
    'leads',
    'companies',
    'trainingBatches',
    'placements',
    'portfolios',
    'rolesOpenings',
    'interviews',
    'invoices',
    'tasks',
  ];

  for (const colName of collectionNames) {
    try {
      const snap = await getDocs(collection(db, colName));
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (e) {
      console.warn(`Error clearing ${colName}:`, e);
    }
  }
}

export async function importActualDatabase(): Promise<{
  studentsCount: number;
  leadsCount: number;
  companiesCount: number;
  batchesCount: number;
  placementsCount: number;
  portfoliosCount: number;
}> {
  // 1. First, clear previous test/placeholder data
  await clearAllCollections();

  const batch = writeBatch(db);
  const now = new Date().toISOString();

  // 2. Seed Real Partner Companies
  const realCompanies: Company[] = [
    {
      id: 'cmp-orly',
      companyId: 'CMP-ORLY',
      name: 'Orly, Internshop',
      industry: 'Fashion & Talent Solutions',
      website: 'https://internshome.com',
      location: 'Kolkata, West Bengal',
      companySize: '11-50 employees',
      status: 'Active',
      contacts: [
        {
          id: 'c-1',
          name: 'Talent Acquisition Team',
          role: 'HR Manager',
          email: 'careers@orlyinternshop.com',
          phone: '+91 98300 00001',
          isPrimary: true,
        },
      ],
      openRolesCount: 2,
      hiredStudentsCount: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'cmp-blob-ai',
      companyId: 'CMP-BLOB',
      name: 'Blob AI.',
      industry: 'Artificial Intelligence & SaaS',
      website: 'https://blobai.tech',
      location: 'Kolkata, West Bengal',
      companySize: '10-30 employees',
      status: 'Active',
      contacts: [
        {
          id: 'c-2',
          name: 'Hiring Lead',
          role: 'Operations Head',
          email: 'hiring@blobai.tech',
          phone: '+91 98300 00002',
          isPrimary: true,
        },
      ],
      openRolesCount: 3,
      hiredStudentsCount: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'cmp-bharat-marble',
      companyId: 'CMP-BHARAT',
      name: 'Bharat Marble',
      industry: 'Architectural Surfaces & Interiors',
      website: 'https://bharatmarble.in',
      location: 'Kolkata, West Bengal',
      companySize: '50-100 employees',
      status: 'Active',
      contacts: [
        {
          id: 'c-3',
          name: 'Marketing Director',
          role: 'Brand Lead',
          email: 'marketing@bharatmarble.in',
          phone: '+91 98300 00003',
          isPrimary: true,
        },
      ],
      openRolesCount: 2,
      hiredStudentsCount: 2,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'cmp-gamerheads',
      companyId: 'CMP-GAMER',
      name: 'GamerHeads',
      industry: 'Gaming Media & Esports',
      website: 'https://gamerheads.in',
      location: 'Kolkata, West Bengal',
      companySize: '10-25 employees',
      status: 'Active',
      contacts: [
        {
          id: 'c-4',
          name: 'Content Director',
          role: 'Media Manager',
          email: 'partners@gamerheads.in',
          phone: '+91 98300 00004',
          isPrimary: true,
        },
      ],
      openRolesCount: 2,
      hiredStudentsCount: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'cmp-anita-saraogi',
      companyId: 'CMP-ANITA',
      name: 'Anita Saraogi',
      industry: 'Designer Apparel & Brand House',
      website: 'https://anitasaraogi.com',
      location: 'Kolkata, West Bengal',
      companySize: '20-50 employees',
      status: 'Active',
      contacts: [
        {
          id: 'c-5',
          name: 'Anita Saraogi Studio',
          role: 'Founder & Creative Director',
          email: 'studio@anitasaraogi.com',
          phone: '+91 98300 00005',
          isPrimary: true,
        },
      ],
      openRolesCount: 1,
      hiredStudentsCount: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'cmp-know-vesta',
      companyId: 'CMP-KVESTA',
      name: 'Know Vesta',
      industry: 'Financial Advisory & Research',
      website: 'https://knowvesta.com',
      location: 'Kolkata, West Bengal',
      companySize: '15-40 employees',
      status: 'Active',
      contacts: [
        {
          id: 'c-6',
          name: 'Research Lead',
          role: 'Managing Partner',
          email: 'careers@knowvesta.com',
          phone: '+91 98300 00006',
          isPrimary: true,
        },
      ],
      openRolesCount: 2,
      hiredStudentsCount: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'cmp-sandip-agarwal',
      companyId: 'CMP-SANDIP',
      name: 'Sandip Agarwal & Co.',
      industry: 'Chartered Accountancy & Advisory',
      website: 'https://sandipagarwal.com',
      location: 'Kolkata, West Bengal',
      companySize: '20-60 employees',
      status: 'Active',
      contacts: [
        {
          id: 'c-7',
          name: 'Senior Partner Office',
          role: 'Partner',
          email: 'contact@sandipagarwal.com',
          phone: '+91 98300 00007',
          isPrimary: true,
        },
      ],
      openRolesCount: 2,
      hiredStudentsCount: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'cmp-silk-edge',
      companyId: 'CMP-SILK',
      name: 'Silk Edge',
      industry: 'Creative Agency & Production',
      website: 'https://silkedge.com',
      location: 'Kolkata, West Bengal',
      companySize: '10-30 employees',
      status: 'Active',
      contacts: [
        {
          id: 'c-8',
          name: 'Creative Operations',
          role: 'Production Head',
          email: 'studio@silkedge.com',
          phone: '+91 98300 00008',
          isPrimary: true,
        },
      ],
      openRolesCount: 2,
      hiredStudentsCount: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'cmp-sparsh-agarwal',
      companyId: 'CMP-SPARSH',
      name: 'Sparsh Agarwal Consulting',
      industry: 'Design & Marketing Consulting',
      website: 'https://sparshagarwal.com',
      location: 'Kolkata, West Bengal',
      companySize: '5-20 employees',
      status: 'Active',
      contacts: [
        {
          id: 'c-9',
          name: 'Sparsh Agarwal',
          role: 'Principal Consultant',
          email: 'sparsh@sparshagarwal.com',
          phone: '+91 98300 00009',
          isPrimary: true,
        },
      ],
      openRolesCount: 1,
      hiredStudentsCount: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'cmp-the-tech-planner',
      companyId: 'CMP-TECHPLAN',
      name: 'The Tech Planner',
      industry: 'Productivity & Creator Tools',
      website: 'https://thetechplanner.com',
      location: 'Kolkata, West Bengal',
      companySize: '5-15 employees',
      status: 'Active',
      contacts: [
        {
          id: 'c-10',
          name: 'Brand Partnerships',
          role: 'Lead Strategist',
          email: 'team@thetechplanner.com',
          phone: '+91 98300 00010',
          isPrimary: true,
        },
      ],
      openRolesCount: 2,
      hiredStudentsCount: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'cmp-sseher',
      companyId: 'CMP-SSEHER',
      name: 'Sseher',
      industry: 'Fashion & Textile Design',
      website: 'https://sseher.com',
      location: 'Kolkata, West Bengal',
      companySize: '10-30 employees',
      status: 'Active',
      contacts: [
        {
          id: 'c-11',
          name: 'Sseher Design Team',
          role: 'Creative Director',
          email: 'hello@sseher.com',
          phone: '+91 98300 00011',
          isPrimary: true,
        },
      ],
      openRolesCount: 1,
      hiredStudentsCount: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'cmp-nimbus',
      companyId: 'CMP-NIMBUS',
      name: 'Nimbus Digital',
      industry: 'Digital Media & Growth',
      website: 'https://nimbusdigital.com',
      location: 'Kolkata, West Bengal',
      companySize: '10-25 employees',
      status: 'Active',
      contacts: [
        {
          id: 'c-12',
          name: 'Media Strategy',
          role: 'Director',
          email: 'info@nimbusdigital.com',
          phone: '+91 98300 00012',
          isPrimary: true,
        },
      ],
      openRolesCount: 2,
      hiredStudentsCount: 0,
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const c of realCompanies) {
    batch.set(doc(db, 'companies', c.id), c);
  }

  // 2b. Seed Active Job Roles for each Partner Company
  for (const r of PARTNER_COMPANY_ROLES) {
    batch.set(doc(db, 'rolesOpenings', r.id), cleanForFirestore(r));
  }

  // 3. Seed Real Training Batches (Batches 1 to 5)
  const realBatches: TrainingBatch[] = [
    {
      id: 'batch-1',
      batchId: 'TB-2025-01',
      name: 'Batch 1 - Marketing, Fashion & Corporate Sector',
      program: 'Marketing & Brand Strategy',
      startDate: '2025-08-01',
      endDate: '2025-08-25',
      trainerName: 'Hazra Operations & Training Lead',
      capacity: 15,
      enrolledStudents: [],
      status: 'Completed',
      sessionsCount: 12,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'batch-2',
      batchId: 'TB-2025-02',
      name: 'Batch 2 - Content Writing & AI Media Work',
      program: 'Content & Media Strategy',
      startDate: '2025-11-01',
      endDate: '2025-11-25',
      trainerName: 'Editorial & AI Media Lead',
      capacity: 20,
      enrolledStudents: [],
      status: 'Completed',
      sessionsCount: 12,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'batch-3',
      batchId: 'TB-2025-03',
      name: 'Batch 3 - Finance, Analysis & Business Operations',
      program: 'Finance & Analytics',
      startDate: '2025-10-01',
      endDate: '2025-10-25',
      trainerName: 'Finance Mentor',
      capacity: 15,
      enrolledStudents: [],
      status: 'Completed',
      sessionsCount: 10,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'batch-4',
      batchId: 'TB-2025-04',
      name: 'Batch 4 - Creative Media, Video & Gaming',
      program: 'Visual Arts & Media',
      startDate: '2026-03-01',
      endDate: '2026-03-25',
      trainerName: 'Media & Animation Lead',
      capacity: 20,
      enrolledStudents: [],
      status: 'Completed',
      sessionsCount: 12,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'batch-5',
      batchId: 'TB-2025-05',
      name: 'Batch 5 - Agency Production & Creative Studio',
      program: 'Creative & Digital Agency',
      startDate: '2026-04-01',
      endDate: '2026-04-28',
      trainerName: 'Production Lead',
      capacity: 20,
      enrolledStudents: [],
      status: 'Active',
      sessionsCount: 14,
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const b of realBatches) {
    batch.set(doc(db, 'trainingBatches', b.id), b);
  }

  // 4. Transform Actual Applicant records into Students, Leads, Placements, Portfolios
  let studentsCount = 0;
  let leadsCount = 0;
  let placementsCount = 0;
  let portfoliosCount = 0;

  // ALL 115 real applicants in ACTUAL_APPLICANTS_DATA are enrolled candidates/students
  ACTUAL_APPLICANTS_DATA.forEach((applicant, idx) => {
    const statusLower = (applicant.status || '').toLowerCase();
    const isPlaced = statusLower.includes('placed');
    const isPortfolio = statusLower.includes('portfolio');
    const isBusy = statusLower.includes('busy');
    const isRejected = statusLower.includes('rejected') || statusLower.includes('closed') || statusLower.includes('old enquiry');
    const isInterviewing = statusLower.includes('community interview') || statusLower.includes('interview');
    const isWaitingBatch = statusLower.includes('waiting for batch');

    const idSuffix = String(idx + 1).padStart(3, '0');
    const studentId = `IH-2025-${idSuffix}`;
    const docId = `student-${applicant.email.replace(/[^a-zA-Z0-9]/g, '_')}`;

    // Determine lifecycle stage on Intern Wall
    let stage: StudentStage = 'In Training';
    let readiness: PlacementReadiness = 'In Training';

    if (isPlaced) {
      stage = 'Placed';
      readiness = 'Placed';
    } else if (isPortfolio) {
      stage = 'Portfolio Review';
      readiness = 'In Training';
    } else if (isWaitingBatch) {
      stage = 'Trained / To Be Placed';
      readiness = 'Interview Ready';
    } else if (applicant.batchNumber && (applicant.batchNumber === 1 || applicant.batchNumber === 2)) {
      stage = 'Trained / To Be Placed';
      readiness = 'Interview Ready';
    } else if (applicant.batchNumber && applicant.batchNumber >= 3) {
      stage = 'In Training';
      readiness = 'In Training';
    } else if (isInterviewing) {
      stage = 'Interviewing';
      readiness = 'Interview Ready';
    } else if (isBusy || isRejected) {
      stage = "Didn't Work Out";
      readiness = 'Not Ready';
    } else {
      stage = 'In Training';
      readiness = 'In Training';
    }

    const skillsList = applicant.responsibilities
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    studentsCount++;
    const studentRecord = cleanForFirestore({
      id: docId,
      studentId,
      name: applicant.name,
      email: applicant.email,
      phone: applicant.phone,
      college: applicant.commitment?.includes('College')
        ? applicant.commitment
        : applicant.email.includes('thebges.edu.in')
        ? 'The Bhawanipur Education Society College'
        : `${applicant.city} University / College`,
      course: applicant.commitment || 'Undergraduate Degree',
      graduationYear: applicant.collegeYear || '2026',
      skills: skillsList.length > 0 ? skillsList : ['Creative Strategy', 'Communication'],
      currentStage: stage,
      placementReadiness: readiness,
      location: applicant.city,
      resumeUrl: applicant.cvUrl || '',
      portfolioUrl: applicant.portfolioLink || '',
      batchId: applicant.batchNumber ? `batch-${applicant.batchNumber}` : '',
      batchName: applicant.batchNumber ? `Batch ${applicant.batchNumber}` : '',
      joinedAt: applicant.timestamp ? new Date(applicant.timestamp).toISOString() : now,
      bio: [
        applicant.commitment ? `Commitment: ${applicant.commitment}` : '',
        applicant.willingHazraTraining ? `Hazra Office: ${applicant.willingHazraTraining}` : '',
        applicant.device ? `Device: ${applicant.device} | Laptop: ${applicant.hasLaptop || 'N/A'}` : '',
        applicant.brandAssigned ? `Brand Assigned: ${applicant.brandAssigned}` : '',
      ]
        .filter(Boolean)
        .join(' • '),
      notes: `Original Status: ${applicant.status}${applicant.placementCompany ? ` | Company: ${applicant.placementCompany}` : ''}`,
      createdAt: applicant.timestamp ? new Date(applicant.timestamp).toISOString() : now,
      updatedAt: now,
    });

    batch.set(doc(db, 'students', docId), studentRecord);

    // Also populate Leads collection for pipeline parity
    leadsCount++;
    const leadId = `LD-${idSuffix}`;
    const leadDocId = `lead-${applicant.email.replace(/[^a-zA-Z0-9]/g, '_')}`;

    const leadNotes = `Original Status: ${applicant.status}${applicant.placementCompany ? ` | Company: ${applicant.placementCompany}` : ''}`;
    const leadStatus: LeadStatus = resolveLeadStatus(applicant.status, leadNotes);

    const leadRecord = cleanForFirestore({
      id: leadDocId,
      leadId,
      studentId: docId,
      name: applicant.name,
      email: applicant.email,
      phone: applicant.phone,
      city: applicant.city,
      cvUrl: applicant.cvUrl,
      willingHazraTraining: applicant.willingHazraTraining,
      hasLaptop: applicant.hasLaptop,
      laptopModel: applicant.laptopModel,
      device: applicant.device,
      portfolioLink: applicant.portfolioLink,
      brandAssigned: applicant.brandAssigned,
      batchNumber: applicant.batchNumber,
      canJoinBy: applicant.canJoinBy,
      placementCompany: applicant.placementCompany,
      college: studentRecord.college,
      course: studentRecord.course,
      graduationYear: applicant.collegeYear || '2026',
      source: applicant.source || 'Direct Application Form',
      status: leadStatus,
      interestArea: applicant.responsibilities,
      notes: [
        `Original Form Status: ${applicant.status}`,
        applicant.cvUrl ? `CV: ${applicant.cvUrl}` : '',
        applicant.willingHazraTraining ? `Hazra Office Willingness: ${applicant.willingHazraTraining}` : '',
        applicant.hasLaptop ? `Laptop: ${applicant.hasLaptop} (${applicant.laptopModel || 'N/A'})` : '',
        applicant.device ? `Phone: ${applicant.device}` : '',
        applicant.commitment ? `Commitment: ${applicant.commitment}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      createdAt: applicant.timestamp ? new Date(applicant.timestamp).toISOString() : now,
      updatedAt: now,
    });
    batch.set(doc(db, 'leads', leadDocId), leadRecord);

    // Add Placement record if placed
    if (isPlaced && applicant.placementCompany) {
      const companiesList = applicant.placementCompany
        .split(/[,&]+/)
        .map((c) => c.trim())
        .filter(Boolean);

      companiesList.forEach((compName, cIdx) => {
        placementsCount++;
        const placementDocId = `plc-${docId}${cIdx > 0 ? `-${cIdx}` : ''}`;
        const matchedCompany = realCompanies.find(
          (rc) =>
            rc.name.toLowerCase().includes(compName.toLowerCase()) ||
            compName.toLowerCase().includes(rc.name.toLowerCase())
        );
        const placementRecord = cleanForFirestore({
          id: placementDocId,
          studentId: docId,
          studentName: applicant.name,
          companyId: matchedCompany ? matchedCompany.id : `cmp-${compName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          companyName: matchedCompany ? matchedCompany.name : compName,
          roleTitle: skillsList.length > 0 ? `${skillsList.slice(0, 2).join(' & ')} Intern` : 'Creative Intern',
          stipend: '₹10,000 - ₹15,000 / month',
          offerDate: applicant.timestamp ? new Date(applicant.timestamp).toISOString() : now,
          joiningDate: applicant.canJoinBy ? `2026-06-01` : 'Nov 2025',
          duration: '3 - 6 Months',
          location: applicant.city || 'Kolkata',
          status: 'Joined',
          placementOwner: 'Hazra Placement Team',
          createdAt: now,
          updatedAt: now,
        });
        batch.set(doc(db, 'placements', placementDocId), placementRecord);
      });
    }

    // Add Portfolio record if portfolio link exists
    if (applicant.portfolioLink) {
      portfoliosCount++;
      const portfolioDocId = `port-${docId}`;
      const portfolioRecord = cleanForFirestore({
        id: portfolioDocId,
        studentId: docId,
        studentName: applicant.name,
        version: 1,
        portfolioUrl: applicant.portfolioLink,
        projectsSummary: applicant.brandAssigned || 'Brand Portfolio',
        status: isPlaced ? 'Approved' : 'Under Review',
        reviewerNotes: `Assigned Brand: ${applicant.brandAssigned || 'General'}`,
        updatedAt: now,
      });
      batch.set(doc(db, 'portfolios', portfolioDocId), portfolioRecord);
    }
  });

  // Commit all writes to Firestore
  await batch.commit();

  // Log activity
  await logActivity({
    entityType: 'system',
    entityId: 'sync-actual-db',
    entityTitle: 'Actual CRM Database',
    action: 'Database Synced',
    actorName: 'System Administrator',
    actorRole: 'Administrator',
    details: `Successfully imported user's actual database: ${ACTUAL_APPLICANTS_DATA.length} applicants (${studentsCount} students, ${leadsCount} leads, ${placementsCount} placements, ${realCompanies.length} partner companies, ${realBatches.length} training cohorts).`,
  });

  return {
    studentsCount,
    leadsCount,
    companiesCount: realCompanies.length,
    batchesCount: realBatches.length,
    placementsCount,
    portfoliosCount,
  };
}

let integrityAlreadyRan = false;

/**
 * Ensures placement records exist in Firestore for specific company talent histories
 * (such as Aariyan Saha and Snigdha Banerjee placed at Anita Saraogi)
 */
export async function ensureCompanyPlacementIntegrity(): Promise<void> {
  if (integrityAlreadyRan) return;
  integrityAlreadyRan = true;

  const now = new Date().toISOString();
  try {
    const placementsCol = collection(db, 'placements');
    const snapshot = await getDocs(placementsCol);
    const existingPlacements: any[] = [];
    snapshot.forEach((d) => existingPlacements.push({ id: d.id, ...d.data() }));

    const hasAariyanAnita = existingPlacements.some(
      (p) =>
        (p.studentName?.toLowerCase().includes('aariyan') || p.studentId?.includes('aariyansaha')) &&
        (p.companyName?.toLowerCase().includes('anita') || p.companyId?.includes('anita'))
    );

    if (!hasAariyanAnita) {
      const aariyanDocId = 'plc-student-aariyansaha532_gmail_com';
      await setDoc(doc(db, 'placements', aariyanDocId), {
        id: aariyanDocId,
        studentId: 'student-aariyansaha532_gmail_com',
        studentName: 'Aariyan Saha',
        companyId: 'cmp-anita-saraogi',
        companyName: 'Anita Saraogi',
        roleTitle: 'Content Writing & Video Editing Intern',
        stipend: '₹12,000 / month',
        offerDate: '2025-11-02T00:41:35.000Z',
        joiningDate: 'Nov 2025',
        duration: '6 Months',
        location: 'Kolkata (Hazra Office & On-site)',
        status: 'Joined',
        placementOwner: 'Hazra Placement Team',
        createdAt: now,
        updatedAt: now,
      });

      // Update student record to reflect Placed at Anita Saraogi
      try {
        const studentRef = doc(db, 'students', 'student-aariyansaha532_gmail_com');
        const studentSnap = await getDoc(studentRef);
        if (studentSnap.exists()) {
          const data = studentSnap.data();
          if (data.currentStage !== 'Placed' || data.placementReadiness !== 'Placed') {
            await updateDoc(studentRef, {
              currentStage: 'Placed',
              placementReadiness: 'Placed',
              notes: 'Placed in company | Company: Anita Saraogi',
              updatedAt: now,
            });
          }
        }
      } catch (stErr) {
        console.warn('Student update error during placement sync:', stErr);
      }
    }

    // Standardize existing lead statuses in Firestore to match the 4 requested options (In Review, Task Submission, Approved for IS, Reject)
    try {
      const leadsSnap = await getDocs(collection(db, 'leads'));
      const leadUpdates: Promise<any>[] = [];

      leadsSnap.forEach((lDoc) => {
        const d = lDoc.data();
        if (!d.status || !(LEAD_STATUS_OPTIONS as readonly string[]).includes(d.status)) {
          const resolved = resolveLeadStatus(d.status, d.notes);
          if (d.status !== resolved) {
            leadUpdates.push(updateDoc(lDoc.ref, { status: resolved, updatedAt: now }));
          }
        }
      });

      if (leadUpdates.length > 0) {
        await Promise.all(leadUpdates);
        console.log(`Updated ${leadUpdates.length} leads to standard 4-status format.`);
      }
    } catch (leadMigrateErr) {
      console.warn('Lead status update check:', leadMigrateErr);
    }
  } catch (err) {
    console.warn('ensureCompanyPlacementIntegrity check:', err);
  }
}

let rolesIntegrityRan = false;

/**
 * Ensures all standard active roles for the 12 partner companies exist in Firestore's rolesOpenings collection.
 */
export async function ensureCompanyRolesIntegrity(): Promise<void> {
  if (rolesIntegrityRan) return;
  rolesIntegrityRan = true;

  try {
    const rolesCol = collection(db, 'rolesOpenings');
    const snap = await getDocs(rolesCol);
    const existingIds = new Set<string>();
    snap.forEach((d) => existingIds.add(d.id));

    const missingRoles = PARTNER_COMPANY_ROLES.filter((r) => !existingIds.has(r.id));
    if (missingRoles.length > 0) {
      const batch = writeBatch(db);
      for (const r of missingRoles) {
        batch.set(doc(db, 'rolesOpenings', r.id), cleanForFirestore(r));
      }
      await batch.commit();
      console.log(`Populated ${missingRoles.length} company roles in Firestore rolesOpenings.`);
    }
  } catch (err) {
    console.warn('ensureCompanyRolesIntegrity check failed:', err);
  }
}

/**
 * Fast-sync all 115 applicants from ACTUAL_APPLICANTS_DATA into Firestore 'students' collection
 * if Firestore currently has fewer than 115 students.
 */
export async function syncAll115Students(force = false): Promise<number> {
  try {
    const studentsCol = collection(db, 'students');
    const existingSnap = await getDocs(studentsCol);

    if (!force && existingSnap.size >= ACTUAL_APPLICANTS_DATA.length) {
      return existingSnap.size;
    }

    const now = new Date().toISOString();
    const batch = writeBatch(db);
    let count = 0;

    ACTUAL_APPLICANTS_DATA.forEach((applicant, idx) => {
      const statusLower = (applicant.status || '').toLowerCase();
      const isPlaced = statusLower.includes('placed');
      const isPortfolio = statusLower.includes('portfolio');
      const isBusy = statusLower.includes('busy');
      const isRejected = statusLower.includes('rejected') || statusLower.includes('closed') || statusLower.includes('old enquiry');
      const isInterviewing = statusLower.includes('community interview') || statusLower.includes('interview');
      const isWaitingBatch = statusLower.includes('waiting for batch');

      const idSuffix = String(idx + 1).padStart(3, '0');
      const studentId = `IH-2025-${idSuffix}`;
      const docId = `student-${applicant.email.replace(/[^a-zA-Z0-9]/g, '_')}`;

      let stage: StudentStage = 'In Training';
      let readiness: PlacementReadiness = 'In Training';

      if (isPlaced) {
        stage = 'Placed';
        readiness = 'Placed';
      } else if (isPortfolio) {
        stage = 'Portfolio Review';
        readiness = 'In Training';
      } else if (isWaitingBatch) {
        stage = 'Trained / To Be Placed';
        readiness = 'Interview Ready';
      } else if (applicant.batchNumber && (applicant.batchNumber === 1 || applicant.batchNumber === 2)) {
        stage = 'Trained / To Be Placed';
        readiness = 'Interview Ready';
      } else if (applicant.batchNumber && applicant.batchNumber >= 3) {
        stage = 'In Training';
        readiness = 'In Training';
      } else if (isInterviewing) {
        stage = 'Interviewing';
        readiness = 'Interview Ready';
      } else if (isBusy || isRejected) {
        stage = "Didn't Work Out";
        readiness = 'Not Ready';
      } else {
        stage = 'In Training';
        readiness = 'In Training';
      }

      const skillsList = applicant.responsibilities
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      const studentRecord = cleanForFirestore({
        id: docId,
        studentId,
        name: applicant.name,
        email: applicant.email,
        phone: applicant.phone,
        college: applicant.commitment?.includes('College')
          ? applicant.commitment
          : applicant.email.includes('thebges.edu.in')
          ? 'The Bhawanipur Education Society College'
          : `${applicant.city} University / College`,
        course: applicant.commitment || 'Undergraduate Degree',
        graduationYear: applicant.collegeYear || '2026',
        skills: skillsList.length > 0 ? skillsList : ['Creative Strategy', 'Communication'],
        currentStage: stage,
        placementReadiness: readiness,
        location: applicant.city,
        resumeUrl: applicant.cvUrl || '',
        portfolioUrl: applicant.portfolioLink || '',
        batchId: applicant.batchNumber ? `batch-${applicant.batchNumber}` : '',
        batchName: applicant.batchNumber ? `Batch ${applicant.batchNumber}` : '',
        joinedAt: applicant.timestamp ? new Date(applicant.timestamp).toISOString() : now,
        bio: [
          applicant.commitment ? `Commitment: ${applicant.commitment}` : '',
          applicant.willingHazraTraining ? `Hazra Office: ${applicant.willingHazraTraining}` : '',
          applicant.device ? `Device: ${applicant.device} | Laptop: ${applicant.hasLaptop || 'N/A'}` : '',
          applicant.brandAssigned ? `Brand Assigned: ${applicant.brandAssigned}` : '',
        ]
          .filter(Boolean)
          .join(' • '),
        notes: `Original Status: ${applicant.status}${applicant.placementCompany ? ` | Company: ${applicant.placementCompany}` : ''}`,
        createdAt: applicant.timestamp ? new Date(applicant.timestamp).toISOString() : now,
        updatedAt: now,
      });

      batch.set(doc(db, 'students', docId), studentRecord, { merge: true });
      count++;
    });

    await batch.commit();
    return count;
  } catch (err) {
    console.error('syncAll115Students error:', err);
    throw err;
  }
}

export async function syncRentAnInternSheetData() {
  try {
    const { INITIAL_RENT_AN_INTERN_BOOKINGS } = await import('../data/rentAnInternData');
    const batch = writeBatch(db);
    for (const booking of INITIAL_RENT_AN_INTERN_BOOKINGS) {
      const docRef = doc(db, 'rentAnIntern', booking.id);
      batch.set(docRef, booking, { merge: true });
    }
    await batch.commit();
    return INITIAL_RENT_AN_INTERN_BOOKINGS.length;
  } catch (err) {
    console.error('syncRentAnInternSheetData error:', err);
    throw err;
  }
}

