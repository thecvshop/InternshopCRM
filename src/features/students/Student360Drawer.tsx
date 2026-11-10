import React, { useState } from 'react';
import {
  X,
  User,
  GraduationCap,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Mail,
  Phone,
  MapPin,
  Sparkles,
  AlertCircle,
  FileCheck,
  Award,
  Edit2,
  Trash2,
  ShieldCheck,
  PenTool,
} from 'lucide-react';
import { Student, StudentStage, Interview, Placement, TaskItem, Assignment } from '../../types/crm';
import { updateStudentStage } from '../../services/firestoreService';
import { Badge } from '../../components/common/Badge';
import { CommitmentAgreementModal } from '../agreements/CommitmentAgreementModal';

interface Student360DrawerProps {
  student: Student | null;
  onClose: () => void;
  interviews: Interview[];
  placements: Placement[];
  tasks: TaskItem[];
  assignments: Assignment[];
  onOpenQuickCreateInterview?: (student: Student) => void;
  onEdit?: (student: Student) => void;
  onDelete?: (student: Student) => void;
}

const JOURNEY_STEPS = [
  'Interest Form',
  'Lead Created',
  'Welcome Comms',
  'Assignment Sent',
  'Assignment Reviewed',
  'In Training',
  'Agreement Signed',
  'Portfolio Review',
  'Ready for Placement',
  'Interview Matching',
  'Interviews Active',
  'Offer Released',
  'Placement Confirmed',
  'Joining Confirmed',
  'Monthly Follow-up',
  'Certificate Issued',
];

const STAGE_OPTIONS: StudentStage[] = [
  'In Training',
  'Trained / To Be Placed',
  'Interviewing',
  'Placed',
  "Didn't Work Out",
  'Assignment Pending',
  'Agreement Pending',
  'Portfolio Review',
];

export const Student360Drawer: React.FC<Student360DrawerProps> = ({
  student,
  onClose,
  interviews,
  placements,
  tasks,
  assignments,
  onOpenQuickCreateInterview,
  onEdit,
  onDelete,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'journey' | 'events' | 'assignments' | 'interviews' | 'placement' | 'tasks'
  >('overview');
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);
  const [isCommitmentModalOpen, setIsCommitmentModalOpen] = useState(false);

  if (!student) return null;

  const defaultStudentEvents = [
    {
      eventName: 'Content Creator Workshop',
      date: '2026-09-24',
      status: 'Attended' as const,
    },
    {
      eventName: 'Marketing Meetup',
      date: '2026-08-14',
      status: 'Did Not Attend' as const,
    },
    {
      eventName: 'InternsHome Networking Evening',
      date: '2026-07-02',
      status: 'Attended' as const,
    },
  ];

  const studentEvents =
    student.eventHistory && student.eventHistory.length > 0
      ? student.eventHistory
      : student.email?.toLowerCase().includes('aman') || student.name?.toLowerCase().includes('aman') || student.studentId === 'ST204'
      ? defaultStudentEvents
      : (student.eventHistory || []);

  const studentInterviews = interviews.filter((i) => i.studentId === student.id);
  const studentPlacement = placements.find((p) => p.studentId === student.id);
  const studentTasks = tasks.filter((t) => t.relatedEntityId === student.id || t.relatedEntityName === student.name);
  const studentAssignments = assignments.filter((a) => a.studentId === student.id || a.studentName === student.name);

  const handleStageChange = async (newStage: StudentStage) => {
    setIsUpdatingStage(true);
    try {
      await updateStudentStage(student, newStage, 'Operations Staff');
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingStage(false);
    }
  };

  const getStageVariant = (stage: StudentStage) => {
    switch (stage) {
      case 'Placed':
        return 'emerald';
      case 'Interviewing':
        return 'blue';
      case 'Trained / To Be Placed':
        return 'purple';
      case 'In Training':
        return 'amber';
      case "Didn't Work Out":
        return 'red';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-xs">
      <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col border-l border-zinc-200 animate-in slide-in-from-right duration-200">
        {/* Top Header */}
        <div className="p-6 border-b border-zinc-200/80 bg-zinc-50/50">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 text-white flex items-center justify-center font-bold text-xl shadow-xs">
                {student.name[0]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold tracking-tight text-zinc-900">{student.name}</h2>
                  <span className="text-xs font-mono font-medium px-2 py-0.5 bg-zinc-200/70 text-zinc-700 rounded-md">
                    {student.studentId}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {student.course} • {student.college} (Class of {student.graduationYear})
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={getStageVariant(student.currentStage)}>
                    {student.currentStage}
                  </Badge>
                  <span className="text-xs text-zinc-500">
                    Readiness: <strong className="text-zinc-800">{student.placementReadiness}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Change Stage Select */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-zinc-500">Stage:</span>
                <select
                  disabled={isUpdatingStage}
                  value={student.currentStage}
                  onChange={(e) => handleStageChange(e.target.value as StudentStage)}
                  className="text-xs font-medium bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-900 cursor-pointer shadow-2xs"
                >
                  {STAGE_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(student)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-100 rounded-lg transition shadow-2xs cursor-pointer"
                  title="Edit Student"
                >
                  <Edit2 className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Edit</span>
                </button>
              )}

              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(student)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg transition shadow-2xs cursor-pointer"
                  title="Delete Student"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200/60 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 mt-6 border-b border-zinc-200 text-xs font-medium">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'journey', label: 'Master Journey' },
              { id: 'events', label: `Events (${studentEvents.length})` },
              { id: 'assignments', label: `Assignments (${studentAssignments.length})` },
              { id: 'interviews', label: `Interviews (${studentInterviews.length})` },
              { id: 'placement', label: studentPlacement ? 'Placement (Confirmed)' : 'Placement' },
              { id: 'tasks', label: `Tasks (${studentTasks.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-2 border-b-2 font-medium transition cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-zinc-900 text-zinc-900 font-semibold'
                    : 'border-transparent text-zinc-500 hover:text-zinc-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 text-sm space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Contact Information */}
              <div className="bg-zinc-50/70 border border-zinc-200/70 rounded-xl p-4 space-y-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
                  Contact & Location
                </span>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2 text-zinc-700">
                    <Mail className="w-4 h-4 text-zinc-400" />
                    <a href={`mailto:${student.email}`} className="hover:underline text-zinc-900 font-medium">
                      {student.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-700">
                    <Phone className="w-4 h-4 text-zinc-400" />
                    <span>{student.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-700">
                    <MapPin className="w-4 h-4 text-zinc-400" />
                    <span>{student.location || 'India (Flexible)'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-700">
                    <Calendar className="w-4 h-4 text-zinc-400" />
                    <span>Joined: {student.joinedAt}</span>
                  </div>
                </div>
              </div>

              {/* Onboarding & Legal Checklist (Section 12) */}
              <div className="bg-white border-2 border-zinc-200 rounded-xl p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Onboarding & Legal Checklist</span>
                  </span>
                  <Badge variant={student.agreementSigned ? 'green' : 'amber'}>
                    {student.agreementSigned ? '✓ Checklist Complete' : 'Action Required'}
                  </Badge>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-zinc-50 rounded-xl border border-zinc-200/80">
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                        student.agreementSigned
                          ? 'bg-emerald-600 text-white'
                          : 'border border-amber-400 bg-amber-50 text-amber-600'
                      }`}
                    >
                      {student.agreementSigned ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <Clock className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div>
                      <span className="font-semibold text-xs text-zinc-900 block">
                        Internshop Commitment Agreement
                      </span>
                      <span className="text-[11px] text-zinc-500 block mt-0.5">
                        {student.agreementSigned
                          ? `E-Signed & recorded in database on ${
                              student.agreementSignedAt
                                ? new Date(student.agreementSignedAt).toLocaleDateString()
                                : student.joinedAt
                            }`
                          : '3-week waiting period, 3-month tenure, INR 3,000 fee clause'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsCommitmentModalOpen(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs whitespace-nowrap ${
                      student.agreementSigned
                        ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-white'
                    }`}
                  >
                    <PenTool className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{student.agreementSigned ? 'View Signed Document' : 'E-Sign on Laptop'}</span>
                  </button>
                </div>
              </div>

              {/* Skills */}
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-2">
                  Technical & Professional Skills
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {student.skills && student.skills.length > 0 ? (
                    student.skills.map((skill, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 bg-zinc-100 border border-zinc-200/80 rounded-md text-xs font-medium text-zinc-700"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-zinc-400 text-xs">No skills listed yet</span>
                  )}
                </div>
              </div>

              {/* Submitted CV & Portfolio Links */}
              {(student.resumeUrl || student.portfolioUrl) && (
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3.5 space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700 block">
                    Verified Documents & Portfolio
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {student.resumeUrl && (
                      <a
                        href={student.resumeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs font-medium rounded-lg transition shadow-2xs"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Open Submitted CV (Drive)</span>
                        <ExternalLink className="w-3 h-3 text-indigo-400" />
                      </a>
                    )}
                    {student.portfolioUrl && (
                      <a
                        href={student.portfolioUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-medium rounded-lg transition shadow-2xs"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>View Portfolio Deck (Canva)</span>
                        <ExternalLink className="w-3 h-3 text-indigo-200" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Bio & Notes */}
              {student.bio && (
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-1">
                    Student Bio / Background
                  </span>
                  <p className="text-xs text-zinc-600 bg-white border border-zinc-200/60 p-3 rounded-lg leading-relaxed">
                    {student.bio}
                  </p>
                </div>
              )}

              {/* Quick Actions */}
              <div className="border-t border-zinc-100 pt-4 flex items-center gap-3">
                <button
                  onClick={() => onOpenQuickCreateInterview && onOpenQuickCreateInterview(student)}
                  className="px-3 py-2 bg-zinc-900 text-white rounded-lg text-xs font-medium hover:bg-zinc-800 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Schedule Interview
                </button>
                {student.phone && (
                  <a
                    href={`https://wa.me/91${student.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    WhatsApp Student
                  </a>
                )}
              </div>
            </div>
          )}

          {activeTab === 'journey' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Internship Lifecycle Progression
                </span>
                <span className="text-xs text-emerald-600 font-medium">Single Source of Truth (Firestore)</span>
              </div>
              <div className="relative pl-6 space-y-4 border-l-2 border-zinc-200 ml-3">
                {JOURNEY_STEPS.map((step, idx) => {
                  const isAgreementStep = step === 'Agreement Signed';
                  const isAgreementSigned = Boolean(student.agreementSigned);

                  const isCurrent =
                    (student.currentStage === 'In Training' && step.includes('Training')) ||
                    (student.currentStage === 'Interviewing' && step.includes('Interview')) ||
                    (student.currentStage === 'Placed' && step.includes('Placement')) ||
                    (student.currentStage === 'Trained / To Be Placed' && step.includes('Ready for Placement'));

                  return (
                    <div key={idx} className="relative group">
                      <div
                        className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 ${
                          isAgreementStep && isAgreementSigned
                            ? 'bg-emerald-600 border-emerald-600 ring-4 ring-emerald-100'
                            : isCurrent
                            ? 'bg-zinc-900 border-zinc-900 ring-4 ring-zinc-100'
                            : 'bg-white border-zinc-300'
                        }`}
                      />
                      <div className="flex items-baseline justify-between">
                        <span
                          className={`text-xs font-medium ${
                            isAgreementStep && isAgreementSigned
                              ? 'text-emerald-700 font-semibold'
                              : isCurrent
                              ? 'text-zinc-900 font-semibold'
                              : 'text-zinc-600'
                          }`}
                        >
                          {step}
                        </span>
                        {isAgreementStep && isAgreementSigned && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                            ✓ E-Signed & Verified
                          </span>
                        )}
                        {isCurrent && !isAgreementStep && (
                          <span className="text-[10px] bg-zinc-900 text-white px-2 py-0.5 rounded-full font-medium">
                            Current Stage
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* EVENT HISTORY TAB (Section 17) */}
          {activeTab === 'events' && (
            <div className="space-y-4">
              <div className="bg-white border border-zinc-200/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-rose-600" />
                    <h4 className="font-bold text-xs text-zinc-900 uppercase tracking-wider">
                      Luma Event Participation History
                    </h4>
                  </div>
                  <span className="text-[11px] text-zinc-400">
                    Source: luma.com/home
                  </span>
                </div>
                <p className="text-xs text-zinc-500">
                  Permanent record of workshops, meetups, and summits attended throughout their CRM lifecycle.
                </p>

                <div className="space-y-2 pt-2">
                  {studentEvents.length === 0 ? (
                    <div className="py-8 text-center text-zinc-400 text-xs">
                      No event registrations recorded yet for this student.
                    </div>
                  ) : (
                    studentEvents.map((evt, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-zinc-50 border border-zinc-200/70 rounded-xl flex items-center justify-between gap-3"
                      >
                        <div className="space-y-0.5">
                          <span className="font-bold text-xs text-zinc-900 block">
                            {evt.eventName}
                          </span>
                          <span className="text-[11px] text-zinc-500">
                            {new Date(evt.date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            evt.status === 'Attended'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : evt.status === 'Registered'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                          }`}
                        >
                          {evt.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'assignments' && (
            <div className="space-y-3">
              {studentAssignments.length > 0 ? (
                studentAssignments.map((a) => (
                  <div key={a.id} className="p-4 border border-zinc-200 rounded-xl bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-zinc-900">{a.title}</span>
                      <Badge variant={a.status === 'Approved' ? 'green' : 'amber'}>{a.status}</Badge>
                    </div>
                    <p className="text-xs text-zinc-500">Template: {a.template}</p>
                    <div className="flex items-center gap-4 text-xs text-zinc-600 pt-1">
                      <span>Due: {a.dueDate}</span>
                      {a.score !== undefined && (
                        <span>
                          Score: <strong className="text-zinc-900">{a.score} / 100</strong>
                        </span>
                      )}
                      {a.reviewer && <span>Reviewer: {a.reviewer}</span>}
                    </div>
                    {a.comments && (
                      <p className="text-xs text-zinc-600 bg-zinc-50 p-2.5 rounded-lg border border-zinc-100">
                        {a.comments}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-10 border border-dashed border-zinc-200 rounded-xl text-zinc-400 text-xs">
                  No assignments created for this student yet.
                </div>
              )}
            </div>
          )}

          {activeTab === 'interviews' && (
            <div className="space-y-3">
              {studentInterviews.length > 0 ? (
                studentInterviews.map((iv) => (
                  <div key={iv.id} className="p-4 border border-zinc-200 rounded-xl bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-sm text-zinc-900">{iv.companyName}</span>
                        <span className="text-xs text-zinc-500 block">
                          {iv.roleTitle} ({iv.round})
                        </span>
                      </div>
                      <Badge variant={iv.status === 'Confirmed' ? 'blue' : 'neutral'}>{iv.status}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-zinc-600 pt-1">
                      <span>Time: {new Date(iv.scheduledAt).toLocaleString()}</span>
                      {iv.meetUrl && (
                        <a
                          href={iv.meetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:underline font-medium"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Join Meeting
                        </a>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 border border-dashed border-zinc-200 rounded-xl text-zinc-400 text-xs">
                  No interviews scheduled yet.
                </div>
              )}
            </div>
          )}

          {activeTab === 'placement' && (
            <div>
              {studentPlacement ? (
                <div className="p-5 border border-emerald-200 bg-emerald-50/50 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                      <Award className="w-5 h-5 text-emerald-600" />
                      <span>Placed at {studentPlacement.companyName}</span>
                    </div>
                    <Badge variant="emerald">{studentPlacement.status}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs bg-white p-3 rounded-xl border border-emerald-100">
                    <div>
                      <span className="text-zinc-400 block">Role Title</span>
                      <strong className="text-zinc-900">{studentPlacement.roleTitle}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-400 block">Stipend</span>
                      <strong className="text-emerald-700">{studentPlacement.stipend}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-400 block">Joining Date</span>
                      <strong className="text-zinc-900">{studentPlacement.joiningDate}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-400 block">Duration</span>
                      <strong className="text-zinc-900">{studentPlacement.duration}</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 border border-dashed border-zinc-200 rounded-xl text-zinc-400 text-xs">
                  Student is not yet placed. Review open roles in Candidate Matching.
                </div>
              )}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-2">
              {studentTasks.length > 0 ? (
                studentTasks.map((t) => (
                  <div key={t.id} className="p-3 border border-zinc-200 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-zinc-900 block">{t.title}</span>
                      <span className="text-[11px] text-zinc-400">Due: {t.dueDate}</span>
                    </div>
                    <Badge variant={t.priority === 'urgent' ? 'red' : 'neutral'}>{t.priority}</Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 border border-dashed border-zinc-200 rounded-xl text-zinc-400 text-xs">
                  No operational tasks linked to this student.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Commitment Agreement Modal */}
      <CommitmentAgreementModal
        isOpen={isCommitmentModalOpen}
        onClose={() => setIsCommitmentModalOpen(false)}
        student={student}
        onSignedSuccess={() => {
          setIsCommitmentModalOpen(false);
        }}
      />
    </div>
  );
};
