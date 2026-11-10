import React, { useState } from 'react';
import {
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
  Clock,
  Building,
  UserCheck,
  Send,
  AlertCircle,
  Tag,
  ChevronUp,
  Maximize2,
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

interface LeadDetailsSectionProps {
  lead: Lead;
  currentStatus: LeadStatus;
  onStatusChange: (id: string, newStatus: LeadStatus) => Promise<void>;
  onConvert: (lead: Lead) => void;
  onShiftToBatch?: (lead: Lead) => void;
  isConverting: boolean;
  onClose?: () => void;
  onOpenModal?: () => void;
}

export const LeadDetailsSection: React.FC<LeadDetailsSectionProps> = ({
  lead,
  currentStatus,
  onStatusChange,
  onConvert,
  onShiftToBatch,
  isConverting,
  onClose,
  onOpenModal,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Look up raw applicant data for extra fields if needed
  const rawApp = applicantsMap.get(lead.email?.toLowerCase().trim());

  // Extract fields from lead or fallback
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
    <div className="bg-zinc-50/90 border-t border-b border-zinc-200/90 p-5 space-y-5 animate-in fade-in duration-150">
      {/* Top Header Strip with Identification and Quick Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-zinc-200 shadow-2xs">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
            {lead.name
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-zinc-900">{lead.name}</h3>
              <span className="font-mono text-[11px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded border border-zinc-200">
                {lead.leadId}
              </span>
              {appliedTimestamp && (
                <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Applied: {appliedTimestamp}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              {lead.college} • {lead.course} ({lead.graduationYear})
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap self-end lg:self-auto">
          {cvUrl && (
            <a
              href={cvUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold transition shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>View Submitted CV</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}

          {lead.phone && (
            <a
              href={`https://wa.me/${waPhone}?text=${waMessage}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition shadow-2xs"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>
          )}

          {lead.phone && (
            <a
              href={`tel:${lead.phone}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-lg text-xs font-medium transition shadow-2xs"
            >
              <Phone className="w-3.5 h-3.5 text-zinc-400" />
              <span>Call</span>
            </a>
          )}

          {onShiftToBatch && (
            <button
              type="button"
              onClick={() => onShiftToBatch(lead)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-xs"
              title="Shift candidate into training batch and remove from leads"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Shift to Training Batch</span>
            </button>
          )}

          {currentStatus !== 'Approved for IS' && currentStatus !== 'Placed' && currentStatus !== 'Training Period' && (
            <button
              onClick={() => onConvert(lead)}
              disabled={isConverting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-xs disabled:opacity-50"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{isConverting ? 'Enrolling...' : 'Convert to Enrolled Student'}</span>
            </button>
          )}

          {onOpenModal && (
            <button
              onClick={onOpenModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white hover:bg-zinc-800 rounded-lg text-xs font-semibold transition cursor-pointer shadow-2xs"
              title="Open full candidate dossier in tabbed modal"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Full Tabbed View</span>
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100 transition cursor-pointer ml-1"
              title="Collapse details"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Luma Event Origin Banner (Section 11, 16) */}
      {(lead.source === 'InternsHome Event' || lead.externalSource === 'Luma' || lead.eventName) && (
        <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-600 text-white">
                Luma Event Lead
              </span>
              <span className="font-bold text-xs text-zinc-900">
                {lead.eventName || lead.sourceDetail || 'InternsHome Community Event'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-600 pt-0.5">
              <span>Event Status: <strong>{lead.eventStatus || 'Registered'}</strong></span>
              {lead.lumaGuestId && <span>Guest ID: <code className="text-zinc-500 font-mono">{lead.lumaGuestId}</code></span>}
              {lead.registrationDate && (
                <span>Registered: {new Date(lead.registrationDate).toLocaleDateString('en-IN')}</span>
              )}
            </div>
          </div>

          <a
            href="https://luma.com/home"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:text-rose-800 self-start sm:self-auto"
          >
            <span>View in Luma Workspace</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* 4-Panel Grid of Full Student Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Panel 1: Contact & Identification */}
        <div className="bg-white p-3.5 rounded-xl border border-zinc-200 shadow-2xs space-y-2.5">
          <div className="flex items-center gap-1.5 text-zinc-800 font-bold text-xs uppercase tracking-wide border-b border-zinc-100 pb-2">
            <Mail className="w-3.5 h-3.5 text-zinc-500" />
            <span>Contact & Identity</span>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-[10px] text-zinc-400 block font-medium">Email Address</span>
              <div className="flex items-center justify-between gap-1 mt-0.5">
                <a
                  href={`mailto:${lead.email}`}
                  className="text-zinc-900 hover:underline truncate max-w-[170px]"
                  title={lead.email}
                >
                  {lead.email}
                </a>
                <button
                  onClick={() => copyToClipboard(lead.email, 'email')}
                  className="text-zinc-400 hover:text-zinc-700 p-0.5 cursor-pointer"
                  title="Copy email"
                >
                  {copiedField === 'email' ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-zinc-400 block font-medium">Phone Number</span>
              <div className="flex items-center justify-between gap-1 mt-0.5">
                <span className="text-zinc-900 font-mono">{lead.phone || 'N/A'}</span>
                {lead.phone && (
                  <button
                    onClick={() => copyToClipboard(lead.phone, 'phone')}
                    className="text-zinc-400 hover:text-zinc-700 p-0.5 cursor-pointer"
                    title="Copy phone"
                  >
                    {copiedField === 'phone' ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                )}
              </div>
            </div>

            <div>
              <span className="text-[10px] text-zinc-400 block font-medium">City / Location</span>
              <div className="flex items-center gap-1 text-zinc-800 mt-0.5">
                <MapPin className="w-3 h-3 text-zinc-400" />
                <span>{city}</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-zinc-400 block font-medium">Acquisition Source</span>
              <span className="inline-block mt-0.5 px-2 py-0.5 bg-zinc-100 text-zinc-700 rounded text-[11px] font-medium">
                {lead.source}
              </span>
            </div>
          </div>
        </div>

        {/* Panel 2: Academic Profile */}
        <div className="bg-white p-3.5 rounded-xl border border-zinc-200 shadow-2xs space-y-2.5">
          <div className="flex items-center gap-1.5 text-zinc-800 font-bold text-xs uppercase tracking-wide border-b border-zinc-100 pb-2">
            <GraduationCap className="w-3.5 h-3.5 text-zinc-500" />
            <span>Academic Background</span>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-[10px] text-zinc-400 block font-medium">College / University</span>
              <span className="text-zinc-900 font-medium block mt-0.5 leading-snug">{lead.college}</span>
            </div>

            <div>
              <span className="text-[10px] text-zinc-400 block font-medium">Course / Degree Stream</span>
              <span className="text-zinc-800 block mt-0.5">{lead.course || 'Undergraduate'}</span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-zinc-400 block font-medium">Graduation Year</span>
                <span className="text-zinc-800 font-medium mt-0.5 block">{lead.graduationYear}</span>
              </div>
              {rawApp?.commitment && (
                <div>
                  <span className="text-[10px] text-zinc-400 block font-medium">Degree Level</span>
                  <span className="text-zinc-700 text-[11px] mt-0.5 block">{rawApp.commitment}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Panel 3: Internship Preferences & Training */}
        <div className="bg-white p-3.5 rounded-xl border border-zinc-200 shadow-2xs space-y-2.5">
          <div className="flex items-center gap-1.5 text-zinc-800 font-bold text-xs uppercase tracking-wide border-b border-zinc-100 pb-2">
            <Briefcase className="w-3.5 h-3.5 text-zinc-500" />
            <span>Preferences & Training</span>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-[10px] text-zinc-400 block font-medium">Target Responsibility / Domain</span>
              <span className="inline-block mt-0.5 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-semibold text-[11px]">
                {lead.interestArea || 'General Internship'}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-zinc-400 block font-medium">Hazra Office Training Willingness</span>
              <span
                className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[11px] font-medium border ${
                  willingHazra.toLowerCase().includes('yes')
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                }`}
              >
                {willingHazra}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <div>
                <span className="text-[10px] text-zinc-400 block font-medium">Batch Allotment</span>
                <span className="text-zinc-800 font-medium text-[11px] mt-0.5 block">
                  {batchNumber ? `Batch #${batchNumber}` : 'Pending Allotment'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block font-medium">Can Join By</span>
                <span className="text-zinc-800 text-[11px] mt-0.5 block">{canJoinBy || 'Immediate'}</span>
              </div>
            </div>

            {brandAssigned && (
              <div>
                <span className="text-[10px] text-zinc-400 block font-medium">Brand Assigned</span>
                <span className="text-indigo-700 font-semibold text-[11px]">{brandAssigned}</span>
              </div>
            )}

            {placementCompany && (
              <div>
                <span className="text-[10px] text-zinc-400 block font-medium">Placement Matched</span>
                <span className="text-emerald-700 font-bold text-[11px]">{placementCompany}</span>
              </div>
            )}
          </div>
        </div>

        {/* Panel 4: Hardware, Tech & Documents */}
        <div className="bg-white p-3.5 rounded-xl border border-zinc-200 shadow-2xs space-y-2.5">
          <div className="flex items-center gap-1.5 text-zinc-800 font-bold text-xs uppercase tracking-wide border-b border-zinc-100 pb-2">
            <Laptop className="w-3.5 h-3.5 text-zinc-500" />
            <span>Hardware & Verification</span>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-[10px] text-zinc-400 block font-medium">Laptop for Work</span>
              <div className="flex items-center gap-1 text-zinc-800 mt-0.5">
                <Laptop className="w-3 h-3 text-zinc-400" />
                <span className="font-medium">{hasLaptop}</span>
                {laptopModel && laptopModel !== 'N/A' && (
                  <span className="text-zinc-500 text-[11px]">({laptopModel})</span>
                )}
              </div>
            </div>

            <div>
              <span className="text-[10px] text-zinc-400 block font-medium">Primary Mobile Device</span>
              <div className="flex items-center gap-1 text-zinc-800 mt-0.5">
                <Smartphone className="w-3 h-3 text-zinc-400" />
                <span>{device}</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-zinc-400 block font-medium">Portfolio & Work Samples</span>
              {portfolioLink ? (
                <a
                  href={portfolioLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium text-[11px] hover:underline mt-0.5"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Open Portfolio Link</span>
                </a>
              ) : (
                <span className="text-zinc-400 text-[11px] mt-0.5 block">Not submitted yet</span>
              )}
            </div>

            {originalStatus && (
              <div>
                <span className="text-[10px] text-zinc-400 block font-medium">Original Application Remark</span>
                <span className="text-zinc-600 text-[11px] font-mono bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-200 block truncate">
                  {originalStatus}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notes & Recruiter Log Section */}
      <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-zinc-900 font-bold text-xs uppercase tracking-wide">
            <FileText className="w-3.5 h-3.5 text-zinc-500" />
            <span>Admissions Notes & Candidate History</span>
          </div>
          {saveSuccess && (
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Note saved to student profile!
            </span>
          )}
        </div>

        {/* Display Existing Notes */}
        {lead.notes ? (
          <div className="bg-zinc-50/80 p-3 rounded-lg border border-zinc-200/80 text-xs text-zinc-700 whitespace-pre-wrap font-sans max-h-44 overflow-y-auto leading-relaxed">
            {lead.notes}
          </div>
        ) : (
          <p className="text-xs text-zinc-400 italic">No notes recorded yet for this student.</p>
        )}

        {/* Add Follow-up Note Form */}
        <div className="pt-2 border-t border-zinc-100 flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Add quick recruiter note or screening feedback (e.g., 'Called, scheduled interview for Friday 3 PM')..."
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSaveNote();
              }
            }}
            className="flex-1 px-3 py-1.5 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
          />
          <button
            onClick={handleSaveNote}
            disabled={isSavingNote || !noteInput.trim()}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-semibold hover:bg-zinc-800 transition cursor-pointer disabled:opacity-50 shrink-0"
          >
            <Send className="w-3 h-3" />
            <span>{isSavingNote ? 'Saving...' : 'Save Note'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
