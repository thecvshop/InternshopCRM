import { collection, writeBatch, doc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { Student, Lead, Company, JobRole, Interview, Placement, Invoice, TaskItem, TrainingBatch, Assignment } from '../types/crm';

export async function seedDemoData() {
  const batch = writeBatch(db);

  // 1. Students
  const demoStudents: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      studentId: 'IH-2025-0101',
      name: 'Aarav Sharma',
      email: 'aarav.sharma@example.com',
      phone: '+91 98765 43210',
      college: 'IIT Delhi',
      course: 'B.Tech Computer Science',
      graduationYear: '2026',
      skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Tailwind CSS'],
      currentStage: 'Interviewing',
      placementReadiness: 'Interview Ready',
      location: 'New Delhi',
      assignmentScore: 94,
      joinedAt: '2025-01-15',
      bio: 'Full-stack builder passionate about developer tools and responsive UI.',
      isDemo: true,
    },
    {
      studentId: 'IH-2025-0102',
      name: 'Priya Sundaram',
      email: 'priya.sundaram@example.com',
      phone: '+91 98451 12345',
      college: 'BITS Pilani',
      course: 'B.E. Electronics & Communication',
      graduationYear: '2025',
      skills: ['Python', 'FastAPI', 'Machine Learning', 'Data Pipelines', 'SQL'],
      currentStage: 'Placed',
      placementReadiness: 'Placed',
      location: 'Bangalore',
      assignmentScore: 98,
      joinedAt: '2024-11-20',
      bio: 'Data enthusiast with strong analytical problem solving and algorithmic foundation.',
      isDemo: true,
    },
    {
      studentId: 'IH-2025-0103',
      name: 'Rohan Verma',
      email: 'rohan.verma@example.com',
      phone: '+91 91234 56789',
      college: 'Delhi Technological University',
      course: 'B.Tech Software Engineering',
      graduationYear: '2026',
      skills: ['UI/UX', 'Figma', 'React', 'CSS Architecture', 'Prototyping'],
      currentStage: 'In Training',
      placementReadiness: 'In Training',
      location: 'Noida',
      assignmentScore: 86,
      joinedAt: '2025-02-01',
      bio: 'Product designer and frontend developer blending aesthetics with clean code.',
      isDemo: true,
    },
    {
      studentId: 'IH-2025-0104',
      name: 'Ananya Deshmukh',
      email: 'ananya.d@example.com',
      phone: '+91 97654 89012',
      college: 'COEP Technological University',
      course: 'B.Tech IT',
      graduationYear: '2025',
      skills: ['Java', 'Spring Boot', 'Microservices', 'Docker', 'Kubernetes'],
      currentStage: 'Trained / To Be Placed',
      placementReadiness: 'Interview Ready',
      location: 'Pune',
      assignmentScore: 91,
      joinedAt: '2025-01-05',
      bio: 'Backend systems engineer focused on high-throughput services.',
      isDemo: true,
    },
    {
      studentId: 'IH-2025-0105',
      name: 'Kabir Mehta',
      email: 'kabir.mehta@example.com',
      phone: '+91 99887 66554',
      college: 'NMIMS Mumbai',
      course: 'BBA Tech',
      graduationYear: '2026',
      skills: ['Product Management', 'Market Research', 'Data Analysis', 'Growth Hacking'],
      currentStage: 'Assignment Pending',
      placementReadiness: 'Not Ready',
      location: 'Mumbai',
      joinedAt: '2025-02-10',
      isDemo: true,
    },
    {
      studentId: 'IH-2025-0106',
      name: 'Sneha Patel',
      email: 'sneha.patel@example.com',
      phone: '+91 98223 34455',
      college: 'DA-IICT Gandhinagar',
      course: 'B.Tech ICT',
      graduationYear: '2025',
      skills: ['Next.js', 'React Native', 'GraphQL', 'Tailwind CSS'],
      currentStage: 'Placed',
      placementReadiness: 'Placed',
      location: 'Ahmedabad',
      assignmentScore: 95,
      joinedAt: '2024-10-15',
      isDemo: true,
    }
  ];

  const now = new Date().toISOString();
  const createdStudentIds: string[] = [];

  demoStudents.forEach((s) => {
    const sRef = doc(collection(db, 'students'));
    createdStudentIds.push(sRef.id);
    batch.set(sRef, {
      ...s,
      id: sRef.id,
      createdAt: now,
      updatedAt: now,
    });
  });

  // 2. Leads
  const demoLeads: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      leadId: 'LD-1041',
      name: 'Devansh Kulkarni',
      email: 'devansh.k@example.com',
      phone: '+91 98111 22334',
      college: 'VIT Vellore',
      course: 'B.Tech CSE',
      graduationYear: '2026',
      source: 'LinkedIn Campaign',
      status: 'Interested',
      interestArea: 'Full Stack Engineering',
      notes: 'Passed initial screening, interested in summer internship batch.',
      isDemo: true,
    },
    {
      leadId: 'LD-1042',
      name: 'Tanvi Agarwal',
      email: 'tanvi.agarwal@example.com',
      phone: '+91 97222 33445',
      college: 'SRM Institute',
      course: 'B.Tech Data Science',
      graduationYear: '2026',
      source: 'College Seminar',
      status: 'New',
      interestArea: 'Data Science & AI',
      isDemo: true,
    },
    {
      leadId: 'LD-1043',
      name: 'Aditya Sen',
      email: 'aditya.sen@example.com',
      phone: '+91 96333 44556',
      college: 'Jadavpur University',
      course: 'B.E. Information Technology',
      graduationYear: '2025',
      source: 'Student Referral',
      status: 'In Review',
      interestArea: 'Cloud & DevOps',
      isDemo: true,
    },
  ];

  demoLeads.forEach((l) => {
    const lRef = doc(collection(db, 'leads'));
    batch.set(lRef, {
      ...l,
      id: lRef.id,
      createdAt: now,
      updatedAt: now,
    });
  });

  // 3. Companies
  const demoCompanies: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      companyId: 'CMP-201',
      name: 'Razorpay',
      industry: 'Fintech / Payments',
      website: 'https://razorpay.com',
      location: 'Bangalore, India',
      companySize: '1,000 - 5,000',
      status: 'Active',
      contacts: [
        {
          id: 'c1',
          name: 'Vikram Joshi',
          role: 'University Hiring Lead',
          email: 'vikram.j@razorpay.com',
          phone: '+91 98200 11223',
          isPrimary: true,
        },
      ],
      openRolesCount: 3,
      hiredStudentsCount: 4,
      isDemo: true,
    },
    {
      companyId: 'CMP-202',
      name: 'Zerodha',
      industry: 'Broking / Tech',
      website: 'https://zerodha.com',
      location: 'Bangalore, India',
      companySize: '500 - 1,000',
      status: 'Active',
      contacts: [
        {
          id: 'c2',
          name: 'Nisha Pillai',
          role: 'Talent Acquisition Partner',
          email: 'nisha.p@zerodha.com',
          phone: '+91 98300 22334',
          isPrimary: true,
        },
      ],
      openRolesCount: 2,
      hiredStudentsCount: 2,
      isDemo: true,
    },
    {
      companyId: 'CMP-203',
      name: 'BrowserStack',
      industry: 'Cloud Infrastructure / Testing',
      website: 'https://browserstack.com',
      location: 'Mumbai, India',
      companySize: '1,000 - 5,000',
      status: 'Active',
      contacts: [
        {
          id: 'c3',
          name: 'Arjun Nambiar',
          role: 'Engineering Manager',
          email: 'arjun.n@browserstack.com',
          phone: '+91 98400 33445',
          isPrimary: true,
        },
      ],
      openRolesCount: 1,
      hiredStudentsCount: 1,
      isDemo: true,
    },
  ];

  const companyIds: string[] = [];
  demoCompanies.forEach((c) => {
    const cRef = doc(collection(db, 'companies'));
    companyIds.push(cRef.id);
    batch.set(cRef, {
      ...c,
      id: cRef.id,
      createdAt: now,
      updatedAt: now,
    });
  });

  // 4. Job Roles
  const demoRoles: Omit<JobRole, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      companyId: companyIds[0] || 'cmp1',
      companyName: 'Razorpay',
      title: 'Software Development Intern (Frontend)',
      department: 'Checkout Experience',
      location: 'Bangalore / Hybrid',
      workMode: 'Hybrid',
      skills: ['React', 'TypeScript', 'Tailwind CSS', 'Redux / Zustand'],
      stipend: '₹45,000 / month',
      openings: 2,
      status: 'Open',
      duration: '6 Months',
    },
    {
      companyId: companyIds[1] || 'cmp2',
      companyName: 'Zerodha',
      title: 'Backend Systems Intern (Go / Python)',
      department: 'Market Data & Orders',
      location: 'Bangalore (Onsite)',
      workMode: 'Onsite',
      skills: ['Go', 'Python', 'PostgreSQL', 'Redis'],
      stipend: '₹50,000 / month',
      openings: 2,
      status: 'Shortlisting',
      duration: '6 Months',
    },
    {
      companyId: companyIds[2] || 'cmp3',
      companyName: 'BrowserStack',
      title: 'Cloud DevOps Intern',
      department: 'Platform Engineering',
      location: 'Remote / Mumbai',
      workMode: 'Remote',
      skills: ['Linux', 'Docker', 'AWS', 'Python Scripting'],
      stipend: '₹40,000 / month',
      openings: 1,
      status: 'Open',
      duration: '3 Months',
    },
  ];

  demoRoles.forEach((r) => {
    const rRef = doc(collection(db, 'rolesOpenings'));
    batch.set(rRef, {
      ...r,
      id: rRef.id,
      createdAt: now,
      updatedAt: now,
    });
  });

  // 5. Interviews
  const demoInterviews: Omit<Interview, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      studentId: createdStudentIds[0] || 's1',
      studentName: 'Aarav Sharma',
      studentCollege: 'IIT Delhi',
      companyId: companyIds[0] || 'cmp1',
      companyName: 'Razorpay',
      roleTitle: 'Software Development Intern (Frontend)',
      round: 'Round 1: Machine Coding',
      scheduledAt: new Date(Date.now() + 86400000 * 2).toISOString(),
      mode: 'Google Meet',
      meetUrl: 'https://meet.google.com/xyz-qwer-abc',
      status: 'Confirmed',
      interviewer: 'Rahul Nair (Senior SDE)',
    },
    {
      studentId: createdStudentIds[3] || 's4',
      studentName: 'Ananya Deshmukh',
      studentCollege: 'COEP Pune',
      companyId: companyIds[1] || 'cmp2',
      companyName: 'Zerodha',
      roleTitle: 'Backend Systems Intern (Go / Python)',
      round: 'Technical Round 1',
      scheduledAt: new Date(Date.now() + 86400000 * 3).toISOString(),
      mode: 'Google Meet',
      meetUrl: 'https://meet.google.com/zrd-tech-101',
      status: 'Proposed',
    },
  ];

  demoInterviews.forEach((i) => {
    const iRef = doc(collection(db, 'interviews'));
    batch.set(iRef, {
      ...i,
      id: iRef.id,
      createdAt: now,
      updatedAt: now,
    });
  });

  // 6. Placements
  const demoPlacements: Omit<Placement, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      studentId: createdStudentIds[1] || 's2',
      studentName: 'Priya Sundaram',
      companyId: companyIds[0] || 'cmp1',
      companyName: 'Razorpay',
      roleTitle: 'Data Engineering Intern',
      stipend: '₹45,000 / month',
      ctc: '₹18 LPA PPO potential',
      offerDate: '2025-01-20',
      joiningDate: '2025-02-01',
      duration: '6 Months',
      location: 'Bangalore',
      status: 'Joined',
    },
    {
      studentId: createdStudentIds[5] || 's6',
      studentName: 'Sneha Patel',
      companyId: companyIds[2] || 'cmp3',
      companyName: 'BrowserStack',
      roleTitle: 'Frontend Engineering Intern',
      stipend: '₹40,000 / month',
      offerDate: '2025-01-10',
      joiningDate: '2025-01-25',
      duration: '6 Months',
      location: 'Mumbai',
      status: 'Joined',
    },
  ];

  demoPlacements.forEach((p) => {
    const pRef = doc(collection(db, 'placements'));
    batch.set(pRef, {
      ...p,
      id: pRef.id,
      createdAt: now,
      updatedAt: now,
    });
  });

  // 7. Invoices
  const demoInvoices: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      invoiceNumber: 'INV-2025-018',
      companyId: companyIds[0] || 'cmp1',
      companyName: 'Razorpay',
      service: 'Internship Placement Sourcing Fee (Priya Sundaram)',
      taxableValue: 25000,
      cgst: 2250,
      sgst: 2250,
      igst: 0,
      total: 29500,
      invoiceDate: '2025-02-02',
      dueDate: '2025-02-17',
      status: 'Sent',
    },
    {
      invoiceNumber: 'INV-2025-019',
      companyId: companyIds[2] || 'cmp3',
      companyName: 'BrowserStack',
      service: 'Campus Cohort Partner Onboarding Fee',
      taxableValue: 50000,
      cgst: 0,
      sgst: 0,
      igst: 9000,
      total: 59000,
      invoiceDate: '2025-01-28',
      dueDate: '2025-02-12',
      status: 'Paid',
      paymentDate: '2025-02-05',
      paymentReference: 'UTR984729104',
    },
  ];

  demoInvoices.forEach((inv) => {
    const invRef = doc(collection(db, 'invoices'));
    batch.set(invRef, {
      ...inv,
      id: invRef.id,
      createdAt: now,
      updatedAt: now,
    });
  });

  // 8. Tasks
  const demoTasks: Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      title: 'Collect signed NDA & Internship agreement from Aarav Sharma',
      priority: 'high',
      status: 'in_progress',
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      assigneeName: 'Operations Lead',
      relatedEntityType: 'student',
      relatedEntityName: 'Aarav Sharma',
    },
    {
      title: 'Review Machine Coding score sheet for Razorpay candidates',
      priority: 'urgent',
      status: 'todo',
      dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      assigneeName: 'Placement Manager',
      relatedEntityType: 'company',
      relatedEntityName: 'Razorpay',
    },
    {
      title: 'Conduct 30-day placement health check with BrowserStack HR',
      priority: 'medium',
      status: 'todo',
      dueDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
      assigneeName: 'HR Relations',
      relatedEntityType: 'placement',
      relatedEntityName: 'Sneha Patel',
    },
  ];

  demoTasks.forEach((t) => {
    const tRef = doc(collection(db, 'tasks'));
    batch.set(tRef, {
      ...t,
      id: tRef.id,
      createdAt: now,
      updatedAt: now,
    });
  });

  // 9. Training Batches
  const demoBatches: Omit<TrainingBatch, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      batchId: 'TB-2025-SPRING-01',
      name: 'Frontend Core & Production Architecture',
      program: 'Web Engineering Fellowship',
      trainerName: 'Sameer Sen (Senior Tech Lead)',
      startDate: '2025-02-01',
      endDate: '2025-03-15',
      capacity: 30,
      enrolledStudents: createdStudentIds.slice(0, 3),
      status: 'Active',
      sessionsCount: 18,
      whatsappGroup: 'https://chat.whatsapp.com/IH-Spring-2025',
    },
    {
      batchId: 'TB-2025-SPRING-02',
      name: 'High-Performance Backend & Cloud Microservices',
      program: 'Systems & Backend Track',
      trainerName: 'Karthik Raman',
      startDate: '2025-02-15',
      endDate: '2025-04-01',
      capacity: 25,
      enrolledStudents: createdStudentIds.slice(3, 5),
      status: 'Upcoming',
      sessionsCount: 20,
    },
  ];

  demoBatches.forEach((b) => {
    const bRef = doc(collection(db, 'trainingBatches'));
    batch.set(bRef, {
      ...b,
      id: bRef.id,
      createdAt: now,
      updatedAt: now,
    });
  });

  // 10. Assignments
  const demoAssignments: Omit<Assignment, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      studentId: createdStudentIds[0] || 's1',
      studentName: 'Aarav Sharma',
      title: 'Full-Stack Performance Dashboard with Vite & Node',
      template: 'Vite + React + REST Integration Benchmark',
      assignedDate: '2025-01-16',
      dueDate: '2025-01-22',
      submissionUrl: 'https://github.com/aarav-sh/internshome-benchmark',
      submittedDate: '2025-01-20',
      reviewer: 'Sameer Sen',
      score: 94,
      status: 'Approved',
      comments: 'Clean code architecture, great error handling, robust test coverage.',
    },
    {
      studentId: createdStudentIds[4] || 's5',
      studentName: 'Kabir Mehta',
      title: 'Product Strategy & Market Sizing Deck',
      template: 'B2B SaaS Growth & GTM Evaluation',
      assignedDate: '2025-02-11',
      dueDate: '2025-02-18',
      status: 'Sent',
    },
  ];

  demoAssignments.forEach((a) => {
    const aRef = doc(collection(db, 'assignments'));
    batch.set(aRef, {
      ...a,
      id: aRef.id,
      createdAt: now,
      updatedAt: now,
    });
  });

  await batch.commit();
}

export async function clearDemoData() {
  const collectionsToClean = [
    'students',
    'leads',
    'companies',
    'rolesOpenings',
    'interviews',
    'placements',
    'invoices',
    'tasks',
    'trainingBatches',
    'assignments',
  ];

  for (const colName of collectionsToClean) {
    try {
      const q = query(collection(db, colName), where('isDemo', '==', true));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    } catch (err) {
      console.warn(`Could not clear demo data from ${colName}:`, err);
    }
  }
}
