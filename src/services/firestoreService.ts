import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  getDocs,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase/config';
import {
  Student,
  Lead,
  Company,
  JobRole,
  Interview,
  Placement,
  Invoice,
  TaskItem,
  ActivityLog,
  Assignment,
  TrainingBatch,
  Agreement,
  Portfolio,
  DocumentItem,
  AutomationRun,
  StudentStage,
  RentAnInternEntry,
  RentAnInternBooking,
} from '../types/crm';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

// --- ACTIVITY LOGGER ---
export async function logActivity(log: Omit<ActivityLog, 'id' | 'timestamp'>) {
  try {
    const actRef = doc(collection(db, 'activities'));
    await setDoc(actRef, {
      ...log,
      id: actRef.id,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

// --- AUTOMATION RUN LOGGER ---
export async function logAutomationRun(run: Omit<AutomationRun, 'id'>) {
  try {
    const autoRef = doc(collection(db, 'automationRuns'));
    await setDoc(autoRef, {
      ...run,
      id: autoRef.id,
    });
  } catch (err) {
    console.error('Failed to log automation run:', err);
  }
}

// --- STUDENTS ---
export function subscribeStudents(callback: (students: Student[]) => void) {
  const q = query(collection(db, 'students'), orderBy('updatedAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Student[] = [];
      snapshot.forEach((d) => list.push(d.data() as Student));
      callback(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'students');
    }
  );
}

export async function addStudent(student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>, actorName = 'Operations') {
  const docRef = doc(collection(db, 'students'));
  const now = new Date().toISOString();
  const newStudent: Student = {
    ...student,
    id: docRef.id,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(docRef, newStudent);
  await logActivity({
    entityType: 'student',
    entityId: docRef.id,
    entityTitle: newStudent.name,
    action: 'Student Profile Enrolled',
    actorName,
    actorRole: 'Operations',
    details: `Created student record ${newStudent.studentId} (${newStudent.college})`,
  });
  return newStudent;
}

export async function updateStudent(id: string, updates: Partial<Student>, actorName = 'Staff') {
  const docRef = doc(db, 'students', id);
  const now = new Date().toISOString();
  await updateDoc(docRef, {
    ...updates,
    updatedAt: now,
  });
}

export async function updateStudentStage(
  student: Student,
  newStage: StudentStage,
  actorName = 'Staff',
  note?: string
) {
  const prevStage = student.currentStage;
  if (prevStage === newStage) return;

  const docRef = doc(db, 'students', student.id);
  const now = new Date().toISOString();
  await updateDoc(docRef, {
    currentStage: newStage,
    updatedAt: now,
  });

  await logActivity({
    entityType: 'student',
    entityId: student.id,
    entityTitle: student.name,
    action: `Lifecycle Transition: ${prevStage} → ${newStage}`,
    actorName,
    actorRole: 'Operations',
    details: note || `Updated internship stage to ${newStage}`,
  });

  // Automated workflows trigger based on stage
  if (newStage === 'In Training') {
    await logAutomationRun({
      name: 'Training Batch Enrollment Verification',
      trigger: `Student Stage Changed to In Training`,
      status: 'Completed',
      startedAt: now,
      completedAt: now,
      entityType: 'student',
      entityId: student.id,
      details: `Scheduled cohort notifications and batch calendar link for ${student.name}`,
    });
  } else if (newStage === 'Trained / To Be Placed') {
    await logAutomationRun({
      name: 'Placement Matching Pipeline Ingestion',
      trigger: `Student Completed Training`,
      status: 'Completed',
      startedAt: now,
      completedAt: now,
      entityType: 'student',
      entityId: student.id,
      details: `Added ${student.name} to talent pool for matching open requirements.`,
    });
  } else if (newStage === 'Placed') {
    await logAutomationRun({
      name: 'Placement Closure & Monthly Follow-up Scheduler',
      trigger: `Student Placed`,
      status: 'Completed',
      startedAt: now,
      completedAt: now,
      entityType: 'student',
      entityId: student.id,
      details: `Created recurring 30-day feedback tasks and invoice generation trigger.`,
    });
  }
}

export async function deleteStudent(id: string, name: string) {
  await deleteDoc(doc(db, 'students', id));
  await logActivity({
    entityType: 'student',
    entityId: id,
    entityTitle: name,
    action: 'Student Record Removed',
    actorName: 'Administrator',
    actorRole: 'Administrator',
  });
}

// --- LEADS ---
export function subscribeLeads(callback: (leads: Lead[]) => void) {
  const q = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Lead[] = [];
      snapshot.forEach((d) => list.push(d.data() as Lead));
      callback(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'leads')
  );
}

export async function addLead(lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>, actorName = 'Counselor') {
  const docRef = doc(collection(db, 'leads'));
  const now = new Date().toISOString();
  const newLead: Lead = {
    ...lead,
    id: docRef.id,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(docRef, newLead);
  await logActivity({
    entityType: 'lead',
    entityId: docRef.id,
    entityTitle: newLead.name,
    action: 'New Lead Inquired',
    actorName,
    actorRole: 'Operations',
    details: `Source: ${newLead.source} | College: ${newLead.college}`,
  });
  return newLead;
}

export async function updateLead(id: string, updates: Partial<Lead>) {
  const docRef = doc(db, 'leads', id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteLead(id: string, name?: string) {
  await deleteDoc(doc(db, 'leads', id));
  if (name) {
    await logActivity({
      entityType: 'lead',
      entityId: id,
      entityTitle: name,
      action: 'Lead Record Removed',
      actorName: 'Operations',
      actorRole: 'Operations',
    });
  }
}

/**
 * Shifts a person from Leads to Training Batches / Student Directory:
 * 1. Creates a new Student record with all information received from the lead.
 * 2. Allots and enrolls the student into the chosen Training Batch.
 * 3. Removes the person completely from the Leads collection in Firestore.
 */
export async function shiftLeadToTrainingBatch({
  lead,
  batchId,
  batchName,
  actorName = 'Admissions / Batch Coordinator',
}: {
  lead: Lead;
  batchId: string;
  batchName?: string;
  actorName?: string;
}): Promise<Student> {
  const yearSuffix = new Date().getFullYear();
  const randomId = Math.floor(1000 + Math.random() * 9000);
  const studentCode = `IH-${yearSuffix}-${randomId}`;

  // Extract any portfolio or resume url from notes if present
  let portfolioUrl = '';
  if (lead.notes) {
    const urlMatch = lead.notes.match(/https?:\/\/[^\s,]+/);
    if (urlMatch) {
      portfolioUrl = urlMatch[0];
    }
  }

  // Derive skills from interest area or notes
  const skillsList: string[] = [];
  if (lead.interestArea) {
    skillsList.push(...lead.interestArea.split(/[,&/]/).map((s) => s.trim()).filter(Boolean));
  }
  if (skillsList.length === 0) {
    skillsList.push('Communication', 'Problem Solving');
  }

  // 1. Create student in Student Directory
  const newStudent: Omit<Student, 'id' | 'createdAt' | 'updatedAt'> = {
    studentId: studentCode,
    leadId: lead.id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    college: lead.college || 'Kolkata College',
    course: lead.course || 'Undergraduate Degree',
    graduationYear: lead.graduationYear || String(yearSuffix),
    skills: skillsList,
    currentStage: 'In Training',
    placementReadiness: 'In Training',
    location: lead.city || 'Kolkata',
    bio: lead.interestArea ? `Specialization: ${lead.interestArea}` : (lead.notes || ''),
    notes: `Enrolled via Lead Allotment on ${new Date().toLocaleDateString()}.\nSource: ${lead.source || 'Direct'}${lead.notes ? `\nOriginal Notes: ${lead.notes}` : ''}`,
    portfolioUrl,
    batchId,
    batchName: batchName || 'Training Batch',
    joinedAt: new Date().toISOString().split('T')[0],
  };

  const student = await addStudent(newStudent, actorName);

  // 2. Add student to Training Batch enrollment
  if (batchId) {
    try {
      const batchRef = doc(db, 'trainingBatches', batchId);
      await updateDoc(batchRef, {
        enrolledStudents: arrayUnion(student.id),
        updatedAt: new Date().toISOString(),
      });
    } catch (batchErr) {
      console.warn('Could not update batch enrollment:', batchErr);
    }
  }

  // 3. REMOVE LEAD FROM LEADS COLLECTION (Shift complete)
  try {
    await deleteDoc(doc(db, 'leads', lead.id));
  } catch (delErr) {
    console.warn('Could not delete lead after conversion, marking converted:', delErr);
    await updateLead(lead.id, { status: 'Converted' });
  }

  // 4. Log Activity & Automation
  await logActivity({
    entityType: 'student',
    entityId: student.id,
    entityTitle: student.name,
    action: `Shifted from Leads to ${batchName || 'Training Batch'}`,
    actorName,
    actorRole: 'Operations',
    details: `Created Student ID ${studentCode} from Lead ${lead.leadId}. Lead removed from active inquiry pool.`,
  });

  await logAutomationRun({
    name: 'Lead Shift to Batch & Student Directory Ingestion',
    trigger: `Lead ${lead.name} shifted to ${batchName || 'Batch'}`,
    status: 'Completed',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    entityType: 'student',
    entityId: student.id,
    details: `Ingested ${student.name} into Student Directory and allotted to batch ${batchId}. Lead deleted.`,
  });

  return student;
}

export async function convertLeadToStudent(lead: Lead, actorName = 'Counselor'): Promise<Student> {
  // 1. Mark lead as Converted
  await updateLead(lead.id, { status: 'Converted' });

  // 2. Create student record
  const studentCountRef = doc(collection(db, 'students'));
  const yearSuffix = new Date().getFullYear();
  const randomId = Math.floor(1000 + Math.random() * 9000);
  const studentCode = `IH-${yearSuffix}-${randomId}`;

  const newStudent: Omit<Student, 'id' | 'createdAt' | 'updatedAt'> = {
    studentId: studentCode,
    leadId: lead.id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    college: lead.college,
    course: lead.course,
    graduationYear: lead.graduationYear,
    skills: ['Communication', 'Problem Solving'],
    currentStage: 'Assignment Pending',
    placementReadiness: 'In Training',
    joinedAt: new Date().toISOString().split('T')[0],
  };

  const student = await addStudent(newStudent, actorName);

  // 3. Trigger Welcome Workflow
  await logAutomationRun({
    name: 'Lead Conversion & Welcome Kit',
    trigger: `Lead ${lead.name} converted to Student`,
    status: 'Completed',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    entityType: 'student',
    entityId: student.id,
    details: `Generated Student ID ${studentCode} and issued orientation assignment.`,
  });

  return student;
}

// --- COMPANIES ---
export function subscribeCompanies(callback: (companies: Company[]) => void) {
  const q = query(collection(db, 'companies'), orderBy('name', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Company[] = [];
      snapshot.forEach((d) => list.push(d.data() as Company));
      callback(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'companies')
  );
}

export async function addCompany(company: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>, actorName = 'Placement Team') {
  const docRef = doc(collection(db, 'companies'));
  const now = new Date().toISOString();
  const newCompany: Company = {
    ...company,
    id: docRef.id,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(docRef, newCompany);
  await logActivity({
    entityType: 'company',
    entityId: docRef.id,
    entityTitle: newCompany.name,
    action: 'Hiring Partner Onboarded',
    actorName,
    actorRole: 'Placement Team',
    details: `${newCompany.name} in ${newCompany.industry} (${newCompany.location})`,
  });
  return newCompany;
}

export async function updateCompany(id: string, updates: Partial<Company>) {
  const docRef = doc(db, 'companies', id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

// --- JOB ROLES ---
export function subscribeJobRoles(callback: (roles: JobRole[]) => void) {
  const q = query(collection(db, 'rolesOpenings'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: JobRole[] = [];
      snapshot.forEach((d) => list.push(d.data() as JobRole));
      callback(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'rolesOpenings')
  );
}

export async function addJobRole(role: Omit<JobRole, 'id' | 'createdAt' | 'updatedAt'>) {
  const docRef = doc(collection(db, 'rolesOpenings'));
  const now = new Date().toISOString();
  const newRole: JobRole = {
    ...role,
    id: docRef.id,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(docRef, newRole);
  return newRole;
}

export async function updateJobRole(id: string, updates: Partial<JobRole>) {
  const docRef = doc(db, 'rolesOpenings', id);
  await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
}

export async function deleteJobRole(id: string) {
  const docRef = doc(db, 'rolesOpenings', id);
  await deleteDoc(docRef);
}

// --- INTERVIEWS ---
export function subscribeInterviews(callback: (interviews: Interview[]) => void) {
  const q = query(collection(db, 'interviews'), orderBy('scheduledAt', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Interview[] = [];
      snapshot.forEach((d) => list.push(d.data() as Interview));
      callback(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'interviews')
  );
}

export async function addInterview(interview: Omit<Interview, 'id' | 'createdAt' | 'updatedAt'>, actorName = 'Placement Team') {
  const docRef = doc(collection(db, 'interviews'));
  const now = new Date().toISOString();
  const newInterview: Interview = {
    ...interview,
    id: docRef.id,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(docRef, newInterview);

  await logActivity({
    entityType: 'interview',
    entityId: docRef.id,
    entityTitle: `${newInterview.studentName} @ ${newInterview.companyName}`,
    action: `Interview Scheduled (${newInterview.round})`,
    actorName,
    actorRole: 'Placement Team',
    details: `Mode: ${newInterview.mode} | Time: ${newInterview.scheduledAt}`,
  });

  // Automated workflow: Calendar & Notifications
  await logAutomationRun({
    name: 'Google Meet & Calendar Sync',
    trigger: 'Interview Scheduled',
    status: 'Completed',
    startedAt: now,
    completedAt: now,
    entityType: 'interview',
    entityId: docRef.id,
    details: `Dispatched Google Calendar invite and Google Meet link to ${newInterview.studentName}`,
  });

  return newInterview;
}

export async function updateInterview(id: string, updates: Partial<Interview>) {
  const docRef = doc(db, 'interviews', id);
  await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
}

// --- PLACEMENTS ---
export function subscribePlacements(callback: (placements: Placement[]) => void) {
  const q = query(collection(db, 'placements'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Placement[] = [];
      snapshot.forEach((d) => list.push(d.data() as Placement));
      callback(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'placements')
  );
}

export async function addPlacement(placement: Omit<Placement, 'id' | 'createdAt' | 'updatedAt'>, actorName = 'Placement Team') {
  const docRef = doc(collection(db, 'placements'));
  const now = new Date().toISOString();
  const newPlacement: Placement = {
    ...placement,
    id: docRef.id,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(docRef, newPlacement);

  // Update student stage to Placed
  try {
    const studentDocRef = doc(db, 'students', placement.studentId);
    await updateDoc(studentDocRef, {
      currentStage: 'Placed',
      placementReadiness: 'Placed',
      updatedAt: now,
    });
  } catch (e) {
    console.warn('Could not auto-update student stage on placement:', e);
  }

  await logActivity({
    entityType: 'placement',
    entityId: docRef.id,
    entityTitle: `${newPlacement.studentName} placed at ${newPlacement.companyName}`,
    action: 'Student Placement Confirmed!',
    actorName,
    actorRole: 'Placement Team',
    details: `Role: ${newPlacement.roleTitle} | Stipend: ${newPlacement.stipend} | Joining: ${newPlacement.joiningDate}`,
  });

  return newPlacement;
}

export async function updatePlacement(id: string, updates: Partial<Placement>) {
  const docRef = doc(db, 'placements', id);
  await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
}

export async function deletePlacement(id: string) {
  const docRef = doc(db, 'placements', id);
  await deleteDoc(docRef);
}

// --- INVOICES & BILLING ---
export function subscribeInvoices(callback: (invoices: Invoice[]) => void) {
  const q = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Invoice[] = [];
      snapshot.forEach((d) => list.push(d.data() as Invoice));
      callback(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'invoices')
  );
}

export async function addInvoice(invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) {
  const docRef = doc(collection(db, 'invoices'));
  const now = new Date().toISOString();
  const newInvoice: Invoice = {
    ...invoice,
    id: docRef.id,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(docRef, newInvoice);

  await logActivity({
    entityType: 'invoice',
    entityId: docRef.id,
    entityTitle: newInvoice.invoiceNumber,
    action: 'Tax Invoice Created',
    actorName: 'Finance',
    actorRole: 'Finance',
    details: `Issued to ${newInvoice.companyName} for ₹${newInvoice.total.toLocaleString()} (GST incl.)`,
  });

  return newInvoice;
}

export async function updateInvoice(id: string, updates: Partial<Invoice>) {
  const docRef = doc(db, 'invoices', id);
  await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
}

// --- TASKS ---
export function subscribeTasks(callback: (tasks: TaskItem[]) => void) {
  const q = query(collection(db, 'tasks'), orderBy('dueDate', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: TaskItem[] = [];
      snapshot.forEach((d) => list.push(d.data() as TaskItem));
      callback(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'tasks')
  );
}

export async function addTask(task: Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt'>) {
  const docRef = doc(collection(db, 'tasks'));
  const now = new Date().toISOString();
  const newTask: TaskItem = {
    ...task,
    id: docRef.id,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(docRef, newTask);
  return newTask;
}

export async function updateTask(id: string, updates: Partial<TaskItem>) {
  const docRef = doc(db, 'tasks', id);
  await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
}

export async function deleteTask(id: string) {
  await deleteDoc(doc(db, 'tasks', id));
}

// --- ACTIVITIES ---
export function subscribeActivities(callback: (logs: ActivityLog[]) => void, maxItems = 40) {
  const q = query(collection(db, 'activities'), orderBy('timestamp', 'desc'), limit(maxItems));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: ActivityLog[] = [];
      snapshot.forEach((d) => list.push(d.data() as ActivityLog));
      callback(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'activities')
  );
}

// --- ASSIGNMENTS ---
export function subscribeAssignments(callback: (items: Assignment[]) => void) {
  const q = query(collection(db, 'assignments'), orderBy('dueDate', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Assignment[] = [];
      snapshot.forEach((d) => list.push(d.data() as Assignment));
      callback(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'assignments')
  );
}

export async function addAssignment(item: Omit<Assignment, 'id' | 'createdAt' | 'updatedAt'>) {
  const docRef = doc(collection(db, 'assignments'));
  const now = new Date().toISOString();
  const newItem: Assignment = {
    ...item,
    id: docRef.id,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(docRef, newItem);
  return newItem;
}

export async function updateAssignment(id: string, updates: Partial<Assignment>) {
  const docRef = doc(db, 'assignments', id);
  await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
}

// --- TRAINING BATCHES ---
export function subscribeTrainingBatches(callback: (items: TrainingBatch[]) => void) {
  const q = query(collection(db, 'trainingBatches'), orderBy('startDate', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: TrainingBatch[] = [];
      snapshot.forEach((d) => list.push(d.data() as TrainingBatch));
      callback(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'trainingBatches')
  );
}

export async function addTrainingBatch(item: Omit<TrainingBatch, 'id' | 'createdAt' | 'updatedAt'>) {
  const docRef = doc(collection(db, 'trainingBatches'));
  const now = new Date().toISOString();
  const newItem: TrainingBatch = {
    ...item,
    id: docRef.id,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(docRef, newItem);
  return newItem;
}

export async function updateTrainingBatch(id: string, updates: Partial<TrainingBatch>) {
  const docRef = doc(db, 'trainingBatches', id);
  await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
}

export async function deleteTrainingBatch(id: string) {
  const docRef = doc(db, 'trainingBatches', id);
  await deleteDoc(docRef);
}

export async function enrollStudentInBatch(batchId: string, batchName: string, studentId: string) {
  const batchRef = doc(db, 'trainingBatches', batchId);
  await updateDoc(batchRef, {
    enrolledStudents: arrayUnion(studentId),
    updatedAt: new Date().toISOString(),
  });
  const studentRef = doc(db, 'students', studentId);
  await updateDoc(studentRef, {
    batchId,
    batchName,
    currentStage: 'In Training',
    updatedAt: new Date().toISOString(),
  });
}

export async function removeStudentFromBatch(batchId: string, studentId: string) {
  const batchRef = doc(db, 'trainingBatches', batchId);
  await updateDoc(batchRef, {
    enrolledStudents: arrayRemove(studentId),
    updatedAt: new Date().toISOString(),
  });
  const studentRef = doc(db, 'students', studentId);
  await updateDoc(studentRef, {
    batchId: '',
    batchName: '',
    updatedAt: new Date().toISOString(),
  });
}

// --- AGREEMENTS ---
export function subscribeAgreements(callback: (items: Agreement[]) => void) {
  const q = query(collection(db, 'agreements'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Agreement[] = [];
      snapshot.forEach((d) => list.push(d.data() as Agreement));
      callback(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'agreements')
  );
}

export async function addAgreement(item: Omit<Agreement, 'id' | 'createdAt' | 'updatedAt'>) {
  const docRef = doc(collection(db, 'agreements'));
  const now = new Date().toISOString();
  const newItem: Agreement = {
    ...item,
    id: docRef.id,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(docRef, newItem);
  return newItem;
}

export async function updateAgreement(id: string, updates: Partial<Agreement>) {
  const docRef = doc(db, 'agreements', id);
  await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
}

export async function signStudentCommitmentAgreement(
  studentId: string,
  agreementData: {
    studentName: string;
    signatureDataUrl: string;
    signatureType?: 'drawn' | 'typed';
    participantDetails: {
      fullName: string;
      college: string;
      courseAndYear: string;
      phone: string;
      email: string;
      signedDate: string;
    };
  }
) {
  const now = new Date().toISOString();
  const agreementRef = doc(collection(db, 'agreements'));

  const newAgreement: Agreement = {
    id: agreementRef.id,
    studentId,
    studentName: agreementData.studentName,
    templateName: 'Internshop Commitment Agreement',
    dateGenerated: agreementData.participantDetails.signedDate || now.split('T')[0],
    status: 'Signed',
    signedAt: now,
    signatureDataUrl: agreementData.signatureDataUrl,
    signatureType: agreementData.signatureType || 'drawn',
    participantDetails: agreementData.participantDetails,
    termsSummary:
      '3-Week Placement Waiting Period, 3-Month Minimum Internship Tenure, INR 3,000 fee upon unauthorized departure or non-compliance.',
    founderName: 'Dhvani Kankaria, Founder',
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(agreementRef, newAgreement);

  // Update student checklist in students collection
  try {
    const studentRef = doc(db, 'students', studentId);
    await setDoc(
      studentRef,
      {
        agreementSigned: true,
        agreementSignedAt: now,
        agreementId: agreementRef.id,
        updatedAt: now,
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Could not update student doc directly:', err);
  }

  await logActivity({
    entityType: 'student',
    entityId: studentId,
    entityTitle: agreementData.studentName,
    action: 'Commitment Agreement E-Signed',
    actorName: agreementData.studentName,
    actorRole: 'Student',
  });

  return newAgreement;
}

// --- PORTFOLIOS ---
export function subscribePortfolios(callback: (items: Portfolio[]) => void) {
  const q = query(collection(db, 'portfolios'), orderBy('updatedAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Portfolio[] = [];
      snapshot.forEach((d) => list.push(d.data() as Portfolio));
      callback(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'portfolios')
  );
}

export async function addPortfolio(item: Omit<Portfolio, 'id'>) {
  const docRef = doc(collection(db, 'portfolios'));
  await setDoc(docRef, { ...item, id: docRef.id });
}

export async function updatePortfolio(id: string, updates: Partial<Portfolio>) {
  const docRef = doc(db, 'portfolios', id);
  await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
}

// --- DOCUMENTS ---
export function subscribeDocuments(callback: (items: DocumentItem[]) => void) {
  const q = query(collection(db, 'documents'), orderBy('uploadedAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: DocumentItem[] = [];
      snapshot.forEach((d) => list.push(d.data() as DocumentItem));
      callback(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'documents')
  );
}

export async function addDocument(item: Omit<DocumentItem, 'id' | 'uploadedAt'>) {
  const docRef = doc(collection(db, 'documents'));
  const newItem: DocumentItem = {
    ...item,
    id: docRef.id,
    uploadedAt: new Date().toISOString(),
  };
  await setDoc(docRef, newItem);
  return newItem;
}

// --- AUTOMATION RUNS ---
export function subscribeAutomations(callback: (items: AutomationRun[]) => void) {
  const q = query(collection(db, 'automationRuns'), orderBy('startedAt', 'desc'), limit(30));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: AutomationRun[] = [];
      snapshot.forEach((d) => list.push(d.data() as AutomationRun));
      callback(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'automationRuns')
  );
}

// --- RENT AN INTERN ---
export function subscribeRentAnIntern(callback: (items: RentAnInternEntry[]) => void) {
  const q = query(collection(db, 'rentAnIntern'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: RentAnInternEntry[] = [];
      snapshot.forEach((d) => list.push(d.data() as RentAnInternEntry));
      callback(list);
    },
    (err) => {
      const fallbackQuery = collection(db, 'rentAnIntern');
      return onSnapshot(fallbackQuery, (snapshot) => {
        const list: RentAnInternEntry[] = [];
        snapshot.forEach((d) => list.push(d.data() as RentAnInternEntry));
        callback(list);
      });
    }
  );
}

export async function addRentAnInternEntry(entry: Omit<RentAnInternEntry, 'id' | 'createdAt' | 'updatedAt'>) {
  const docRef = doc(collection(db, 'rentAnIntern'));
  const now = new Date().toISOString();
  const newEntry: RentAnInternEntry = {
    ...entry,
    id: docRef.id,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(docRef, newEntry);
  return newEntry;
}

export async function updateRentAnInternEntry(id: string, updates: Partial<RentAnInternEntry>) {
  const docRef = doc(db, 'rentAnIntern', id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export const DELETED_RAI_KEY = 'intern_crm_deleted_rai_ids';

export function getDeletedRentAnInternIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_RAI_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function addDeletedRentAnInternId(id: string) {
  try {
    const set = getDeletedRentAnInternIds();
    set.add(id);
    localStorage.setItem(DELETED_RAI_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // Ignore storage errors
  }
}

export async function deleteRentAnInternEntry(id: string) {
  addDeletedRentAnInternId(id);
  await deleteDoc(doc(db, 'rentAnIntern', id));
}

export async function syncRentAnInternBookingsToFirestore(bookings: RentAnInternBooking[]) {
  const batch = writeBatch(db);
  for (const b of bookings) {
    const docRef = doc(db, 'rentAnIntern', b.id);
    batch.set(docRef, {
      ...b,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  }
  await batch.commit();
}

