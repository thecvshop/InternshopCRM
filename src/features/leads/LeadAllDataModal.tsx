import React, { useState } from 'react';
import {
  X,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Briefcase,
  Laptop,
  Smartphone,
  ExternalLink,
  FileText,
  Calendar,
  CheckCircle2,
  Copy,
  Check,
  MessageCircle,
  Building,
  UserCheck,
  Send,
  Sparkles,
  Award,
  Layers,
} from 'lucide-react';
import { Lead, LeadStatus, LEAD_STATUS_OPTIONS, resolveLeadStatus } from '../../types/crm';
import { updateLead } from '../../services/firestoreService';
import { ACTUAL_APPLICANTS_DATA, RawCsvApplicant } from '../../data/actualRecords';

// Cache lookup map by lowercase email
const applicantsMap = new Map<string, RawCsvApplicant>();
ACTUAL_APPLICANTS_DATA.forEach((app) => {
  if (app.email) {
    applicantsMap.set(app.email.toLowerCase().trim(), app);
  }
});

interface LeadAllDataModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (id: string, newStatus: LeadStatus) => Promise<void>;
  onConvert: (lead: Lead) => void;
  onShiftToBatch?: (lead: Lead) => void;
  isConverting: boolean;
}

export const LeadAllDataModal: React.FC<LeadAllDataModalProps> = ({
  lead,
  isOpen,
  onClose,
  onStatusChange,
  onConvert,
  onShiftToBatch,
  isConverting,
}) => {
  const [activeTab, setActiveTab] = useState<'all_data' | 'notes' | 'outreach'>('all_data');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen || !lead) return null;

  // Look up raw applicant data for extra fields if needed
  const rawApp = applicantsMap.get(lead.email?.toLowerCase().trim());

  const notesText = lead.notes || '';
  const cvFromNotes = notesText.match(/CV:\s*(https?:\/\/[^\s\n\r]+)/i)?.[1];
  const hazraFromNotes = notesText.match(/Hazra Office Willingness:\s*([^\n\r]+)/i)?.[1];
  const laptopFromNotes = notesText.match(/Laptop:\s*([^\(\n\r]+)/i)?.[1]?.trim();
  const laptopModelFromNotes = notesText.match(/Laptop:\s*[^\(]+\(([^\)]+)\)/i)?.[1];
  const deviceFromNotes = notesText.match(/Phone:\s*([^\n\r]+)/i)?.[1];
  const commitmentFromNotes = notesText.match(/Commitment:\s*([^\n\r]+)/i)?.[1];
  const originalStatusMatch = notesText.match(/Original Form Status:\s*([^\n\r]+)/i)?.[1];

  const city = lead.city || rawApp?.city || 'Kolkata';
  const cvUrl = lead.cvUrl || rawApp?.cvUrl || cvFromNotes || null;
  const willingHazra =
    lead.willingHazraTraining || rawApp?.willingHazraTraining || hazraFromNotes || 'Not specified';
  const hasLaptop = lead.hasLaptop || rawApp?.hasLaptop || laptopFromNotes || 'Not specified';
  const laptopModel = lead.laptopModel || rawApp?.laptopModel || laptopModelFromNotes || 'N/A';
  const device = lead.device || rawApp?.device || deviceFromNotes || 'Not specified';
  const portfolioLink = lead.portfolioLink || rawApp?.portfolioLink || null;
  const brandAssigned = lead.brandAssigned || rawApp?.brandAssigned || null;
  const batchNumber = lead.batchNumber || rawApp?.batchNumber || null;
  const canJoinBy = lead.canJoinBy || rawApp?.canJoinBy || null;
  const placementCompany = lead.placementCompany || rawApp?.placementCompany || null;
  const originalStatus = originalStatusMatch || rawApp?.status || null;
  const appliedTimestamp = rawApp?.timestamp || lead.createdAt;

  const currentStatus = resolveLeadStatus(lead.status, lead.notes);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSaveNote = async () => {
    if (!noteInput.trim()) return;
    setIsSavingNote(true);
    try {
      const timestamp = new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      const noteEntry = `[${timestamp}] ${noteInput.trim()}`;
      const updatedNotes = lead.notes ? `${lead.notes}\n\n${noteEntry}` : noteEntry;

      await updateLead(lead.id, { notes: updatedNotes });
      setNoteInput('');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update lead notes:', err);
      alert('Failed to save note: ' + err);
    } finally {
      setIsSavingNote(false);
    }
  };

  const cleanPhone = lead.phone ? lead.phone.replace(/[^0-9]/g, '') : '';
  const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const waMessage = encodeURIComponent(
    `Hello ${lead.name}, this is from InternsHome Admissions team regarding your application for the ${lead.interestArea || 'Internship'} program. Are you available for a brief discussion?`
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div
        className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-200 bg-zinc-50/80 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
              {lead.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-zinc-900 truncate">{lead.name}</h2>
                <span className="font-mono text-xs bg-white text-zinc-700 px-2 py-0.5 rounded border border-zinc-200 shadow-2xs">
                  {lead.leadId}
                </span>
                {appliedTimestamp && (
                  <span className="text-xs text-zinc-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {appliedTimestamp}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 truncate mt-0.5">
                {lead.college} • {lead.course} ({lead.graduationYear})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onShiftToBatch && (
              <button
                type="button"
                onClick={() => {
                  onShiftToBatch(lead);
                  onClose();
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-xs"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Shift to Training Batch</span>
              </button>
            )}

            {currentStatus !== 'Approved for IS' ? (
              <button
                onClick={() => onConvert(lead)}
                disabled={isConverting}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>{isConverting ? 'Enrolling...' : 'Convert to Student'}</span>
              </button>
            ) : (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                Approved for IS ✓
              </span>
            )}

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/80 rounded-xl transition cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 border-b border-zinc-200 bg-white flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('all_data')}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'all_data'
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>View All Application Data</span>
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'notes'
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Screening Notes & History</span>
            {lead.notes && (
              <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('outreach')}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'outreach'
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Quick Outreach & Contact</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 bg-zinc-50/50">
          {/* TAB 1: ALL APPLICATION DATA */}
          {activeTab === 'all_data' && (
            <div className="space-y-4">
              {/* Status and Direct Conversion Bar */}
              <div className="bg-white p-4 rounded-xl border border-zinc-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-semibold text-zinc-500">Pipeline Stage:</span>
                  <select
                    value={currentStatus}
                    onChange={(e) => onStatusChange(lead.id, e.target.value as LeadStatus)}
                    className="text-xs font-semibold rounded-lg px-2.5 py-1.5 border border-zinc-300 bg-white text-zinc-900 cursor-pointer focus:outline-none shadow-2xs"
                  >
                    {LEAD_STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  {cvUrl && (
                    <a
                      href={cvUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold transition"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Open Submitted CV</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {portfolioLink && (
                    <a
                      href={portfolioLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 rounded-lg text-xs font-semibold transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Portfolio Link</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Data Grid: 4 Cards showing all 15+ candidate parameters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Academic & University Details */}
                <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 text-zinc-900 font-bold text-xs uppercase tracking-wide border-b border-zinc-100 pb-2">
                    <GraduationCap className="w-4 h-4 text-zinc-500" />
                    <span>Academic & Education Profile</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="col-span-2">
                      <span className="text-[11px] text-zinc-400 block font-medium">College / University</span>
                      <span className="text-zinc-900 font-semibold block mt-0.5">{lead.college}</span>
                    </div>

                    <div>
                      <span className="text-[11px] text-zinc-400 block font-medium">Degree / Course</span>
                      <span className="text-zinc-800 font-medium block mt-0.5">{lead.course || 'Undergraduate'}</span>
                    </div>

                    <div>
                      <span className="text-[11px] text-zinc-400 block font-medium">Graduation Year</span>
                      <span className="text-zinc-800 font-medium block mt-0.5">{lead.graduationYear || '2026'}</span>
                    </div>

                    {rawApp?.commitment && (
                      <div className="col-span-2">
                        <span className="text-[11px] text-zinc-400 block font-medium">Academic Commitment</span>
                        <span className="text-zinc-700 block mt-0.5">{rawApp.commitment}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Contact & Identity Information */}
                <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 text-zinc-900 font-bold text-xs uppercase tracking-wide border-b border-zinc-100 pb-2">
                    <Mail className="w-4 h-4 text-zinc-500" />
                    <span>Contact & Location</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="col-span-2">
                      <span className="text-[11px] text-zinc-400 block font-medium">Email Address</span>
                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <a href={`mailto:${lead.email}`} className="text-zinc-900 font-medium hover:underline truncate">
                          {lead.email}
                        </a>
                        <button
                          onClick={() => copyToClipboard(lead.email, 'email')}
                          className="text-zinc-400 hover:text-zinc-700 p-0.5 cursor-pointer"
                          title="Copy email"
                        >
                          {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] text-zinc-400 block font-medium">Phone Number</span>
                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <span className="text-zinc-900 font-mono font-medium">{lead.phone || 'N/A'}</span>
                        {lead.phone && (
                          <button
                            onClick={() => copyToClipboard(lead.phone, 'phone')}
                            className="text-zinc-400 hover:text-zinc-700 p-0.5 cursor-pointer"
                            title="Copy phone"
                          >
                            {copiedField === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] text-zinc-400 block font-medium">City / Location</span>
                      <div className="flex items-center gap-1 text-zinc-800 font-medium mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{city}</span>
                      </div>
                    </div>

                    <div className="col-span-2">
                      <span className="text-[11px] text-zinc-400 block font-medium">Acquisition Channel / Source</span>
                      <span className="inline-block mt-0.5 px-2.5 py-0.5 bg-zinc-100 text-zinc-700 rounded-md text-xs font-semibold">
                        {lead.source || 'Direct Application Form'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Logistics & Hardware Readiness */}
                <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 text-zinc-900 font-bold text-xs uppercase tracking-wide border-b border-zinc-100 pb-2">
                    <Laptop className="w-4 h-4 text-zinc-500" />
                    <span>Logistics, Hardware & Availability</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[11px] text-zinc-400 block font-medium">Hazra Office Training</span>
                      <span
                        className={`inline-block mt-0.5 px-2 py-0.5 rounded font-semibold text-xs border ${
                          willingHazra.toLowerCase().includes('yes')
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                        }`}
                      >
                        {willingHazra}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-zinc-400 block font-medium">Laptop for Work</span>
                      <div className="flex items-center gap-1 text-zinc-800 font-medium mt-0.5">
                        <span>{hasLaptop}</span>
                        {laptopModel && laptopModel !== 'N/A' && (
                          <span className="text-zinc-500 font-normal">({laptopModel})</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] text-zinc-400 block font-medium">Primary Mobile Device</span>
                      <div className="flex items-center gap-1 text-zinc-800 font-medium mt-0.5">
                        <Smartphone className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{device}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] text-zinc-400 block font-medium">Available to Join By</span>
                      <span className="text-zinc-800 font-medium block mt-0.5">{canJoinBy || 'Immediate'}</span>
                    </div>
                  </div>
                </div>

                {/* 4. Internship Domain, Batch & Placements */}
                <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 text-zinc-900 font-bold text-xs uppercase tracking-wide border-b border-zinc-100 pb-2">
                    <Briefcase className="w-4 h-4 text-zinc-500" />
                    <span>Internship Domain & Brand Assignment</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="col-span-2">
                      <span className="text-[11px] text-zinc-400 block font-medium">Target Responsibility / Domain</span>
                      <span className="inline-block mt-0.5 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md font-semibold text-xs">
                        {lead.interestArea || 'General Internship'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-zinc-400 block font-medium">Assigned Batch</span>
                      <span className="text-zinc-900 font-semibold block mt-0.5">
                        {batchNumber ? `Batch #${batchNumber}` : 'Pending Allotment'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-zinc-400 block font-medium">Assigned Brand</span>
                      <span className="text-indigo-700 font-semibold block mt-0.5">{brandAssigned || 'None'}</span>
                    </div>

                    {placementCompany && (
                      <div className="col-span-2">
                        <span className="text-[11px] text-zinc-400 block font-medium">Placement Matched Company</span>
                        <div className="flex items-center gap-1.5 text-emerald-700 font-bold mt-0.5">
                          <Building className="w-3.5 h-3.5" />
                          <span>{placementCompany}</span>
                        </div>
                      </div>
                    )}

                    {originalStatus && (
                      <div className="col-span-2">
                        <span className="text-[11px] text-zinc-400 block font-medium">Original Form Status</span>
                        <span className="text-zinc-600 font-mono text-xs bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200 block truncate mt-0.5">
                          {originalStatus}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NOTES & SCREENING LOG */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-zinc-900 font-bold text-xs uppercase tracking-wide">
                    <FileText className="w-4 h-4 text-zinc-500" />
                    <span>Candidate History & Interview Notes</span>
                  </div>
                  {saveSuccess && (
                    <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Note saved to profile!
                    </span>
                  )}
                </div>

                {lead.notes ? (
                  <div className="bg-zinc-50/80 p-4 rounded-xl border border-zinc-200 text-xs text-zinc-700 whitespace-pre-wrap font-sans max-h-72 overflow-y-auto leading-relaxed">
                    {lead.notes}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 italic p-4 bg-zinc-50 rounded-xl border border-zinc-200 text-center">
                    No notes recorded yet for this candidate.
                  </p>
                )}

                {/* Add New Note */}
                <div className="pt-2 border-t border-zinc-100 space-y-2">
                  <label className="text-[11px] font-semibold text-zinc-600 block">Add Screening / Interview Note</label>
                  <div className="flex gap-2">
                    <textarea
                      rows={3}
                      placeholder="Enter interview feedback, screening comments, or callback details..."
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveNote}
                      disabled={isSavingNote || !noteInput.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white rounded-lg text-xs font-semibold hover:bg-zinc-800 transition cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSavingNote ? 'Saving...' : 'Save Note'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: QUICK OUTREACH & ACTIONS */}
          {activeTab === 'outreach' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* WhatsApp */}
                {lead.phone ? (
                  <a
                    href={`https://wa.me/${waPhone}?text=${waMessage}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl flex flex-col items-center text-center gap-2 transition group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center group-hover:scale-105 transition">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-emerald-900 block">WhatsApp Chat</span>
                      <span className="text-[11px] text-emerald-700 mt-0.5 block">{lead.phone}</span>
                    </div>
                  </a>
                ) : (
                  <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex flex-col items-center text-center gap-2 opacity-50">
                    <MessageCircle className="w-5 h-5 text-zinc-400" />
                    <span className="text-xs text-zinc-400">No phone for WhatsApp</span>
                  </div>
                )}

                {/* Call */}
                {lead.phone ? (
                  <a
                    href={`tel:${lead.phone}`}
                    className="p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl flex flex-col items-center text-center gap-2 transition group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center group-hover:scale-105 transition">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-blue-900 block">Direct Call</span>
                      <span className="text-[11px] text-blue-700 mt-0.5 block">{lead.phone}</span>
                    </div>
                  </a>
                ) : (
                  <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex flex-col items-center text-center gap-2 opacity-50">
                    <Phone className="w-5 h-5 text-zinc-400" />
                    <span className="text-xs text-zinc-400">No phone number</span>
                  </div>
                )}

                {/* Email */}
                <a
                  href={`mailto:${lead.email}`}
                  className="p-4 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl flex flex-col items-center text-center gap-2 transition group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center group-hover:scale-105 transition">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-purple-900 block">Send Email</span>
                    <span className="text-[11px] text-purple-700 mt-0.5 block truncate max-w-[150px]">{lead.email}</span>
                  </div>
                </a>
              </div>

              {/* Conversion & Enrollment Callout */}
              <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Candidate Enrollment Action</h4>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Converting this lead creates an official student record in the Intern Directory, generates an official Student ID (`IH-2025-XXX`), and positions them in the Training & Placement Kanban Wall.
                </p>
                {currentStatus !== 'Approved for IS' ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {onShiftToBatch && (
                      <button
                        type="button"
                        onClick={() => {
                          onShiftToBatch(lead);
                          onClose();
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                      >
                        <GraduationCap className="w-4 h-4" />
                        <span>Shift to Training Batch (Removes from Leads)</span>
                      </button>
                    )}
                    <button
                      onClick={() => onConvert(lead)}
                      disabled={isConverting}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>{isConverting ? 'Enrolling Candidate...' : 'Enroll as Active Student'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-medium">
                    ✓ This candidate is already approved for IS.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-200 bg-white flex items-center justify-between shrink-0">
          <span className="text-xs text-zinc-400">
            Internal ID: <code className="font-mono text-zinc-600">{lead.id}</code>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold rounded-lg transition cursor-pointer border border-zinc-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
