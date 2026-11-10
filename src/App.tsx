import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './lib/auth/AuthContext';
import {
  subscribeStudents,
  subscribeLeads,
  subscribeCompanies,
  subscribeJobRoles,
  subscribeInterviews,
  subscribePlacements,
  subscribeInvoices,
  subscribeTasks,
  subscribeAssignments,
  subscribeTrainingBatches,
  subscribeAgreements,
  subscribeAutomations,
  subscribeActivities,
  subscribeRentAnIntern,
} from './services/firestoreService';
import { ensureCompanyPlacementIntegrity, syncAll115Students } from './services/actualDataService';
import {
  Student,
  StudentStage,
  Lead,
  Company,
  JobRole,
  Interview,
  Placement,
  Invoice,
  TaskItem,
  Assignment,
  TrainingBatch,
  Agreement,
  AutomationRun,
  ActivityLog,
  RentAnInternEntry,
  InternsHomeEvent,
  EventRegistration,
  EventMedia,
} from './types/crm';
import { INITIAL_RENT_AN_INTERN_ENTRIES } from './data/rentAnInternData';
import {
  subscribeEvents,
  subscribeEventRegistrations,
  subscribeEventMedia,
  seedInitialLumaEventsIfNeeded,
} from './services/lumaEventService';

import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { CommandPalette } from './components/layout/CommandPalette';
import { QuickCreateModal, QuickCreateType } from './components/common/QuickCreateModal';

import { DashboardView } from './features/dashboard/DashboardView';
import { HomeLandingView } from './features/home/HomeLandingView';
import { EventsHostedView } from './features/home/EventsHostedView';
import { EventGalleryView } from './features/home/EventGalleryView';
import { StudentsView } from './features/students/StudentsView';
import { LeadsView } from './features/leads/LeadsView';
import { CompaniesView } from './features/companies/CompaniesView';
import { MatchingView } from './features/matching/MatchingView';
import { InterviewsView } from './features/interviews/InterviewsView';
import { PlacementsView } from './features/placements/PlacementsView';
import { BillingView } from './features/billing/BillingView';
import { AssignmentsView } from './features/assignments/AssignmentsView';
import { TrainingView } from './features/training/TrainingView';
import { AgreementsView } from './features/agreements/AgreementsView';
import { TasksView } from './features/tasks/TasksView';
import { CalendarView } from './features/calendar/CalendarView';
import { AutomationMonitorView } from './features/automations/AutomationMonitorView';
import { SettingsView } from './features/settings/SettingsView';
import { RentAnInternView } from './features/rentAnIntern/RentAnInternView';
import { JobCreatorView } from './features/jobCreator/JobCreatorView';
import { subscribeRentInternJobs } from './services/rentInternJobService';
import { RentInternJob } from './types/crm';

const MainApp: React.FC = () => {
  const { role } = useAuth();

  // Navigation & Modal State
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState<boolean>(false);
  const [quickCreateType, setQuickCreateType] = useState<QuickCreateType>('student');
  const [quickCreateStage, setQuickCreateStage] = useState<StudentStage | undefined>(undefined);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedMatchingCompanyId, setSelectedMatchingCompanyId] = useState<string | undefined>(undefined);
  const [selectedMatchingRoleId, setSelectedMatchingRoleId] = useState<string | undefined>(undefined);

  // Firestore Real-Time Subscriptions
  const [students, setStudents] = useState<Student[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [roles, setRoles] = useState<JobRole[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [batches, setBatches] = useState<TrainingBatch[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [automationRuns, setAutomationRuns] = useState<AutomationRun[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [rentAnInternEntries, setRentAnInternEntries] = useState<RentAnInternEntry[]>(INITIAL_RENT_AN_INTERN_ENTRIES);
  const [rentInternJobs, setRentInternJobs] = useState<RentInternJob[]>([]);
  const [events, setEvents] = useState<InternsHomeEvent[]>([]);
  const [eventRegistrations, setEventRegistrations] = useState<EventRegistration[]>([]);
  const [eventMedia, setEventMedia] = useState<EventMedia[]>([]);

  // Wire all real-time Firestore listeners
  useEffect(() => {
    const unsubStudents = subscribeStudents(setStudents);
    const unsubLeads = subscribeLeads(setLeads);
    const unsubCompanies = subscribeCompanies(setCompanies);
    const unsubRoles = subscribeJobRoles(setRoles);
    const unsubInterviews = subscribeInterviews(setInterviews);
    const unsubPlacements = subscribePlacements(setPlacements);
    const unsubInvoices = subscribeInvoices(setInvoices);
    const unsubTasks = subscribeTasks(setTasks);
    const unsubAssignments = subscribeAssignments(setAssignments);
    const unsubBatches = subscribeTrainingBatches(setBatches);
    const unsubAgreements = subscribeAgreements(setAgreements);
    const unsubAutomation = subscribeAutomations(setAutomationRuns);
    const unsubActivities = subscribeActivities(setActivities);
    const unsubRentJobs = subscribeRentInternJobs(setRentInternJobs);
    const unsubEvents = subscribeEvents(setEvents);
    const unsubRegistrations = subscribeEventRegistrations(null, setEventRegistrations);
    const unsubMedia = subscribeEventMedia(null, setEventMedia);
    seedInitialLumaEventsIfNeeded();
    const unsubRentAnIntern = subscribeRentAnIntern((items) => {
      // Filter items to ensure they match Rent An Intern Booking schema
      const validItems = (items || []).filter((i: any) => i && (i.company || i.dateOfBooking));
      if (validItems.length > 0) {
        // Sanitize legacy entries where amount was entered as per-kid rather than total
        const sanitizedItems = validItems.map((item: any) => {
          const kids = Number(item.noOfKids) || 1;
          if (item.id === 'rai-booking-1' && (item.amountEarned < 3000 || item.travel < 600)) {
            return {
              ...item,
              amountEarned: 3000,
              travel: 600,
              totalAmount: 3600,
              amountEarnedByInternshop: item.amountEarnedByInternshop || 1000,
              clientGrandTotal: 4600,
            };
          }
          if (kids > 1 && item.amountEarned === 1000) {
            const correctedAmount = item.amountEarned * kids;
            const correctedTravel = Number(item.travel) || 0;
            const correctedTotal = correctedAmount + correctedTravel;
            const fee = Number(item.amountEarnedByInternshop) || 1000;
            return {
              ...item,
              amountEarned: correctedAmount,
              travel: correctedTravel,
              totalAmount: correctedTotal,
              clientGrandTotal: correctedTotal + fee,
            };
          }
          return item;
        });

        const itemsMap = new Map(sanitizedItems.map((i: any) => [i.id, i]));
        const merged = [...sanitizedItems];
        for (const initial of INITIAL_RENT_AN_INTERN_ENTRIES) {
          if (!itemsMap.has(initial.id)) {
            merged.push(initial);
          }
        }
        setRentAnInternEntries(merged);
      } else {
        setRentAnInternEntries(INITIAL_RENT_AN_INTERN_ENTRIES);
      }
    });

    return () => {
      unsubStudents();
      unsubLeads();
      unsubCompanies();
      unsubRoles();
      unsubInterviews();
      unsubPlacements();
      unsubInvoices();
      unsubTasks();
      unsubAssignments();
      unsubBatches();
      unsubAgreements();
      unsubAutomation();
      unsubActivities();
      unsubRentJobs();
      unsubRentAnIntern();
      unsubEvents();
      unsubRegistrations();
      unsubMedia();
    };
  }, []);

  // One-time placement integrity and database verification on mount
  const initialIntegrityRanRef = useRef(false);
  useEffect(() => {
    if (initialIntegrityRanRef.current) return;
    initialIntegrityRanRef.current = true;

    const timer = setTimeout(() => {
      ensureCompanyPlacementIntegrity().catch((err) => console.log('Placement integrity check:', err));
      syncAll115Students().catch((err) => console.log('Students sync check:', err));
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Global keyboard shortcut for Command Palette (Cmd + K / Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const openQuickCreate = (type: QuickCreateType = 'student', stage?: StudentStage) => {
    setQuickCreateType(type);
    setQuickCreateStage(stage);
    setIsQuickCreateOpen(true);
  };

  const handleOpenPerson = (type: 'Lead' | 'Student', id: string) => {
    if (type === 'Student') {
      const student = students.find((s) => s.id === id || s.studentId === id);
      if (student) {
        setSelectedStudent(student);
      }
      setActiveView('students');
    } else {
      setActiveView('leads');
    }
  };

  const getTitle = () => {
    switch (activeView) {
      case 'dashboard':
        return 'Executive Overview';
      case 'home':
        return 'Home — Events & Community';
      case 'events_hosted':
        return 'Events Hosted';
      case 'event_gallery':
        return 'Event Gallery';
      case 'job-creator':
        return 'Job Creator — Rent an Intern';
      case 'rent-an-intern':
        return 'Rent an Intern';
      case 'leads':
        return 'Leads & Admissions Pipeline';
      case 'students':
        return 'Students & Intern Wall';
      case 'matching':
        return 'Candidate Matching & Shortlists';
      case 'companies':
        return 'Hiring Partners & Roles';
      case 'interviews':
        return 'Interview Coordination';
      case 'placements':
        return 'Placements & 30-Day Check';
      case 'assignments':
        return 'Assignments & Technical Reviews';
      case 'training':
        return 'Training Cohorts & Batches';
      case 'agreements':
        return 'Legal & Student Agreements';
      case 'billing':
        return 'GST Invoices & Revenue';
      case 'tasks':
        return 'Operational Task Manager';
      case 'calendar':
        return 'Consolidated Calendar';
      case 'automations':
        return 'Automation Monitor';
      case 'settings':
        return 'Integrations & Access Control';
      default:
        return 'InternsHome CRM';
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#f4f4f5] text-zinc-900 font-sans antialiased overflow-hidden">
      {/* Left Collapsible Navigation Sidebar */}
      <Sidebar
        activeView={activeView}
        onSelectView={setActiveView}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        counts={{
          students: students.length,
          leads: leads.filter((l) => l.status !== 'Converted').length,
          companies: companies.length,
          interviews: interviews.length,
          placements: placements.length,
          invoices: invoices.length,
          tasks: tasks.filter((t) => t.status !== 'Completed').length,
          rentAnIntern: rentAnInternEntries.length,
          jobCreator: rentInternJobs.length,
          eventsHosted: events.length,
          agreements: agreements.length,
        }}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Navbar */}
        <Navbar
          activeViewTitle={getTitle()}
          onOpenQuickCreate={() => openQuickCreate('student')}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {activeView === 'dashboard' && (
              <DashboardView
                students={students}
                leads={leads}
                companies={companies}
                roles={roles}
                interviews={interviews}
                placements={placements}
                invoices={invoices}
                tasks={tasks}
                batches={batches}
                activities={activities}
                onSelectView={setActiveView}
                onOpenQuickCreate={() => openQuickCreate('student')}
                onSelectStudent={(st) => setSelectedStudent(st)}
              />
            )}

            {activeView === 'home' && (
              <HomeLandingView
                events={events}
                registrations={eventRegistrations}
                media={eventMedia}
                onNavigate={setActiveView}
                onOpenPerson={handleOpenPerson}
              />
            )}

            {activeView === 'events_hosted' && (
              <EventsHostedView
                events={events}
                registrations={eventRegistrations}
                media={eventMedia}
                onOpenPerson={handleOpenPerson}
              />
            )}

            {activeView === 'event_gallery' && (
              <EventGalleryView
                events={events}
                media={eventMedia}
              />
            )}

            {activeView === 'job-creator' && (
              <JobCreatorView />
            )}

            {activeView === 'rent-an-intern' && (
              <RentAnInternView entries={rentAnInternEntries} />
            )}

            {activeView === 'students' && (
              <StudentsView
                students={students}
                leads={leads}
                interviews={interviews}
                placements={placements}
                tasks={tasks}
                assignments={assignments}
                onOpenQuickCreate={(stage) => openQuickCreate('student', stage)}
                selectedStudent={selectedStudent}
                onSelectStudent={setSelectedStudent}
              />
            )}

            {activeView === 'leads' && (
              <LeadsView
                leads={leads}
                batches={batches}
                onOpenQuickCreate={() => openQuickCreate('lead')}
                onStudentCreated={(st) => {
                  setSelectedStudent(st);
                  setActiveView('students');
                }}
                onNavigateToTraining={() => setActiveView('training')}
              />
            )}

            {activeView === 'companies' && (
              <CompaniesView
                companies={companies}
                roles={roles}
                placements={placements}
                students={students}
                onSelectStudent={(st) => {
                  setSelectedStudent(st);
                  setActiveView('students');
                }}
                onOpenQuickCreate={() => openQuickCreate('company')}
                onNavigateToMatching={(companyId, roleId) => {
                  setSelectedMatchingCompanyId(companyId);
                  setSelectedMatchingRoleId(roleId);
                  setActiveView('matching');
                }}
              />
            )}

            {activeView === 'matching' && (
              <MatchingView
                students={students}
                roles={roles}
                companies={companies}
                initialCompanyId={selectedMatchingCompanyId}
                initialRoleId={selectedMatchingRoleId}
                onScheduleInterview={(student, role) => {
                  openQuickCreate('interview');
                }}
              />
            )}

            {activeView === 'interviews' && (
              <InterviewsView
                interviews={interviews}
                onOpenQuickCreate={() => openQuickCreate('interview')}
              />
            )}

            {activeView === 'placements' && (
              <PlacementsView
                placements={placements}
                onOpenQuickCreate={() => openQuickCreate('student')}
              />
            )}

            {activeView === 'billing' && (
              <BillingView
                invoices={invoices}
                onOpenQuickCreate={() => openQuickCreate('invoice')}
              />
            )}

            {activeView === 'assignments' && (
              <AssignmentsView assignments={assignments} />
            )}

            {activeView === 'training' && (
              <TrainingView
                batches={batches}
                students={students}
                leads={leads}
                onSelectStudent={(st) => {
                  setSelectedStudent(st);
                  setActiveView('students');
                }}
                onNavigateToStudents={() => setActiveView('students')}
              />
            )}

            {activeView === 'agreements' && (
              <AgreementsView agreements={agreements} students={students} />
            )}

            {activeView === 'tasks' && (
              <TasksView
                tasks={tasks}
                onOpenQuickCreate={() => openQuickCreate('task')}
              />
            )}

            {activeView === 'calendar' && (
              <CalendarView
                interviews={interviews}
                batches={batches}
                tasks={tasks}
                onOpenQuickCreate={() => openQuickCreate('interview')}
              />
            )}

            {activeView === 'automations' && (
              <AutomationMonitorView automationRuns={automationRuns} />
            )}

            {activeView === 'settings' && <SettingsView />}
          </div>
        </main>
      </div>

      {/* Global Quick Create Modal */}
      <QuickCreateModal
        isOpen={isQuickCreateOpen}
        onClose={() => {
          setIsQuickCreateOpen(false);
          setQuickCreateStage(undefined);
        }}
        initialType={quickCreateType}
        initialStudentStage={quickCreateStage}
        companies={companies}
        students={students}
      />

      {/* Global Command Palette (⌘K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={(viewId) => {
          setActiveView(viewId);
          setIsCommandPaletteOpen(false);
        }}
        onQuickCreate={(type) => {
          setIsCommandPaletteOpen(false);
          openQuickCreate(type);
        }}
        students={students}
        companies={companies}
        leads={leads}
        onSelectStudent={(st) => {
          setSelectedStudent(st);
          setActiveView('students');
          setIsCommandPaletteOpen(false);
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
