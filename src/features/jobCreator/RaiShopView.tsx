import React, { useState, useEffect } from 'react';
import {
  Plus,
  Sparkles,
  Search,
  Filter,
  ArrowUpDown,
  Building,
  MapPin,
  Calendar,
  Clock,
  Users,
  DollarSign,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Copy,
  ExternalLink,
  SlidersHorizontal,
  X,
  UserCheck,
  Briefcase,
  Store,
} from 'lucide-react';
import {
  RentInternJob,
  RentInternJobStatus,
  NormalizedRole,
  PricingRule,
} from '../../types/crm';
import {
  subscribeRentInternJobs,
  saveRentInternJob,
  updateRentInternJob,
  deleteRentInternJob,
  getNextJobId,
} from '../../services/rentInternJobService';
import { subscribePricingRules, calculateJobPricing } from '../../services/pricingService';
import { JobDetailDrawer } from './components/JobDetailDrawer';

interface RaiShopViewProps {
  onNavigateToAiForm: () => void;
}

const ALL_STATUSES: RentInternJobStatus[] = [
  'Draft',
  'Awaiting Client Details',
  'Ready for Review',
  'Approved',
  'Published',
  'Applications Open',
  'Applications Closed',
  'Assigned',
  'In Progress',
  'Completed',
  'Cancelled',
];

const NORMALIZED_ROLES: NormalizedRole[] = [
  'Content Creator',
  'Videographer',
  'Photographer',
  'Video Editor',
  'Event Support',
  'Event Registration',
  'Stall Support',
  'Promoter',
  'Research Intern',
  'Data Entry',
  'Operations Support',
  'Social Media Support',
  'Marketing Support',
  'Sales Support',
  'Campus Ambassador',
  'Host / Presenter',
  'Graphic Design',
  'Production Assistant',
  'Other',
];

export const RaiShopView: React.FC<RaiShopViewProps> = ({ onNavigateToAiForm }) => {
  const [jobs, setJobs] = useState<RentInternJob[]>([]);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [selectedJob, setSelectedJob] = useState<RentInternJob | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [brandFilter, setBrandFilter] = useState<string>('All');
  const [locationFilter, setLocationFilter] = useState<string>('All');
  const [ownerFilter, setOwnerFilter] = useState<string>('All');
  const [assignmentFilter, setAssignmentFilter] = useState<'All' | 'Assigned' | 'Unassigned'>('All');
  const [activeTab, setActiveTab] = useState<'All' | 'Active' | 'Action Needed' | 'Completed'>('All');
  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<'createdAt' | 'dates' | 'client' | 'internPayment'>('createdAt');
  const [sortAsc, setSortAsc] = useState(false);

  // Manual Job Creation Form State
  const [manualForm, setManualForm] = useState<Partial<RentInternJob>>({
    role: 'Content Creator',
    normalizedRole: 'Content Creator',
    client: '',
    numberOfInterns: 1,
    jobType: 'Gig',
    location: {
      venue: '',
      area: '',
      city: 'Kolkata',
      remoteType: 'On-site',
    },
    dates: ['Upcoming'],
    startTime: '02:00 PM',
    endTime: '06:00 PM',
    durationHours: 4,
    primaryTask: '',
    clientCommercial: 1500,
    internPayment: 1000,
    travelIncluded: true,
    travelAmount: 200,
    foodIncluded: false,
    status: 'Ready for Review',
    jobOwner: 'Operations Team',
  });

  useEffect(() => {
    const unsubJobs = subscribeRentInternJobs((loaded) => setJobs(loaded));
    const unsubRules = subscribePricingRules((rules) => setPricingRules(rules));
    return () => {
      unsubJobs();
      unsubRules();
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Metrics computation (Compact metrics per section 4)
  const activeJobsCount = jobs.filter(
    (j) => !['Completed', 'Cancelled'].includes(j.status)
  ).length;

  const awaitingDetailsCount = jobs.filter(
    (j) => j.status === 'Awaiting Client Details'
  ).length;

  const readyToPublishCount = jobs.filter(
    (j) => j.status === 'Ready for Review' || j.status === 'Approved'
  ).length;

  const applicationsOpenCount = jobs.filter(
    (j) => j.status === 'Applications Open' || j.status === 'Published'
  ).length;

  const internsRequiredTotal = jobs
    .filter((j) => !['Completed', 'Cancelled'].includes(j.status))
    .reduce((sum, j) => sum + (Number(j.numberOfInterns) || 1), 0);

  const internsAssignedTotal = jobs
    .filter((j) => !['Completed', 'Cancelled'].includes(j.status))
    .reduce((sum, j) => sum + (j.assignedInterns?.length || 0), 0);

  const completedThisMonthCount = jobs.filter((j) => {
    if (j.status !== 'Completed') return false;
    const date = new Date(j.updatedAt || j.createdAt);
    const now = new Date();
    return (
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  }).length;

  // Filter options
  const uniqueBrands = Array.from(new Set(jobs.map((j) => j.client).filter(Boolean)));
  const uniqueLocations = Array.from(
    new Set(jobs.map((j) => j.location?.area || j.location?.city).filter(Boolean))
  );
  const uniqueOwners = Array.from(new Set(jobs.map((j) => j.jobOwner).filter(Boolean)));

  // Filtered jobs
  const filteredJobs = jobs.filter((job) => {
    // Tab filter
    if (activeTab === 'Active' && ['Completed', 'Cancelled'].includes(job.status)) return false;
    if (activeTab === 'Action Needed' && !['Awaiting Client Details', 'Ready for Review', 'Applications Open'].includes(job.status)) return false;
    if (activeTab === 'Completed' && job.status !== 'Completed') return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        job.jobId.toLowerCase().includes(q) ||
        job.role.toLowerCase().includes(q) ||
        job.client.toLowerCase().includes(q) ||
        (job.location?.venue || '').toLowerCase().includes(q) ||
        (job.location?.area || '').toLowerCase().includes(q) ||
        (job.primaryTask || '').toLowerCase().includes(q);
      if (!match) return false;
    }

    // Dropdown filters
    if (statusFilter !== 'All' && job.status !== statusFilter) return false;
    if (roleFilter !== 'All' && job.normalizedRole !== roleFilter && job.role !== roleFilter) return false;
    if (brandFilter !== 'All' && job.client !== brandFilter) return false;
    if (locationFilter !== 'All' && (job.location?.area !== locationFilter && job.location?.city !== locationFilter)) return false;
    if (ownerFilter !== 'All' && job.jobOwner !== ownerFilter) return false;

    if (assignmentFilter === 'Assigned' && (!job.assignedInterns || job.assignedInterns.length === 0)) return false;
    if (assignmentFilter === 'Unassigned' && (job.assignedInterns && job.assignedInterns.length >= (job.numberOfInterns || 1))) return false;

    return true;
  }).sort((a, b) => {
    let comparison = 0;
    if (sortField === 'createdAt') {
      comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortField === 'dates') {
      const dateA = (a.dates && a.dates[0]) || '';
      const dateB = (b.dates && b.dates[0]) || '';
      comparison = dateA.localeCompare(dateB);
    } else if (sortField === 'client') {
      comparison = a.client.localeCompare(b.client);
    } else if (sortField === 'internPayment') {
      comparison = (b.internPayment || 0) - (a.internPayment || 0);
    }
    return sortAsc ? -comparison : comparison;
  });

  const handleManualCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.client?.trim()) {
      showToast('Client / Brand name is required');
      return;
    }

    try {
      const nextId = await getNextJobId();
      const newJob: Omit<RentInternJob, 'id'> = {
        jobId: nextId,
        jobTitle: `${manualForm.normalizedRole || 'Event Support'} for ${manualForm.client}`,
        client: manualForm.client.trim(),
        clientContact: {
          pocName: '',
          pocPhone: '',
        },
        role: manualForm.role || manualForm.normalizedRole || 'Event Support',
        normalizedRole: (manualForm.normalizedRole as NormalizedRole) || 'Event Support',
        numberOfInterns: Number(manualForm.numberOfInterns) || 1,
        jobType: manualForm.jobType || 'Gig',
        location: {
          venue: manualForm.location?.venue || 'Kolkata',
          area: manualForm.location?.area || '',
          city: manualForm.location?.city || 'Kolkata',
          remoteType: manualForm.location?.remoteType || 'On-site',
        },
        dateType: 'single',
        dates: manualForm.dates && manualForm.dates.length > 0 ? manualForm.dates : ['Upcoming'],
        startTime: manualForm.startTime || '02:00 PM',
        endTime: manualForm.endTime || '06:00 PM',
        numberOfDays: 1,
        durationHours: Number(manualForm.durationHours) || 4,
        primaryTask: manualForm.primaryTask || 'On-site coordination and duties',
        additionalTasks: [],
        expectedDeliverables: [],
        deliverableQuantity: '',
        deliveryDeadline: '',
        specialInstructions: '',
        requiredSkills: [],
        experienceRequirement: manualForm.experienceRequirement || 'Fresher / Any',
        equipmentRequired: ['None'],
        askPhoneModel: false,
        askCameraModel: false,
        askPortfolio: false,
        askWorkSamples: false,
        askInstagram: false,
        askCollege: true,
        askYear: true,
        clientCommercial: Number(manualForm.clientCommercial) || 1500,
        internPayment: Number(manualForm.internPayment) || 1000,
        travelIncluded: Boolean(manualForm.travelIncluded),
        travelAmount: Number(manualForm.travelAmount) || 0,
        foodIncluded: Boolean(manualForm.foodIncluded),
        jobOwner: manualForm.jobOwner || 'Operations Team',
        createdBy: 'Operations',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: (manualForm.status as RentInternJobStatus) || 'Ready for Review',
        priority: 'Medium',
        source: 'Direct',
        originalClientBrief: 'Manually created by Operations in RAI Shop',
        clientClarifications: [],
        generatedGigText: '',
        missingFields: [],
        clarificationMessage: '',
      };

      const docId = await saveRentInternJob(newJob);
      setIsManualModalOpen(false);
      showToast(`✓ Job ${nextId} created successfully in RAI Shop!`);
      const created = jobs.find((j) => j.id === docId);
      if (created) setSelectedJob(created);
    } catch (err: any) {
      showToast(`Error creating job: ${err.message}`);
    }
  };

  const getStatusBadge = (status: RentInternJobStatus) => {
    switch (status) {
      case 'Draft':
        return 'bg-zinc-100 text-zinc-700 border-zinc-200';
      case 'Awaiting Client Details':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Ready for Review':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'Approved':
      case 'Published':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'Applications Open':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200 font-bold';
      case 'Applications Closed':
        return 'bg-zinc-100 text-zinc-600 border-zinc-300';
      case 'Assigned':
        return 'bg-teal-50 text-teal-800 border-teal-200 font-semibold';
      case 'In Progress':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold';
      case 'Completed':
        return 'bg-emerald-100 text-emerald-900 border-emerald-200';
      case 'Cancelled':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-medium flex items-center gap-2 animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER SECTION (Section 3) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-zinc-900">RAI Shop</h1>
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-700 rounded-md border border-zinc-200">
              Rent an Intern Workspace
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Manage all Rent an Intern requirements from brief to completion.
          </p>
        </div>

        {/* Top actions (Section 3 & 6) */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Primary: AI Create */}
          <button
            type="button"
            onClick={onNavigateToAiForm}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Create</span>
          </button>

          {/* Option 2: Manual Create */}
          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold text-zinc-700 bg-white hover:bg-zinc-50 border border-zinc-300 rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Manual Create</span>
          </button>

          <button
            type="button"
            onClick={() => setShowFiltersDrawer(!showFiltersDrawer)}
            className={`px-3 py-2 text-xs font-medium rounded-xl border transition-colors flex items-center gap-1.5 cursor-pointer ${
              statusFilter !== 'All' || roleFilter !== 'All' || brandFilter !== 'All' || locationFilter !== 'All'
                ? 'bg-zinc-900 text-white border-zinc-900'
                : 'bg-white text-zinc-700 hover:bg-zinc-50 border-zinc-300'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* COMPACT SUMMARY METRICS DASHBOARD (Section 4) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <div className="bg-white p-3 rounded-xl border border-zinc-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-zinc-500 block truncate">Active Jobs</span>
          <span className="text-xl font-bold text-zinc-900 mt-0.5 block">{activeJobsCount}</span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-zinc-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-amber-700 block truncate">Awaiting Client Details</span>
          <span className="text-xl font-bold text-amber-900 mt-0.5 block">{awaitingDetailsCount}</span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-zinc-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-purple-700 block truncate">Ready to Publish</span>
          <span className="text-xl font-bold text-purple-900 mt-0.5 block">{readyToPublishCount}</span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-zinc-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-indigo-700 block truncate">Applications Open</span>
          <span className="text-xl font-bold text-indigo-900 mt-0.5 block">{applicationsOpenCount}</span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-zinc-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-blue-700 block truncate">Interns Required</span>
          <span className="text-xl font-bold text-blue-900 mt-0.5 block">{internsRequiredTotal}</span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-zinc-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-teal-700 block truncate">Interns Assigned</span>
          <span className="text-xl font-bold text-teal-900 mt-0.5 block">{internsAssignedTotal}</span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-zinc-200/80 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-medium text-emerald-700 block truncate">Completed This Month</span>
          <span className="text-xl font-bold text-emerald-900 mt-0.5 block">{completedThisMonthCount}</span>
        </div>
      </div>

      {/* FILTER BAR & SEARCH */}
      <div className="bg-white p-3.5 rounded-2xl border border-zinc-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Saved Views / Quick Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-zinc-100 rounded-xl overflow-x-auto">
            {(['All', 'Active', 'Action Needed', 'Completed'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === tab
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by Job ID, Role, Brand, Venue, Scope..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Expanded Filters Drawer */}
        {showFiltersDrawer && (
          <div className="pt-3 border-t border-zinc-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 animate-in fade-in duration-150">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-800"
              >
                <option value="All">All Statuses</option>
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Role</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-800"
              >
                <option value="All">All Roles</option>
                {NORMALIZED_ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Brand</label>
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-800"
              >
                <option value="All">All Brands</option>
                {uniqueBrands.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Location</label>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-800"
              >
                <option value="All">All Locations</option>
                {uniqueLocations.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Assignment</label>
              <select
                value={assignmentFilter}
                onChange={(e) => setAssignmentFilter(e.target.value as any)}
                className="w-full px-2.5 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-800"
              >
                <option value="All">All</option>
                <option value="Assigned">Fully / Partially Assigned</option>
                <option value="Unassigned">Unassigned Gigs</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Job Owner</label>
              <select
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-800"
              >
                <option value="All">All Owners</option>
                {uniqueOwners.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* JOB LIST TABLE (Section 5) */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 font-semibold select-none">
              <tr>
                <th
                  onClick={() => {
                    if (sortField === 'createdAt') setSortAsc(!sortAsc);
                    else {
                      setSortField('createdAt');
                      setSortAsc(false);
                    }
                  }}
                  className="py-3 px-3.5 cursor-pointer hover:text-zinc-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Job ID</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3">Role</th>
                <th
                  onClick={() => {
                    if (sortField === 'client') setSortAsc(!sortAsc);
                    else {
                      setSortField('client');
                      setSortAsc(true);
                    }
                  }}
                  className="py-3 px-3 cursor-pointer hover:text-zinc-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Brand / Client</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    if (sortField === 'dates') setSortAsc(!sortAsc);
                    else {
                      setSortField('dates');
                      setSortAsc(true);
                    }
                  }}
                  className="py-3 px-3 cursor-pointer hover:text-zinc-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Date</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3">Time</th>
                <th className="py-3 px-3">Location</th>
                <th className="py-3 px-2.5 text-center">Interns Needed</th>
                <th className="py-3 px-2.5 text-center">Applications</th>
                <th className="py-3 px-2.5 text-center">Assigned</th>
                <th
                  onClick={() => {
                    if (sortField === 'internPayment') setSortAsc(!sortAsc);
                    else {
                      setSortField('internPayment');
                      setSortAsc(false);
                    }
                  }}
                  className="py-3 px-3 text-right cursor-pointer hover:text-zinc-900"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Intern Pay</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Owner</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/60">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-zinc-400">
                    <Store className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
                    <p className="font-medium text-sm text-zinc-600">No Rent an Intern jobs found</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Use AI Create to paste a client brief, or click Manual Create.
                    </p>
                    <button
                      type="button"
                      onClick={onNavigateToAiForm}
                      className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Start AI Job Creation</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => {
                  const needed = Number(job.numberOfInterns) || 1;
                  const assignedCount = job.assignedInterns?.length || 0;
                  const isFullyAssigned = assignedCount >= needed;

                  return (
                    <tr
                      key={job.id}
                      onClick={() => setSelectedJob(job)}
                      className="hover:bg-zinc-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Job ID */}
                      <td className="py-3 px-3.5 font-mono font-bold text-zinc-900">
                        {job.jobId}
                      </td>

                      {/* Role */}
                      <td className="py-3 px-3">
                        <span className="font-semibold text-zinc-900 block truncate max-w-[140px]">
                          {job.normalizedRole || job.role}
                        </span>
                        {job.role && job.role !== job.normalizedRole && (
                          <span className="text-[10px] text-zinc-400 truncate block max-w-[140px]">
                            {job.role}
                          </span>
                        )}
                      </td>

                      {/* Brand / Client */}
                      <td className="py-3 px-3 font-medium text-zinc-800 truncate max-w-[140px]">
                        {job.client || '—'}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 text-zinc-700 whitespace-nowrap">
                        {job.dates && job.dates.length > 0 ? job.dates.join(', ') : '—'}
                      </td>

                      {/* Time */}
                      <td className="py-3 px-3 text-zinc-600 whitespace-nowrap font-mono text-[11px]">
                        {job.startTime && job.endTime ? `${job.startTime} - ${job.endTime}` : '—'}
                      </td>

                      {/* Location */}
                      <td className="py-3 px-3 text-zinc-600 truncate max-w-[150px]">
                        {[job.location?.venue, job.location?.area].filter(Boolean).join(', ') ||
                          job.location?.city ||
                          '—'}
                      </td>

                      {/* Interns Needed */}
                      <td className="py-3 px-2.5 text-center font-bold text-zinc-800">
                        {needed}
                      </td>

                      {/* Applications */}
                      <td className="py-3 px-2.5 text-center text-zinc-600">
                        {job.applicationsCount || 0}
                      </td>

                      {/* Assigned */}
                      <td className="py-3 px-2.5 text-center">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                            isFullyAssigned
                              ? 'bg-emerald-100 text-emerald-800'
                              : assignedCount > 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-zinc-100 text-zinc-600'
                          }`}
                        >
                          {assignedCount} / {needed}
                        </span>
                      </td>

                      {/* Intern Payment */}
                      <td className="py-3 px-3 text-right font-bold text-zinc-900 font-mono">
                        ₹{(job.internPayment || 0).toLocaleString('en-IN')}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] border whitespace-nowrap ${getStatusBadge(
                            job.status
                          )}`}
                        >
                          {job.status}
                        </span>
                      </td>

                      {/* Owner */}
                      <td className="py-3 px-3 text-zinc-500 text-[11px] truncate max-w-[100px]">
                        {job.jobOwner || 'Ops'}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedJob(job);
                          }}
                          className="p-1 rounded-lg text-zinc-400 group-hover:text-zinc-900 group-hover:bg-zinc-200/60 transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MANUAL JOB CREATION MODAL (Section 6) */}
      {isManualModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs"
          onClick={() => setIsManualModalOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Manual Create Rent an Intern Job</h3>
                <p className="text-xs text-zinc-500">Enter gig details directly without AI brief parsing</p>
              </div>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="w-7 h-7 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualCreateSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Brand / Client Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ITC Sonar, Myntra, Cafe Coffee Day"
                    value={manualForm.client}
                    onChange={(e) => setManualForm({ ...manualForm, client: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Role Category</label>
                  <select
                    value={manualForm.normalizedRole}
                    onChange={(e) =>
                      setManualForm({
                        ...manualForm,
                        normalizedRole: e.target.value as NormalizedRole,
                        role: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900"
                  >
                    {NORMALIZED_ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Interns Needed</label>
                  <input
                    type="number"
                    min={1}
                    value={manualForm.numberOfInterns}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, numberOfInterns: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Start Time</label>
                  <input
                    type="text"
                    placeholder="02:00 PM"
                    value={manualForm.startTime}
                    onChange={(e) => setManualForm({ ...manualForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">End Time</label>
                  <input
                    type="text"
                    placeholder="06:00 PM"
                    value={manualForm.endTime}
                    onChange={(e) => setManualForm({ ...manualForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Venue / Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Taj Bengal, Alipore"
                    value={manualForm.location?.venue}
                    onChange={(e) =>
                      setManualForm({
                        ...manualForm,
                        location: { ...manualForm.location!, venue: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Date</label>
                  <input
                    type="text"
                    placeholder="e.g. 28-Sep or Tomorrow"
                    value={manualForm.dates?.[0] || ''}
                    onChange={(e) => setManualForm({ ...manualForm, dates: [e.target.value] })}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Primary Scope / Duties</label>
                <textarea
                  rows={2}
                  placeholder="Describe main tasks..."
                  value={manualForm.primaryTask}
                  onChange={(e) => setManualForm({ ...manualForm, primaryTask: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Intern Payout (₹)</label>
                  <input
                    type="number"
                    step={100}
                    value={manualForm.internPayment}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, internPayment: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Client Commercial (₹)</label>
                  <input
                    type="number"
                    step={100}
                    value={manualForm.clientCommercial}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, clientCommercial: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl shadow-xs cursor-pointer"
                >
                  Save to RAI Shop
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JOB DETAIL DRAWER (Section 5) */}
      {selectedJob && (
        <JobDetailDrawer
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onStatusChange={async (newStatus) => {
            await updateRentInternJob(selectedJob.id, { status: newStatus });
            setSelectedJob({ ...selectedJob, status: newStatus });
            showToast(`Status updated to ${newStatus}`);
          }}
          onDelete={async () => {
            await deleteRentInternJob(selectedJob.id);
            setSelectedJob(null);
            showToast(`Job ${selectedJob.jobId} deleted`);
          }}
        />
      )}
    </div>
  );
};
