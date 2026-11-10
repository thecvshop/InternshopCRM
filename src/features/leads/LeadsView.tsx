import React, { useState, useMemo } from 'react';
import {
  Search,
  UserCheck,
  Phone,
  Mail,
  Plus,
  ExternalLink,
  FileText,
  Eye,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  MessageCircle,
  MapPin,
  Check,
  Sparkles,
  FileSpreadsheet,
  GraduationCap,
  Users,
  CheckSquare,
  Square,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Trash2,
} from 'lucide-react';
import { Lead, LeadStatus, Student, TrainingBatch, LEAD_STATUS_OPTIONS, resolveLeadStatus } from '../../types/crm';
import { convertLeadToStudent, updateLead, deleteLead } from '../../services/firestoreService';
import { LeadDetailsSection } from './LeadDetailsSection';
import { LeadAllDataModal } from './LeadAllDataModal';
import { GoogleSheetsSyncModal } from './GoogleSheetsSyncModal';
import { ShiftToBatchModal } from './ShiftToBatchModal';
import { LeadDuplicatesModal } from './LeadDuplicatesModal';
import { detectDuplicates } from '../../utils/duplicateDetection';

// Clean, un-truncated display names for status pills and dropdowns
export const STATUS_DISPLAY_NAME: Record<string, string> = {
  'In Review': 'In Review',
  'Task Submission': 'Task Submission',
  'Approved for IS': 'Approved for IS',
  'Reject': 'Reject',
  'Training Period': 'Approved for IS',
  'Community Interview Left': 'In Review',
  'Waiting for Batch Allotment': 'Task Submission',
  'Portfolio Underway': 'Approved for IS',
  'Just here for Community': 'In Review',
  'Busy With Something Else': 'In Review',
  'Closed Enquiry': 'Reject',
  'Rent an Intern': 'Approved for IS',
  'Placed': 'Approved for IS',
  'Rejected': 'Reject',
};

interface LeadsViewProps {
  leads: Lead[];
  batches?: TrainingBatch[];
  onOpenQuickCreate: () => void;
  onStudentCreated: (student: Student) => void;
  onNavigateToTraining?: () => void;
}

export const LeadsView: React.FC<LeadsViewProps> = ({
  leads,
  batches = [],
  onOpenQuickCreate,
  onStudentCreated,
  onNavigateToTraining,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [expandedLeadIds, setExpandedLeadIds] = useState<Set<string>>(new Set());
  const [selectedLeadForModal, setSelectedLeadForModal] = useState<Lead | null>(null);
  const [isSheetsSyncOpen, setIsSheetsSyncOpen] = useState(false);

  // Shift to Training Batch State
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [shiftModalLeads, setShiftModalLeads] = useState<Lead[]>([]);
  const [shiftSuccessBanner, setShiftSuccessBanner] = useState<string | null>(null);

  // Event & Source Filters (Section 15)
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [eventStatusFilter, setEventStatusFilter] = useState<string>('all');

  // Duplicate detection state
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);

  // Compute duplicate clusters in leads
  const duplicateData = useMemo(() => {
    return detectDuplicates<Lead>(leads, (l: Lead) => ({
      name: l.name,
      email: l.email,
      phone: l.phone,
    }));
  }, [leads]);

  // Unique events present in leads
  const availableEvents = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.eventName) set.add(l.eventName);
      if (l.source === 'InternsHome Event' && l.sourceDetail) set.add(l.sourceDetail);
    });
    return Array.from(set);
  }, [leads]);

  // Dynamic sources breakdown with count
  const availableSources = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach((l) => {
      const src = l.source || 'Other';
      counts[src] = (counts[src] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [leads]);

  // Status counts for quick filter chips
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: leads.length };
    leads.forEach((l) => {
      const st = resolveLeadStatus(l.status, l.notes);
      counts[st] = (counts[st] || 0) + 1;
    });
    return counts;
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      // Duplicate filter
      if (showDuplicatesOnly && !duplicateData.duplicateIdMap.has(l.id)) {
        return false;
      }

      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        l.name.toLowerCase().includes(q) ||
        l.leadId.toLowerCase().includes(q) ||
        l.college.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        (l.phone && l.phone.includes(q)) ||
        (l.city && l.city.toLowerCase().includes(q)) ||
        (l.interestArea && l.interestArea.toLowerCase().includes(q)) ||
        (l.eventName && l.eventName.toLowerCase().includes(q));

      const leadCurrentStatus = resolveLeadStatus(l.status, l.notes);
      const matchesStatus = statusFilter === 'all' || leadCurrentStatus === statusFilter;

      // Section 15 Filters
      const matchesSource =
        sourceFilter === 'all' ||
        l.source === sourceFilter ||
        (sourceFilter === 'InternsHome Event' && (l.source === 'InternsHome Event' || l.externalSource === 'Luma'));

      const matchesEvent =
        eventFilter === 'all' ||
        l.eventName === eventFilter ||
        l.sourceDetail === eventFilter;

      const matchesEventStatus =
        eventStatusFilter === 'all' ||
        l.eventStatus === eventStatusFilter ||
        (!l.eventStatus && eventStatusFilter === 'Registered' && (l.source === 'InternsHome Event' || l.externalSource === 'Luma'));

      return matchesSearch && matchesStatus && matchesSource && matchesEvent && matchesEventStatus;
    });
  }, [leads, search, statusFilter, sourceFilter, eventFilter, eventStatusFilter]);

  const toggleExpand = (id: string) => {
    setExpandedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedLeadIds(new Set(filteredLeads.map((l) => l.id)));
  };

  const collapseAll = () => {
    setExpandedLeadIds(new Set());
  };

  const handleToggleSelectLead = (id: string) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    if (selectedLeadIds.size === filteredLeads.length && filteredLeads.length > 0) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(filteredLeads.map((l) => l.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedLeadIds(new Set());
  };

  const handleOpenShiftSingle = (lead: Lead) => {
    setShiftModalLeads([lead]);
    setIsShiftModalOpen(true);
  };

  const handleOpenShiftBulk = () => {
    const targets = leads.filter((l) => selectedLeadIds.has(l.id));
    if (targets.length === 0) return;
    setShiftModalLeads(targets);
    setIsShiftModalOpen(true);
  };

  const handleShiftSuccess = (createdStudents: Student[], batchName: string) => {
    if (createdStudents.length > 0) {
      onStudentCreated(createdStudents[0]);
    }
    const count = createdStudents.length;
    setSelectedLeadIds(new Set());
    setShiftSuccessBanner(
      `✓ Successfully shifted ${count} candidate${count > 1 ? 's' : ''} into ${batchName} and enrolled in Student Directory. Removed from Leads.`
    );
    setTimeout(() => {
      setShiftSuccessBanner(null);
    }, 7000);
  };

  const handleConvert = async (lead: Lead) => {
    if (confirm(`Convert lead "${lead.name}" (${lead.college}) into an enrolled Student?`)) {
      setConvertingId(lead.id);
      try {
        const student = await convertLeadToStudent(lead, 'Admissions Officer');
        await updateLead(lead.id, { status: 'Approved for IS' });
        onStudentCreated(student);
      } catch (err) {
        console.error('Lead conversion failed:', err);
        alert('Failed to convert lead: ' + err);
      } finally {
        setConvertingId(null);
      }
    }
  };

  const handleStatusChange = async (id: string, newStatus: LeadStatus) => {
    await updateLead(id, { status: newStatus });
  };

  const getStatusStyle = (st: LeadStatus) => {
    switch (st) {
      case 'In Review':
      case 'Community Interview Left':
      case 'Busy With Something Else':
      case 'Just here for Community':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Task Submission':
      case 'Waiting for Batch Allotment':
        return 'bg-sky-50 text-sky-800 border-sky-200';
      case 'Approved for IS':
      case 'Training Period':
      case 'Portfolio Underway':
      case 'Placed':
      case 'Rent an Intern':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Reject':
      case 'Rejected':
      case 'Closed Enquiry':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-zinc-50 text-zinc-700 border-zinc-200';
    }
  };

  const topStatusPills: { label: string; value: string; count: number }[] = [
    { label: 'All Leads', value: 'all', count: statusCounts['all'] || 0 },
    {
      label: 'In Review',
      value: 'In Review',
      count: statusCounts['In Review'] || 0,
    },
    {
      label: 'Task Submission',
      value: 'Task Submission',
      count: statusCounts['Task Submission'] || 0,
    },
    {
      label: 'Approved for IS',
      value: 'Approved for IS',
      count: statusCounts['Approved for IS'] || 0,
    },
    {
      label: 'Reject',
      value: 'Reject',
      count: statusCounts['Reject'] || 0,
    },
  ];

  return (
    <div className="space-y-3.5">
      {/* Quick Status Chips Header */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {topStatusPills.map((pill) => (
          <button
            key={pill.value}
            onClick={() => setStatusFilter(pill.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 border ${
              statusFilter === pill.value
                ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900'
            }`}
          >
            <span>{pill.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                statusFilter === pill.value
                  ? 'bg-white/20 text-white'
                  : 'bg-zinc-100 text-zinc-600'
              }`}
            >
              {pill.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filter & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-zinc-200/80 shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, college, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-zinc-200 rounded-lg px-2.5 py-1.5 bg-white text-zinc-700 cursor-pointer focus:outline-none font-medium"
          >
            <option value="all">All Stages ({leads.length})</option>
            {LEAD_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status} ({statusCounts[status] || 0})
              </option>
            ))}
          </select>

          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="text-xs border border-zinc-200 rounded-lg px-2.5 py-1.5 bg-white text-zinc-700 cursor-pointer focus:outline-none font-medium max-w-[190px] truncate"
          >
            <option value="all">All Sources ({leads.length})</option>
            {availableSources.map(([src, count]) => (
              <option key={src} value={src}>
                {src} ({count})
              </option>
            ))}
          </select>

          {/* Event Filter (Section 15) */}
          {availableEvents.length > 0 && (
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="text-xs border border-zinc-200 rounded-lg px-2.5 py-1.5 bg-white text-zinc-700 cursor-pointer focus:outline-none font-medium max-w-[170px] truncate"
            >
              <option value="all">All Events ({availableEvents.length})</option>
              {availableEvents.map((ev) => (
                <option key={ev} value={ev}>
                  {ev}
                </option>
              ))}
            </select>
          )}

          {/* Event Status Filter (Section 15) */}
          {(sourceFilter === 'InternsHome Event' || eventFilter !== 'all') && (
            <select
              value={eventStatusFilter}
              onChange={(e) => setEventStatusFilter(e.target.value)}
              className="text-xs border border-zinc-200 rounded-lg px-2.5 py-1.5 bg-white text-zinc-700 cursor-pointer focus:outline-none font-medium"
            >
              <option value="all">All Event Statuses</option>
              <option value="Registered">Registered</option>
              <option value="Attended">Attended</option>
              <option value="Did Not Attend">Did Not Attend</option>
            </select>
          )}

          <div className="flex items-center gap-1 border-l border-zinc-200 pl-2">
            <button
              onClick={expandedLeadIds.size > 0 ? collapseAll : expandAll}
              className="px-2.5 py-1.5 text-[11px] font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition cursor-pointer flex items-center gap-1 border border-zinc-200"
              title="Toggle inline row expansions"
            >
              <ChevronsUpDown className="w-3 h-3 text-zinc-400" />
              <span>{expandedLeadIds.size > 0 ? 'Collapse All' : 'Expand All'}</span>
            </button>
            <span className="text-[11px] text-zinc-400 font-medium px-1.5 whitespace-nowrap">
              {filteredLeads.length} leads
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto flex-wrap">
          {/* Duplicate Identification & Cleanup Action */}
          {duplicateData.totalDuplicateCount > 0 ? (
            <button
              type="button"
              onClick={() => setShowDuplicatesModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs select-none whitespace-nowrap"
              title="Identify and remove duplicate lead inquiries"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Identify Duplicates ({duplicateData.totalDuplicateCount})</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowDuplicatesModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-lg text-xs font-medium transition cursor-pointer border border-zinc-200 whitespace-nowrap"
              title="Scan leads for duplicate inquiries"
            >
              <Copy className="w-3.5 h-3.5 text-zinc-400" />
              <span>Check Duplicates</span>
            </button>
          )}

          {duplicateData.totalDuplicateCount > 0 && (
            <button
              type="button"
              onClick={() => setShowDuplicatesOnly(!showDuplicatesOnly)}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                showDuplicatesOnly
                  ? 'bg-amber-100 border-amber-300 text-amber-900 ring-2 ring-amber-400/30'
                  : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
              }`}
              title="Filter view to only show duplicate leads"
            >
              <span>{showDuplicatesOnly ? 'Duplicates Only' : 'Filter Duplicates'}</span>
              <span className="font-mono text-[10px] bg-amber-200 text-amber-900 px-1.5 rounded-full font-bold">
                {duplicateData.duplicateIdMap.size}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsSheetsSyncOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] touch-manipulation text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-xs select-none"
            title="Sync updated rows directly with Google Sheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Sync with Google Sheet</span>
          </button>

          <button
            type="button"
            onClick={onOpenQuickCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-semibold hover:bg-zinc-800 active:scale-[0.98] touch-manipulation transition cursor-pointer shadow-xs select-none"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Lead</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner for Shifting */}
      {shiftSuccessBanner && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-3.5 rounded-xl text-xs flex items-center justify-between gap-3 shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{shiftSuccessBanner}</span>
          </div>
          {onNavigateToTraining && (
            <button
              onClick={onNavigateToTraining}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>View in Training Batches &rarr;</span>
            </button>
          )}
        </div>
      )}

      {/* Floating Bulk Action Bar when candidates are selected */}
      {selectedLeadIds.size > 0 && (
        <div className="bg-zinc-900 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-[11px]">
              {selectedLeadIds.size}
            </span>
            <span>Candidates selected from Leads</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenShiftBulk}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Shift Selected ({selectedLeadIds.size}) to Training Batch</span>
            </button>
            <button
              onClick={handleClearSelection}
              className="px-2.5 py-1.5 text-xs text-zinc-400 hover:text-white transition cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* 5-Column Streamlined Table */}
      <div className="bg-white border border-zinc-200/80 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto pb-1">
          <table className="w-full text-left text-xs table-fixed min-w-[920px]">
            <colgroup>
              <col className="w-[24%]" />
              <col className="w-[18%]" />
              <col className="w-[17%]" />
              <col className="w-[17%]" />
              <col className="w-[24%]" />
            </colgroup>
            <thead className="bg-zinc-50/80 border-b border-zinc-200/80 text-zinc-500 font-semibold tracking-wide">
              <tr>
                <th className="py-3 px-3.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filteredLeads.length > 0 && selectedLeadIds.size === filteredLeads.length}
                      onChange={handleSelectAllFiltered}
                      className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer shrink-0"
                      title="Select all filtered leads"
                    />
                    <span>Candidate</span>
                  </div>
                </th>
                <th className="py-3 px-3.5">Contact Details</th>
                <th className="py-3 px-3.5">College & Education</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5 text-right whitespace-nowrap">Actions & Batch Shift</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredLeads.map((lead) => {
                const cvMatch = lead.notes?.match(/CV:\s*(https:\/\/[^\s]+)/);
                const cvLink = lead.cvUrl || (cvMatch ? cvMatch[1] : null);
                const currentStatus = resolveLeadStatus(lead.status, lead.notes);
                const isExpanded = expandedLeadIds.has(lead.id);
                const isSelected = selectedLeadIds.has(lead.id);
                const cleanPhone = lead.phone ? lead.phone.replace(/[^0-9]/g, '') : '';
                const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

                return (
                  <React.Fragment key={lead.id}>
                    <tr
                      className={`transition ${
                        isSelected
                          ? 'bg-emerald-50/40 font-medium'
                          : isExpanded
                          ? 'bg-zinc-50/80 font-medium'
                          : 'hover:bg-zinc-50/50'
                      }`}
                    >
                      {/* Column 1: Candidate (Checkbox, Name, ID, CV, Domain tag) */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectLead(lead.id)}
                            className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer shrink-0"
                          />

                          <button
                            type="button"
                            onClick={() => toggleExpand(lead.id)}
                            className="p-1 rounded-md hover:bg-zinc-200 text-zinc-400 hover:text-zinc-700 transition shrink-0"
                            title={isExpanded ? 'Collapse inline preview' : 'Expand inline preview'}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 text-zinc-700" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <div
                            onClick={() => setSelectedLeadForModal(lead)}
                            className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-xs shrink-0 cursor-pointer shadow-2xs hover:scale-105 transition"
                            title="Click to view all data"
                          >
                            {lead.name
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div
                              onClick={() => setSelectedLeadForModal(lead)}
                              className="font-bold text-zinc-900 text-xs truncate hover:text-indigo-600 transition cursor-pointer"
                              title={`${lead.name} (Click for all data)`}
                            >
                              {lead.name}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 min-w-0 flex-wrap">
                              <span className="text-[10px] font-mono text-zinc-400 whitespace-nowrap shrink-0">
                                {lead.leadId}
                              </span>
                              {duplicateData.duplicateIdMap.has(lead.id) && (
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowDuplicatesModal(true);
                                  }}
                                  className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded hover:bg-amber-200 transition cursor-pointer shrink-0"
                                  title={duplicateData.duplicateIdMap.get(lead.id)?.join(', ')}
                                >
                                  <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                                  <span>Duplicate</span>
                                </span>
                              )}
                              {(lead.source === 'InternsHome Event' || lead.externalSource === 'Luma') && (
                                <span
                                  className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded shrink-0"
                                  title={`Luma Event: ${lead.eventName || lead.sourceDetail || 'Community Event'}`}
                                >
                                  <Sparkles className="w-2.5 h-2.5 text-rose-500" />
                                  <span>Luma Event</span>
                                </span>
                              )}
                              {cvLink && (
                                <a
                                  href={cvLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-0.5 text-[9px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 py-0.2 rounded font-semibold hover:bg-indigo-100 transition whitespace-nowrap shrink-0"
                                  title="Open Submitted CV"
                                >
                                  <FileText className="w-2.5 h-2.5" />
                                  <span>CV</span>
                                  <ExternalLink className="w-2 h-2" />
                                </a>
                              )}
                              {lead.interestArea && (
                                <span
                                  className="text-[9px] text-zinc-500 bg-zinc-100 px-1.5 py-0.2 rounded truncate max-w-[110px]"
                                  title={lead.interestArea}
                                >
                                  {lead.interestArea}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Contact Details (Email, Phone, WhatsApp) */}
                      <td className="py-3 px-3.5">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5 text-zinc-700 min-w-0">
                            <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <a
                              href={`mailto:${lead.email}`}
                              className="truncate text-xs hover:text-zinc-900 hover:underline"
                              title={lead.email}
                            >
                              {lead.email}
                            </a>
                          </div>

                          <div className="flex items-center gap-1.5 text-zinc-500 min-w-0">
                            <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span className="font-mono text-[11px] whitespace-nowrap">{lead.phone || 'N/A'}</span>
                            {lead.phone && (
                              <a
                                href={`https://wa.me/${waPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-1.5 py-0.2 rounded font-semibold transition whitespace-nowrap ml-0.5 shrink-0"
                                title="Chat on WhatsApp"
                              >
                                <MessageCircle className="w-2.5 h-2.5" />
                                <span>WA</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Column 3: College & Education */}
                      <td className="py-3 px-3.5">
                        <div className="min-w-0">
                          <span
                            className="font-medium text-zinc-900 block truncate text-xs"
                            title={lead.college}
                          >
                            {lead.college || 'Not specified'}
                          </span>
                          <span
                            className="text-[10px] text-zinc-400 block truncate mt-0.5"
                            title={`${lead.course || 'Undergraduate'} ${lead.graduationYear ? `• ${lead.graduationYear}` : ''}`}
                          >
                            {lead.course || 'Undergraduate'} {lead.graduationYear ? `• ${lead.graduationYear}` : ''}
                          </span>
                        </div>
                      </td>

                      {/* Column 4: Status (Clean Interactive Dropdown with un-truncated labels) */}
                      <td className="py-3 px-3.5">
                        <div className="relative inline-flex items-center w-full max-w-[146px]">
                          <select
                            value={currentStatus}
                            onChange={(e) => handleStatusChange(lead.id, e.target.value as LeadStatus)}
                            className={`text-xs font-semibold rounded-lg pl-2.5 pr-6 py-1.5 cursor-pointer focus:outline-none border shadow-2xs w-full appearance-none transition ${getStatusStyle(
                              currentStatus
                            )}`}
                            title={`Status: ${currentStatus}`}
                          >
                            {LEAD_STATUS_OPTIONS.map((status) => (
                              <option key={status} value={status} className="bg-white text-zinc-900 font-normal">
                                {STATUS_DISPLAY_NAME[status] || status}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-zinc-500 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
                        </div>
                      </td>

                      {/* Column 5: Actions & Batch Shift */}
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                          {/* Shift to Batch Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenShiftSingle(lead)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-2xs shrink-0 whitespace-nowrap"
                            title="Shift candidate into Training Batch and remove from leads"
                          >
                            <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                            <span>Shift to Batch</span>
                          </button>

                          <button
                            onClick={() => setSelectedLeadForModal(lead)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-2xs shrink-0 whitespace-nowrap"
                            title="View all application parameters in dedicated tab"
                          >
                            <Eye className="w-3.5 h-3.5 shrink-0" />
                            <span>View</span>
                          </button>

                          {duplicateData.duplicateIdMap.has(lead.id) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Remove duplicate lead "${lead.name}" (${lead.leadId})?`)) {
                                  deleteLead(lead.id, lead.name);
                                }
                              }}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer shrink-0"
                              title="Delete duplicate lead inquiry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Inline Section (colSpan=5) */}
                    {isExpanded && (
                      <tr key={`${lead.id}-details`}>
                        <td colSpan={5} className="p-0 border-b border-zinc-200/90">
                          <LeadDetailsSection
                            lead={lead}
                            currentStatus={currentStatus}
                            onStatusChange={handleStatusChange}
                            onConvert={handleConvert}
                            onShiftToBatch={() => handleOpenShiftSingle(lead)}
                            isConverting={convertingId === lead.id}
                            onClose={() => toggleExpand(lead.id)}
                            onOpenModal={() => setSelectedLeadForModal(lead)}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-400 text-xs">
                    No leads match the selected filters or search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shift to Training Batch Modal */}
      <ShiftToBatchModal
        leads={shiftModalLeads}
        batches={batches}
        isOpen={isShiftModalOpen}
        onClose={() => {
          setIsShiftModalOpen(false);
          setShiftModalLeads([]);
        }}
        onSuccess={handleShiftSuccess}
      />

      {/* Comprehensive "View All Data" Modal */}
      <LeadAllDataModal
        lead={selectedLeadForModal}
        isOpen={Boolean(selectedLeadForModal)}
        onClose={() => setSelectedLeadForModal(null)}
        onStatusChange={handleStatusChange}
        onConvert={handleConvert}
        onShiftToBatch={(lead) => handleOpenShiftSingle(lead)}
        isConverting={convertingId === selectedLeadForModal?.id}
      />

      {/* Google Sheets Live Parity Sync Modal */}
      <GoogleSheetsSyncModal
        isOpen={isSheetsSyncOpen}
        onClose={() => setIsSheetsSyncOpen(false)}
        leads={leads}
      />

      {/* Duplicate Identification & Cleanup Modal */}
      <LeadDuplicatesModal
        isOpen={showDuplicatesModal}
        onClose={() => setShowDuplicatesModal(false)}
        groups={duplicateData.groups}
        totalDuplicateCount={duplicateData.totalDuplicateCount}
        totalLeads={leads.length}
        onSelectLead={(lead) => setSelectedLeadForModal(lead)}
      />
    </div>
  );
};
