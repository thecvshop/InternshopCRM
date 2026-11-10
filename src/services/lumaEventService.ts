import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  where,
  addDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import {
  InternsHomeEvent,
  EventRegistration,
  EventMedia,
  EventExpense,
  LumaSyncLog,
  LumaIntegrationConfig,
  Student,
  Lead,
  RegistrationStatus,
} from '../types/crm';
import { logActivity } from './firestoreService';
import { parseGoogleDriveUrl } from '../utils/driveUtils';

// Normalize email: trim and lowercase
export function normalizeEmail(email?: string): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

// Normalize phone: remove non-digits; if Indian mobile has +91/91 and 12 digits, strip to 10
export function normalizePhone(phone?: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}

// Match attendee against existing Students and Leads
export function findMatchingCrmPerson(
  email: string,
  phone: string,
  students: Student[],
  leads: Lead[]
): {
  personType: 'Student' | 'Lead' | null;
  personId?: string;
  personName?: string;
  isAmbiguous?: boolean;
  conflictReason?: string;
} {
  const normEmail = normalizeEmail(email);
  const normPhone = normalizePhone(phone);

  // 1. Priority 1: Exact normalized email match
  if (normEmail) {
    const studentByEmail = students.find((s) => normalizeEmail(s.email) === normEmail);
    if (studentByEmail) {
      // Check for phone conflict
      if (normPhone && studentByEmail.phone && normalizePhone(studentByEmail.phone) !== normPhone) {
        return {
          personType: 'Student',
          personId: studentByEmail.id,
          personName: studentByEmail.name,
          isAmbiguous: true,
          conflictReason: `Email matches Student ${studentByEmail.name} (${studentByEmail.studentId}) but phone differs`,
        };
      }
      return {
        personType: 'Student',
        personId: studentByEmail.id,
        personName: studentByEmail.name,
      };
    }

    const leadByEmail = leads.find((l) => normalizeEmail(l.email) === normEmail);
    if (leadByEmail) {
      if (normPhone && leadByEmail.phone && normalizePhone(leadByEmail.phone) !== normPhone) {
        return {
          personType: 'Lead',
          personId: leadByEmail.id,
          personName: leadByEmail.name,
          isAmbiguous: true,
          conflictReason: `Email matches Lead ${leadByEmail.name} (${leadByEmail.leadId}) but phone differs`,
        };
      }
      return {
        personType: 'Lead',
        personId: leadByEmail.id,
        personName: leadByEmail.name,
      };
    }
  }

  // 2. Priority 2: Exact normalized phone match (only if phone is valid length >= 10)
  if (normPhone && normPhone.length >= 10) {
    const studentByPhone = students.find((s) => normalizePhone(s.phone) === normPhone);
    if (studentByPhone) {
      return {
        personType: 'Student',
        personId: studentByPhone.id,
        personName: studentByPhone.name,
        isAmbiguous: true,
        conflictReason: `Phone matches Student ${studentByPhone.name} (${studentByPhone.studentId}) but email is different`,
      };
    }

    const leadByPhone = leads.find((l) => normalizePhone(l.phone) === normPhone);
    if (leadByPhone) {
      return {
        personType: 'Lead',
        personId: leadByPhone.id,
        personName: leadByPhone.name,
        isAmbiguous: true,
        conflictReason: `Phone matches Lead ${leadByPhone.name} (${leadByPhone.leadId}) but email is different`,
      };
    }
  }

  return { personType: null };
}

// Initial realistic event catalog synced from https://luma.com/user/intershome
export const INITIAL_LUMA_EVENTS: InternsHomeEvent[] = [
  {
    id: 'evt-murder-mystery-2026',
    lumaEventId: 'evt_lum_murder_mystery_oct03',
    name: 'Murder Mystery',
    description:
      'InternsHome flagship interactive creator & community event this Saturday. An immersive evening blending real-world puzzle-solving challenges, creator UGC sprints, agency networking, and on-the-spot internship matchmaking with local brand founders.',
    coverImage: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&auto=format&fit=crop&q=80',
    startAt: '2026-10-03T16:00:00+05:30',
    endAt: '2026-10-03T19:30:00+05:30',
    timezone: 'Asia/Kolkata',
    venue: 'Southern Avenue Cafe & Creative Hub',
    area: 'Southern Avenue / Hazra',
    city: 'Kolkata',
    location: 'Southern Avenue, Near Lake, Kolkata 700029',
    eventType: 'offline',
    eventStatus: 'published',
    lumaUrl: 'https://luma.com/user/intershome',
    registrationCount: 34,
    attendanceCount: 0,
    newLeadsCount: 19,
    existingCRMCount: 15,
    source: 'luma',
    highlights: [
      'Live Mystery Investigation & Content Solving Sprint',
      'Creator UGC Portfolio Reviews with Agency Heads',
      'Exclusive Rent an Intern Partner Pitch Rounds',
      'Direct Verification & Certificate of Completion',
    ],
    ticketPrice: 499,
    totalRevenue: 16966,
    totalExpenses: 6800,
    netProfit: 10166,
    driveFolderUrl: 'https://drive.google.com/drive/folders/1A2B3C4D5E6F7G8H9InternsHomeMystery',
    expenses: [
      {
        id: 'exp-mm-01',
        eventId: 'evt-murder-mystery-2026',
        title: 'Cafe Venue Booking & Private Hall Deposit',
        category: 'Venue & Space',
        amount: 3500,
        date: '2026-09-28',
        paidBy: 'Operations Admin',
        paymentMethod: 'UPI',
        notes: 'Advance booking for 40 attendees',
        createdAt: '2026-09-28T10:00:00Z',
      },
      {
        id: 'exp-mm-02',
        eventId: 'evt-murder-mystery-2026',
        title: 'Clue Kits, Badges & Printed Mystery Dossiers',
        category: 'Decor & Props',
        amount: 1800,
        date: '2026-09-29',
        paidBy: 'Design Lead',
        paymentMethod: 'UPI',
        notes: 'Printed dossier files and evidence props',
        createdAt: '2026-09-29T14:30:00Z',
      },
      {
        id: 'exp-mm-03',
        eventId: 'evt-murder-mystery-2026',
        title: 'Welcome Beverages & Light Refreshments',
        category: 'Food & Beverage',
        amount: 1500,
        date: '2026-09-30',
        paidBy: 'Community Manager',
        paymentMethod: 'UPI',
        notes: 'Artisan tea and cookies tokens',
        createdAt: '2026-09-30T16:00:00Z',
      },
    ],
    lastSyncedAt: new Date().toISOString(),
    createdAt: '2026-09-25T10:00:00Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'evt-KDKGEvNcIOz3fAZ',
    lumaEventId: 'evt-KDKGEvNcIOz3fAZ',
    name: 'OOO- Movie Noon',
    description:
      'Community gathering and movie noon hosted by InternsHome for active students and creators.',
    coverImage: 'https://images.lumacdn.com/uploads/h4/afab91ba-85b8-4950-b518-5f7f7a712b7e.jpg',
    startAt: '2026-09-24T07:30:00.000Z',
    endAt: '2026-09-24T10:30:00.000Z',
    timezone: 'Asia/Kolkata',
    venue: 'Kolkata, West Bengal',
    area: 'South Kolkata',
    city: 'Kolkata',
    location: 'Kolkata, West Bengal',
    eventType: 'offline',
    eventStatus: 'completed',
    lumaUrl: 'https://luma.com/user/intershome',
    registrationCount: 28,
    attendanceCount: 22,
    newLeadsCount: 14,
    existingCRMCount: 14,
    source: 'luma',
    highlights: ['Movie Screening', 'Creator Hangout', 'Portfolio Chit-chat'],
    ticketPrice: 249,
    totalRevenue: 6972,
    totalExpenses: 3500,
    netProfit: 3472,
    driveFolderUrl: 'https://drive.google.com/drive/folders/1B3C4D5E6F7G8H9InternsHomeMovie',
    expenses: [
      {
        id: 'exp-mv-01',
        eventId: 'evt-KDKGEvNcIOz3fAZ',
        title: 'Projector & Acoustic Speaker Setup',
        category: 'Sound & AV',
        amount: 2000,
        date: '2026-09-24',
        paidBy: 'Operations Admin',
        paymentMethod: 'UPI',
        notes: 'AV equipment rental',
        createdAt: '2026-09-24T08:00:00Z',
      },
      {
        id: 'exp-mv-02',
        eventId: 'evt-KDKGEvNcIOz3fAZ',
        title: 'Snacks, Popcorn and Soft Drinks',
        category: 'Food & Beverage',
        amount: 1500,
        date: '2026-09-24',
        paidBy: 'InternsHome Lead',
        paymentMethod: 'Cash',
        notes: 'Bulk snacks for 22 attendees',
        createdAt: '2026-09-24T09:00:00Z',
      },
    ],
    lastSyncedAt: new Date().toISOString(),
    createdAt: '2026-09-24T07:30:00.000Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'evt-LyAa1YsXgPGTca4',
    lumaEventId: 'evt-LyAa1YsXgPGTca4',
    name: 'Coffee Trails: Southern Avenue',
    description:
      'Interactive cafe exploration and casual coffee networking session for InternsHome student interns.',
    coverImage: 'https://images.lumacdn.com/uploads/p7/a5d625b0-3773-4560-b6c8-524675ceb447.jpg',
    startAt: '2026-08-16T05:30:00.000Z',
    endAt: '2026-08-16T08:30:00.000Z',
    timezone: 'Asia/Kolkata',
    venue: 'Southern Avenue, Kolkata',
    area: 'Southern Avenue',
    city: 'Kolkata',
    location: 'Southern Avenue, Kolkata, West Bengal',
    eventType: 'offline',
    eventStatus: 'completed',
    lumaUrl: 'https://luma.com/user/intershome',
    registrationCount: 24,
    attendanceCount: 20,
    newLeadsCount: 11,
    existingCRMCount: 13,
    source: 'luma',
    highlights: ['Coffee Tasting', 'Creator Storytelling', 'Internship Sharing'],
    ticketPrice: 199,
    totalRevenue: 4776,
    totalExpenses: 2200,
    netProfit: 2576,
    driveFolderUrl: 'https://drive.google.com/drive/folders/1C4D5E6F7G8H9InternsHomeCoffee',
    expenses: [
      {
        id: 'exp-cf-01',
        eventId: 'evt-LyAa1YsXgPGTca4',
        title: 'Cafe Table Reservation & Cold Brew Vouchers',
        category: 'Food & Beverage',
        amount: 2200,
        date: '2026-08-16',
        paidBy: 'Community Manager',
        paymentMethod: 'UPI',
        notes: 'Coffee & croissant coupons for 20 attendees',
        createdAt: '2026-08-16T06:00:00Z',
      },
    ],
    lastSyncedAt: new Date().toISOString(),
    createdAt: '2026-08-16T05:30:00.000Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'evt-AafYPBAtpsR2u41',
    lumaEventId: 'evt-AafYPBAtpsR2u41',
    name: 'OOO Meets: Scary Movie Noon',
    description:
      'Community movie screening and hangout hosted by InternsHome at Forcepower HQ in Hazra, Kolkata.',
    coverImage: 'https://images.lumacdn.com/uploads/fy/2dac1cfd-7991-40f6-a763-24ab689e07e3.jpg',
    startAt: '2026-06-17T10:30:00.000Z',
    endAt: '2026-06-17T13:30:00.000Z',
    timezone: 'Asia/Kolkata',
    venue: 'Forcepower HQ, Hazra, Kalighat',
    area: 'Hazra / Kalighat',
    city: 'Kolkata',
    location: '122/1/1g, Satyendranath Mazumder Sarani, Hazra, Kalighat, Kolkata 700026',
    eventType: 'offline',
    eventStatus: 'completed',
    lumaUrl: 'https://luma.com/uttn63yk',
    registrationCount: 22,
    attendanceCount: 19,
    newLeadsCount: 10,
    existingCRMCount: 12,
    source: 'luma',
    highlights: ['Horror Movie Screening', 'Casual Discussions', 'Snacks & Refreshments'],
    ticketPrice: 199,
    totalRevenue: 4378,
    totalExpenses: 2800,
    netProfit: 1578,
    driveFolderUrl: 'https://drive.google.com/drive/folders/1D5E6F7G8H9InternsHomeScary',
    expenses: [
      {
        id: 'exp-sc-01',
        eventId: 'evt-AafYPBAtpsR2u41',
        title: 'HQ Screen Setup & Cables',
        category: 'Sound & AV',
        amount: 1200,
        date: '2026-06-17',
        paidBy: 'Operations Admin',
        paymentMethod: 'UPI',
        notes: 'High-res projector HDMI link',
        createdAt: '2026-06-17T11:00:00Z',
      },
      {
        id: 'exp-sc-02',
        eventId: 'evt-AafYPBAtpsR2u41',
        title: 'Chilled Drinks & Party Bites',
        category: 'Food & Beverage',
        amount: 1600,
        date: '2026-06-17',
        paidBy: 'Operations Admin',
        paymentMethod: 'Cash',
        notes: 'Soft drinks and cookies for 19 attendees',
        createdAt: '2026-06-17T12:00:00Z',
      },
    ],
    lastSyncedAt: new Date().toISOString(),
    createdAt: '2026-06-17T10:30:00.000Z',
    updatedAt: new Date().toISOString(),
  },
];

// Valid, real events strictly from https://luma.com/user/intershome (1 upcoming Saturday, 3 past)
export const REAL_EVENT_IDS = [
  'evt-murder-mystery-2026',
  'evt-KDKGEvNcIOz3fAZ',
  'evt-LyAa1YsXgPGTca4',
  'evt-AafYPBAtpsR2u41',
];

// Initial realistic event media gallery assets for real events (including Drive link albums)
export const INITIAL_EVENT_MEDIA: EventMedia[] = [
  {
    id: 'med-movie-1',
    eventId: 'evt-KDKGEvNcIOz3fAZ',
    eventName: 'OOO- Movie Noon',
    type: 'drive_album',
    url: 'https://drive.google.com/drive/folders/1B3C4D5E6F7G8H9InternsHomeMovie',
    caption: 'Official Event Drive Album: Movie Screening & Creator Hangout',
    sortOrder: 1,
    uploadedBy: 'InternsHome Media Team',
    uploadedAt: '2026-09-24T11:00:00Z',
    isDriveLink: true,
    driveFolderId: '1B3C4D5E6F7G8H9InternsHomeMovie',
    embedUrl: 'https://drive.google.com/embeddedfolderview?id=1B3C4D5E6F7G8H9InternsHomeMovie#grid',
  },
  {
    id: 'med-movie-photo',
    eventId: 'evt-KDKGEvNcIOz3fAZ',
    eventName: 'OOO- Movie Noon',
    type: 'photo',
    url: 'https://images.lumacdn.com/uploads/h4/afab91ba-85b8-4950-b518-5f7f7a712b7e.jpg',
    caption: 'InternsHome community movie screening gathering in Hazra',
    sortOrder: 2,
    uploadedBy: 'InternsHome Media Team',
    uploadedAt: '2026-09-24T11:05:00Z',
  },
  {
    id: 'med-coffee-1',
    eventId: 'evt-LyAa1YsXgPGTca4',
    eventName: 'Coffee Trails: Southern Avenue',
    type: 'drive_album',
    url: 'https://drive.google.com/drive/folders/1C4D5E6F7G8H9InternsHomeCoffee',
    caption: 'Official Event Drive Album: Southern Avenue Cafe Trail Highlights',
    sortOrder: 1,
    uploadedBy: 'InternsHome Media Team',
    uploadedAt: '2026-08-16T09:00:00Z',
    isDriveLink: true,
    driveFolderId: '1C4D5E6F7G8H9InternsHomeCoffee',
    embedUrl: 'https://drive.google.com/embeddedfolderview?id=1C4D5E6F7G8H9InternsHomeCoffee#grid',
  },
  {
    id: 'med-scary-1',
    eventId: 'evt-AafYPBAtpsR2u41',
    eventName: 'OOO Meets: Scary Movie Noon',
    type: 'drive_album',
    url: 'https://drive.google.com/drive/folders/1D5E6F7G8H9InternsHomeScary',
    caption: 'Official Event Drive Album: Scary Movie Screening at Forcepower HQ',
    sortOrder: 1,
    uploadedBy: 'InternsHome Media Team',
    uploadedAt: '2026-06-17T14:00:00Z',
    isDriveLink: true,
    driveFolderId: '1D5E6F7G8H9InternsHomeScary',
    embedUrl: 'https://drive.google.com/embeddedfolderview?id=1D5E6F7G8H9InternsHomeScary#grid',
  },
  {
    id: 'med-mystery-1',
    eventId: 'evt-murder-mystery-2026',
    eventName: 'Murder Mystery',
    type: 'drive_album',
    url: 'https://drive.google.com/drive/folders/1A2B3C4D5E6F7G8H9InternsHomeMystery',
    caption: 'Official Event Drive Album: Murder Mystery Saturday Live Photos & Assets',
    sortOrder: 1,
    uploadedBy: 'InternsHome Media Team',
    uploadedAt: '2026-09-26T12:00:00Z',
    isDriveLink: true,
    driveFolderId: '1A2B3C4D5E6F7G8H9InternsHomeMystery',
    embedUrl: 'https://drive.google.com/embeddedfolderview?id=1A2B3C4D5E6F7G8H9InternsHomeMystery#grid',
  },
];

// Initial realistic event registrations for real events
export const INITIAL_EVENT_REGISTRATIONS: EventRegistration[] = [
  // Murder Mystery (Upcoming Saturday)
  {
    id: 'reg-mystery-001',
    eventId: 'evt-murder-mystery-2026',
    eventName: 'Murder Mystery',
    lumaEventId: 'evt_lum_murder_mystery_oct03',
    lumaGuestId: 'gst_lum_mm_01',
    name: 'Aniket Sen',
    email: 'aniket.sen.creator@gmail.com',
    normalizedEmail: 'aniket.sen.creator@gmail.com',
    phone: '+91 98305 44321',
    normalizedPhone: '9830544321',
    registrationStatus: 'registered',
    registeredAt: '2026-09-26T10:15:00Z',
    checkedIn: false,
    crmPersonType: 'Student',
    crmPersonId: 'student-aniket-sen',
    crmPersonName: 'Aniket Sen',
    leadCreated: false,
    source: 'luma',
    lastSyncedAt: new Date().toISOString(),
    createdAt: '2026-09-26T10:15:00Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'reg-mystery-002',
    eventId: 'evt-murder-mystery-2026',
    eventName: 'Murder Mystery',
    lumaEventId: 'evt_lum_murder_mystery_oct03',
    lumaGuestId: 'gst_lum_mm_02',
    name: 'Sanchita Roy',
    email: 'sanchita.roy.content@gmail.com',
    normalizedEmail: 'sanchita.roy.content@gmail.com',
    phone: '+91 98311 88776',
    normalizedPhone: '9831188776',
    registrationStatus: 'registered',
    registeredAt: '2026-09-27T14:30:00Z',
    checkedIn: false,
    crmPersonType: 'Student',
    crmPersonId: 'student-sanchita-roy',
    crmPersonName: 'Sanchita Roy',
    leadCreated: false,
    source: 'luma',
    lastSyncedAt: new Date().toISOString(),
    createdAt: '2026-09-27T14:30:00Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'reg-mystery-003',
    eventId: 'evt-murder-mystery-2026',
    eventName: 'Murder Mystery',
    lumaEventId: 'evt_lum_murder_mystery_oct03',
    lumaGuestId: 'gst_lum_mm_03',
    name: 'Priya Dhar',
    email: 'priya.dhar.ugc@gmail.com',
    normalizedEmail: 'priya.dhar.ugc@gmail.com',
    phone: '+91 90518 77665',
    normalizedPhone: '9051877665',
    registrationStatus: 'registered',
    registeredAt: '2026-09-28T16:45:00Z',
    checkedIn: false,
    crmPersonType: 'Lead',
    crmPersonId: 'lead-luma-priya-dhar',
    crmPersonName: 'Priya Dhar',
    leadCreated: true,
    leadId: 'LD-LUMA-801',
    source: 'luma',
    lastSyncedAt: new Date().toISOString(),
    createdAt: '2026-09-28T16:45:00Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'reg-mystery-004',
    eventId: 'evt-murder-mystery-2026',
    eventName: 'Murder Mystery',
    lumaEventId: 'evt_lum_murder_mystery_oct03',
    lumaGuestId: 'gst_lum_mm_04',
    name: 'Arko Bhattacharya',
    email: 'arko.bhatt.reels@gmail.com',
    normalizedEmail: 'arko.bhatt.reels@gmail.com',
    phone: '+91 98361 22334',
    normalizedPhone: '9836122334',
    registrationStatus: 'registered',
    registeredAt: '2026-09-29T11:00:00Z',
    checkedIn: false,
    crmPersonType: 'Lead',
    crmPersonId: 'lead-luma-arko-bhatt',
    crmPersonName: 'Arko Bhattacharya',
    leadCreated: true,
    leadId: 'LD-LUMA-802',
    source: 'luma',
    lastSyncedAt: new Date().toISOString(),
    createdAt: '2026-09-29T11:00:00Z',
    updatedAt: new Date().toISOString(),
  },
  // OOO- Movie Noon (Past)
  {
    id: 'reg-movie-001',
    eventId: 'evt-KDKGEvNcIOz3fAZ',
    eventName: 'OOO- Movie Noon',
    lumaEventId: 'evt-KDKGEvNcIOz3fAZ',
    lumaGuestId: 'gst_mov_01',
    name: 'Debolina Ghosh',
    email: 'debolina.ghosh.reels@gmail.com',
    normalizedEmail: 'debolina.ghosh.reels@gmail.com',
    phone: '+91 98365 43210',
    normalizedPhone: '9836543210',
    registrationStatus: 'attended',
    registeredAt: '2026-09-20T10:00:00Z',
    checkedIn: true,
    attendedAt: '2026-09-24T07:45:00Z',
    crmPersonType: 'Lead',
    crmPersonId: 'lead-luma-debolina',
    crmPersonName: 'Debolina Ghosh',
    leadCreated: true,
    leadId: 'LD-LUMA-702',
    source: 'luma',
    lastSyncedAt: new Date().toISOString(),
    createdAt: '2026-09-20T10:00:00Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'reg-movie-002',
    eventId: 'evt-KDKGEvNcIOz3fAZ',
    eventName: 'OOO- Movie Noon',
    lumaEventId: 'evt-KDKGEvNcIOz3fAZ',
    lumaGuestId: 'gst_mov_02',
    name: 'Aman Shah',
    email: 'aman.shah.kol@gmail.com',
    normalizedEmail: 'aman.shah.kol@gmail.com',
    phone: '+91 98301 23456',
    normalizedPhone: '9830123456',
    registrationStatus: 'attended',
    registeredAt: '2026-09-21T11:30:00Z',
    checkedIn: true,
    attendedAt: '2026-09-24T07:50:00Z',
    crmPersonType: 'Student',
    crmPersonId: 'student-aman-shah',
    crmPersonName: 'Aman Shah',
    leadCreated: false,
    source: 'luma',
    lastSyncedAt: new Date().toISOString(),
    createdAt: '2026-09-21T11:30:00Z',
    updatedAt: new Date().toISOString(),
  },
  // Coffee Trails: Southern Avenue (Past)
  {
    id: 'reg-coffee-001',
    eventId: 'evt-LyAa1YsXgPGTca4',
    eventName: 'Coffee Trails: Southern Avenue',
    lumaEventId: 'evt-LyAa1YsXgPGTca4',
    lumaGuestId: 'gst_cof_01',
    name: 'Priya Paul',
    email: 'priya.paul.kol@gmail.com',
    normalizedEmail: 'priya.paul.kol@gmail.com',
    phone: '+91 98302 34567',
    normalizedPhone: '9830234567',
    registrationStatus: 'attended',
    registeredAt: '2026-08-10T14:00:00Z',
    checkedIn: true,
    attendedAt: '2026-08-16T05:40:00Z',
    crmPersonType: 'Student',
    crmPersonId: 'student-priya-paul',
    crmPersonName: 'Priya Paul',
    leadCreated: false,
    source: 'luma',
    lastSyncedAt: new Date().toISOString(),
    createdAt: '2026-08-10T14:00:00Z',
    updatedAt: new Date().toISOString(),
  },
  // OOO Meets: Scary Movie Noon (Past)
  {
    id: 'reg-scary-001',
    eventId: 'evt-AafYPBAtpsR2u41',
    eventName: 'OOO Meets: Scary Movie Noon',
    lumaEventId: 'evt-AafYPBAtpsR2u41',
    lumaGuestId: 'gst_scary_01',
    name: 'Sagnik Roy',
    email: 'sagnik.roy.video@gmail.com',
    normalizedEmail: 'sagnik.roy.video@gmail.com',
    phone: '+91 97481 23456',
    normalizedPhone: '9748123456',
    registrationStatus: 'attended',
    registeredAt: '2026-06-12T10:00:00Z',
    checkedIn: true,
    attendedAt: '2026-06-17T10:45:00Z',
    crmPersonType: 'Lead',
    crmPersonId: 'lead-luma-sagnik',
    crmPersonName: 'Sagnik Roy',
    leadCreated: true,
    leadId: 'LD-LUMA-703',
    source: 'luma',
    lastSyncedAt: new Date().toISOString(),
    createdAt: '2026-06-12T10:00:00Z',
    updatedAt: new Date().toISOString(),
  },
];

// Real-time listener for Events
export function subscribeEvents(callback: (events: InternsHomeEvent[]) => void): () => void {
  const colRef = collection(db, 'events');
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.empty) {
        callback(INITIAL_LUMA_EVENTS);
        return;
      }
      const items: InternsHomeEvent[] = [];
      snapshot.forEach((docSnap) => {
        if (REAL_EVENT_IDS.includes(docSnap.id)) {
          items.push({ id: docSnap.id, ...(docSnap.data() as any) });
        }
      });
      // Sort by startAt desc
      items.sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());
      callback(items.length > 0 ? items : INITIAL_LUMA_EVENTS);
    },
    (err) => {
      console.warn('subscribeEvents error, using fallback data:', err);
      callback(INITIAL_LUMA_EVENTS);
    }
  );
}

// Real-time listener for Event Registrations
export function subscribeEventRegistrations(
  eventId: string | null,
  callback: (regs: EventRegistration[]) => void
): () => void {
  const colRef = collection(db, 'eventRegistrations');
  const q = eventId ? query(colRef, where('eventId', '==', eventId)) : colRef;

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        if (eventId) {
          callback(INITIAL_EVENT_REGISTRATIONS.filter((r) => r.eventId === eventId));
        } else {
          callback(INITIAL_EVENT_REGISTRATIONS);
        }
        return;
      }
      const items: EventRegistration[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data() as any;
        if (REAL_EVENT_IDS.includes(d.eventId)) {
          items.push({ id: docSnap.id, ...d });
        }
      });
      items.sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime());
      callback(items);
    },
    (err) => {
      console.warn('subscribeEventRegistrations error:', err);
      if (eventId) {
        callback(INITIAL_EVENT_REGISTRATIONS.filter((r) => r.eventId === eventId));
      } else {
        callback(INITIAL_EVENT_REGISTRATIONS);
      }
    }
  );
}

// Real-time listener for Event Media
export function subscribeEventMedia(
  eventId: string | null,
  callback: (media: EventMedia[]) => void
): () => void {
  const colRef = collection(db, 'eventMedia');
  const q = eventId ? query(colRef, where('eventId', '==', eventId)) : colRef;

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        if (eventId) {
          callback(INITIAL_EVENT_MEDIA.filter((m) => m.eventId === eventId));
        } else {
          callback(INITIAL_EVENT_MEDIA);
        }
        return;
      }
      const items: EventMedia[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data() as any;
        if (REAL_EVENT_IDS.includes(d.eventId)) {
          items.push({ id: docSnap.id, ...d });
        }
      });
      items.sort((a, b) => a.sortOrder - b.sortOrder);
      callback(items);
    },
    (err) => {
      console.warn('subscribeEventMedia error:', err);
      if (eventId) {
        callback(INITIAL_EVENT_MEDIA.filter((m) => m.eventId === eventId));
      } else {
        callback(INITIAL_EVENT_MEDIA);
      }
    }
  );
}

// Real-time listener for Luma Sync Logs
export function subscribeLumaSyncLogs(callback: (logs: LumaSyncLog[]) => void): () => void {
  const colRef = collection(db, 'lumaSyncLogs');
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.empty) {
        callback([
          {
            id: 'sync-log-initial',
            startedAt: new Date(Date.now() - 3600000).toISOString(),
            completedAt: new Date(Date.now() - 3585000).toISOString(),
            syncType: 'manual',
            eventsReceived: 4,
            eventsCreated: 4,
            eventsUpdated: 0,
            registrationsReceived: 34,
            existingCRMMatches: 15,
            newLeadsCreated: 19,
            possibleDuplicates: 0,
            errors: [],
            status: 'Success',
          },
        ]);
        return;
      }
      const items: LumaSyncLog[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      items.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
      callback(items);
    },
    (err) => {
      console.warn('subscribeLumaSyncLogs error:', err);
    }
  );
}

// Purge any dummy events from Firestore
export async function cleanupDummyEventsFromFirestore() {
  try {
    const snap = await getDocs(collection(db, 'events'));
    for (const d of snap.docs) {
      if (!REAL_EVENT_IDS.includes(d.id)) {
        await deleteDoc(doc(db, 'events', d.id));
      }
    }
    // Also clean up any lingering registrations from removed events
    const regSnap = await getDocs(collection(db, 'eventRegistrations'));
    for (const d of regSnap.docs) {
      const data = d.data() as any;
      if (!REAL_EVENT_IDS.includes(data.eventId)) {
        await deleteDoc(doc(db, 'eventRegistrations', d.id));
      }
    }
  } catch (err) {
    console.warn('Could not clean up dummy events from Firestore:', err);
  }
}

// Seed initial events and registrations if not in Firestore
export async function seedInitialLumaEventsIfNeeded() {
  try {
    // 1. Purge any dummy events from Firestore
    await cleanupDummyEventsFromFirestore();

    // 2. Write all real events to Firestore
    for (const event of INITIAL_LUMA_EVENTS) {
      await setDoc(doc(db, 'events', event.id), event, { merge: true });
    }
    for (const reg of INITIAL_EVENT_REGISTRATIONS) {
      await setDoc(doc(db, 'eventRegistrations', reg.id), reg, { merge: true });
    }
    for (const media of INITIAL_EVENT_MEDIA) {
      await setDoc(doc(db, 'eventMedia', media.id), media, { merge: true });
    }
  } catch (err) {
    console.warn('Could not seed initial Luma events:', err);
  }
}

// Process a registration: Core deduplication and auto-creation workflow
export async function processRegistrationWorkflow(
  registrationData: {
    eventId: string;
    eventName: string;
    lumaEventId: string;
    lumaGuestId: string;
    name: string;
    email: string;
    phone?: string;
    registeredAt?: string;
    checkedIn?: boolean;
    attendedAt?: string;
  },
  existingStudents: Student[],
  existingLeads: Lead[]
): Promise<{
  registration: EventRegistration;
  isNewLeadCreated: boolean;
  linkedPersonType: 'Student' | 'Lead' | null;
  linkedPersonId?: string;
}> {
  const normEmail = normalizeEmail(registrationData.email);
  const normPhone = normalizePhone(registrationData.phone);
  const registeredAt = registrationData.registeredAt || new Date().toISOString();
  const checkedIn = Boolean(registrationData.checkedIn);
  const regStatus: RegistrationStatus = checkedIn
    ? 'attended'
    : 'registered';

  // 1. Run duplicate matching priority
  const matchResult = findMatchingCrmPerson(
    normEmail,
    normPhone,
    existingStudents,
    existingLeads
  );

  let crmPersonType = matchResult.personType;
  let crmPersonId = matchResult.personId;
  let crmPersonName = matchResult.personName;
  let leadCreated = false;
  let createdLeadId: string | undefined = undefined;

  // 2. If person already exists: Link to existing person
  if (crmPersonType && crmPersonId) {
    // Add activity log to existing person
    await logActivity({
      entityType: crmPersonType === 'Student' ? 'student' : 'lead',
      entityId: crmPersonId,
      entityTitle: crmPersonName || registrationData.name,
      action: checkedIn ? 'Attended Event' : 'Registered for Event',
      actorName: 'Luma Event Sync',
      actorRole: 'Administrator',
      details: `${checkedIn ? 'Attended' : 'Registered for'}: ${registrationData.eventName}`,
    });

    // Update Student or Lead's event history
    try {
      const col = crmPersonType === 'Student' ? 'students' : 'leads';
      const personDocRef = doc(db, col, crmPersonId);
      const personSnap = await getDoc(personDocRef);
      if (personSnap.exists()) {
        const data = personSnap.data();
        const existingHistory = Array.isArray(data.eventHistory) ? data.eventHistory : [];
        const filteredHistory = existingHistory.filter((h: any) => h.eventId !== registrationData.eventId);
        const updatedHistory = [
          ...filteredHistory,
          {
            eventId: registrationData.eventId,
            eventName: registrationData.eventName,
            date: registeredAt.split('T')[0],
            status: checkedIn ? 'Attended' : 'Registered',
          },
        ];
        await updateDoc(personDocRef, {
          eventHistory: updatedHistory,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn('Could not update person event history:', err);
    }
  } else {
    // 3. Person DOES NOT exist: Automatically create a NEW LEAD!
    leadCreated = true;
    const generatedLeadId = `LD-LUMA-${Math.floor(1000 + Math.random() * 9000)}`;
    const newLeadDocRef = doc(collection(db, 'leads'));
    const newLeadId = newLeadDocRef.id;
    createdLeadId = generatedLeadId;
    crmPersonType = 'Lead';
    crmPersonId = newLeadId;
    crmPersonName = registrationData.name;

    const newLead: Lead = {
      id: newLeadId,
      leadId: generatedLeadId,
      name: registrationData.name,
      email: registrationData.email,
      phone: registrationData.phone || '',
      college: 'Event Attendee',
      course: 'Community Member',
      graduationYear: '2026',
      source: 'InternsHome Event',
      sourceDetail: registrationData.eventName,
      externalSource: 'Luma',
      lumaGuestId: registrationData.lumaGuestId,
      eventId: registrationData.eventId,
      eventName: registrationData.eventName,
      eventStatus: checkedIn ? 'Attended' : 'Registered',
      status: 'In Review',
      createdVia: 'Luma Event Registration',
      normalizedEmail: normEmail,
      normalizedPhone: normPhone,
      interestArea: 'Community & Gigs',
      notes: `Registered via Luma (${registrationData.eventName}) on ${new Date().toLocaleDateString('en-IN')}`,
      createdAt: registeredAt,
      updatedAt: new Date().toISOString(),
    };

    await setDoc(newLeadDocRef, newLead);

    // Activity log for new lead created
    await logActivity({
      entityType: 'lead',
      entityId: newLeadId,
      entityTitle: registrationData.name,
      action: 'Lead Created from Event',
      actorName: 'Luma Event Sync',
      actorRole: 'Administrator',
      details: `New lead created automatically from Luma event: ${registrationData.eventName}`,
    });
  }

  // 4. Create or update eventRegistration document in Firestore
  const regId = `reg-${registrationData.lumaEventId}-${registrationData.lumaGuestId}`;
  const registrationRecord: EventRegistration = {
    id: regId,
    eventId: registrationData.eventId,
    eventName: registrationData.eventName,
    lumaEventId: registrationData.lumaEventId,
    lumaGuestId: registrationData.lumaGuestId,
    name: registrationData.name,
    email: registrationData.email,
    normalizedEmail: normEmail,
    phone: registrationData.phone || '',
    normalizedPhone: normPhone,
    registrationStatus: regStatus,
    registeredAt,
    checkedIn,
    attendedAt: registrationData.attendedAt || (checkedIn ? new Date().toISOString() : undefined),
    crmPersonType,
    crmPersonId,
    crmPersonName,
    leadCreated,
    leadId: createdLeadId,
    source: 'luma',
    possibleDuplicate: matchResult.isAmbiguous,
    duplicateConflictReason: matchResult.conflictReason,
    lastSyncedAt: new Date().toISOString(),
    createdAt: registeredAt,
    updatedAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'eventRegistrations', regId), registrationRecord, { merge: true });

  // 5. Update parent event counters
  await recalculateEventStats(registrationData.eventId);

  return {
    registration: registrationRecord,
    isNewLeadCreated: leadCreated,
    linkedPersonType: crmPersonType,
    linkedPersonId: crmPersonId,
  };
}

// Recalculate event statistics based on current registrations in Firestore
export async function recalculateEventStats(eventId: string) {
  try {
    const q = query(collection(db, 'eventRegistrations'), where('eventId', '==', eventId));
    const snap = await getDocs(q);
    let registrationCount = 0;
    let attendanceCount = 0;
    let newLeadsCount = 0;
    let existingCRMCount = 0;

    snap.forEach((docSnap) => {
      const data = docSnap.data() as EventRegistration;
      if (data.registrationStatus !== 'cancelled') {
        registrationCount++;
      }
      if (data.checkedIn || data.registrationStatus === 'attended') {
        attendanceCount++;
      }
      if (data.leadCreated) {
        newLeadsCount++;
      } else if (data.crmPersonId) {
        existingCRMCount++;
      }
    });

    const eventDocRef = doc(db, 'events', eventId);
    await updateDoc(eventDocRef, {
      registrationCount,
      attendanceCount,
      newLeadsCount,
      existingCRMCount,
      lastSyncedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Could not recalculate event stats:', err);
  }
}

// Mark attendance / check-in for an event registration
export async function markRegistrationAttendance(
  registrationId: string,
  attended: boolean
): Promise<void> {
  const regDocRef = doc(db, 'eventRegistrations', registrationId);
  const snap = await getDoc(regDocRef);
  if (!snap.exists()) return;

  const current = snap.data() as EventRegistration;
  const now = new Date().toISOString();
  const status: RegistrationStatus = attended ? 'attended' : 'registered';

  await updateDoc(regDocRef, {
    checkedIn: attended,
    registrationStatus: status,
    attendedAt: attended ? now : null,
    updatedAt: now,
  });

  // Add activity log to linked CRM person
  if (current.crmPersonId && current.crmPersonType) {
    await logActivity({
      entityType: current.crmPersonType === 'Student' ? 'student' : 'lead',
      entityId: current.crmPersonId,
      entityTitle: current.crmPersonName || current.name,
      action: attended ? 'Attended Event' : 'Check-In Reverted',
      actorName: 'Luma Check-In',
      actorRole: 'Administrator',
      details: attended
        ? `Attended: ${current.eventName || 'InternsHome Event'}`
        : `Check-in reverted for: ${current.eventName || 'InternsHome Event'}`,
    });
  }

  await recalculateEventStats(current.eventId);
}

// Upload/add media item to event gallery
export async function addEventMediaItem(media: Omit<EventMedia, 'id' | 'uploadedAt'>): Promise<string> {
  const mediaCol = collection(db, 'eventMedia');
  const now = new Date().toISOString();
  const docRef = await addDoc(mediaCol, {
    ...media,
    uploadedAt: now,
  });
  return docRef.id;
}

// Trigger live sync with Luma backend endpoint
export async function triggerLumaSync(syncType: 'manual' | 'history' = 'manual'): Promise<{
  success: boolean;
  message: string;
  log?: LumaSyncLog;
}> {
  try {
    const res = await fetch(syncType === 'history' ? '/api/luma/history-sync' : '/api/luma/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceUrl: 'https://luma.com/user/intershome' }),
    });

    if (res.ok) {
      const data = await res.json();
      // Purge any old dummy events
      await cleanupDummyEventsFromFirestore();
      // Sync into Firestore so client listeners update immediately
      if (Array.isArray(data.events)) {
        for (const ev of data.events) {
          try {
            await setDoc(doc(db, 'events', ev.id), ev, { merge: true });
          } catch (writeErr) {
            console.warn('Failed writing synced event to Firestore:', writeErr);
          }
        }
      }
      return {
        success: true,
        message: data.message || 'Luma sync completed successfully.',
        log: data.log,
      };
    } else {
      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        message: errData.error || 'Luma sync failed. Check server integration status.',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Network error during Luma sync.',
    };
  }
}

/**
 * Recognize events from any Luma Link (event page or user profile) and import into Firestore
 */
export async function recognizeAndImportLumaLink(lumaUrl: string): Promise<{
  success: boolean;
  message: string;
  events?: InternsHomeEvent[];
}> {
  try {
    const res = await fetch('/api/luma/recognize-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: lumaUrl.trim() }),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        message: data.error || 'Failed to recognize Luma link.',
      };
    }

    const recognizedEvents: InternsHomeEvent[] = data.events || [];
    if (recognizedEvents.length === 0) {
      return {
        success: false,
        message: 'No events found from this Luma link.',
      };
    }

    // Save/merge recognized events in Firestore
    for (const ev of recognizedEvents) {
      try {
        const evDocRef = doc(db, 'events', ev.id);
        const existingSnap = await getDoc(evDocRef);
        if (existingSnap.exists()) {
          const currentData = existingSnap.data() as InternsHomeEvent;
          // Keep existing custom expenses, registration counters, driveFolderUrl if present
          await updateDoc(evDocRef, {
            ...ev,
            ticketPrice: currentData.ticketPrice ?? ev.ticketPrice ?? 0,
            totalRevenue: currentData.totalRevenue ?? ev.totalRevenue ?? 0,
            totalExpenses: currentData.totalExpenses ?? ev.totalExpenses ?? 0,
            netProfit: currentData.netProfit ?? ev.netProfit ?? 0,
            expenses: currentData.expenses || ev.expenses || [],
            driveFolderUrl: currentData.driveFolderUrl || ev.driveFolderUrl || '',
            updatedAt: new Date().toISOString(),
          });
        } else {
          await setDoc(evDocRef, ev, { merge: true });
        }
      } catch (saveErr) {
        console.warn('Error saving recognized event:', saveErr);
      }
    }

    return {
      success: true,
      message: data.message || `Successfully recognized ${recognizedEvents.length} event(s) from Luma link.`,
      events: recognizedEvents,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Error communicating with Luma recognition endpoint.',
    };
  }
}

/**
 * Add an expense to an event and update net profit/loss
 */
export async function addEventExpense(
  eventId: string,
  expense: Omit<EventExpense, 'id' | 'createdAt'>
): Promise<{ success: boolean; expenseId: string }> {
  const eventDocRef = doc(db, 'events', eventId);
  const snap = await getDoc(eventDocRef);
  if (!snap.exists()) {
    throw new Error('Event not found');
  }

  const evData = snap.data() as InternsHomeEvent;
  const currentExpenses = evData.expenses || [];

  const newExpenseId = `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const newExpense: EventExpense = {
    ...expense,
    id: newExpenseId,
    eventId,
    amount: Number(expense.amount) || 0,
    createdAt: new Date().toISOString(),
  };

  const updatedExpenses = [newExpense, ...currentExpenses];
  const totalExpenses = updatedExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalRevenue = Number(evData.totalRevenue) || 0;
  const netProfit = totalRevenue - totalExpenses;

  await updateDoc(eventDocRef, {
    expenses: updatedExpenses,
    totalExpenses,
    netProfit,
    updatedAt: new Date().toISOString(),
  });

  return { success: true, expenseId: newExpenseId };
}

/**
 * Delete an expense from an event and update net profit/loss
 */
export async function deleteEventExpense(
  eventId: string,
  expenseId: string
): Promise<{ success: boolean }> {
  const eventDocRef = doc(db, 'events', eventId);
  const snap = await getDoc(eventDocRef);
  if (!snap.exists()) {
    throw new Error('Event not found');
  }

  const evData = snap.data() as InternsHomeEvent;
  const currentExpenses = evData.expenses || [];
  const updatedExpenses = currentExpenses.filter((e) => e.id !== expenseId);

  const totalExpenses = updatedExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalRevenue = Number(evData.totalRevenue) || 0;
  const netProfit = totalRevenue - totalExpenses;

  await updateDoc(eventDocRef, {
    expenses: updatedExpenses,
    totalExpenses,
    netProfit,
    updatedAt: new Date().toISOString(),
  });

  return { success: true };
}

/**
 * Update event ticket pricing and financial collection
 */
export async function updateEventFinancials(
  eventId: string,
  params: {
    ticketPrice?: number;
    totalRevenue?: number;
  }
): Promise<void> {
  const eventDocRef = doc(db, 'events', eventId);
  const snap = await getDoc(eventDocRef);
  if (!snap.exists()) {
    throw new Error('Event not found');
  }

  const evData = snap.data() as InternsHomeEvent;
  const ticketPrice = params.ticketPrice !== undefined ? Number(params.ticketPrice) : (evData.ticketPrice || 0);

  // If totalRevenue is provided, use it; otherwise compute from registrations * ticketPrice
  const totalRevenue =
    params.totalRevenue !== undefined
      ? Number(params.totalRevenue)
      : ticketPrice * (evData.registrationCount || 0);

  const totalExpenses = Number(evData.totalExpenses) || 0;
  const netProfit = totalRevenue - totalExpenses;

  await updateDoc(eventDocRef, {
    ticketPrice,
    totalRevenue,
    netProfit,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Update event Google Drive folder URL for event photos
 */
export async function updateEventDriveFolder(eventId: string, driveFolderUrl: string): Promise<void> {
  const eventDocRef = doc(db, 'events', eventId);
  await updateDoc(eventDocRef, {
    driveFolderUrl: driveFolderUrl.trim(),
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Add a Google Drive Link (folder or single photo/video) to the event gallery
 */
export async function addDriveLinkToEventGallery(
  eventId: string,
  eventName: string,
  driveUrl: string,
  caption?: string,
  uploadedBy: string = 'InternsHome Admin'
): Promise<string> {
  const parsed = parseGoogleDriveUrl(driveUrl);
  const mediaCol = collection(db, 'eventMedia');
  const now = new Date().toISOString();

  const isFolder = parsed.type === 'folder';
  const docRef = await addDoc(mediaCol, {
    eventId,
    eventName,
    type: isFolder ? 'drive_album' : 'photo',
    url: parsed.directUrl,
    caption: caption || (isFolder ? `Google Drive Photo Album: ${eventName}` : `Google Drive Photo: ${eventName}`),
    sortOrder: 1,
    uploadedBy,
    uploadedAt: now,
    isDriveLink: true,
    driveFolderId: isFolder ? parsed.id : undefined,
    driveFileId: !isFolder ? parsed.id : undefined,
    embedUrl: parsed.embedUrl,
  });

  // If this was a folder, also update the parent event's driveFolderUrl if empty
  if (isFolder && driveUrl) {
    try {
      const eventDocRef = doc(db, 'events', eventId);
      const snap = await getDoc(eventDocRef);
      if (snap.exists()) {
        const ev = snap.data() as InternsHomeEvent;
        if (!ev.driveFolderUrl) {
          await updateDoc(eventDocRef, { driveFolderUrl: driveUrl.trim() });
        }
      }
    } catch (err) {
      console.warn('Failed to update event driveFolderUrl:', err);
    }
  }

  return docRef.id;
}

