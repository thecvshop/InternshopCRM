import React, { useState, useMemo } from 'react';
import {
  Users,
  LayoutGrid,
  List,
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  MoreVertical,
  ExternalLink,
  Sparkles,
  GraduationCap,
  Building,
  Edit2,
  Trash2,
  AlertTriangle,
  Copy,
  CheckCircle2,
  Clock,
  FileCheck,
  PenTool,
} from 'lucide-react';
import { Student, StudentStage, Lead, Interview, Placement, TaskItem, Assignment } from '../../types/crm';
import { updateStudentStage } from '../../services/firestoreService';
import { Badge } from '../../components/common/Badge';
import { Student360Drawer } from './Student360Drawer';
import { SelectStudentModal } from './SelectStudentModal';
import { EditStudentModal } from './EditStudentModal';
import { DeleteStudentModal } from './DeleteStudentModal';
import { StudentDuplicatesModal } from './StudentDuplicatesModal';
import { CommitmentAgreementModal } from '../agreements/CommitmentAgreementModal';
import { detectDuplicates } from '../../utils/duplicateDetection';

interface StudentsViewProps {
  students: Student[];
  leads?: Lead[];
  interviews: Interview[];
  placements: Placement[];
  tasks: TaskItem[];
  assignments: Assignment[];
  onOpenQuickCreate: (stage?: StudentStage) => void;
  selectedStudent: Student | null;
  onSelectStudent: (student: Student | null) => void;
}

const INTERN_WALL_STAGES: StudentStage[] = [
  'In Training',
  'Trained / To Be Placed',
  'Interviewing',
  'Placed',
  "Didn't Work Out",
];

export const StudentsView: React.FC<StudentsViewProps> = ({
  students,
  leads = [],
  interviews,
  placements,
  tasks,
  assignments,
  onOpenQuickCreate,
  selectedStudent,
  onSelectStudent,
}) => {
  const [viewMode, setViewMode] = useState<'wall' | 'table'>('wall');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [collegeFilter, setCollegeFilter] = useState<string>('all');
  const [skillFilter, setSkillFilter] = useState<string>('all');

  // Select Student from Log Modal state
  const [isSelectStudentModalOpen, setIsSelectStudentModalOpen] = useState(false);
  const [modalTargetStage, setModalTargetStage] = useState<StudentStage>('In Training');

  // Edit and Delete Student Modal states
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [agreementModalStudent, setAgreementModalStudent] = useState<Student | null>(null);

  // Duplicate detection state
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);

  // Compute duplicate clusters in real-time
  const duplicateData = useMemo(() => {
    return detectDuplicates<Student>(students, (s: Student) => ({
      name: s.name,
      email: s.email,
      phone: s.phone,
    }));
  }, [students]);

  const handleOpenAddStudent = (stage: StudentStage = 'In Training') => {
    setModalTargetStage(stage);
    setIsSelectStudentModalOpen(true);
  };

  // Derive unique filter options
  const uniqueColleges = Array.from(new Set(students.map((s) => s.college).filter(Boolean)));
  const allSkills = Array.from(new Set(students.flatMap((s) => s.skills || [])));

  const filteredStudents = students.filter((s) => {
    // If showDuplicatesOnly is enabled, only show students in a duplicate cluster
    if (showDuplicatesOnly && !duplicateData.duplicateIdMap.has(s.id)) {
      return false;
    }

    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.studentId.toLowerCase().includes(q) ||
      s.college.toLowerCase().includes(q) ||
      s.skills.some((sk) => sk.toLowerCase().includes(q));

    const matchesStage = stageFilter === 'all' || s.currentStage === stageFilter;
    const matchesCollege = collegeFilter === 'all' || s.college === collegeFilter;
    const matchesSkill = skillFilter === 'all' || s.skills.includes(skillFilter);

    return matchesSearch && matchesStage && matchesCollege && matchesSkill;
  });

  // Drag and Drop handler for Intern Wall
  const handleDragStart = (e: React.DragEvent, studentId: string) => {
    e.dataTransfer.setData('text/plain', studentId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStage: StudentStage) => {
    e.preventDefault();
    const studentId = e.dataTransfer.getData('text/plain');
    const student = students.find((s) => s.id === studentId);
    if (student && student.currentStage !== targetStage) {
      await updateStudentStage(student, targetStage, 'Staff Drag & Drop');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-zinc-200/80 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, ID, college, skill..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>

          {/* College Filter */}
          <select
            value={collegeFilter}
            onChange={(e) => setCollegeFilter(e.target.value)}
            className="text-xs border border-zinc-200 rounded-lg px-2.5 py-1.5 bg-white text-zinc-700 cursor-pointer focus:outline-none"
          >
            <option value="all">All Colleges</option>
            {uniqueColleges.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>

          {/* Skill Filter */}
          <select
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            className="text-xs border border-zinc-200 rounded-lg px-2.5 py-1.5 bg-white text-zinc-700 cursor-pointer focus:outline-none"
          >
            <option value="all">All Skills</option>
            {allSkills.slice(0, 15).map((sk) => (
              <option key={sk} value={sk}>
                {sk}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
          {/* Duplicate Identification & Cleanup Action */}
          {duplicateData.totalDuplicateCount > 0 ? (
            <button
              type="button"
              onClick={() => setShowDuplicatesModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs whitespace-nowrap"
              title="Identify and remove duplicate student profiles"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Identify Duplicates ({duplicateData.totalDuplicateCount})</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowDuplicatesModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap border border-zinc-200"
              title="Scan directory for duplicate records"
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
              title="Filter view to only show records with duplicate matches"
            >
              <span>{showDuplicatesOnly ? 'Duplicates Only' : 'Filter Duplicates'}</span>
              <span className="font-mono text-[10px] bg-amber-200 text-amber-900 px-1.5 rounded-full font-bold">
                {duplicateData.duplicateIdMap.size}
              </span>
            </button>
          )}

          {/* View Toggle */}
          <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200/70">
            <button
              onClick={() => setViewMode('wall')}
              title="Intern Wall (Kanban)"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                viewMode === 'wall' ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Intern Wall</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="Student Directory Table View"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Directory Table</span>
            </button>
          </div>

          <button
            onClick={() => handleOpenAddStudent('In Training')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-medium hover:bg-zinc-800 transition cursor-pointer shadow-xs whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* INTERN WALL (KANBAN) */}
      {viewMode === 'wall' ? (
        <div className="flex gap-3.5 items-start overflow-x-auto pb-4 snap-x">
          {INTERN_WALL_STAGES.map((colStage) => {
            const stageStudents = filteredStudents.filter((s) => s.currentStage === colStage);
            return (
              <div
                key={colStage}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, colStage)}
                className="w-72 md:w-auto md:flex-1 md:min-w-[210px] shrink-0 bg-zinc-50/80 border border-zinc-200/80 rounded-xl p-3 flex flex-col min-h-[480px] transition-colors hover:border-zinc-300 snap-start"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-3 px-1 gap-1">
                  <span className="text-xs font-semibold text-zinc-800 truncate" title={colStage}>
                    {colStage}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-mono font-medium px-1.5 py-0.5 bg-zinc-200/80 text-zinc-700 rounded-full">
                      {stageStudents.length}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenAddStudent(colStage);
                      }}
                      className="p-1 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200/80 transition cursor-pointer"
                      title={`Add student to "${colStage}"`}
                      aria-label={`Add student to ${colStage}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="space-y-2 flex-1 flex flex-col">
                  {stageStudents.map((st) => (
                    <div
                      key={st.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, st.id)}
                      onClick={() => onSelectStudent(st)}
                      className="bg-white p-3 rounded-lg border border-zinc-200/80 hover:border-zinc-400 hover:shadow-xs transition cursor-grab active:cursor-grabbing space-y-2 group"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {st.name[0]}
                        </div>
                        <div className="truncate flex-1">
                          <div className="flex items-center gap-1.5 truncate">
                            <h4 className="font-semibold text-xs text-zinc-900 truncate group-hover:text-blue-600 transition">
                              {st.name}
                            </h4>
                            {duplicateData.duplicateIdMap.has(st.id) && (
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowDuplicatesModal(true);
                                }}
                                className="px-1 py-0.2 bg-amber-100 text-amber-900 border border-amber-300 rounded text-[9px] font-bold shrink-0 hover:bg-amber-200 transition cursor-pointer"
                                title={duplicateData.duplicateIdMap.get(st.id)?.join(', ')}
                              >
                                ⚠️ Duplicate
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-400 block truncate">{st.college}</span>
                        </div>
                        <div
                          className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => setEditingStudent(st)}
                            title="Edit Student"
                            className="p-1 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingStudent(st)}
                            title="Delete Student"
                            className="p-1 rounded-md text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Skills pill */}
                      {st.skills && st.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          <span className="px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded text-[10px] truncate max-w-full">
                            {st.skills[0]}
                          </span>
                          {st.skills.length > 1 && (
                            <span className="px-1 py-0.5 bg-zinc-100 text-zinc-400 rounded text-[9px]">
                              +{st.skills.length - 1}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Agreement Checklist Status */}
                      <div className="pt-1 border-t border-zinc-100 flex items-center justify-between text-[10px]">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAgreementModalStudent(st);
                          }}
                          className={`inline-flex items-center gap-1 font-semibold px-1.5 py-0.5 rounded text-[9px] transition cursor-pointer hover:opacity-80 ${
                            st.agreementSigned
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                          title={st.agreementSigned ? 'Click to view signed commitment agreement' : 'Click to open laptop E-Sign station'}
                        >
                          {st.agreementSigned ? '✓ Agreement Signed' : '⏳ E-Sign Pending'}
                        </button>
                        <span className="font-mono text-zinc-400">{st.studentId}</span>
                      </div>
                    </div>
                  ))}

                  {/* Empty State Drop & Quick-Add Zone */}
                  {stageStudents.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => handleOpenAddStudent(colStage)}
                      className="w-full h-28 border border-dashed border-zinc-300 hover:border-zinc-400 hover:bg-white rounded-lg flex flex-col items-center justify-center gap-1.5 text-zinc-400 hover:text-zinc-700 transition cursor-pointer p-3 group"
                    >
                      <div className="w-6 h-6 rounded-full bg-zinc-200/70 group-hover:bg-zinc-900 group-hover:text-white text-zinc-600 flex items-center justify-center transition">
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-medium text-zinc-700 group-hover:text-zinc-900">
                        Add Student
                      </span>
                      <span className="text-[10px] text-zinc-400">or drop cards here</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenAddStudent(colStage)}
                      className="w-full py-1.5 px-2 rounded-lg border border-dashed border-zinc-200 hover:border-zinc-400 hover:bg-white text-zinc-500 hover:text-zinc-900 text-[11px] font-medium flex items-center justify-center gap-1.5 transition cursor-pointer mt-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add to {colStage === 'Trained / To Be Placed' ? 'Trained' : colStage}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white border border-zinc-200/80 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50/80 border-b border-zinc-200/80 text-zinc-500 font-medium">
              <tr>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">College & Degree</th>
                <th className="py-3 px-4">Current Stage</th>
                <th className="py-3 px-4">Placement Readiness</th>
                <th className="py-3 px-4">Commitment Agreement</th>
                <th className="py-3 px-4">Top Skills</th>
                <th className="py-3 px-4">Enrolled Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredStudents.map((st) => (
                <tr
                  key={st.id}
                  onClick={() => onSelectStudent(st)}
                  className="hover:bg-zinc-50/80 transition cursor-pointer"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-zinc-800 text-white flex items-center justify-center font-semibold text-xs">
                        {st.name[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-zinc-900 block">{st.name}</span>
                          {duplicateData.duplicateIdMap.has(st.id) && (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowDuplicatesModal(true);
                              }}
                              className="px-1.5 py-0.2 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[9px] font-bold inline-flex items-center gap-1 hover:bg-amber-100 transition cursor-pointer"
                              title={duplicateData.duplicateIdMap.get(st.id)?.join(', ')}
                            >
                              <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                              <span>Duplicate</span>
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400">{st.studentId}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-zinc-800 block">{st.college}</span>
                    <span className="text-[10px] text-zinc-400">{st.course}</span>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={st.currentStage === 'Placed' ? 'green' : 'neutral'}>
                      {st.currentStage}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-zinc-700">{st.placementReadiness}</span>
                  </td>
                  <td className="py-3 px-4">
                    {st.agreementSigned ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAgreementModalStudent(st);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer transition"
                        title="Click to view signed commitment agreement"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Signed</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAgreementModalStudent(st);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white cursor-pointer transition shadow-2xs whitespace-nowrap"
                        title="Hand laptop to student to read and e-sign commitment agreement"
                      >
                        <PenTool className="w-3.5 h-3.5 text-emerald-400" />
                        <span>E-Sign on Laptop</span>
                      </button>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1 flex-wrap">
                      {st.skills?.slice(0, 2).map((sk, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded text-[10px]">
                          {sk}
                        </span>
                      ))}
                      {(st.skills?.length || 0) > 2 && (
                        <span className="text-[10px] text-zinc-400">+{st.skills.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-zinc-500">{st.joinedAt}</td>
                  <td className="py-3 px-4 text-right">
                    <div
                      className="flex items-center justify-end gap-1.5 whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => setEditingStudent(st)}
                        className="px-2.5 py-1 inline-flex items-center gap-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-medium transition cursor-pointer shadow-2xs"
                        title="Edit Student Profile"
                      >
                        <Edit2 className="w-3 h-3 text-zinc-500" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingStudent(st)}
                        className="px-2.5 py-1 inline-flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60 rounded-lg text-xs font-medium transition cursor-pointer shadow-2xs"
                        title="Delete Student Record"
                      >
                        <Trash2 className="w-3 h-3 text-rose-500" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400 text-xs">
                    No students match the criteria. Click "Add Student" to populate.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Student 360 Drawer */}
      <Student360Drawer
        student={selectedStudent}
        onClose={() => onSelectStudent(null)}
        interviews={interviews}
        placements={placements}
        tasks={tasks}
        assignments={assignments}
        onEdit={(st) => setEditingStudent(st)}
        onDelete={(st) => setDeletingStudent(st)}
      />

      {/* Select Student from Log Modal (Add Student Action) */}
      <SelectStudentModal
        isOpen={isSelectStudentModalOpen}
        onClose={() => setIsSelectStudentModalOpen(false)}
        targetStage={modalTargetStage}
        students={students}
        leads={leads}
        onStageChanged={(newStage) => setModalTargetStage(newStage)}
      />

      {/* Edit Student Modal (Edit Action) */}
      <EditStudentModal
        isOpen={Boolean(editingStudent)}
        onClose={() => setEditingStudent(null)}
        student={editingStudent}
        onSuccess={() => {
          setEditingStudent(null);
        }}
      />

      {/* Delete Student Modal (Delete Action) */}
      <DeleteStudentModal
        isOpen={Boolean(deletingStudent)}
        onClose={() => setDeletingStudent(null)}
        student={deletingStudent}
        onSuccess={() => {
          if (selectedStudent && deletingStudent && selectedStudent.id === deletingStudent.id) {
            onSelectStudent(null);
          }
          setDeletingStudent(null);
        }}
      />

      {/* Duplicate Identification & Cleanup Modal */}
      <StudentDuplicatesModal
        isOpen={showDuplicatesModal}
        onClose={() => setShowDuplicatesModal(false)}
        groups={duplicateData.groups}
        totalDuplicateCount={duplicateData.totalDuplicateCount}
        totalStudents={students.length}
        onSelectStudent={onSelectStudent}
      />

      {/* Commitment Agreement & E-Sign Station Modal */}
      <CommitmentAgreementModal
        isOpen={Boolean(agreementModalStudent)}
        onClose={() => setAgreementModalStudent(null)}
        student={agreementModalStudent}
        students={students}
      />
    </div>
  );
};
