import React, { useState, useMemo } from 'react';
import {
  FileCheck,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  Search,
  PenTool,
  ShieldCheck,
  Users,
  CheckCircle2,
  Printer,
  ChevronRight,
  Sparkles,
  FileText,
} from 'lucide-react';
import { Agreement, Student } from '../../types/crm';
import { addAgreement, updateAgreement } from '../../services/firestoreService';
import { Badge } from '../../components/common/Badge';
import { CommitmentAgreementModal } from './CommitmentAgreementModal';

interface AgreementsViewProps {
  agreements: Agreement[];
  students?: Student[];
}

export const AgreementsView: React.FC<AgreementsViewProps> = ({ agreements, students = [] }) => {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'signed' | 'pending'>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // E-Sign Modal state
  const [isCommitmentModalOpen, setIsCommitmentModalOpen] = useState(false);
  const [selectedStudentForSign, setSelectedStudentForSign] = useState<Student | null>(null);
  const [selectedAgreementForView, setSelectedAgreementForView] = useState<Agreement | null>(null);

  // Quick picker student selection
  const [quickPickerStudentId, setQuickPickerStudentId] = useState('');
  const [optimisticSigned, setOptimisticSigned] = useState<Record<string, { signed: boolean; signedAt: string; agreement: Agreement }>>({});

  const [form, setForm] = useState({
    title: 'Internship Engagement & Non-Disclosure Agreement (NDA)',
    partyType: 'Student' as const,
    partyName: '',
    terms: 'Intern agrees to adhere to company IP guidelines, 90-day internship duration, and non-disclosure obligations.',
  });

  // Calculate statistics
  const totalStudents = students.length;
  const signedStudents = useMemo(() => {
    return students.filter(
      (s) =>
        s.agreementSigned ||
        Boolean(optimisticSigned[s.id]) ||
        agreements.some((a) => (a.studentId === s.id || a.studentName.toLowerCase() === s.name.toLowerCase()) && a.status === 'Signed')
    );
  }, [students, agreements, optimisticSigned]);

  const pendingStudents = useMemo(() => {
    return students.filter(
      (s) =>
        !s.agreementSigned &&
        !optimisticSigned[s.id] &&
        !agreements.some((a) => (a.studentId === s.id || a.studentName.toLowerCase() === s.name.toLowerCase()) && a.status === 'Signed')
    );
  }, [students, agreements, optimisticSigned]);

  const combinedAgreements = useMemo(() => {
    const list = [...agreements];
    (Object.values(optimisticSigned) as Array<{ signed: boolean; signedAt: string; agreement: Agreement }>).forEach((opt) => {
      if (!list.some((a) => a.id === opt.agreement.id || a.studentId === opt.agreement.studentId)) {
        list.unshift(opt.agreement);
      }
    });
    return list;
  }, [agreements, optimisticSigned]);

  const signedCount = signedStudents.length;
  const pendingCount = pendingStudents.length;
  const percentSigned = totalStudents > 0 ? Math.round((signedCount / totalStudents) * 100) : 0;

  // Filtered display list
  const filteredList = useMemo(() => {
    const q = search.toLowerCase();

    if (activeTab === 'signed') {
      return combinedAgreements.filter((a) => {
        if (a.status !== 'Signed') return false;
        return !q || a.studentName.toLowerCase().includes(q) || a.templateName.toLowerCase().includes(q);
      });
    }

    if (activeTab === 'pending') {
      return pendingStudents.filter((s) => {
        return !q || s.name.toLowerCase().includes(q) || s.college.toLowerCase().includes(q) || (s.studentId && s.studentId.toLowerCase().includes(q));
      });
    }

    // 'all': combine signed agreements and pending students
    return combinedAgreements.filter((a) => {
      return !q || a.studentName.toLowerCase().includes(q) || a.templateName.toLowerCase().includes(q);
    });
  }, [combinedAgreements, pendingStudents, activeTab, search]);

  const handleOpenSignForStudent = (student: Student) => {
    setSelectedStudentForSign(student);
    const existing = agreements.find(
      (a) => a.studentId === student.id || a.studentName.toLowerCase() === student.name.toLowerCase()
    );
    setSelectedAgreementForView(existing || null);
    setIsCommitmentModalOpen(true);
  };

  const handleOpenViewAgreement = (agreement: Agreement) => {
    const matchedStudent = students.find(
      (s) => s.id === agreement.studentId || s.name.toLowerCase() === agreement.studentName.toLowerCase()
    );
    setSelectedStudentForSign(
      matchedStudent || {
        id: agreement.studentId,
        studentId: agreement.studentId,
        name: agreement.studentName,
        email: agreement.participantDetails?.email || '',
        phone: agreement.participantDetails?.phone || '',
        college: agreement.participantDetails?.college || '',
        course: agreement.participantDetails?.courseAndYear || '',
        graduationYear: '',
        skills: [],
        currentStage: 'In Training',
        placementReadiness: 'In Training',
        joinedAt: agreement.dateGenerated,
        createdAt: agreement.createdAt,
        updatedAt: agreement.updatedAt,
        agreementSigned: true,
      }
    );
    setSelectedAgreementForView(agreement);
    setIsCommitmentModalOpen(true);
  };

  const handleLaunchQuickPickerSign = () => {
    if (!quickPickerStudentId) return;
    const target = students.find((s) => s.id === quickPickerStudentId);
    if (target) {
      handleOpenSignForStudent(target);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await addAgreement({
      studentId: 'IH-GEN',
      studentName: form.partyName,
      templateName: form.title,
      dateGenerated: new Date().toISOString().split('T')[0],
      status: 'Sent',
      termsSummary: form.terms,
    });
    setShowAddModal(false);
    setForm({
      title: 'Internship Engagement & Non-Disclosure Agreement (NDA)',
      partyType: 'Student',
      partyName: '',
      terms: 'Intern agrees to adhere to company IP guidelines, 90-day internship duration, and non-disclosure obligations.',
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. HERO BANNER: OFFICIAL INTERNSHOP COMMITMENT AGREEMENT STATION */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 text-white rounded-2xl p-6 sm:p-8 shadow-md border border-zinc-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full bg-gradient-to-l from-emerald-950/20 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Official Internshop Student Onboarding Legal Document</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans">
              Internshop Commitment Agreement — Laptop E-Sign Station
            </h2>

            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
              When candidates enroll in Internshop, display this agreement on the laptop for them to review and e-sign.
              Covers the <strong>3-week placement waiting window</strong>, <strong>3-month mandatory internship tenure</strong>,
              and <strong>INR 3,000 breach liability clause</strong>. E-signing automatically marks the student’s checklist in Firestore.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-zinc-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Interactive Draw / Type E-Signature</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Founder Countersigned (Dhvani Kankaria)</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Auto-syncs Student Database Checklist</span>
              </span>
            </div>
          </div>

          {/* Quick Launcher Card */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5 w-full md:w-80 shrink-0 space-y-3 backdrop-blur-xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300 block">
              Hand Laptop to Student to E-Sign:
            </span>

            <select
              value={quickPickerStudentId}
              onChange={(e) => setQuickPickerStudentId(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Select Enrolled Student...</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.college || 'Candidate'}) {s.agreementSigned ? '✓ Signed' : '⏳ Pending'}
                </option>
              ))}
            </select>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleLaunchQuickPickerSign}
                disabled={!quickPickerStudentId}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-lg transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <PenTool className="w-4 h-4" />
                <span>Open & E-Sign on Laptop</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedStudentForSign(null);
                  setSelectedAgreementForView(null);
                  setIsCommitmentModalOpen(true);
                }}
                className="w-full py-2 px-3 bg-white/10 hover:bg-white/20 text-zinc-200 hover:text-white font-medium text-xs rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer border border-white/10"
              >
                <FileText className="w-3.5 h-3.5 text-zinc-300" />
                <span>Preview Master Agreement Template</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. STATS & COMPLIANCE METRICS BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4.5 rounded-xl border border-zinc-200 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Enrolled Students</span>
            <Users className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 font-mono">{totalStudents}</div>
          <span className="text-[11px] text-zinc-400 block">Candidates in database</span>
        </div>

        <div className="bg-white p-4.5 rounded-xl border border-zinc-200 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-xs text-emerald-700 font-medium">
            <span>Agreements E-Signed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 font-mono">
            {signedCount} <span className="text-xs text-zinc-400 font-normal">({percentSigned}%)</span>
          </div>
          <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-emerald-600 h-full rounded-full transition-all" style={{ width: `${percentSigned}%` }} />
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-xl border border-zinc-200 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-xs text-amber-700 font-medium">
            <span>Pending E-Signatures</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700 font-mono">{pendingCount}</div>
          <span className="text-[11px] text-amber-600 block">Students requiring laptop sign-off</span>
        </div>
      </div>

      {/* 3. CONTROLS, SEARCH & TABS */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white p-4 rounded-xl border border-zinc-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'all' ? 'bg-zinc-900 text-white shadow-2xs' : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            All Agreements ({agreements.length})
          </button>
          <button
            onClick={() => setActiveTab('signed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'signed' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            E-Signed ({signedCount})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'pending' ? 'bg-amber-600 text-white shadow-2xs' : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            Needs E-Sign ({pendingCount})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by student or college..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap"
            title="Create custom agreement template"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Issue Other Document</span>
          </button>
        </div>
      </div>

      {/* 4. AGREEMENTS LIST / GRID */}
      {activeTab === 'pending' ? (
        /* PENDING STUDENTS REQUIRING LAPTOP E-SIGN */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(filteredList as Student[]).map((st) => (
            <div
              key={st.id}
              className="bg-white border border-amber-200/90 rounded-xl p-5 space-y-3.5 shadow-2xs hover:border-amber-400 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-400 font-semibold">{st.studentId}</span>
                    <h4 className="font-bold text-sm text-zinc-900 mt-0.5">{st.name}</h4>
                    <span className="text-xs text-zinc-500 block">{st.college || 'Candidate'}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" />
                    <span>Awaiting E-Sign</span>
                  </span>
                </div>

                <div className="mt-3 p-3 bg-zinc-50 rounded-lg border border-zinc-100 text-xs text-zinc-600 space-y-1">
                  <div className="font-semibold text-zinc-800 text-[11px] uppercase tracking-wider">
                    Internshop Commitment Agreement
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-tight">
                    Must be signed on laptop to confirm 3-month tenure and 3-week waiting period before placement matching.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-400">Database checklist pending</span>
                <button
                  type="button"
                  onClick={() => handleOpenSignForStudent(st)}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <PenTool className="w-3 h-3 text-emerald-400" />
                  <span>E-Sign on Laptop</span>
                </button>
              </div>
            </div>
          ))}

          {filteredList.length === 0 && (
            <div className="col-span-3 text-center py-12 bg-white rounded-xl border border-dashed border-zinc-200 text-xs text-zinc-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="font-semibold text-zinc-800 text-sm">All Students Have E-Signed!</p>
              <p>Every enrolled student in the current directory has completed the Commitment Agreement.</p>
            </div>
          )}
        </div>
      ) : (
        /* STANDARD AGREEMENTS VIEW (SIGNED & DRAFTS) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(filteredList as Agreement[]).map((a) => {
            const isSigned = a.status === 'Signed';
            return (
              <div
                key={a.id}
                className="bg-white border border-zinc-200/90 rounded-xl p-5 space-y-3.5 shadow-2xs hover:border-zinc-300 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono text-zinc-400 font-semibold">{a.id.slice(0, 8)}</span>
                      <h4 className="font-bold text-sm text-zinc-900 mt-0.5">{a.studentName}</h4>
                      <span className="text-xs text-zinc-500 block">Candidate Agreement</span>
                    </div>
                    <Badge variant={isSigned ? 'green' : 'amber'}>
                      {isSigned ? '✓ Signed' : a.status}
                    </Badge>
                  </div>

                  <p className="mt-3 text-xs text-zinc-700 bg-zinc-50 p-3 rounded-lg border border-zinc-100 font-medium">
                    {a.templateName}
                  </p>

                  <div className="text-[11px] text-zinc-500 line-clamp-2 mt-2 leading-relaxed">
                    {a.termsSummary || '3-Week Placement Waiting Period, 3-Month Minimum Internship Tenure, INR 3,000 fee upon breach.'}
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs gap-2">
                  <span className="text-zinc-500 text-[11px]">
                    {a.signedAt ? (
                      <span className="text-emerald-700 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Signed {new Date(a.signedAt).toLocaleDateString()}</span>
                      </span>
                    ) : (
                      'Awaiting signature'
                    )}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleOpenViewAgreement(a)}
                    className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <FileText className="w-3 h-3 text-emerald-400" />
                    <span>{isSigned ? 'View Document' : 'Open E-Sign'}</span>
                  </button>
                </div>
              </div>
            );
          })}

          {filteredList.length === 0 && (
            <div className="col-span-3 text-center py-12 bg-white rounded-xl border border-dashed border-zinc-200 text-xs text-zinc-400 space-y-2">
              <FileCheck className="w-8 h-8 text-zinc-300 mx-auto" />
              <p className="font-semibold text-zinc-700 text-sm">No agreements found</p>
              <p>Click "Open & E-Sign on Laptop" in the banner above to execute your first student commitment agreement.</p>
            </div>
          )}
        </div>
      )}

      {/* 5. COMMITMENT AGREEMENT E-SIGN & VIEWER MODAL */}
      <CommitmentAgreementModal
        isOpen={isCommitmentModalOpen}
        onClose={() => {
          setIsCommitmentModalOpen(false);
          setSelectedStudentForSign(null);
          setSelectedAgreementForView(null);
        }}
        student={selectedStudentForSign}
        agreement={selectedAgreementForView}
        students={students}
        onSignedSuccess={(newAgreement, studentId) => {
          setSelectedAgreementForView(newAgreement);
          setOptimisticSigned((prev) => ({
            ...prev,
            [studentId]: {
              signed: true,
              signedAt: newAgreement.signedAt || new Date().toISOString(),
              agreement: newAgreement,
            },
          }));
        }}
      />

      {/* 6. CREATE OTHER AGREEMENT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-bold text-zinc-900 text-base">Issue Custom Agreement</h3>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-zinc-600">
                &times;
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-600 font-medium mb-1">Party Type</label>
                <select
                  value={form.partyType}
                  onChange={(e) => setForm({ ...form, partyType: e.target.value as any })}
                  className="w-full text-xs px-3 py-2 border border-zinc-200 rounded-lg bg-white"
                >
                  <option value="Student">Student</option>
                  <option value="Company">Company</option>
                </select>
              </div>
              <div>
                <label className="block text-zinc-600 font-medium mb-1">Party Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Aarav Sharma or Razorpay Software"
                  value={form.partyName}
                  onChange={(e) => setForm({ ...form, partyName: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-zinc-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-zinc-600 font-medium mb-1">Agreement Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-zinc-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-zinc-600 font-medium mb-1">Terms Summary</label>
                <textarea
                  rows={3}
                  value={form.terms}
                  onChange={(e) => setForm({ ...form, terms: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-zinc-200 rounded-lg"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 border border-zinc-200 rounded-lg text-zinc-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-zinc-900 text-white rounded-lg font-medium"
                >
                  Issue Agreement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
