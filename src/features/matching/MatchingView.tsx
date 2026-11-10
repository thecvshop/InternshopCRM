import React, { useState, useMemo, useEffect } from 'react';
import {
  Building2,
  Search,
  CheckSquare,
  Square,
  Share2,
  Sparkles,
  ExternalLink,
  Calendar,
  MessageSquare,
  FileText,
  Check,
  Copy,
  Filter,
  GraduationCap,
  Briefcase,
  X,
} from 'lucide-react';
import { Student, JobRole, Company } from '../../types/crm';
import { PARTNER_COMPANY_ROLES } from '../../data/partnerCompanyRoles';
import { Badge } from '../../components/common/Badge';

interface MatchingViewProps {
  students: Student[];
  roles: JobRole[];
  companies: Company[];
  initialCompanyId?: string;
  initialRoleId?: string;
  onScheduleInterview?: (student: Student, role: JobRole) => void;
}

export const MatchingView: React.FC<MatchingViewProps> = ({
  students,
  roles,
  companies,
  initialCompanyId,
  initialRoleId,
  onScheduleInterview,
}) => {
  // Combine Firestore roles with standard partner company roles without duplicates
  const allRoles = useMemo(() => {
    const map = new Map<string, JobRole>();
    // 1. Load standard partner company roles as baseline
    PARTNER_COMPANY_ROLES.forEach((r) => map.set(r.id, r));
    // 2. Overlay any updated or newly added roles from Firestore
    (roles || []).forEach((r) => {
      if (r && r.id) {
        map.set(r.id, r);
      }
    });
    return Array.from(map.values());
  }, [roles]);

  // Distinct company list with open roles count
  const companyOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; rolesCount: number }>();

    // Seed with all companies prop
    (companies || []).forEach((c) => {
      map.set(c.id, { id: c.id, name: c.name, rolesCount: 0 });
    });

    // Count roles per company
    allRoles.forEach((r) => {
      const existing = map.get(r.companyId) || {
        id: r.companyId,
        name: r.companyName || 'Partner Company',
        rolesCount: 0,
      };
      existing.rolesCount += 1;
      map.set(r.companyId, existing);
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [companies, allRoles]);

  // Company selection state
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(initialCompanyId || 'all');

  // Roles available under current company selection
  const availableRoles = useMemo(() => {
    if (selectedCompanyId === 'all') return allRoles;
    return allRoles.filter(
      (r) =>
        r.companyId === selectedCompanyId ||
        r.companyName?.toLowerCase() === selectedCompanyId.toLowerCase()
    );
  }, [allRoles, selectedCompanyId]);

  // Selected role state
  const [selectedRoleId, setSelectedRoleId] = useState<string>(
    initialRoleId || availableRoles[0]?.id || allRoles[0]?.id || ''
  );

  // Sync selected role when company filter or available roles change
  useEffect(() => {
    if (initialRoleId && allRoles.some((r) => r.id === initialRoleId)) {
      setSelectedRoleId(initialRoleId);
      const matched = allRoles.find((r) => r.id === initialRoleId);
      if (matched?.companyId) {
        setSelectedCompanyId(matched.companyId);
      }
      return;
    }

    if (!selectedRoleId || !availableRoles.some((r) => r.id === selectedRoleId)) {
      if (availableRoles.length > 0) {
        setSelectedRoleId(availableRoles[0].id);
      } else if (allRoles.length > 0) {
        setSelectedRoleId(allRoles[0].id);
      }
    }
  }, [availableRoles, allRoles, initialRoleId, selectedRoleId]);

  const selectedRole =
    allRoles.find((r) => r.id === selectedRoleId) || availableRoles[0] || allRoles[0];

  // Candidates state
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [stageFilter, setStageFilter] = useState<'all' | 'trained' | 'training' | 'placed'>('all');
  const [sortBy, setSortBy] = useState<'match' | 'name' | 'gradYear'>('match');
  const [showShortlistModal, setShowShortlistModal] = useState(false);
  const [copiedFeedback, setCopiedFeedback] = useState(false);

  // Calculate skill match score and identify matching skills
  const calculateMatchDetails = (student: Student, role?: JobRole) => {
    if (!role || !role.skills || role.skills.length === 0) {
      return { score: 75, matchedSkills: [] };
    }

    const studentSkillsLower = (student.skills || []).map((s) => s.toLowerCase().trim());
    const matchedSkills = role.skills.filter((reqSkill) => {
      const reqLower = reqSkill.toLowerCase().trim();
      return studentSkillsLower.some(
        (sSkill) => sSkill.includes(reqLower) || reqLower.includes(sSkill)
      );
    });

    const score = Math.round((matchedSkills.length / role.skills.length) * 100);
    return { score, matchedSkills };
  };

  // Filter students
  const eligibleStudents = students.filter((s) => s.currentStage !== "Didn't Work Out");

  const filteredStudents = useMemo(() => {
    const q = search.toLowerCase().trim();

    return eligibleStudents
      .filter((s) => {
        const matchesSearch =
          !q ||
          s.name.toLowerCase().includes(q) ||
          (s.college && s.college.toLowerCase().includes(q)) ||
          (s.location && s.location.toLowerCase().includes(q)) ||
          (s.skills && s.skills.some((sk) => sk.toLowerCase().includes(q)));

        const matchesSkill =
          !skillFilter ||
          (s.skills && s.skills.some((sk) => sk.toLowerCase().includes(skillFilter.toLowerCase())));

        let matchesStage = true;
        if (stageFilter === 'trained') {
          matchesStage = s.currentStage === 'Trained / To Be Placed';
        } else if (stageFilter === 'training') {
          matchesStage = s.currentStage === 'In Training' || s.currentStage === 'Portfolio Review';
        } else if (stageFilter === 'placed') {
          matchesStage = s.currentStage === 'Placed';
        }

        return matchesSearch && matchesSkill && matchesStage;
      })
      .sort((a, b) => {
        if (sortBy === 'match') {
          const scoreA = calculateMatchDetails(a, selectedRole).score;
          const scoreB = calculateMatchDetails(b, selectedRole).score;
          return scoreB - scoreA;
        }
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        }
        return (b.graduationYear || '2026').localeCompare(a.graduationYear || '2026');
      });
  }, [eligibleStudents, search, skillFilter, stageFilter, sortBy, selectedRole]);

  const toggleSelectStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map((s) => s.id));
    }
  };

  const shortlistedStudents = students.filter((s) => selectedStudentIds.includes(s.id));

  // Copy shortlist to clipboard
  const handleCopyShortlist = () => {
    const text =
      `InternsHome Candidate Shortlist\n` +
      `Target Role: ${selectedRole?.companyName} — ${selectedRole?.title} (${selectedRole?.stipend})\n` +
      `Work Mode: ${selectedRole?.workMode} • ${selectedRole?.location}\n` +
      `Required Skills: ${selectedRole?.skills?.join(', ')}\n\n` +
      `Shortlisted Candidates (${shortlistedStudents.length}):\n` +
      shortlistedStudents
        .map(
          (s, i) =>
            `${i + 1}. ${s.name} | ${s.college} (${s.graduationYear})\n` +
            `   Skills: ${s.skills?.join(', ')}\n` +
            `   Status: ${s.currentStage} | Contact: ${s.phone || s.email}` +
            (s.portfolioUrl ? `\n   Portfolio: ${s.portfolioUrl}` : '') +
            (s.resumeUrl ? `\n   Resume: ${s.resumeUrl}` : '')
        )
        .join('\n\n');

    navigator.clipboard.writeText(text);
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 3000);
  };

  return (
    <div className="space-y-4">
      {/* Top Overview & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-zinc-200/80 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Candidate Matching & Role Alignment</span>
          </h2>
          <p className="text-xs text-zinc-500">
            Align candidate talent pool ({students.length} applicants) with open internship requirements across {companyOptions.length} partner companies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={selectedStudentIds.length === 0}
            onClick={() => setShowShortlistModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 text-white rounded-lg text-xs font-semibold hover:bg-zinc-800 disabled:opacity-40 transition cursor-pointer shadow-xs"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Generate Client Shortlist ({selectedStudentIds.length})</span>
          </button>
        </div>
      </div>

      {/* Company Quick-Filter Tabs */}
      <div className="bg-white p-3 rounded-xl border border-zinc-200/80 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-zinc-400" />
            <span>Filter by Hiring Partner Company:</span>
          </span>
          <span className="text-[11px] text-zinc-400">
            {allRoles.length} active roles across {companyOptions.length} companies
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => {
              setSelectedCompanyId('all');
              if (allRoles.length > 0) setSelectedRoleId(allRoles[0].id);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer shrink-0 ${
              selectedCompanyId === 'all'
                ? 'bg-zinc-900 text-white shadow-xs font-semibold'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            All Companies ({allRoles.length} roles)
          </button>

          {companyOptions.map((comp) => {
            const isSelected = selectedCompanyId === comp.id;
            return (
              <button
                key={comp.id}
                onClick={() => {
                  setSelectedCompanyId(comp.id);
                  const firstRole = allRoles.find((r) => r.companyId === comp.id);
                  if (firstRole) setSelectedRoleId(firstRole.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-zinc-900 text-white shadow-xs font-semibold'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                <span>{comp.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                    isSelected ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-200 text-zinc-600'
                  }`}
                >
                  {comp.rolesCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Target Role Selector & Details Banner */}
      <div className="bg-white border border-zinc-200/80 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-zinc-400" />
              <span>Target Role:</span>
            </span>

            <select
              value={selectedRole?.id || ''}
              onChange={(e) => setSelectedRoleId(e.target.value)}
              className="text-xs font-bold text-zinc-900 bg-zinc-50 border border-zinc-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-900 cursor-pointer min-w-[320px] max-w-full"
            >
              {selectedCompanyId === 'all' ? (
                companyOptions.map((comp) => {
                  const compRoles = allRoles.filter((r) => r.companyId === comp.id);
                  if (compRoles.length === 0) return null;
                  return (
                    <optgroup key={comp.id} label={`${comp.name} (${compRoles.length} roles)`}>
                      {compRoles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.companyName} — {r.title} ({r.stipend})
                        </option>
                      ))}
                    </optgroup>
                  );
                })
              ) : (
                availableRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} — {r.stipend} ({r.workMode})
                  </option>
                ))
              )}
            </select>
          </div>

          {selectedRole && (
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                {selectedRole.stipend}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 font-medium">
                {selectedRole.workMode}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 font-medium">
                {selectedRole.location}
              </span>
            </div>
          )}
        </div>

        {/* Selected Role Detailed Summary */}
        {selectedRole && (
          <div className="p-3 bg-zinc-50/70 border border-zinc-200/70 rounded-lg space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-900">
                  {selectedRole.companyName} • {selectedRole.title}
                </span>
                <span className="text-[11px] text-zinc-500">({selectedRole.department})</span>
              </div>
              <div className="text-[11px] text-zinc-500">
                Duration: <strong className="text-zinc-700">{selectedRole.duration || '3-6 Months'}</strong> • Openings:{' '}
                <strong className="text-zinc-700">{selectedRole.openings || 1}</strong>
              </div>
            </div>

            {selectedRole.requirements && (
              <p className="text-xs text-zinc-600 italic">
                "{selectedRole.requirements}"
              </p>
            )}

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-semibold text-zinc-500 mr-1">Required Skills:</span>
              {selectedRole.skills?.map((sk, idx) => (
                <button
                  key={idx}
                  onClick={() => setSkillFilter(skillFilter === sk ? '' : sk)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                    skillFilter === sk
                      ? 'bg-zinc-900 text-white'
                      : 'bg-white border border-zinc-200 text-zinc-700 hover:border-zinc-400'
                  }`}
                  title="Click to filter candidates with this skill"
                >
                  {sk} {skillFilter === sk && '✕'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-zinc-200/80 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative w-64">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search candidate name, college, city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>

          <div className="relative w-52">
            <input
              type="text"
              placeholder="Filter by skill (e.g. Canva, Video editing)..."
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
            {skillFilter && (
              <button
                onClick={() => setSkillFilter('')}
                className="absolute right-2 top-2 text-zinc-400 hover:text-zinc-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Stage Filter */}
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs border border-zinc-200 rounded-lg bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          >
            <option value="all">All Stages ({eligibleStudents.length})</option>
            <option value="trained">Trained / To Be Placed</option>
            <option value="training">In Training / Portfolio</option>
            <option value="placed">Placed Candidates</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs border border-zinc-200 rounded-lg bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          >
            <option value="match">Sort: Highest Match %</option>
            <option value="name">Sort: Candidate Name (A-Z)</option>
            <option value="gradYear">Sort: Graduation Year</option>
          </select>
        </div>

        <div className="flex items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-zinc-100">
          <span className="text-xs text-zinc-500">
            Showing <strong>{filteredStudents.length}</strong> candidates
          </span>

          <button
            onClick={toggleSelectAll}
            className="text-xs font-semibold text-zinc-700 hover:text-zinc-900 transition flex items-center gap-1.5 cursor-pointer"
          >
            {selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0 ? (
              <CheckSquare className="w-4 h-4 text-zinc-900" />
            ) : (
              <Square className="w-4 h-4 text-zinc-400" />
            )}
            <span>Select All Filtered ({filteredStudents.length})</span>
          </button>
        </div>
      </div>

      {/* Candidate Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredStudents.map((student) => {
          const { score: matchScore, matchedSkills } = calculateMatchDetails(student, selectedRole);
          const isSelected = selectedStudentIds.includes(student.id);
          const rawPhone = student.phone ? student.phone.replace(/[^0-9]/g, '').slice(-10) : '';

          return (
            <div
              key={student.id}
              className={`p-4 rounded-xl border transition-all bg-white space-y-3 relative flex flex-col justify-between ${
                isSelected
                  ? 'border-zinc-900 ring-2 ring-zinc-900 shadow-sm'
                  : 'border-zinc-200/90 hover:border-zinc-300 hover:shadow-xs'
              }`}
            >
              <div className="space-y-3">
                {/* Header with Checkbox and Match Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <button
                      onClick={() => toggleSelectStudent(student.id)}
                      className="mt-0.5 cursor-pointer"
                      title={isSelected ? 'Deselect candidate' : 'Select candidate for shortlist'}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-zinc-900" />
                      ) : (
                        <Square className="w-4 h-4 text-zinc-300 hover:text-zinc-500" />
                      )}
                    </button>

                    <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {student.name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')}
                    </div>

                    <div>
                      <h4 className="font-bold text-xs text-zinc-900 hover:underline cursor-pointer">
                        {student.name}
                      </h4>
                      <span className="text-[11px] text-zinc-500 block leading-tight">
                        {student.college} • {student.graduationYear || '2026'}
                      </span>
                      {student.location && (
                        <span className="text-[10px] text-zinc-400 block">{student.location}</span>
                      )}
                    </div>
                  </div>

                  {/* Match Score Badge */}
                  <div className="text-right shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                        matchScore >= 75
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : matchScore >= 40
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      {matchScore >= 75 && <Sparkles className="w-3 h-3 text-emerald-600" />}
                      {matchScore}% Match
                    </span>
                  </div>
                </div>

                {/* Candidate Skills Breakdown */}
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-zinc-400 block uppercase tracking-wider">
                    Skills ({student.skills?.length || 0}):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {student.skills?.map((sk, i) => {
                      const isMatchingSkill = matchedSkills.some((ms) =>
                        ms.toLowerCase().includes(sk.toLowerCase()) ||
                        sk.toLowerCase().includes(ms.toLowerCase())
                      );

                      return (
                        <span
                          key={i}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                            isMatchingSkill
                              ? 'bg-emerald-100 text-emerald-900 font-bold border border-emerald-200/80 shadow-2xs'
                              : 'bg-zinc-100 text-zinc-600'
                          }`}
                        >
                          {isMatchingSkill && <Check className="w-2.5 h-2.5 text-emerald-700" />}
                          {sk}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Card Footer: Links & Interview Button */}
              <div className="space-y-2 pt-2 border-t border-zinc-100">
                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span>
                    Stage: <strong className="text-zinc-800">{student.currentStage}</strong>
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">{student.studentId}</span>
                </div>

                <div className="flex items-center justify-between gap-1.5 pt-1">
                  <div className="flex items-center gap-1.5">
                    {student.resumeUrl && (
                      <a
                        href={student.resumeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition"
                        title="View Resume / CV"
                      >
                        <FileText className="w-2.5 h-2.5" />
                        <span>CV</span>
                      </a>
                    )}

                    {student.portfolioUrl && (
                      <a
                        href={student.portfolioUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition"
                        title="View Portfolio"
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                        <span>Portfolio</span>
                      </a>
                    )}

                    {rawPhone && (
                      <a
                        href={`https://wa.me/91${rawPhone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
                        title={`WhatsApp +91 ${rawPhone}`}
                      >
                        <MessageSquare className="w-2.5 h-2.5" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                  </div>

                  {onScheduleInterview && selectedRole && (
                    <button
                      onClick={() => onScheduleInterview(student, selectedRole)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold rounded bg-zinc-900 text-white hover:bg-zinc-800 transition cursor-pointer"
                    >
                      <Calendar className="w-2.5 h-2.5" />
                      <span>Interview</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredStudents.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-zinc-200 space-y-2">
          <GraduationCap className="w-8 h-8 text-zinc-300 mx-auto" />
          <h3 className="text-sm font-semibold text-zinc-700">No candidates match current filter criteria</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Try clearing search terms or filtering by a different skill requirement.
          </p>
          <button
            onClick={() => {
              setSearch('');
              setSkillFilter('');
              setStageFilter('all');
            }}
            className="px-3 py-1.5 bg-zinc-100 text-zinc-700 rounded-lg text-xs font-medium hover:bg-zinc-200 transition cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Client Shortlist Modal */}
      {showShortlistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl border border-zinc-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-start border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-bold text-zinc-900 text-base">Client Candidate Shortlist</h3>
                <p className="text-xs text-zinc-500">
                  Prepared for <strong className="text-zinc-800">{selectedRole?.companyName}</strong> —{' '}
                  <strong className="text-zinc-800">{selectedRole?.title}</strong> ({selectedRole?.stipend})
                </p>
              </div>
              <button
                onClick={() => setShowShortlistModal(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 text-xs pr-1">
              <div className="p-3 bg-zinc-50 rounded-lg text-zinc-600 text-xs border border-zinc-100">
                This shortlist presents pre-screened talent from the InternsHome talent pipeline matching{' '}
                <strong>{selectedRole?.companyName}</strong>'s required skills ({selectedRole?.skills?.join(', ')}).
              </div>

              {shortlistedStudents.map((s, idx) => {
                const { score: matchScore, matchedSkills } = calculateMatchDetails(s, selectedRole);

                return (
                  <div
                    key={s.id}
                    className="p-3.5 border border-zinc-200/90 rounded-xl bg-white space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-zinc-400 font-bold text-xs">{idx + 1}.</span>
                        <div>
                          <span className="font-bold text-zinc-900 text-sm">{s.name}</span>
                          <span className="text-zinc-500 block text-xs">
                            {s.college} • {s.course} ({s.graduationYear})
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {matchScore}% Skill Match
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 pt-1">
                      {s.skills?.map((sk, i) => {
                        const isMatch = matchedSkills.some((ms) =>
                          ms.toLowerCase().includes(sk.toLowerCase())
                        );
                        return (
                          <span
                            key={i}
                            className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                              isMatch
                                ? 'bg-emerald-100 text-emerald-900 font-semibold'
                                : 'bg-zinc-100 text-zinc-600'
                            }`}
                          >
                            {sk}
                          </span>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-zinc-500 pt-1 border-t border-zinc-100">
                      <span>Phone: {s.phone || 'On file'}</span>
                      <span>Email: {s.email}</span>
                      {s.portfolioUrl && (
                        <a
                          href={s.portfolioUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-purple-600 hover:underline font-medium"
                        >
                          View Portfolio →
                        </a>
                      )}
                      {s.resumeUrl && (
                        <a
                          href={s.resumeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline font-medium"
                        >
                          View Resume →
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-zinc-100 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs text-zinc-500">
                Total candidates selected: <strong>{shortlistedStudents.length}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyShortlist}
                  className="px-3.5 py-1.5 border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedFeedback ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Copy Shortlist Text</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-semibold hover:bg-zinc-800 transition cursor-pointer"
                >
                  Print / Save PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
