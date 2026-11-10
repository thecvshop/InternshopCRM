import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  Users,
  Calendar,
  Plus,
  ExternalLink,
  Search,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  MessageCircle,
  FileText,
  UserCheck,
  ChevronRight,
  Filter,
  ArrowRight,
  Sparkles,
  Award,
  Layers,
  Check,
  X,
  Trash2,
  BookOpen,
  Pencil,
  PenTool,
} from 'lucide-react';
import { TrainingBatch, Student, Lead } from '../../types/crm';
import {
  addTrainingBatch,
  updateTrainingBatch,
  deleteTrainingBatch,
  enrollStudentInBatch,
  removeStudentFromBatch,
  shiftLeadToTrainingBatch,
  updateStudent,
} from '../../services/firestoreService';
import { Badge } from '../../components/common/Badge';
import { EditBatchModal } from './EditBatchModal';
import { CommitmentAgreementModal } from '../agreements/CommitmentAgreementModal';
import {
  getBatchDisplayTitle,
  sortBatchesDescending,
  formatCohortDateRange,
} from '../../utils/batchUtils';

interface TrainingViewProps {
  batches: TrainingBatch[];
  students: Student[];
  leads?: Lead[];
  onSelectStudent?: (student: Student) => void;
  onNavigateToStudents?: () => void;
}

export const TrainingView: React.FC<TrainingViewProps> = ({
  batches,
  students,
  leads = [],
  onSelectStudent,
  onNavigateToStudents,
}) => {
  // Sorted cohorts strictly in logical order (Batch 5 -> Batch 4 -> Batch 3 -> Batch 2 -> Batch 1)
  const orderedBatches = useMemo(() => {
    return sortBatchesDescending(batches);
  }, [batches]);

  // Active batch selection
  const [selectedBatchId, setSelectedBatchId] = useState<string>(
    orderedBatches.length > 0 ? orderedBatches[0].id : ''
  );
  const [agreementModalStudent, setAgreementModalStudent] = useState<Student | null>(null);

  // Active batch object
  const activeBatch = useMemo(() => {
    return orderedBatches.find((b) => b.id === selectedBatchId) || orderedBatches[0] || null;
  }, [orderedBatches, selectedBatchId]);

  // Derive students in the active batch
  const batchStudents = useMemo(() => {
    if (!activeBatch) return [];
    const enrolledSet = new Set(activeBatch.enrolledStudents || []);
    const batchNameLower = activeBatch.name.toLowerCase().trim();
    const batchIdLower = activeBatch.id.toLowerCase();
    const batchCodeLower = (activeBatch.batchId || '').toLowerCase();

    return students.filter((s) => {
      // 1. Direct ID match in batch.enrolledStudents
      if (enrolledSet.has(s.id)) return true;

      // 2. Direct student.batchId match
      if (
        s.batchId &&
        (s.batchId === activeBatch.id ||
          s.batchId === activeBatch.batchId ||
          s.batchId.toLowerCase() === batchIdLower)
      ) {
        return true;
      }

      // 3. Batch number match e.g. "Batch 1", "Batch 2", "Batch 3", "Batch 4", "Batch 5"
      if (s.batchName) {
        const sBatchLower = s.batchName.toLowerCase().trim();
        if (batchNameLower.includes(sBatchLower) || sBatchLower.includes(batchNameLower)) {
          return true;
        }
        const batchNumMatch = activeBatch.name.match(/batch\s*(\d+)/i);
        const studentNumMatch = s.batchName.match(/batch\s*(\d+)/i);
        if (batchNumMatch && studentNumMatch && batchNumMatch[1] === studentNumMatch[1]) {
          return true;
        }
      }

      return false;
    });
  }, [activeBatch, students]);

  // Selected students in the picture row (for filtering main table)
  const [selectedStudentIdsInRow, setSelectedStudentIdsInRow] = useState<Set<string>>(new Set());

  // Search query within the main table
  const [tableSearch, setTableSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<'all' | 'in_training' | 'trained'>('all');

  // Modals
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [showEditBatchModal, setShowEditBatchModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState<TrainingBatch | null>(null);
  const [showShiftLeadModal, setShowShiftLeadModal] = useState(false);
  const [selectedLeadsToShift, setSelectedLeadsToShift] = useState<Set<string>>(new Set());
  const [isShiftingLeads, setIsShiftingLeads] = useState(false);
  const [leadShiftSearch, setLeadShiftSearch] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  const handleOpenEditBatch = (batch: TrainingBatch) => {
    setEditingBatch(batch);
    setShowEditBatchModal(true);
  };

  // New batch form state
  const [batchForm, setBatchForm] = useState({
    name: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 86400000 * 45).toISOString().split('T')[0],
    capacity: 30,
    sessionsCount: 14,
    whatsappGroup: '',
  });

  // Toggle selection of a student card in the picture row
  const handleToggleSelectStudent = (studentId: string) => {
    setSelectedStudentIdsInRow((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  // Select all or clear selection in picture row
  const handleSelectAllInRow = () => {
    if (selectedStudentIdsInRow.size === batchStudents.length && batchStudents.length > 0) {
      setSelectedStudentIdsInRow(new Set());
    } else {
      setSelectedStudentIdsInRow(new Set(batchStudents.map((s) => s.id)));
    }
  };

  const handleClearRowSelection = () => {
    setSelectedStudentIdsInRow(new Set());
  };

  // Filtered rows for the main table:
  // "and the main table will have rows from the above selection manner"
  const tableDisplayStudents = useMemo(() => {
    let list = batchStudents;

    // Filter by picture row selection if user selected any candidates
    if (selectedStudentIdsInRow.size > 0) {
      list = list.filter((s) => selectedStudentIdsInRow.has(s.id));
    }

    // Filter by stage
    if (stageFilter === 'in_training') {
      list = list.filter((s) => s.currentStage === 'In Training' || s.currentStage === 'Training Period');
    } else if (stageFilter === 'trained') {
      list = list.filter((s) => s.currentStage === 'Trained / To Be Placed' || s.currentStage === 'Interview Ready');
    }

    // Search query
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.studentId.toLowerCase().includes(q) ||
          s.college.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          (s.phone && s.phone.includes(q)) ||
          (s.skills && s.skills.some((sk) => sk.toLowerCase().includes(q)))
      );
    }

    return list;
  }, [batchStudents, selectedStudentIdsInRow, stageFilter, tableSearch]);

  // Handle stage change directly from table
  const handleStudentStageChange = async (student: Student, newStage: string) => {
    try {
      await updateStudent(student.id, {
        currentStage: newStage as any,
        placementReadiness: newStage.includes('Trained') || newStage.includes('Interview') ? 'Interview Ready' : 'In Training',
      });
      showNotice(`Updated stage for ${student.name} to "${newStage}"`);
    } catch (err) {
      console.error('Failed to update stage:', err);
    }
  };

  // Handle remove student from batch
  const handleRemoveFromBatch = async (student: Student) => {
    if (!activeBatch) return;
    if (confirm(`Remove ${student.name} from ${activeBatch.name}?`)) {
      try {
        await removeStudentFromBatch(activeBatch.id, student.id);
        showNotice(`Removed ${student.name} from ${activeBatch.name}`);
      } catch (err) {
        console.error('Failed to remove from batch:', err);
      }
    }
  };

  // Shift selected leads into active batch
  const handleShiftSelectedLeads = async () => {
    if (!activeBatch || selectedLeadsToShift.size === 0) return;
    setIsShiftingLeads(true);

    try {
      const leadsToProcess = leads.filter((l) => selectedLeadsToShift.has(l.id));
      for (const lead of leadsToProcess) {
        await shiftLeadToTrainingBatch({
          lead,
          batchId: activeBatch.id,
          batchName: activeBatch.name,
        });
      }

      showNotice(
        `✓ Shifted ${leadsToProcess.length} candidate${leadsToProcess.length > 1 ? 's' : ''} from Leads into ${activeBatch.name} and added to Student Directory!`
      );
      setSelectedLeadsToShift(new Set());
      setShowShiftLeadModal(false);
    } catch (err: any) {
      console.error('Failed to shift leads:', err);
      alert('Error shifting leads: ' + err.message);
    } finally {
      setIsShiftingLeads(false);
    }
  };

  // Create Batch
  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchForm.name.trim()) return;

    try {
      const batchCode = `TB-${new Date().getFullYear()}-${Math.floor(10 + Math.random() * 90)}`;
      const created = await addTrainingBatch({
        batchId: batchCode,
        name: batchForm.name.trim(),
        startDate: batchForm.startDate,
        endDate: batchForm.endDate,
        capacity: Number(batchForm.capacity) || 30,
        enrolledStudents: [],
        status: 'Active',
        sessionsCount: Number(batchForm.sessionsCount) || 14,
        whatsappGroup: batchForm.whatsappGroup.trim() || undefined,
      });

      setSelectedBatchId(created.id);
      setShowAddBatchModal(false);
      setBatchForm({
        name: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 86400000 * 45).toISOString().split('T')[0],
        capacity: 30,
        sessionsCount: 14,
        whatsappGroup: '',
      });
      showNotice(`✓ Created training batch: ${created.name}`);
    } catch (err: any) {
      console.error('Error creating batch:', err);
    }
  };

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 5000);
  };

  // Leads available to shift into active batch
  const filteredLeadsToShift = useMemo(() => {
    return leads.filter((l) => {
      const q = leadShiftSearch.toLowerCase();
      const matchSearch =
        !q ||
        l.name.toLowerCase().includes(q) ||
        l.college.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        (l.interestArea && l.interestArea.toLowerCase().includes(q));
      return matchSearch;
    });
  }, [leads, leadShiftSearch]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-emerald-600" />
              <span>Training Batches & Cohort Creation</span>
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
              {batches.length} Batches
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1 max-w-2xl leading-relaxed">
            Select any batch to view its candidate gallery row, filter enrolled students in the main table, and seamlessly shift applicants from the Leads section into active training.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Shift candidates from leads button */}
          <button
            onClick={() => setShowShiftLeadModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs"
            title="Enroll unbatched leads directly into active batch"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Shift from Leads ({leads.length})</span>
          </button>

          {/* New batch button */}
          <button
            onClick={() => setShowAddBatchModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 active:scale-[0.98] transition cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Training Batch</span>
          </button>
        </div>
      </div>

      {/* Notification Toast Banner */}
      {notification && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-3.5 rounded-xl text-xs flex items-center justify-between gap-3 shadow-2xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notification}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. BATCHES SELECTOR TABS & CAROUSEL                      */}
      {/* ======================================================== */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block">
            Select Active Batch Cohort
          </span>
          <span className="text-xs text-zinc-500 font-medium">
            Active: <strong className="text-zinc-900">{activeBatch ? getBatchDisplayTitle(activeBatch) : 'None'}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {orderedBatches.map((b) => {
            const isSelected = activeBatch?.id === b.id;
            const bStudents = students.filter(
              (s) =>
                (b.enrolledStudents && b.enrolledStudents.includes(s.id)) ||
                s.batchId === b.id ||
                s.batchId === b.batchId ||
                (s.batchName && b.name.toLowerCase().includes(s.batchName.toLowerCase()))
            );

            return (
              <div
                key={b.id}
                onClick={() => {
                  setSelectedBatchId(b.id);
                  setSelectedStudentIdsInRow(new Set());
                }}
                className={`rounded-2xl p-4.5 border-2 transition-all cursor-pointer relative shadow-2xs flex flex-col justify-between group bg-white ${
                  isSelected
                    ? 'border-zinc-900 shadow-md ring-2 ring-zinc-900/10'
                    : 'border-zinc-200 hover:border-zinc-400 hover:shadow-xs'
                }`}
              >
                <div>
                  {/* Top Bar: Code & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-medium text-zinc-500">
                      {b.batchId}
                    </span>

                    <Badge
                      variant={
                        b.status === 'Active'
                          ? 'green'
                          : b.status === 'Upcoming'
                          ? 'blue'
                          : 'neutral'
                      }
                    >
                      {b.status}
                    </Badge>
                  </div>

                  {/* Batch Title: Clean Batch (Number) e.g. Batch 5 */}
                  <h3 className="font-bold text-lg text-zinc-900 mt-2 tracking-tight">
                    {getBatchDisplayTitle(b)}
                  </h3>

                  {/* Redesigned Clean Batch Details & Progress */}
                  <div className="mt-3.5 space-y-2.5">
                    {/* Enrollment progress bar (Non-wrapping) */}
                    <div className="bg-zinc-50/90 rounded-xl p-3 border border-zinc-100 space-y-1.5">
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="text-[11px] font-semibold text-zinc-500 flex items-center gap-1.5 shrink-0">
                          <Users className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span>Enrollment</span>
                        </span>
                        <span className="font-mono text-xs font-bold text-zinc-900 whitespace-nowrap">
                          {bStudents.length} <span className="font-normal text-zinc-400">/ {b.capacity} Students</span>
                        </span>
                      </div>
                      <div className="w-full bg-zinc-200/80 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isSelected ? 'bg-zinc-900' : 'bg-emerald-600'
                          }`}
                          style={{
                            width: `${Math.min(100, Math.round((bStudents.length / (b.capacity || 20)) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Schedule & Duration 2-Col Box (Formatted compact dates) */}
                    <div className="bg-zinc-50/90 rounded-xl p-2.5 border border-zinc-100 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-zinc-400 font-medium block flex items-center gap-1">
                          <Clock className="w-3 h-3 text-zinc-400 shrink-0" />
                          <span>Schedule</span>
                        </span>
                        <span className="font-bold text-xs text-zinc-800 mt-0.5 block truncate">
                          {b.sessionsCount || 14} Sessions
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-zinc-400 font-medium block flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-zinc-400 shrink-0" />
                          <span>Duration</span>
                        </span>
                        <span
                          className="font-medium text-[11px] text-zinc-700 mt-0.5 block truncate"
                          title={`${b.startDate} to ${b.endDate}`}
                        >
                          {formatCohortDateRange(b.startDate, b.endDate)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer: Single Edit button & Clear Cohort Selector */}
                <div className="mt-3.5 pt-3 border-t border-zinc-100 flex items-center justify-between gap-2 text-xs">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEditBatch(b);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 font-medium text-xs transition cursor-pointer shadow-2xs"
                    title="Edit Cohort"
                  >
                    <Pencil className="w-3 h-3 text-zinc-500" />
                    <span>Edit</span>
                  </button>

                  <div
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition select-none ${
                      isSelected
                        ? 'bg-zinc-900 text-white shadow-2xs'
                        : 'text-zinc-600 group-hover:text-zinc-900 bg-zinc-100 group-hover:bg-zinc-200'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Selected</span>
                      </>
                    ) : (
                      <span>Select Cohort</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Quick Create Batch Card in Grid */}
          <div
            onClick={() => setShowAddBatchModal(true)}
            className="rounded-2xl p-5 border-2 border-dashed border-zinc-200 hover:border-zinc-900 bg-zinc-50/50 hover:bg-zinc-50 transition-all cursor-pointer flex flex-col items-center justify-center text-center space-y-2 select-none group min-h-[220px]"
          >
            <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 group-hover:border-zinc-400 text-zinc-400 group-hover:text-zinc-900 flex items-center justify-center transition shadow-2xs">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-xs text-zinc-800 group-hover:text-zinc-900 block">
                Create New Batch
              </span>
              <span className="text-[10px] text-zinc-400">
                Add custom cohort curriculum
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. "A ROW WITH PICTURES OF ALL THE PEOPLE I SELECT IN     */}
      {/*    THAT BATCH" (INTERACTIVE CANDIDATE GALLERY ROW)       */}
      {/* ======================================================== */}
      {activeBatch && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs p-5 space-y-4">
          {/* Row Header & Selection Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <span>Enrolled Candidates in {getBatchDisplayTitle(activeBatch)}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {batchStudents.length} Candidates
                  </span>
                </h2>
                <p className="text-[11px] text-zinc-500">
                  Click on any candidate picture card to select and focus their record in the main table below.
                </p>
              </div>
            </div>

            {/* Header Actions & Selection Controls */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleOpenEditBatch(activeBatch)}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                title="Edit batch name, trainer, dates, sessions, or capacity"
              >
                <Pencil className="w-3.5 h-3.5 text-zinc-500" />
                <span>Edit Batch Details</span>
              </button>

              {selectedStudentIdsInRow.size > 0 && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                  {selectedStudentIdsInRow.size} Selected in Row
                </span>
              )}

              <button
                type="button"
                onClick={handleSelectAllInRow}
                className="px-2.5 py-1 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 font-semibold text-xs transition cursor-pointer"
              >
                {selectedStudentIdsInRow.size === batchStudents.length && batchStudents.length > 0
                  ? 'Deselect All'
                  : 'Select All in Row'}
              </button>

              {selectedStudentIdsInRow.size > 0 && (
                <button
                  type="button"
                  onClick={handleClearRowSelection}
                  className="px-2.5 py-1 text-zinc-500 hover:text-zinc-900 text-xs font-medium cursor-pointer"
                >
                  Clear Selection
                </button>
              )}
            </div>
          </div>

          {/* Horizontal Scrollable Row with Pictures */}
          <div className="overflow-x-auto pb-2 -mx-1 px-1">
            <div className="flex items-stretch gap-3 min-w-max">
              {batchStudents.map((student) => {
                const isSelected = selectedStudentIdsInRow.has(student.id);
                const initials = student.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                return (
                  <div
                    key={student.id}
                    onClick={() => handleToggleSelectStudent(student.id)}
                    className={`w-44 p-3 rounded-xl border-2 transition-all cursor-pointer relative flex flex-col justify-between select-none ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/40 shadow-sm ring-2 ring-emerald-500/20'
                        : 'border-zinc-200 hover:border-zinc-300 bg-white hover:bg-zinc-50/50'
                    }`}
                  >
                    {/* Top indicator & checkbox */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-mono text-zinc-400">
                        {student.studentId}
                      </span>
                      <div
                        className={`w-4 h-4 rounded-md flex items-center justify-center transition ${
                          isSelected
                            ? 'bg-emerald-600 text-white'
                            : 'border border-zinc-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>

                    {/* Candidate Photo & Monogram */}
                    <div className="flex flex-col items-center text-center space-y-1.5 py-1">
                      {student.profilePhoto ? (
                        <img
                          src={student.profilePhoto}
                          alt={student.name}
                          className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-xs"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-zinc-900 text-white font-bold text-base flex items-center justify-center shadow-xs">
                          {initials}
                        </div>
                      )}

                      <h4 className="font-bold text-xs text-zinc-900 line-clamp-1 w-full" title={student.name}>
                        {student.name}
                      </h4>
                      <p className="text-[10px] text-zinc-500 line-clamp-1 w-full" title={student.college}>
                        {student.college}
                      </p>
                    </div>

                    {/* Badges / Stage */}
                    <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[10px]">
                      <span className="text-zinc-400 truncate max-w-[85px]">
                        {student.skills?.[0] || 'Track Trainee'}
                      </span>
                      <Badge
                        variant={
                          student.currentStage === 'Trained / To Be Placed'
                            ? 'blue'
                            : student.currentStage === 'Placed'
                            ? 'green'
                            : 'neutral'
                        }
                      >
                        {student.currentStage === 'Trained / To Be Placed' ? 'Trained' : 'In Training'}
                      </Badge>
                    </div>
                  </div>
                );
              })}

              {/* "+ Add / Shift Lead" Card at the end of the picture row */}
              <div
                onClick={() => setShowShiftLeadModal(true)}
                className="w-40 p-4 rounded-xl border-2 border-dashed border-zinc-200 hover:border-emerald-500 bg-zinc-50/50 hover:bg-emerald-50/30 transition-all cursor-pointer flex flex-col items-center justify-center text-center space-y-2 shrink-0 group"
              >
                <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 group-hover:border-emerald-300 text-zinc-400 group-hover:text-emerald-600 flex items-center justify-center transition shadow-2xs">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-xs text-zinc-800 group-hover:text-emerald-700 block">
                    Shift from Leads
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    Add new candidates
                  </span>
                </div>
              </div>

              {batchStudents.length === 0 && (
                <div className="py-8 px-12 text-center text-zinc-400 text-xs">
                  No students currently enrolled in this batch. Click &quot;Shift from Leads&quot; to enroll applicants!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. "AND THE MAIN TABLE WILL HAVE ROWS FROM THE ABOVE      */}
      {/*    SELECTION MANNER"                                      */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-2xs overflow-hidden">
        {/* Table Filter & Sub-header */}
        <div className="p-4 border-b border-zinc-200 bg-zinc-50/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-800 flex items-center gap-1.5">
              <span>Main Candidate Table</span>
              <span className="font-mono text-[11px] text-zinc-500">
                ({tableDisplayStudents.length} Rows)
              </span>
            </h3>

            {selectedStudentIdsInRow.size > 0 && (
              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-0.5 rounded-lg text-xs font-semibold">
                <span>Filtered by Picture Row Selection ({selectedStudentIdsInRow.size})</span>
                <button
                  onClick={handleClearRowSelection}
                  className="text-emerald-700 hover:text-emerald-900 ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search candidates by name, college, email..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
              />
            </div>

            {/* Stage filter */}
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as any)}
              className="text-xs border border-zinc-200 rounded-lg px-2.5 py-1.5 bg-white text-zinc-700 focus:outline-none"
            >
              <option value="all">All Stages</option>
              <option value="in_training">In Training</option>
              <option value="trained">Trained / Ready for Placement</option>
            </select>
          </div>
        </div>

        {/* The Table */}
        <div className="overflow-x-auto pb-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-zinc-50/80 border-b border-zinc-200 text-[11px] font-bold text-zinc-500 uppercase tracking-wider select-none">
              <tr>
                <th className="py-3.5 pl-6 pr-4">Candidate & Student ID</th>
                <th className="py-3.5 px-4">Contact Info</th>
                <th className="py-3.5 px-4">Batch Cohort</th>
                <th className="py-3.5 px-4">Lead Source & Ingestion</th>
                <th className="py-3.5 px-4">Portfolio & CV</th>
                <th className="py-3.5 px-4">Training Stage</th>
                <th className="py-3.5 pr-6 pl-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-xs">
              {tableDisplayStudents.map((student) => {
                const cleanPhone = student.phone ? student.phone.replace(/[^0-9]/g, '') : '';
                const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                const isSelectedInRow = selectedStudentIdsInRow.has(student.id);

                return (
                  <tr
                    key={student.id}
                    className={`transition-colors ${
                      isSelectedInRow ? 'bg-emerald-50/30' : 'hover:bg-zinc-50/80'
                    }`}
                  >
                    {/* Candidate Name & ID */}
                    <td className="py-3.5 pl-6 pr-4">
                      <div className="flex items-center gap-3">
                        {student.profilePhoto ? (
                          <img
                            src={student.profilePhoto}
                            alt={student.name}
                            className="w-9 h-9 rounded-xl object-cover shrink-0 border border-zinc-200"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {student.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-zinc-900 text-sm">
                              {student.name}
                            </span>
                            <span className="font-mono text-[10px] text-zinc-400 bg-zinc-100 px-1.5 py-0.2 rounded">
                              {student.studentId}
                            </span>
                            {student.agreementSigned ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAgreementModalStudent(student);
                                }}
                                className="font-semibold text-[9px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded cursor-pointer transition"
                                title={`E-Signed: ${student.agreementSignedAt || 'Yes'}. Click to view document.`}
                              >
                                ✓ Signed
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAgreementModalStudent(student);
                                }}
                                className="font-semibold text-[9px] text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded cursor-pointer transition inline-flex items-center gap-0.5"
                                title="Click to open laptop E-Sign station for this enrolled student"
                              >
                                <PenTool className="w-2.5 h-2.5 text-amber-700" />
                                <span>E-Sign</span>
                              </button>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5 truncate max-w-xs">
                            {student.college} {student.course ? `• ${student.course}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Contact Details */}
                    <td className="py-3.5 px-4 text-zinc-600 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-zinc-400" />
                          <span className="font-mono text-[11px]">{student.phone || 'N/A'}</span>
                          {student.phone && (
                            <a
                              href={`https://wa.me/${waPhone}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-0.5 text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-semibold hover:bg-emerald-100 transition"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle className="w-2.5 h-2.5" />
                              <span>WA</span>
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-zinc-400" />
                          <span className="text-[11px] text-zinc-500 truncate max-w-[140px]" title={student.email}>
                            {student.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Batch Cohort */}
                    <td className="py-3.5 px-4 text-zinc-700 whitespace-nowrap">
                      <div>
                        <span className="font-bold text-xs text-zinc-900 block">
                          {getBatchDisplayTitle(activeBatch)}
                        </span>
                        <span className="text-[11px] text-zinc-500 block mt-0.5">
                          Enrolled • Joined {student.joinedAt || '2025'}
                        </span>
                      </div>
                    </td>

                    {/* Original Lead Data & Notes */}
                    <td className="py-3.5 px-4 text-zinc-600">
                      <div className="max-w-[180px]">
                        <span className="text-[11px] font-semibold text-zinc-800 block truncate">
                          {student.bio || student.notes || 'Inquired via Leads Pipeline'}
                        </span>
                        <span className="text-[10px] text-zinc-400 truncate block mt-0.5">
                          Allotted to Batch on enrollment
                        </span>
                      </div>
                    </td>

                    {/* Portfolio & CV */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {student.portfolioUrl ? (
                          <a
                            href={student.portfolioUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-indigo-700 hover:underline font-semibold bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Canva</span>
                          </a>
                        ) : (
                          <span className="text-zinc-400 text-[11px] italic">No portfolio</span>
                        )}

                        {student.resumeUrl && (
                          <a
                            href={student.resumeUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-zinc-700 hover:underline font-semibold bg-zinc-100 px-2 py-0.5 rounded"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Resume</span>
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Training Stage Selector */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <select
                        value={student.currentStage}
                        onChange={(e) => handleStudentStageChange(student, e.target.value)}
                        className={`text-xs font-semibold rounded-lg px-2.5 py-1.5 border focus:outline-none cursor-pointer ${
                          student.currentStage === 'Trained / To Be Placed'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : student.currentStage === 'Placed'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-zinc-50 text-zinc-800 border-zinc-200'
                        }`}
                      >
                        <option value="In Training">In Training</option>
                        <option value="Trained / To Be Placed">Trained / Ready for Placement</option>
                        <option value="Interviewing">Interviewing</option>
                        <option value="Placed">Placed</option>
                        <option value="Didn't Work Out">Didn&apos;t Work Out</option>
                      </select>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 pr-6 pl-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {onSelectStudent && (
                          <button
                            type="button"
                            onClick={() => onSelectStudent(student)}
                            className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-2xs inline-flex items-center gap-1"
                            title="View full 360 Student Profile"
                          >
                            <span>Profile</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemoveFromBatch(student)}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-zinc-100 transition cursor-pointer"
                          title="Remove student from this batch"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {tableDisplayStudents.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400 text-xs">
                    <GraduationCap className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                    <p className="font-semibold text-zinc-700">No candidates match your table filters.</p>
                    {selectedStudentIdsInRow.size > 0 && (
                      <button
                        onClick={handleClearRowSelection}
                        className="mt-2 text-xs text-emerald-700 font-semibold hover:underline"
                      >
                        Reset picture row selection
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL: SHIFT CANDIDATES FROM LEADS INTO ACTIVE BATCH     */}
      {/* ======================================================== */}
      {showShiftLeadModal && activeBatch && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div
            className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[90vh] my-6 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-zinc-200 bg-zinc-50/80 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-zinc-900">
                    Shift Candidates from Leads into {getBatchDisplayTitle(activeBatch)}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Select applicants to enroll into this cohort. They will be added to the Student Directory and removed from the Leads list.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowShiftLeadModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Search bar for leads */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search leads by name, college, email, or domain..."
                  value={leadShiftSearch}
                  onChange={(e) => setLeadShiftSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              {/* Leads Selection List */}
              <div className="border border-zinc-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto divide-y divide-zinc-100">
                {filteredLeadsToShift.map((lead) => {
                  const isChecked = selectedLeadsToShift.has(lead.id);

                  return (
                    <div
                      key={lead.id}
                      onClick={() => {
                        setSelectedLeadsToShift((prev) => {
                          const next = new Set(prev);
                          if (next.has(lead.id)) next.delete(lead.id);
                          else next.add(lead.id);
                          return next;
                        });
                      }}
                      className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition ${
                        isChecked ? 'bg-emerald-50/50' : 'hover:bg-zinc-50/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-900 text-xs truncate">
                              {lead.name}
                            </span>
                            <span className="font-mono text-[10px] text-zinc-400">
                              {lead.leadId}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                            {lead.college} • {lead.phone || lead.email}
                          </p>
                        </div>
                      </div>

                      {lead.interestArea && (
                        <span className="text-[10px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded font-medium shrink-0">
                          {lead.interestArea}
                        </span>
                      )}
                    </div>
                  );
                })}

                {filteredLeadsToShift.length === 0 && (
                  <div className="py-8 text-center text-zinc-400 text-xs">
                    No leads found matching your search.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-200 bg-white flex items-center justify-between">
              <span className="text-xs text-zinc-500">
                {selectedLeadsToShift.size} candidate{selectedLeadsToShift.size === 1 ? '' : 's'} selected
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowShiftLeadModal(false)}
                  className="px-4 py-2 border border-zinc-200 rounded-xl text-zinc-700 hover:bg-zinc-50 cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={selectedLeadsToShift.size === 0 || isShiftingLeads}
                  onClick={handleShiftSelectedLeads}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>
                    {isShiftingLeads
                      ? 'Enrolling Candidates...'
                      : `Shift Selected (${selectedLeadsToShift.size}) to Batch`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREATE NEW TRAINING BATCH                          */}
      {/* ======================================================== */}
      {showAddBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div
            className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-zinc-200 space-y-4 my-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-bold text-zinc-900 text-base">Create Training Batch</h3>
                <p className="text-xs text-zinc-500">Set up a new cohort for candidate deployment.</p>
              </div>
              <button
                onClick={() => setShowAddBatchModal(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-700 font-semibold mb-1">Batch Title / Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Batch 6"
                  value={batchForm.name}
                  onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Target Capacity</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={5}
                      max={200}
                      value={batchForm.capacity}
                      onChange={(e) => setBatchForm({ ...batchForm, capacity: Number(e.target.value) })}
                      className="w-full text-xs px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 pr-16 font-mono"
                    />
                    <span className="absolute right-3 top-2 text-[11px] text-zinc-400 pointer-events-none">
                      Students
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-700 font-semibold mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Schedule (Sessions)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={batchForm.sessionsCount}
                      onChange={(e) => setBatchForm({ ...batchForm, sessionsCount: Number(e.target.value) })}
                      className="w-full text-xs px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 pr-16 font-mono"
                    />
                    <span className="absolute right-3 top-2 text-[11px] text-zinc-400 pointer-events-none">
                      Sessions
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    value={batchForm.startDate}
                    onChange={(e) => setBatchForm({ ...batchForm, startDate: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">End Date</label>
                  <input
                    type="date"
                    value={batchForm.endDate}
                    onChange={(e) => setBatchForm({ ...batchForm, endDate: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-700 font-semibold mb-1">WhatsApp Group Community Link</label>
                <input
                  type="text"
                  placeholder="https://chat.whatsapp.com/..."
                  value={batchForm.whatsappGroup}
                  onChange={(e) => setBatchForm({ ...batchForm, whatsappGroup: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowAddBatchModal(false)}
                  className="px-3.5 py-2 border border-zinc-200 rounded-lg text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-zinc-900 text-white rounded-lg font-semibold hover:bg-zinc-800 transition cursor-pointer"
                >
                  Create Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Training Batch Modal */}
      <EditBatchModal
        batch={editingBatch}
        isOpen={showEditBatchModal}
        onClose={() => {
          setShowEditBatchModal(false);
          setEditingBatch(null);
        }}
        onSuccess={(updated) => {
          showNotice(`✓ Successfully updated ${updated.name}`);
        }}
        onDelete={(deletedId) => {
          showNotice('✓ Training batch deleted.');
          if (selectedBatchId === deletedId) {
            const remaining = batches.filter((b) => b.id !== deletedId);
            setSelectedBatchId(remaining.length > 0 ? remaining[0].id : '');
          }
        }}
        enrolledCount={
          editingBatch
            ? students.filter(
                (s) =>
                  (editingBatch.enrolledStudents && editingBatch.enrolledStudents.includes(s.id)) ||
                  s.batchId === editingBatch.id ||
                  s.batchId === editingBatch.batchId ||
                  (s.batchName && editingBatch.name.toLowerCase().includes(s.batchName.toLowerCase()))
              ).length
            : 0
        }
      />

      {/* Commitment Agreement & Laptop E-Sign Station Modal */}
      <CommitmentAgreementModal
        isOpen={Boolean(agreementModalStudent)}
        onClose={() => setAgreementModalStudent(null)}
        student={agreementModalStudent}
        students={students}
      />
    </div>
  );
};
