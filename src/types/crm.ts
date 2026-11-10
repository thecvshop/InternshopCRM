export type UserRole =
  | 'Administrator'
  | 'Operations'
  | 'Trainer'
  | 'Placement Team'
  | 'HR'
  | 'Finance'
  | 'Company POC'
  | 'Student';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  avatarUrl?: string;
  phone?: string;
  status: 'active' | 'suspended' | 'invited';
  createdAt: string;
  updatedAt: string;
}

export type StudentStage =
  | 'In Training'
  | 'Trained / To Be Placed'
  | 'Interviewing'
  | 'Placed'
  | "Didn't Work Out"
  | 'Assignment Pending'
  | 'Agreement Pending'
  | 'Portfolio Review';

export type PlacementReadiness = 'Not Ready' | 'In Training' | 'Interview Ready' | 'Placed';

export interface Student {
  id: string;
  studentId: string; // e.g. IH-2025-0042
  leadId?: string;
  name: string;
  email: string;
  phone: string;
  profilePhoto?: string;
  college: string;
  course: string;
  graduationYear: string;
  skills: string[];
  currentStage: StudentStage;
  placementReadiness: PlacementReadiness;
  ownerUserId?: string;
  ownerName?: string;
  location?: string;
  bio?: string;
  portfolioUrl?: string;
  resumeUrl?: string;
  assignmentScore?: number;
  batchId?: string;
  batchName?: string;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  isDemo?: boolean;
  agreementSigned?: boolean;
  agreementSignedAt?: string;
  agreementId?: string;
  eventHistory?: Array<{
    eventId: string;
    eventName: string;
    date: string;
    status: 'Registered' | 'Attended' | 'Did Not Attend' | 'Cancelled';
  }>;
}

export const LEAD_STATUS_OPTIONS = [
  'In Review',
  'Task Submission',
  'Approved for IS',
  'Reject',
] as const;

export type LeadStatus =
  | (typeof LEAD_STATUS_OPTIONS)[number]
  | 'Training Period'
  | 'Rejected'
  | 'Rent an Intern'
  | 'Community Interview Left'
  | 'Just here for Community'
  | 'Waiting for Batch Allotment'
  | 'Portfolio Underway'
  | 'Placed'
  | 'Busy With Something Else'
  | 'Closed Enquiry'
  | 'New'
  | 'Contacted'
  | 'Interested'
  | 'Converted'
  | 'Unqualified';

export function resolveLeadStatus(rawStatus: string | undefined, notes?: string): (typeof LEAD_STATUS_OPTIONS)[number] {
  if (rawStatus && (LEAD_STATUS_OPTIONS as readonly string[]).includes(rawStatus)) {
    return rawStatus as (typeof LEAD_STATUS_OPTIONS)[number];
  }

  const originalMatch = notes?.match(/(?:Original Form Status|Original Status|Sheet Status):\s*([^\n\r|•]+)/i);
  const text = `${originalMatch ? originalMatch[1] : ''} ${rawStatus || ''} ${notes || ''}`.toLowerCase();

  // 1. Reject keywords:
  // closed enquiry, shared the workflow, rejected, seenzoned, unresponsive, no response, not a good fit, etc.
  if (
    text.includes('closed enquiry') ||
    text.includes('closed response') ||
    text.includes('old enquiry') ||
    text.includes('shared the workflow') ||
    text.includes('shared workflow') ||
    text.includes('workflow') ||
    text.includes('rejected') ||
    text.includes('reject') ||
    text.includes('not a good fit') ||
    text.includes('seenzoned') ||
    text.includes('unresponsive') ||
    text.includes('no response') ||
    text.includes('unqualified')
  ) {
    return 'Reject';
  }

  // 2. Approved for IS keywords:
  // in training, portfolio prep, placed, rent an intern, approved
  if (
    text.includes('in training') ||
    text.includes('training period') ||
    text.includes('training') ||
    text.includes('portfolio prep') ||
    text.includes('portfolio underway') ||
    text.includes('portfolio') ||
    text.includes('placed in company') ||
    text.includes('placed') ||
    text.includes('rent an intern') ||
    text.includes('approved for is') ||
    text.includes('approved')
  ) {
    return 'Approved for IS';
  }

  // 3. Task Submission keywords:
  // Waiting batch, task, assignment, task submission, task assigned, task submitted
  if (
    text.includes('task submission') ||
    text.includes('task assigned') ||
    text.includes('task submitted') ||
    text.includes('task') ||
    text.includes('assignment') ||
    text.includes('submission') ||
    text.includes('waiting batch') ||
    text.includes('waiting for batch allotment') ||
    text.includes('waiting for batch')
  ) {
    return 'Task Submission';
  }

  // 4. In Review keywords:
  // interview left, on hold, community interview, busy, community only, lead, etc.
  if (
    text.includes('interview left') ||
    text.includes('community interview left') ||
    text.includes('community interview') ||
    text.includes('interview') ||
    text.includes('on hold') ||
    text.includes('hold') ||
    text.includes('busy with something else') ||
    text.includes('busy') ||
    text.includes('just here for community') ||
    text.includes('community') ||
    text.includes('lead') ||
    text.includes('new') ||
    text.includes('contacted') ||
    text.includes('in review')
  ) {
    return 'In Review';
  }

  // Direct legacy status mappings
  if (rawStatus === 'In Review') return 'In Review';
  if (
    rawStatus === 'Community Interview Left' ||
    rawStatus === 'Just here for Community' ||
    rawStatus === 'Busy With Something Else' ||
    rawStatus === 'Contacted' ||
    rawStatus === 'New'
  ) {
    return 'In Review';
  }
  if (rawStatus === 'Waiting for Batch Allotment' || rawStatus === 'Interested') {
    return 'Task Submission';
  }
  if (
    rawStatus === 'Training Period' ||
    rawStatus === 'Portfolio Underway' ||
    rawStatus === 'Placed' ||
    rawStatus === 'Rent an Intern' ||
    rawStatus === 'Converted'
  ) {
    return 'Approved for IS';
  }
  if (rawStatus === 'Rejected' || rawStatus === 'Closed Enquiry' || rawStatus === 'Unqualified') {
    return 'Reject';
  }

  return 'In Review';
}

export interface Lead {
  id: string;
  leadId: string; // e.g. LD-1092
  studentId?: string;
  name: string;
  email: string;
  phone: string;
  college: string;
  course: string;
  graduationYear: string;
  source: string;
  status: LeadStatus;
  city?: string;
  cvUrl?: string;
  willingHazraTraining?: string;
  hasLaptop?: string;
  laptopModel?: string;
  device?: string;
  portfolioLink?: string;
  brandAssigned?: string;
  batchNumber?: number | string;
  canJoinBy?: string;
  placementCompany?: string;
  assignedTo?: string;
  assignedToName?: string;
  nextFollowUp?: string;
  notes?: string;
  interestArea?: string;
  sourceDetail?: string;
  externalSource?: 'Luma' | string;
  lumaGuestId?: string;
  eventId?: string;
  eventName?: string;
  eventStatus?: 'Registered' | 'Attended' | 'Did Not Attend' | 'Cancelled';
  createdVia?: string;
  normalizedEmail?: string;
  normalizedPhone?: string;
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

export interface CompanyContact {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  isPrimary?: boolean;
}

export interface Company {
  id: string;
  companyId: string; // e.g. CMP-108
  name: string;
  industry: string;
  website: string;
  location: string;
  companySize: string;
  status: 'Active' | 'Prospect' | 'Dormant';
  accountOwner?: string;
  accountOwnerName?: string;
  contacts: CompanyContact[];
  openRolesCount?: number;
  hiredStudentsCount?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

export interface JobRole {
  id: string;
  companyId: string;
  companyName: string;
  title: string;
  department: string;
  location: string;
  workMode: 'Remote' | 'Hybrid' | 'Onsite';
  skills: string[];
  stipend: string;
  openings: number;
  status: 'Draft' | 'Open' | 'Shortlisting' | 'Interviewing' | 'Filled' | 'Closed';
  duration?: string;
  requirements?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Interview {
  id: string;
  studentId: string;
  studentName: string;
  studentCollege?: string;
  companyId: string;
  companyName: string;
  roleTitle: string;
  round: string; // e.g. 'Round 1: Technical', 'HR Round', 'Final Discussion'
  scheduledAt: string;
  mode: 'Google Meet' | 'Zoom' | 'In-Person' | 'Phone';
  meetUrl?: string;
  status: 'Proposed' | 'Confirmed' | 'Completed' | 'Rescheduled' | 'Cancelled' | 'Selected' | 'Rejected';
  interviewer?: string;
  feedback?: string;
  rating?: number;
  outcome?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Placement {
  id: string;
  studentId: string;
  studentName: string;
  studentPhoto?: string;
  companyId: string;
  companyName: string;
  roleTitle: string;
  stipend: string;
  ctc?: string;
  offerDate: string;
  joiningDate: string;
  duration: string;
  location: string;
  offerLetterUrl?: string;
  status: 'Offer Released' | 'Accepted' | 'Joined' | 'Completed' | 'Withdrawn';
  placementOwner?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g. INV-2025-001
  companyId: string;
  companyName: string;
  billingContact?: string;
  studentReference?: string;
  service: string;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  invoiceDate: string;
  dueDate: string;
  status: 'Draft' | 'Generated' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';
  paymentDate?: string;
  paymentReference?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  id: string;
  studentId: string;
  studentName: string;
  title: string;
  template: string;
  assignedDate: string;
  dueDate: string;
  submissionUrl?: string;
  submittedDate?: string;
  reviewer?: string;
  score?: number; // 0-100
  status: 'Not Sent' | 'Sent' | 'Submitted' | 'Under Review' | 'Revision Required' | 'Approved' | 'Rejected' | 'Overdue';
  comments?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingBatch {
  id: string;
  batchId: string; // e.g. TB-2025-04
  name: string;
  program?: string;
  trainerName?: string;
  startDate: string;
  endDate: string;
  capacity: number;
  enrolledStudents: string[]; // student IDs
  status: 'Upcoming' | 'Active' | 'Completed';
  whatsappGroup?: string;
  sessionsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Agreement {
  id: string;
  studentId: string;
  studentName: string;
  templateName: string;
  dateGenerated: string;
  status: 'Draft' | 'Sent' | 'Opened' | 'Signed' | 'Completed' | 'Declined';
  signedAt?: string;
  signatureDataUrl?: string;
  signatureType?: 'drawn' | 'typed';
  participantDetails?: {
    fullName: string;
    college: string;
    courseAndYear: string;
    phone: string;
    email: string;
    signedDate: string;
  };
  termsSummary?: string;
  founderName?: string;
  founderSignatureUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Portfolio {
  id: string;
  studentId: string;
  studentName: string;
  version: number;
  portfolioUrl: string;
  projectsSummary?: string;
  status: 'Draft' | 'Submitted' | 'Under Review' | 'Approved' | 'Changes Requested';
  reviewerNotes?: string;
  updatedAt: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'completed';
  dueDate: string;
  assignee?: string;
  assigneeName?: string;
  relatedEntityType?: 'student' | 'lead' | 'company' | 'interview' | 'placement' | 'invoice';
  relatedEntityId?: string;
  relatedEntityName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  entityType: 'student' | 'lead' | 'company' | 'interview' | 'placement' | 'invoice' | 'system' | 'assignment' | 'rent_intern_job';
  entityId: string;
  entityTitle: string;
  action: string;
  actorName: string;
  actorRole: UserRole;
  timestamp: string;
  details?: string;
}

export interface MonthlyFollowUp {
  id: string;
  placementId: string;
  studentId: string;
  studentName: string;
  companyName: string;
  monthYear: string;
  studentRating: number; // 1-5
  studentFeedback: string;
  companyRating: number; // 1-5
  companyFeedback: string;
  status: 'Pending' | 'Completed';
  createdAt: string;
}

export interface AutomationRun {
  id: string;
  name: string;
  trigger: string;
  status: 'Queued' | 'Running' | 'Completed' | 'Failed';
  startedAt: string;
  completedAt?: string;
  entityType: string;
  entityId: string;
  details: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  type: 'Resume' | 'Assignment' | 'Agreement' | 'Signed Agreement' | 'Portfolio' | 'Certificate' | 'Offer Letter' | 'Invoice' | 'Other';
  relatedEntityType: 'student' | 'company' | 'invoice';
  relatedEntityId: string;
  relatedEntityName: string;
  fileSize: string;
  fileUrl: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface RentAnInternBooking {
  id: string;
  dateOfBooking: string; // e.g. "14-Feb", "5-Mar"
  company: string; // e.g. "Ace Blend", "CSC", "Grid And Grid"
  poc: string; // Booking Company POC e.g. "Prajay", "Ronak Mehta"
  phone: string; // e.g. "77109 52379"
  hours: number; // e.g. 5, 3, 4, 1.5, 8
  jobDescription: string; // e.g. "🚨 Rent An Intern", "Model (UGC + Photoshoot)"
  workDriveLink: string; // Google Drive link for deliverables/assets
  noOfKids: number; // Number of Interns / Kids dispatched (e.g. 1, 2, 3, 4, 5)
  amountEarned: number; // e.g. 1000, 2800, 1750, 0
  travel: number; // Travel allowance / cost (e.g. 200, 400, 0)
  totalAmount?: number; // amountEarned + travel
  amountEarnedByInternshop?: number; // Total amount earned by Internshop (Coordination fee per rate card: ₹1,000 / ₹800 / ₹650 / ₹500)
  clientGrandTotal?: number; // Total billed to client: totalAmount + amountEarnedByInternshop
  status: 'Scheduled' | 'Fulfilled' | 'In Progress' | 'Payment Received' | 'Pending Payment';
  assignedInterns?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Backwards compatibility alias
export type RentAnInternEntry = RentAnInternBooking;

// ==========================================
// RENT AN INTERN - JOB CREATOR & PRICING TYPES
// ==========================================

export type RentInternJobStatus =
  | 'Draft'
  | 'Awaiting Client Details'
  | 'Ready for Review'
  | 'Approved'
  | 'Published'
  | 'Applications Open'
  | 'Applications Closed'
  | 'Assigned'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled';

export type NormalizedRole =
  | 'Content Creator'
  | 'Videographer'
  | 'Photographer'
  | 'Video Editor'
  | 'Event Support'
  | 'Event Registration'
  | 'Stall Support'
  | 'Promoter'
  | 'Research Intern'
  | 'Data Entry'
  | 'Operations Support'
  | 'Social Media Support'
  | 'Marketing Support'
  | 'Sales Support'
  | 'Campus Ambassador'
  | 'Host / Presenter'
  | 'Graphic Design'
  | 'Production Assistant'
  | 'Other';

export type JobCategory = 'renter' | 'normal';

export interface ClarificationQuestion {
  id: string;
  question: string;
  context?: string;
  suggestedOptions: string[];
  userAnswer?: string;
}

export interface CompleteJobDescription {
  id?: string;
  jobCategory: JobCategory;
  jobTitle: string;
  companyName: string;
  companyLogoUrl?: string;
  companyWebsite?: string;
  companyLocation?: string;
  companyAbout?: string;
  department?: string;
  employmentType: string;
  workMode: 'On-site' | 'Hybrid' | 'Remote';
  locationAddress: string;
  openings: number;
  durationOrDates: string;
  timings: string;
  compensationText: string;
  compensationAmount?: number;
  roleSummary: string;
  responsibilities: string[];
  requirements: string[];
  preferredSkills?: string[];
  equipmentNeeded?: string[];
  deliverables?: string[];
  perksAndBenefits: string[];
  selectionProcess?: string[];
  contactEmail?: string;
  applicationDeadline?: string;
  rawBrief: string;
  answeredQuestions?: Array<{ question: string; answer: string }>;
  whatsappText: string;
  createdAt: string;
  updatedAt: string;
  status: 'Draft' | 'Published' | 'Archived';
}

export interface RentInternJob {
  id: string; // Firestore document ID
  jobId: string; // Formatted ID e.g. "RAI-2026-001"
  jobTitle: string;
  client: string; // Client / Brand name
  clientContact: {
    pocName: string;
    pocPhone: string;
    pocEmail?: string;
  };
  role: string; // Raw input role
  normalizedRole: NormalizedRole;
  numberOfInterns: number;
  jobType: 'Gig' | 'Hourly' | 'Project' | 'Event';
  location: {
    venue: string;
    area: string;
    city: string;
    remoteType: 'On-site' | 'Remote' | 'Hybrid';
  };
  dateType: 'single' | 'multiple' | 'range' | 'recurring';
  dates: string[];
  startTime: string; // e.g. "04:00 PM"
  endTime: string; // e.g. "09:00 PM"
  numberOfDays: number;
  durationHours: number;

  // Scope
  primaryTask: string;
  additionalTasks: string[];
  expectedDeliverables: string[];
  deliverableQuantity: string;
  deliveryDeadline: string;
  specialInstructions: string;
  instagramUrl?: string;

  // Requirements
  requiredSkills: string[];
  experienceRequirement: string;
  equipmentRequired: string[];
  phoneRequirement?: string;
  cameraRequirement?: string;
  laptopRequirement?: string;
  softwareRequirement?: string;
  languageRequirement?: string;
  dressCode?: string;
  otherRequirement?: string;

  // Application Requirements
  askPhoneModel: boolean;
  askCameraModel: boolean;
  askPortfolio: boolean;
  askWorkSamples: boolean;
  askInstagram: boolean;
  askCollege: boolean;
  askYear: boolean;
  additionalApplicationQuestion?: string;

  // Commercial
  clientCommercial: number;
  internPayment: number;
  travelIncluded: boolean;
  travelAmount: number;
  foodIncluded: boolean;
  otherReimbursement?: string;
  paymentNotes?: string;
  pricingCalculation?: {
    pricingRuleId?: string;
    basePay: number;
    additionalHoursPay: number;
    overtimePay: number;
    travelAllowance: number;
    totalCalculatedInternPay: number;
    totalCalculatedClientCharge: number;
    isOverridden: boolean;
    overrideReason?: string;
  };

  // Internal
  jobOwner: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  status: RentInternJobStatus;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  source: 'WhatsApp' | 'Call' | 'Email' | 'Direct';
  internalNotes?: string;

  // Applications & Assignments
  applicationsCount?: number;
  assignedInterns?: Array<{
    studentId: string;
    studentName: string;
    phone: string;
    assignedAt: string;
    status: 'Confirmed' | 'Completed' | 'No Show' | 'Cancelled';
  }>;

  // Raw & AI Workflow Artifacts
  originalClientBrief: string;
  clientClarifications: Array<{
    timestamp: string;
    text: string;
  }>;
  generatedGigText: string;
  missingFields: string[];
  clarificationMessage: string;
  aiExtractionConfidence?: Record<string, number>;
}

export interface PricingRule {
  id: string;
  roleCategory: string; // NormalizedRole or 'Default'
  minDurationHours: number;
  maxDurationHours: number;
  baseInternPayment: number;
  additionalHourRate: number;
  clientRate: number;
  internRate: number;
  weekendMultiplier: number;
  lateNightRule: {
    startAfter: string; // e.g. "20:00"
    bonus: number;
  };
  travelRule: {
    defaultTravel: number;
    conditionNotes?: string;
  };
  effectiveFrom: string;
  effectiveUntil?: string;
  active: boolean;
}

// ==========================================
// HOME / LUMA EVENTS & COMMUNITY MODULE
// ==========================================

export type EventType = 'offline' | 'online' | 'hybrid';
export type EventStatus = 'published' | 'completed' | 'cancelled';
export type RegistrationStatus = 'registered' | 'attended' | 'cancelled' | 'did_not_attend';

export interface EventExpense {
  id: string;
  eventId: string;
  title: string;
  category: 'Venue & Space' | 'Food & Beverage' | 'Sound & AV' | 'Printing & Badges' | 'Staff & Intern Stipends' | 'Decor & Props' | 'Marketing & Ads' | 'Other';
  amount: number; // in INR (₹)
  date: string;
  paidBy?: string;
  paymentMethod?: 'UPI' | 'Bank Transfer' | 'Cash' | 'Card';
  notes?: string;
  createdAt: string;
}

export interface InternsHomeEvent {
  id: string;
  lumaEventId: string;
  name: string;
  description: string;
  coverImage: string;
  startAt: string; // ISO string e.g. "2026-09-24T18:00:00Z"
  endAt: string;   // ISO string e.g. "2026-09-24T21:00:00Z"
  timezone: string;
  venue: string;
  area?: string;
  city: string;
  location: string;
  eventType: EventType;
  eventStatus: EventStatus;
  lumaUrl: string;
  registrationCount: number;
  attendanceCount: number;
  newLeadsCount: number;
  existingCRMCount: number;
  source: 'luma' | string;
  highlights?: string[];
  lastSyncedAt: string;
  createdAt: string;
  updatedAt: string;

  // Event Financials & Expense Tracking
  ticketPrice?: number;    // What the event charges per attendee (in ₹, 0 for Free)
  totalRevenue?: number;   // Total collection from ticket sales + sponsors
  totalExpenses?: number;  // Total calculated expenses incurred
  netProfit?: number;      // totalRevenue - totalExpenses
  expenses?: EventExpense[];

  // Google Drive photo album
  driveFolderUrl?: string; // e.g. "https://drive.google.com/drive/folders/..."
}

export interface EventRegistration {
  id: string;
  eventId: string;
  eventName?: string;
  lumaEventId: string;
  lumaGuestId: string;
  name: string;
  email: string;
  normalizedEmail: string;
  phone: string;
  normalizedPhone: string;
  registrationStatus: RegistrationStatus;
  registeredAt: string;
  checkedIn: boolean;
  attendedAt?: string;
  crmPersonType?: 'Lead' | 'Student' | null;
  crmPersonId?: string;
  crmPersonName?: string;
  leadCreated: boolean;
  leadId?: string;
  source: 'luma' | string;
  possibleDuplicate?: boolean;
  duplicateConflictReason?: string;
  lastSyncedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventMedia {
  id: string;
  eventId: string;
  eventName?: string;
  type: 'photo' | 'video' | 'drive_album' | 'drive_file';
  storagePath?: string;
  url: string; // Google Drive folder or image URL
  isDriveLink?: boolean;
  driveFolderId?: string;
  driveFileId?: string;
  embedUrl?: string;
  thumbnailPath?: string;
  caption: string;
  sortOrder: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface LumaSyncLog {
  id: string;
  startedAt: string;
  completedAt: string;
  syncType: 'manual' | 'webhook' | 'history';
  eventsReceived: number;
  eventsCreated: number;
  eventsUpdated: number;
  registrationsReceived: number;
  existingCRMMatches: number;
  newLeadsCreated: number;
  possibleDuplicates: number;
  errors: string[];
  status: 'Success' | 'Partial' | 'Failed';
}

export interface LumaIntegrationConfig {
  workspaceUrl: string;
  connected: boolean;
  apiKeyMasked?: string;
  webhookActive: boolean;
  lastSync?: string;
  eventsSyncedCount: number;
  registrationsSyncedCount: number;
  lastError?: string;
}

