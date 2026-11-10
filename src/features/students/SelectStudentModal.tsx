import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Check,
  UserPlus,
  ArrowRight,
  GraduationCap,
  Users,
  FileText,
  Filter,
  CheckSquare,
  Square,
  Sparkles,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Student, Lead, StudentStage, PlacementReadiness } from '../../types/crm';
import { updateStudentStage, convertLeadToStudent, addStudent } from '../../services/firestoreService';
import { syncAll115Students } from '../../services/actualDataService';

interface SelectStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetStage: StudentStage;
  students: Student[];
  leads?: Lead[];
  onStageChanged?: (newStage: StudentStage) => void;
}

const ALL_STAGES: StudentStage[] = [
  'In Training',
  'Trained / To Be Placed',
  'Interviewing',
  'Placed',
  "Didn't Work Out",
  'Assignment Pending',
  'Agreement Pending',
  'Portfolio Review',
];

export const SelectStudentModal: React.FC<SelectStudentModalProps> = ({
  isOpen,
  onClose,
  targetStage,
  students,
  leads = [],
  onStageChanged,
}) => {
  const [currentStage, setCurrentStage] = useState<StudentStage>(targetStage);
  const [activeTab, setActiveTab] = useState<'students' | 'leads' | 'new'>('students');
  const [search, setSearch] = useState('');
  const [filterCurrentStage, setFilterCurrentStage] = useState<string>('all');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // New Student Form state
  const [newForm, setNewForm] = useState({
    name: '',
    email: '',
    phone: '',
    college: '',
    course: '',
    graduationYear: '2026',
    skills: 'Communication, Problem Solving',
  });
  const [creatingNew, setCreatingNew] = useState(false);

  // Sync internal currentStage when targetStage changes from outside
  React.useEffect(() => {
    setCurrentStage(targetStage);
  }, [targetStage, isOpen]);

  // Clear selections on modal open/close
  React.useEffect(() => {
    if (isOpen) {
      setSelectedStudentIds(new Set());
      setSuccessNotice(null);
      setSearch('');
    }
  }, [isOpen]);

  const handleSyncAll = async () => {
    try {
      setIsSyncing(true);
      const count = await syncAll115Students(true);
      setSuccessNotice(`Successfully synced all ${count} student records from database!`);
    } catch (err: any) {
      console.error('Failed to sync students:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleStageSelect = (stage: StudentStage) => {
    setCurrentStage(stage);
    if (onStageChanged) {
      onStageChanged(stage);
    }
  };

  // Filter students
  const filteredStudents = useMemo(() => {
    const q = search.toLowerCase().trim();
    return students.filter((s) => {
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.studentId.toLowerCase().includes(q) ||
        s.college.toLowerCase().includes(q) ||
        (s.course && s.course.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.notes && s.notes.toLowerCase().includes(q)) ||
        (s.batchName && s.batchName.toLowerCase().includes(q)) ||
        s.skills.some((sk) => sk.toLowerCase().includes(q));

      const matchesStage =
        filterCurrentStage === 'all' || s.currentStage === filterCurrentStage;

      return matchesSearch && matchesStage;
    });
  }, [students, search, filterCurrentStage]);

  // Filter leads
  const filteredLeads = useMemo(() => {
    const q = search.toLowerCase().trim();
    return leads.filter((l) => {
      if (!q) return true;
      return (
        l.name.toLowerCase().includes(q) ||
        l.leadId.toLowerCase().includes(q) ||
        l.college.toLowerCase().includes(q) ||
        (l.email && l.email.toLowerCase().includes(q)) ||
        (l.interestArea && l.interestArea.toLowerCase().includes(q))
      );
    });
  }, [leads, search]);

  const toggleSelectStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllEligible = () => {
    const eligible = filteredStudents.filter((s) => s.currentStage !== currentStage);
    if (selectedStudentIds.size === eligible.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(eligible.map((s) => s.id)));
    }
  };

  // 1-Click Move Student to Current Target Stage
  const handleAddSingleStudent = async (student: Student) => {
    try {
      setProcessingId(student.id);
      await updateStudentStage(
        student,
        currentStage,
        'Staff Selection',
        `Moved to ${currentStage} from student directory log`
      );
      setSuccessNotice(`Added ${student.name} to "${currentStage}"`);
      setTimeout(() => setSuccessNotice(null), 3500);
    } catch (err) {
      console.error('Failed to move student:', err);
    } finally {
      setProcessingId(null);
    }
  };

  // Bulk Move Selected Students
  const handleBulkAddStudents = async () => {
    if (selectedStudentIds.size === 0) return;
    try {
      setBulkProcessing(true);
      const toMove = students.filter(
        (s) => selectedStudentIds.has(s.id) && s.currentStage !== currentStage
      );

      for (const st of toMove) {
        await updateStudentStage(
          st,
          currentStage,
          'Staff Bulk Action',
          `Batch added to ${currentStage}`
        );
      }

      setSuccessNotice(`Successfully added ${toMove.length} student(s) to "${currentStage}"`);
      setSelectedStudentIds(new Set());
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err) {
      console.error('Failed to bulk move students:', err);
    } finally {
      setBulkProcessing(false);
    }
  };

  // 1-Click Convert Lead & Add directly to Current Target Stage
  const handleConvertLead = async (lead: Lead) => {
    try {
      setProcessingId(lead.id);
      const createdStudent = await convertLeadToStudent(lead, 'Staff Selection');
      if (createdStudent && createdStudent.currentStage !== currentStage) {
        await updateStudentStage(
          createdStudent,
          currentStage,
          'Staff Selection',
          `Lead converted and placed directly into ${currentStage}`
        );
      }
      setSuccessNotice(`Converted & added ${lead.name} to "${currentStage}"`);
      setTimeout(() => setSuccessNotice(null), 3500);
    } catch (err) {
      console.error('Failed to convert lead:', err);
    } finally {
      setProcessingId(null);
    }
  };

  // Create & Enroll New Student Record
  const handleCreateNewStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.name || !newForm.college) return;

    try {
      setCreatingNew(true);
      const year = new Date().getFullYear();
      const randomCode = Math.floor(1000 + Math.random() * 9000);

      const readinessMap: Record<string, PlacementReadiness> = {
        'In Training': 'In Training',
        'Trained / To Be Placed': 'Interview Ready',
        Interviewing: 'Interview Ready',
        Placed: 'Placed',
        "Didn't Work Out": 'Not Ready',
      };

      await addStudent({
        studentId: `IH-${year}-${randomCode}`,
        name: newForm.name,
        email: newForm.email || `${newForm.name.toLowerCase().replace(/\s+/g, '')}@example.com`,
        phone: newForm.phone || '+91 9800000000',
        college: newForm.college,
        course: newForm.course || 'Undergraduate Degree',
        graduationYear: newForm.graduationYear || '2026',
        skills: newForm.skills.split(',').map((s) => s.trim()).filter(Boolean),
        currentStage: currentStage,
        placementReadiness: readinessMap[currentStage] || 'In Training',
        joinedAt: new Date().toISOString().split('T')[0],
      });

      setSuccessNotice(`Enrolled new student ${newForm.name} into "${currentStage}"`);
      setNewForm({
        name: '',
        email: '',
        phone: '',
        college: '',
        course: '',
        graduationYear: '2026',
        skills: 'Communication, Problem Solving',
      });
      setActiveTab('students');
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err) {
      console.error('Failed to create student:', err);
    } finally {
      setCreatingNew(false);
    }
  };

  if (!isOpen) return null;

  const eligibleCount = filteredStudents.filter((s) => s.currentStage !== currentStage).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-zinc-200 flex flex-col overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="p-5 border-b border-zinc-200 bg-zinc-50/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-zinc-900 text-white shadow-2xs">
                <Users className="w-4 h-4" />
              </span>
              <h2 className="text-base font-semibold text-zinc-900">
                Add Students to Stage
              </h2>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Select existing students from the directory log or applicant leads to add to this stage.
            </p>
          </div>

          {/* Target Stage Switcher, Sync & Close */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncAll}
              disabled={isSyncing}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-100 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
              title="Sync all 115 records from database"
            >
              <RefreshCw className={`w-3 h-3 text-zinc-600 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync (115)'}</span>
            </button>

            <div className="flex items-center gap-1.5 bg-white border border-zinc-300 rounded-lg px-2.5 py-1.5 shadow-2xs">
              <span className="text-[11px] text-zinc-500 font-medium whitespace-nowrap">Target:</span>
              <select
                value={currentStage}
                onChange={(e) => handleStageSelect(e.target.value as StudentStage)}
                className="text-xs font-semibold text-zinc-900 bg-transparent cursor-pointer focus:outline-none"
              >
                {ALL_STAGES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 transition cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* NOTIFICATION BANNER */}
        {successNotice && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs font-medium text-emerald-800 flex items-center justify-between animate-in slide-in-from-top-1">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successNotice}</span>
            </div>
            <button
              onClick={() => setSuccessNotice(null)}
              className="text-emerald-700 hover:text-emerald-900 text-[11px] font-semibold underline ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* TABS NAVIGATION */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 pt-3 bg-white">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('students')}
              className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition cursor-pointer ${
                activeTab === 'students'
                  ? 'border-zinc-900 text-zinc-900'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Students Directory Log</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-mono">
                {students.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('leads')}
              className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition cursor-pointer ${
                activeTab === 'leads'
                  ? 'border-zinc-900 text-zinc-900'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Applicant Leads Pool</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-mono">
                {leads.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('new')}
              className={`pb-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
                activeTab === 'new'
                  ? 'border-zinc-900 text-zinc-900'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Enroll Brand New</span>
            </button>
          </div>
        </div>

        {/* SEARCH & FILTERS TOOLBAR (When viewing students or leads) */}
        {activeTab !== 'new' && (
          <div className="p-3.5 bg-zinc-50 border-b border-zinc-200/80 flex flex-wrap items-center justify-between gap-2.5">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder={
                  activeTab === 'students'
                    ? 'Search student log by name, ID, college, skill...'
                    : 'Search leads by name, college, email, role...'
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 transition"
              />
            </div>

            {activeTab === 'students' && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-zinc-500 text-xs">
                  <Filter className="w-3 h-3" />
                  <span>Stage:</span>
                </div>
                <select
                  value={filterCurrentStage}
                  onChange={(e) => setFilterCurrentStage(e.target.value)}
                  className="text-xs bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-zinc-700 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Stages ({students.length})</option>
                  {ALL_STAGES.map((st) => {
                    const count = students.filter((s) => s.currentStage === st).length;
                    return (
                      <option key={st} value={st}>
                        {st} ({count})
                      </option>
                    );
                  })}
                </select>

                {eligibleCount > 0 && (
                  <button
                    type="button"
                    onClick={selectAllEligible}
                    className="px-2.5 py-1.5 text-[11px] font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-100 transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    {selectedStudentIds.size === eligibleCount ? (
                      <CheckSquare className="w-3 h-3 text-zinc-900" />
                    ) : (
                      <Square className="w-3 h-3 text-zinc-400" />
                    )}
                    <span>
                      {selectedStudentIds.size === eligibleCount ? 'Deselect All' : 'Select All Eligible'}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB BODY */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[320px]">
          {/* TAB 1: ALL STUDENTS LOG */}
          {activeTab === 'students' && (
            <div className="space-y-2">
              {filteredStudents.map((st) => {
                const isAlreadyInStage = st.currentStage === currentStage;
                const isSelected = selectedStudentIds.has(st.id);
                const isProcessing = processingId === st.id;

                return (
                  <div
                    key={st.id}
                    onClick={() => {
                      if (!isAlreadyInStage) {
                        toggleSelectStudent(st.id);
                      }
                    }}
                    className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                      isAlreadyInStage
                        ? 'bg-zinc-50/70 border-zinc-200 opacity-75 cursor-default'
                        : isSelected
                        ? 'bg-blue-50/60 border-blue-300 shadow-2xs'
                        : 'bg-white border-zinc-200 hover:border-zinc-300 hover:shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Selection Checkbox */}
                      <button
                        type="button"
                        disabled={isAlreadyInStage}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isAlreadyInStage) {
                            toggleSelectStudent(st.id);
                          }
                        }}
                        className={`p-1 rounded shrink-0 transition ${
                          isAlreadyInStage
                            ? 'text-zinc-300 cursor-not-allowed'
                            : isSelected
                            ? 'text-blue-600 hover:text-blue-800'
                            : 'text-zinc-400 hover:text-zinc-600'
                        }`}
                      >
                        {isAlreadyInStage ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : isSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4 text-zinc-300" />
                        )}
                      </button>

                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {st.name[0]}
                      </div>

                      {/* Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-zinc-900 truncate">{st.name}</span>
                          <span className="text-[10px] font-mono text-zinc-400 whitespace-nowrap">
                            {st.studentId}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500 truncate mt-0.5">
                          {st.college} {st.course ? `• ${st.course}` : ''}
                        </div>
                        
                        {/* Skills chips */}
                        {st.skills && st.skills.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            {st.skills.slice(0, 3).map((sk) => (
                              <span
                                key={sk}
                                className="px-1.5 py-0.2 bg-zinc-100 text-zinc-600 rounded text-[9px] font-medium"
                              >
                                {sk}
                              </span>
                            ))}
                            {st.skills.length > 3 && (
                              <span className="text-[9px] text-zinc-400">+{st.skills.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Current Stage Badge & Action Button */}
                    <div className="flex items-center gap-2.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <div className="text-right hidden sm:block">
                        <span className="text-[10px] text-zinc-400 block font-medium">Current Stage</span>
                        <span
                          className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-md border mt-0.5 ${
                            st.currentStage === currentStage
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                          }`}
                        >
                          {st.currentStage}
                        </span>
                      </div>

                      {isAlreadyInStage ? (
                        <span className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>In {currentStage}</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleAddSingleStudent(st)}
                          className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-medium transition cursor-pointer shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isProcessing ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <ArrowRight className="w-3.5 h-3.5" />
                          )}
                          <span>Add to {currentStage === 'Trained / To Be Placed' ? 'Trained' : currentStage}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredStudents.length === 0 && (
                <div className="py-12 text-center text-zinc-400 text-xs">
                  No students found matching your search.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: APPLICANT LEADS POOL */}
          {activeTab === 'leads' && (
            <div className="space-y-2">
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center justify-between">
                <span>Select candidate leads from incoming application forms to enroll directly into <strong>{currentStage}</strong>.</span>
              </div>

              {filteredLeads.map((lead) => {
                const isProcessing = processingId === lead.id;
                return (
                  <div
                    key={lead.id}
                    className="p-3 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-2xs transition flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-zinc-900">{lead.name}</span>
                        <span className="text-[10px] font-mono text-zinc-400">{lead.leadId}</span>
                        <span className="px-1.5 py-0.2 bg-zinc-100 text-zinc-600 rounded text-[9px]">
                          {lead.source}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5 truncate">
                        {lead.college} {lead.course ? `• ${lead.course}` : ''}
                      </div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">
                        Domain: <span className="text-zinc-600 font-medium">{lead.interestArea || 'General Internship'}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleConvertLead(lead)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition cursor-pointer shadow-2xs flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <UserPlus className="w-3.5 h-3.5" />
                      )}
                      <span>Enroll & Add to {currentStage === 'Trained / To Be Placed' ? 'Trained' : currentStage}</span>
                    </button>
                  </div>
                );
              })}

              {filteredLeads.length === 0 && (
                <div className="py-12 text-center text-zinc-400 text-xs">
                  No applicant leads found.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ENROLL BRAND NEW */}
          {activeTab === 'new' && (
            <form onSubmit={handleCreateNewStudent} className="p-2 space-y-3.5">
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs text-zinc-600">
                Enroll a completely new student record directly into <strong className="text-zinc-900">{currentStage}</strong>.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Student Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={newForm.name}
                    onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    College / University <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Heritage Institute of Technology"
                    value={newForm.college}
                    onChange={(e) => setNewForm({ ...newForm, college: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="rahul@example.com"
                    value={newForm.email}
                    onChange={(e) => setNewForm({ ...newForm, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Phone / WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="+91 9876543210"
                    value={newForm.phone}
                    onChange={(e) => setNewForm({ ...newForm, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Degree / Course</label>
                  <input
                    type="text"
                    placeholder="B.Tech Computer Science"
                    value={newForm.course}
                    onChange={(e) => setNewForm({ ...newForm, course: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Skills (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="React, Figma, UX Design"
                    value={newForm.skills}
                    onChange={(e) => setNewForm({ ...newForm, skills: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={creatingNew}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-medium transition cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {creatingNew ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Create & Enroll into {currentStage}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* MODAL FOOTER / BULK ACTIONS */}
        <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {selectedStudentIds.size > 0 ? (
              <span className="text-xs font-medium text-blue-700 bg-blue-100/70 px-2.5 py-1 rounded-md border border-blue-200">
                {selectedStudentIds.size} student(s) selected
              </span>
            ) : (
              <span className="text-xs text-zinc-500">
                {activeTab === 'students' && `${filteredStudents.length} students in log`}
                {activeTab === 'leads' && `${filteredLeads.length} leads in pool`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedStudentIds.size > 0 && (
              <button
                type="button"
                disabled={bulkProcessing}
                onClick={handleBulkAddStudents}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {bulkProcessing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Add {selectedStudentIds.size} Selected to {currentStage}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-100 transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
