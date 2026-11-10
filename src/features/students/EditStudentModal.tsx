import React, { useState, useEffect } from 'react';
import { X, Save, User, GraduationCap, Mail, Phone, Briefcase, Award, Globe, FileText, Loader2 } from 'lucide-react';
import { Student, StudentStage, PlacementReadiness } from '../../types/crm';
import { updateStudent } from '../../services/firestoreService';

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onSuccess?: () => void;
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

const READINESS_OPTIONS: PlacementReadiness[] = ['Not Ready', 'In Training', 'Interview Ready', 'Placed'];

export const EditStudentModal: React.FC<EditStudentModalProps> = ({
  isOpen,
  onClose,
  student,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    college: '',
    course: '',
    graduationYear: '2026',
    currentStage: 'In Training' as StudentStage,
    placementReadiness: 'In Training' as PlacementReadiness,
    skills: '',
    portfolioUrl: '',
    resumeUrl: '',
    location: '',
    notes: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (student) {
      setFormData({
        name: student.name || '',
        email: student.email || '',
        phone: student.phone || '',
        college: student.college || '',
        course: student.course || '',
        graduationYear: student.graduationYear || '2026',
        currentStage: student.currentStage || 'In Training',
        placementReadiness: student.placementReadiness || 'In Training',
        skills: (student.skills || []).join(', '),
        portfolioUrl: student.portfolioUrl || '',
        resumeUrl: student.resumeUrl || '',
        location: student.location || '',
        notes: student.notes || '',
      });
      setError(null);
    }
  }, [student, isOpen]);

  if (!isOpen || !student) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Student name is required');
      return;
    }
    if (!formData.email.trim()) {
      setError('Student email is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const parsedSkills = formData.skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const updates: Partial<Student> = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        college: formData.college.trim(),
        course: formData.course.trim(),
        graduationYear: formData.graduationYear.trim(),
        currentStage: formData.currentStage,
        placementReadiness: formData.placementReadiness,
        skills: parsedSkills,
        portfolioUrl: formData.portfolioUrl.trim(),
        resumeUrl: formData.resumeUrl.trim(),
        location: formData.location.trim(),
        notes: formData.notes.trim(),
      };

      await updateStudent(student.id, updates, 'Operations Staff');

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to update student:', err);
      setError(err?.message || 'Failed to update student record. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold text-sm">
              {student.name?.[0] || 'S'}
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">Edit Student Profile</h3>
              <p className="text-xs text-zinc-500 font-mono">
                {student.studentId} • {student.college || 'Unassigned College'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          {/* Basic Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-zinc-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
                  placeholder="e.g. Aranya Roy"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-zinc-700 mb-1">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
                  placeholder="e.g. student@college.edu"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-zinc-700 mb-1">Phone / WhatsApp</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
                  placeholder="e.g. +91 9876543210"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-zinc-700 mb-1">Location / City</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
                placeholder="e.g. Kolkata, Hazra"
              />
            </div>
          </div>

          {/* College & Education */}
          <div className="pt-2 border-t border-zinc-100">
            <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2.5">
              Academic Background
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block font-medium text-zinc-700 mb-1">College / Institute</label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={formData.college}
                    onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
                    placeholder="e.g. St. Xavier's College"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-zinc-700 mb-1">Graduation Year</label>
                <input
                  type="text"
                  value={formData.graduationYear}
                  onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
                  placeholder="2026"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block font-medium text-zinc-700 mb-1">Course / Degree</label>
                <input
                  type="text"
                  value={formData.course}
                  onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
                  placeholder="e.g. B.Tech Computer Science / B.Sc Multimedia"
                />
              </div>
            </div>
          </div>

          {/* Internship Lifecycle & Placement */}
          <div className="pt-2 border-t border-zinc-100">
            <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2.5">
              Internship Stage & Readiness
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-zinc-700 mb-1">Current Lifecycle Stage</label>
                <select
                  value={formData.currentStage}
                  onChange={(e) => setFormData({ ...formData, currentStage: e.target.value as StudentStage })}
                  className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white text-zinc-800 cursor-pointer"
                >
                  {ALL_STAGES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-zinc-700 mb-1">Placement Readiness</label>
                <select
                  value={formData.placementReadiness}
                  onChange={(e) => setFormData({ ...formData, placementReadiness: e.target.value as PlacementReadiness })}
                  className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white text-zinc-800 cursor-pointer"
                >
                  {READINESS_OPTIONS.map((ro) => (
                    <option key={ro} value={ro}>
                      {ro}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Skills & Links */}
          <div className="pt-2 border-t border-zinc-100">
            <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2.5">
              Skills, Portfolio & CV
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block font-medium text-zinc-700 mb-1">
                  Skills (comma separated)
                </label>
                <div className="relative">
                  <Award className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={formData.skills}
                    onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
                    placeholder="e.g. React, TypeScript, Video Editing, CapCut, Figma"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Portfolio Link</label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                    <input
                      type="url"
                      value={formData.portfolioUrl}
                      onChange={(e) => setFormData({ ...formData, portfolioUrl: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Resume / CV Drive Link</label>
                  <div className="relative">
                    <FileText className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                    <input
                      type="url"
                      value={formData.resumeUrl}
                      onChange={(e) => setFormData({ ...formData, resumeUrl: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
                      placeholder="https://drive.google.com/..."
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-medium text-zinc-700 mb-1">Staff Notes / Observations</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white resize-none"
                  placeholder="Additional notes about availability, interview feedback, or commitments..."
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-100 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
