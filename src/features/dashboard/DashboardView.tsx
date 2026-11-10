import React, { useState } from 'react';
import {
  Users,
  Building,
  Calendar,
  DollarSign,
  CheckSquare,
  Sparkles,
  ArrowRight,
  Clock,
  ExternalLink,
  Plus,
  Briefcase,
  GraduationCap,
  Layers,
  FileText,
  Phone,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Percent,
} from 'lucide-react';
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
  TrainingBatch,
} from '../../types/crm';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { getBatchDisplayTitle } from '../../utils/batchUtils';

export type DashboardMode = 'overview' | 'intern' | 'company';

interface DashboardViewProps {
  students: Student[];
  leads: Lead[];
  companies: Company[];
  roles: JobRole[];
  interviews: Interview[];
  placements: Placement[];
  invoices: Invoice[];
  tasks: TaskItem[];
  activities: ActivityLog[];
  batches?: TrainingBatch[];
  onSelectView: (view: string) => void;
  onOpenQuickCreate: () => void;
  onSelectStudent: (student: Student) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  students,
  leads,
  companies,
  roles,
  interviews,
  placements,
  invoices,
  tasks,
  activities,
  batches = [],
  onSelectView,
  onOpenQuickCreate,
  onSelectStudent,
}) => {
  const [dashboardMode, setDashboardMode] = useState<DashboardMode>('overview');

  // Intern Metrics
  const placedStudents = students.filter((s) => s.currentStage === 'Placed');
  const interviewingStudents = students.filter((s) => s.currentStage === 'Interviewing');
  const trainingStudents = students.filter((s) => s.currentStage === 'In Training');
  const readyStudents = students.filter((s) => s.currentStage === 'Trained / To Be Placed');
  const portfolioReviewStudents = students.filter((s) => s.currentStage === 'Portfolio Review');
  const totalInternApplicants = leads.length + students.length;
  const placementRate = students.length > 0 ? Math.round((placedStudents.length / students.length) * 100) : 0;

  // Company Metrics
  const activeCompanies = companies.filter((c) => c.status === 'Active');
  const openRoles = roles.filter((r) => r.status === 'Open' || r.status === 'Shortlisting');
  const totalOpenings = openRoles.reduce((sum, r) => sum + (r.openings || 1), 0);
  const totalInvoicedValue = invoices.reduce((sum, i) => sum + (i.total || 0), 0);
  const totalCollectedRevenue = invoices
    .filter((i) => i.status === 'Paid')
    .reduce((sum, i) => sum + (i.total || 0), 0);
  const pendingReceivables = totalInvoicedValue - totalCollectedRevenue;

  // Today's interviews
  const today = new Date().toISOString().split('T')[0];
  const todaysInterviews = interviews.filter(
    (i) => i.scheduledAt?.startsWith(today) || i.status === 'Confirmed'
  );

  const pendingTasks = tasks.filter((t) => t.status !== 'Completed');

  return (
    <div className="space-y-6">
      {/* Top Header & Dual-Client Mode Switcher */}
      <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-zinc-900">CRM Operations Center</h2>
            <Badge variant="blue">Dual-Client Marketplace</Badge>
          </div>
          <p className="text-xs text-zinc-500">
            Switch between Executive 360°, Intern Client Ops, and Corporate Partner Ops.
          </p>
        </div>

        {/* Mode Selector Segmented Tabs */}
        <div className="flex items-center bg-zinc-100 p-1 rounded-lg border border-zinc-200/70 w-full sm:w-auto">
          <button
            onClick={() => setDashboardMode('overview')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
              dashboardMode === 'overview'
                ? 'bg-white text-zinc-900 shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>360° Overview</span>
          </button>

          <button
            onClick={() => setDashboardMode('intern')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
              dashboardMode === 'intern'
                ? 'bg-white text-blue-600 shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Intern Mode</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-50 text-blue-700 font-medium">
              {students.length}
            </span>
          </button>

          <button
            onClick={() => setDashboardMode('company')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
              dashboardMode === 'company'
                ? 'bg-white text-emerald-700 shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Company Mode</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-50 text-emerald-700 font-medium">
              {companies.length}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. OVERVIEW MODE (EXECUTIVE 360° VIEW) */}
      {/* ========================================================================= */}
      {dashboardMode === 'overview' && (
        <div className="space-y-6">
          {/* 4 Core Balanced KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <StatCard
              title="Intern Talent Pool"
              value={students.length}
              subtitle={`${leads.length} applicants in admissions funnel`}
              icon={Users}
              trend={{ value: `${placementRate}% placed`, isPositive: true }}
              onClick={() => setDashboardMode('intern')}
            />
            <StatCard
              title="Corporate Partners"
              value={companies.length}
              subtitle={`${openRoles.length} open roles (${totalOpenings} openings)`}
              icon={Building}
              trend={{ value: `${activeCompanies.length} active`, isPositive: true }}
              onClick={() => setDashboardMode('company')}
            />
            <StatCard
              title="Interviews Conducted"
              value={interviews.length}
              subtitle={`${todaysInterviews.length} confirmed sessions today`}
              icon={Calendar}
              onClick={() => onSelectView('interviews')}
            />
            <StatCard
              title="B2B Revenue Invoiced"
              value={`₹${(totalInvoicedValue / 1000).toFixed(0)}k`}
              subtitle={`₹${(totalCollectedRevenue / 1000).toFixed(0)}k collected • 18% GST`}
              icon={DollarSign}
              onClick={() => onSelectView('billing')}
            />
          </div>

          {/* Dual-Sided Marketplace Health: Intern Supply vs Company Demand */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Left: Intern Talent Pipeline */}
            <div className="bg-white p-5 rounded-xl border border-zinc-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-zinc-900">Intern Talent Supply Pipeline</h3>
                    <p className="text-xs text-zinc-500">From application to placement outcome</p>
                  </div>
                </div>
                <button
                  onClick={() => setDashboardMode('intern')}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  <span>Intern Ops</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2.5 bg-zinc-50 border border-zinc-200/60 rounded-lg">
                  <span className="text-[10px] uppercase font-semibold text-zinc-400 block">Admissions</span>
                  <span className="text-lg font-bold text-zinc-800 block mt-0.5">{leads.length}</span>
                  <span className="text-[10px] text-zinc-500">Leads</span>
                </div>
                <div className="p-2.5 bg-zinc-50 border border-zinc-200/60 rounded-lg">
                  <span className="text-[10px] uppercase font-semibold text-zinc-400 block">In Cohorts</span>
                  <span className="text-lg font-bold text-amber-600 block mt-0.5">
                    {trainingStudents.length + readyStudents.length}
                  </span>
                  <span className="text-[10px] text-zinc-500">Batches 1-5</span>
                </div>
                <div className="p-2.5 bg-zinc-50 border border-zinc-200/60 rounded-lg">
                  <span className="text-[10px] uppercase font-semibold text-zinc-400 block">Interviewing</span>
                  <span className="text-lg font-bold text-blue-600 block mt-0.5">{interviewingStudents.length}</span>
                  <span className="text-[10px] text-zinc-500">In Rounds</span>
                </div>
                <div className="p-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-lg">
                  <span className="text-[10px] uppercase font-semibold text-emerald-700 block">Placed</span>
                  <span className="text-lg font-bold text-emerald-700 block mt-0.5">{placedStudents.length}</span>
                  <span className="text-[10px] text-emerald-600">{placementRate}% Success</span>
                </div>
              </div>
            </div>

            {/* Right: Company Corporate Demand Pipeline */}
            <div className="bg-white p-5 rounded-xl border border-zinc-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                    <Building className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-zinc-900">Corporate Partner Demand</h3>
                    <p className="text-xs text-zinc-500">Hiring requisitions and B2B engagement</p>
                  </div>
                </div>
                <button
                  onClick={() => setDashboardMode('company')}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>Company Ops</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2.5 bg-zinc-50 border border-zinc-200/60 rounded-lg">
                  <span className="text-[10px] uppercase font-semibold text-zinc-400 block">Partners</span>
                  <span className="text-lg font-bold text-zinc-800 block mt-0.5">{companies.length}</span>
                  <span className="text-[10px] text-zinc-500">Accounts</span>
                </div>
                <div className="p-2.5 bg-zinc-50 border border-zinc-200/60 rounded-lg">
                  <span className="text-[10px] uppercase font-semibold text-zinc-400 block">Requisitions</span>
                  <span className="text-lg font-bold text-blue-600 block mt-0.5">{openRoles.length}</span>
                  <span className="text-[10px] text-zinc-500">{totalOpenings} Openings</span>
                </div>
                <div className="p-2.5 bg-zinc-50 border border-zinc-200/60 rounded-lg">
                  <span className="text-[10px] uppercase font-semibold text-zinc-400 block">Interviews</span>
                  <span className="text-lg font-bold text-purple-600 block mt-0.5">{interviews.length}</span>
                  <span className="text-[10px] text-zinc-500">Scheduled</span>
                </div>
                <div className="p-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-lg">
                  <span className="text-[10px] uppercase font-semibold text-emerald-700 block">Hired</span>
                  <span className="text-lg font-bold text-emerald-700 block mt-0.5">{placements.length}</span>
                  <span className="text-[10px] text-emerald-600">Onboarded</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2-Column Split: Today's Schedule & Action Items + Live Activity Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left 7 Cols: Today's Schedule & Pending Tasks */}
            <div className="lg:col-span-7 space-y-4">
              {/* Upcoming Interviews */}
              <div className="bg-white p-5 rounded-xl border border-zinc-200/80 space-y-3">
                <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
                  <h3 className="font-bold text-xs text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-zinc-500" />
                    <span>Upcoming Partner Interviews</span>
                  </h3>
                  <button
                    onClick={() => onSelectView('interviews')}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    View all ({interviews.length})
                  </button>
                </div>

                <div className="space-y-2.5">
                  {interviews.slice(0, 3).map((iv) => (
                    <div
                      key={iv.id}
                      className="p-3 border border-zinc-200/70 rounded-lg flex items-center justify-between text-xs hover:bg-zinc-50/60 transition"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-900">{iv.studentName}</span>
                          <span className="text-zinc-400">→</span>
                          <span className="font-semibold text-zinc-800">{iv.companyName}</span>
                        </div>
                        <span className="text-[11px] text-zinc-500 block mt-0.5">
                          {iv.roleTitle} ({iv.round}) •{' '}
                          {new Date(iv.scheduledAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant={iv.status === 'Confirmed' ? 'blue' : 'neutral'}>{iv.status}</Badge>
                        {iv.meetUrl && (
                          <a
                            href={iv.meetUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded text-[11px] font-medium transition"
                          >
                            Join
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                  {interviews.length === 0 && (
                    <div className="text-center py-6 text-xs text-zinc-400">No interviews scheduled yet.</div>
                  )}
                </div>
              </div>

              {/* Pending Operational Tasks */}
              <div className="bg-white p-5 rounded-xl border border-zinc-200/80 space-y-3">
                <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
                  <h3 className="font-bold text-xs text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-zinc-500" />
                    <span>Pending Tasks ({pendingTasks.length})</span>
                  </h3>
                  <button
                    onClick={() => onSelectView('tasks')}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    View all
                  </button>
                </div>

                <div className="space-y-2">
                  {pendingTasks.slice(0, 3).map((t) => (
                    <div
                      key={t.id}
                      className="p-3 border border-zinc-200/70 rounded-lg flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-medium text-zinc-900 block">{t.title}</span>
                        <span className="text-[11px] text-zinc-500">
                          Assignee: {t.assignedTo} • Due: {t.dueDate}
                        </span>
                      </div>
                      <Badge variant={t.priority === 'urgent' ? 'red' : 'amber'}>{t.priority}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Live Activity Feed */}
            <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-zinc-200/80 space-y-4">
              <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
                <h3 className="font-bold text-xs text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-zinc-500" />
                  <span>Real-Time Activity Audit Trail</span>
                </h3>
                <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 animate-pulse" />
              </div>

              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {activities.slice(0, 8).map((act) => (
                  <div
                    key={act.id}
                    className="p-2.5 bg-zinc-50/70 rounded-lg border border-zinc-100 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-900">{act.action}</span>
                      <span className="text-[10px] text-zinc-400">
                        {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-600">{act.details}</p>
                    <div className="text-[10px] text-zinc-400">By: {act.performedBy}</div>
                  </div>
                ))}
                {activities.length === 0 && (
                  <div className="text-center py-10 text-xs text-zinc-400">
                    No activity logged yet. Operations will log live audit events here.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. INTERN CLIENT MODE (STUDENT & TRAINING OPERATIONS) */}
      {/* ========================================================================= */}
      {dashboardMode === 'intern' && (
        <div className="space-y-6">
          {/* Intern Mode Banner */}
          <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-white p-4 rounded-xl border border-blue-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600 text-white rounded-lg shadow-2xs">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-zinc-900">Intern & Candidate Client Operations</h3>
                <p className="text-xs text-zinc-600">
                  Managing student lifecycle, admissions funnel, Hazra training cohorts, Canva portfolios, and placement readiness.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSelectView('leads')}
                className="px-3 py-1.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-xs font-semibold text-zinc-800 rounded-lg shadow-2xs transition cursor-pointer"
              >
                View Leads ({leads.length})
              </button>
              <button
                onClick={() => onSelectView('students')}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white rounded-lg shadow-2xs transition cursor-pointer"
              >
                Student Directory & Wall
              </button>
            </div>
          </div>

          {/* Intern Specific 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <StatCard
              title="Admissions Funnel"
              value={leads.length}
              subtitle="Form submissions awaiting batching"
              icon={Sparkles}
              onClick={() => onSelectView('leads')}
            />
            <StatCard
              title="In Training Cohorts"
              value={trainingStudents.length}
              subtitle="Enrolled across Batches 1 to 5"
              icon={Users}
              onClick={() => onSelectView('students')}
            />
            <StatCard
              title="Portfolios Under Review"
              value={portfolioReviewStudents.length}
              subtitle="Submitted Canva portfolio decks"
              icon={FileText}
              onClick={() => onSelectView('students')}
            />
            <StatCard
              title="Placed Interns"
              value={placedStudents.length}
              subtitle={`${placementRate}% overall placement rate`}
              icon={CheckCircle2}
              onClick={() => onSelectView('placements')}
            />
          </div>

          {/* Candidate Journey Funnel Progression */}
          <div className="bg-white p-5 rounded-xl border border-zinc-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-zinc-900">Candidate Progression Funnel</h3>
                <p className="text-xs text-zinc-500">Live pipeline distribution across student lifecycle stages.</p>
              </div>
              <span className="text-xs font-semibold text-blue-600">
                {totalInternApplicants} Total Candidates
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div
                onClick={() => onSelectView('leads')}
                className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-xl hover:border-zinc-400 transition cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase text-zinc-400">1. Applied</span>
                  <Badge variant="neutral">Lead</Badge>
                </div>
                <span className="text-2xl font-bold text-zinc-900 block mt-2">{leads.length}</span>
                <span className="text-[10px] text-zinc-500">Form responses</span>
              </div>

              <div
                onClick={() => onSelectView('students')}
                className="p-3 bg-amber-50/50 border border-amber-200/70 rounded-xl hover:border-amber-400 transition cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase text-amber-600">2. In Cohort</span>
                  <Badge variant="amber">Active</Badge>
                </div>
                <span className="text-2xl font-bold text-amber-700 block mt-2">{trainingStudents.length}</span>
                <span className="text-[10px] text-amber-600">Training coursework</span>
              </div>

              <div
                onClick={() => onSelectView('students')}
                className="p-3 bg-purple-50/50 border border-purple-200/70 rounded-xl hover:border-purple-400 transition cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase text-purple-600">3. Portfolios</span>
                  <Badge variant="purple">Canva</Badge>
                </div>
                <span className="text-2xl font-bold text-purple-700 block mt-2">
                  {portfolioReviewStudents.length + readyStudents.length}
                </span>
                <span className="text-[10px] text-purple-600">Decks verified</span>
              </div>

              <div
                onClick={() => onSelectView('interviews')}
                className="p-3 bg-blue-50/50 border border-blue-200/70 rounded-xl hover:border-blue-400 transition cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase text-blue-600">4. Interviewing</span>
                  <Badge variant="blue">Partner</Badge>
                </div>
                <span className="text-2xl font-bold text-blue-700 block mt-2">{interviewingStudents.length}</span>
                <span className="text-[10px] text-blue-600">Shortlisted for roles</span>
              </div>

              <div
                onClick={() => onSelectView('placements')}
                className="p-3 bg-emerald-50/80 border border-emerald-300 rounded-xl hover:border-emerald-500 transition cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase text-emerald-700">5. Placed</span>
                  <Badge variant="emerald">Hired</Badge>
                </div>
                <span className="text-2xl font-bold text-emerald-700 block mt-2">{placedStudents.length}</span>
                <span className="text-[10px] text-emerald-600">Offers & onboarding</span>
              </div>
            </div>
          </div>

          {/* Active Training Batches & Cohorts */}
          <div className="bg-white p-5 rounded-xl border border-zinc-200/80 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-zinc-900">Training Cohorts (Batches 1 to 5)</h3>
                <p className="text-xs text-zinc-500">Hazra training programs and curriculum tracks.</p>
              </div>
              <span className="text-xs text-zinc-500">{batches.length} cohorts tracked</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {batches.map((batch) => {
                const enrolled = students.filter((s) => s.batchId === batch.id || s.notes?.includes(batch.id));
                return (
                  <div
                    key={batch.id}
                    className="p-3.5 border border-zinc-200/80 rounded-xl space-y-2 hover:border-zinc-300 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-bold text-zinc-900 block">{getBatchDisplayTitle(batch)}</span>
                      </div>
                      <Badge variant={batch.status === 'Active' ? 'emerald' : 'neutral'}>
                        {batch.status}
                      </Badge>
                    </div>

                    <div className="pt-1 flex items-center justify-between text-[11px] text-zinc-600 border-t border-zinc-100">
                      <span>{batch.sessionsCount || 14} Sessions</span>
                      <span className="font-medium text-zinc-900">
                        {enrolled.length} / {batch.capacity} Enrolled
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Student Directory Quick View (Top Talent) */}
          <div className="bg-white p-5 rounded-xl border border-zinc-200/80 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-zinc-900">Student Directory Quick View</h3>
                <p className="text-xs text-zinc-500">
                  Direct access to CVs, Canva portfolios, and WhatsApp outreach.
                </p>
              </div>
              <button
                onClick={() => onSelectView('students')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                <span>Open Full Student Directory</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200/70 text-zinc-400 font-semibold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Student</th>
                    <th className="py-2.5 px-3">College & Course</th>
                    <th className="py-2.5 px-3">Stage</th>
                    <th className="py-2.5 px-3">Top Skills</th>
                    <th className="py-2.5 px-3 text-right">Direct Links</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {students.slice(0, 6).map((student) => (
                    <tr
                      key={student.id}
                      onClick={() => onSelectStudent(student)}
                      className="hover:bg-zinc-50/70 cursor-pointer transition"
                    >
                      <td className="py-3 px-3">
                        <div className="font-bold text-zinc-900">{student.name}</div>
                        <div className="text-[11px] text-zinc-500">{student.studentId} • {student.email}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-zinc-800 font-medium">{student.college}</div>
                        <div className="text-[11px] text-zinc-500">{student.course}</div>
                      </td>
                      <td className="py-3 px-3">
                        <Badge
                          variant={
                            student.currentStage === 'Placed'
                              ? 'emerald'
                              : student.currentStage === 'Interviewing'
                              ? 'blue'
                              : student.currentStage === 'In Training'
                              ? 'amber'
                              : 'neutral'
                          }
                        >
                          {student.currentStage}
                        </Badge>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {student.skills?.slice(0, 2).map((sk) => (
                            <span
                              key={sk}
                              className="px-1.5 py-0.5 bg-zinc-100 text-zinc-700 rounded text-[10px] truncate"
                            >
                              {sk}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {student.portfolioUrl && (
                            <a
                              href={student.portfolioUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="Open Canva Portfolio Deck"
                              className="p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-md transition"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {student.resumeUrl && (
                            <a
                              href={student.resumeUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="Open Resume / CV"
                              className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md transition"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {student.phone && (
                            <a
                              href={`https://wa.me/${student.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              title="Message via WhatsApp"
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md transition"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. COMPANY CLIENT MODE (CORPORATE PARTNERS & HIRING OPERATIONS) */}
      {/* ========================================================================= */}
      {dashboardMode === 'company' && (
        <div className="space-y-6">
          {/* Company Mode Banner */}
          <div className="bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-white p-4 rounded-xl border border-emerald-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-700 text-white rounded-lg shadow-2xs">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-zinc-900">Corporate Partner Client Operations</h3>
                <p className="text-xs text-zinc-600">
                  Managing hiring accounts, open requisitions, student shortlists, interview loops, and B2B GST billing.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSelectView('companies')}
                className="px-3 py-1.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-xs font-semibold text-zinc-800 rounded-lg shadow-2xs transition cursor-pointer"
              >
                Companies & Roles ({companies.length})
              </button>
              <button
                onClick={() => onSelectView('billing')}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-xs font-semibold text-white rounded-lg shadow-2xs transition cursor-pointer"
              >
                Invoices & GST Billing
              </button>
            </div>
          </div>

          {/* Company Specific 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <StatCard
              title="Corporate Partners"
              value={companies.length}
              subtitle={`${activeCompanies.length} actively hiring`}
              icon={Building}
              onClick={() => onSelectView('companies')}
            />
            <StatCard
              title="Active Job Requisitions"
              value={openRoles.length}
              subtitle={`${totalOpenings} open positions across clients`}
              icon={Briefcase}
              onClick={() => onSelectView('companies')}
            />
            <StatCard
              title="Partner Interviews"
              value={interviews.length}
              subtitle="Live rounds with hiring managers"
              icon={Calendar}
              onClick={() => onSelectView('interviews')}
            />
            <StatCard
              title="Invoiced B2B Value"
              value={`₹${(totalInvoicedValue / 1000).toFixed(0)}k`}
              subtitle={`₹${(pendingReceivables / 1000).toFixed(0)}k pending receivables`}
              icon={DollarSign}
              onClick={() => onSelectView('billing')}
            />
          </div>

          {/* B2B Partner Engagement Funnel */}
          <div className="bg-white p-5 rounded-xl border border-zinc-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-zinc-900">B2B Partner Requisition Pipeline</h3>
                <p className="text-xs text-zinc-500">Corporate client hiring lifecycle from onboarding to invoice settlement.</p>
              </div>
              <span className="text-xs font-semibold text-emerald-700">
                {companies.length} Partner Accounts
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div
                onClick={() => onSelectView('companies')}
                className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-xl hover:border-zinc-400 transition cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase text-zinc-400">1. Onboarded</span>
                  <Badge variant="neutral">Partner</Badge>
                </div>
                <span className="text-2xl font-bold text-zinc-900 block mt-2">{companies.length}</span>
                <span className="text-[10px] text-zinc-500">Signed brands & orgs</span>
              </div>

              <div
                onClick={() => onSelectView('companies')}
                className="p-3 bg-blue-50/50 border border-blue-200/70 rounded-xl hover:border-blue-400 transition cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase text-blue-600">2. Requisitions</span>
                  <Badge variant="blue">Open</Badge>
                </div>
                <span className="text-2xl font-bold text-blue-700 block mt-2">{openRoles.length}</span>
                <span className="text-[10px] text-blue-600">{totalOpenings} openings</span>
              </div>

              <div
                onClick={() => onSelectView('matching')}
                className="p-3 bg-purple-50/50 border border-purple-200/70 rounded-xl hover:border-purple-400 transition cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase text-purple-600">3. Shortlists</span>
                  <Badge variant="purple">Matched</Badge>
                </div>
                <span className="text-2xl font-bold text-purple-700 block mt-2">
                  {students.filter((s) => s.currentStage === 'Trained / To Be Placed' || s.currentStage === 'Interviewing').length}
                </span>
                <span className="text-[10px] text-purple-600">Ready to dispatch</span>
              </div>

              <div
                onClick={() => onSelectView('interviews')}
                className="p-3 bg-amber-50/50 border border-amber-200/70 rounded-xl hover:border-amber-400 transition cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase text-amber-600">4. Interviews</span>
                  <Badge variant="amber">Loop</Badge>
                </div>
                <span className="text-2xl font-bold text-amber-700 block mt-2">{interviews.length}</span>
                <span className="text-[10px] text-amber-600">Company rounds</span>
              </div>

              <div
                onClick={() => onSelectView('billing')}
                className="p-3 bg-emerald-50/80 border border-emerald-300 rounded-xl hover:border-emerald-500 transition cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase text-emerald-700">5. Closed & Invoiced</span>
                  <Badge variant="emerald">Hired</Badge>
                </div>
                <span className="text-2xl font-bold text-emerald-700 block mt-2">{placements.length}</span>
                <span className="text-[10px] text-emerald-600">₹{(totalInvoicedValue / 1000).toFixed(0)}k Invoiced</span>
              </div>
            </div>
          </div>

          {/* Corporate Partner Accounts Directory */}
          <div className="bg-white p-5 rounded-xl border border-zinc-200/80 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-zinc-900">Partner Accounts & Brand Directory</h3>
                <p className="text-xs text-zinc-500">Corporate clients hiring through InternsHome.</p>
              </div>
              <button
                onClick={() => onSelectView('companies')}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Manage Companies & Roles</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {companies.map((company) => {
                const companyRoles = roles.filter((r) => r.companyId === company.id);
                const companyPlacements = placements.filter((p) => p.companyName === company.name || p.companyId === company.id);
                return (
                  <div
                    key={company.id}
                    onClick={() => onSelectView('companies')}
                    className="p-4 border border-zinc-200/80 rounded-xl hover:border-zinc-300 transition cursor-pointer space-y-3 bg-white"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-bold text-sm text-zinc-900 block">{company.name}</span>
                        <span className="text-[11px] text-zinc-500">{company.industry} • {company.location}</span>
                      </div>
                      <Badge variant={company.status === 'Active' ? 'emerald' : 'neutral'}>
                        {company.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-100 text-xs">
                      <div className="bg-zinc-50 p-2 rounded-lg">
                        <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Open Roles</span>
                        <span className="font-bold text-zinc-800 text-sm mt-0.5">
                          {companyRoles.length > 0 ? companyRoles.length : '1 Role'}
                        </span>
                      </div>
                      <div className="bg-zinc-50 p-2 rounded-lg">
                        <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Hired Interns</span>
                        <span className="font-bold text-emerald-700 text-sm mt-0.5">
                          {companyPlacements.length > 0 ? companyPlacements.length : 1} Placed
                        </span>
                      </div>
                    </div>

                    {company.contacts && company.contacts.length > 0 && (
                      <div className="text-[11px] text-zinc-500 flex items-center justify-between pt-1">
                        <span>POC: {company.contacts[0].name}</span>
                        <span className="text-zinc-400">{company.contacts[0].email}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* B2B Invoices & GST Compliance Tracker */}
          <div className="bg-white p-5 rounded-xl border border-zinc-200/80 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-zinc-900">B2B Placement Fee Invoices & GST Compliance</h3>
                <p className="text-xs text-zinc-500">
                  Tax compliant invoices with 18% GST (9% CGST + 9% SGST).
                </p>
              </div>
              <button
                onClick={() => onSelectView('billing')}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Open Full Invoicing Center</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-zinc-50 border border-zinc-200/80 rounded-xl">
                <span className="text-[11px] text-zinc-500 font-medium block">Total Invoiced</span>
                <span className="text-xl font-bold text-zinc-900 block mt-1">
                  ₹{totalInvoicedValue.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-zinc-400">{invoices.length} invoices generated</span>
              </div>
              <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                <span className="text-[11px] text-emerald-700 font-medium block">Paid & Settled</span>
                <span className="text-xl font-bold text-emerald-700 block mt-1">
                  ₹{totalCollectedRevenue.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-emerald-600">Cleared through bank transfer</span>
              </div>
              <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl">
                <span className="text-[11px] text-amber-700 font-medium block">Pending Receivables</span>
                <span className="text-xl font-bold text-amber-700 block mt-1">
                  ₹{pendingReceivables.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-amber-600">Awaiting client payment</span>
              </div>
            </div>

            {invoices.length > 0 && (
              <div className="overflow-x-auto pt-2">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200/70 text-zinc-400 font-semibold uppercase text-[10px]">
                      <th className="py-2 px-3">Invoice #</th>
                      <th className="py-2 px-3">Corporate Partner</th>
                      <th className="py-2 px-3">Service</th>
                      <th className="py-2 px-3">Taxable Value</th>
                      <th className="py-2 px-3">Total (Incl. 18% GST)</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {invoices.slice(0, 4).map((inv) => (
                      <tr key={inv.id} className="hover:bg-zinc-50/60 transition">
                        <td className="py-2.5 px-3 font-semibold text-zinc-900">{inv.invoiceNumber}</td>
                        <td className="py-2.5 px-3 text-zinc-800">{inv.companyName}</td>
                        <td className="py-2.5 px-3 text-zinc-500">{inv.service}</td>
                        <td className="py-2.5 px-3 text-zinc-700">₹{inv.taxableValue?.toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-3 font-bold text-zinc-900">₹{inv.total?.toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-3">
                          <Badge variant={inv.status === 'Paid' ? 'emerald' : 'amber'}>{inv.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
