import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Building,
  Globe,
  MapPin,
  Upload,
  Download,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  Plus,
  Trash2,
  FileText,
  Printer,
  ArrowRight,
  HelpCircle,
  CheckCircle2,
  Clock,
  Calendar,
  DollarSign,
  Users,
  Briefcase,
  Zap,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Search,
  Eye,
  Info,
  Pencil,
} from 'lucide-react';
import {
  JobCategory,
  ClarificationQuestion,
  CompleteJobDescription,
} from '../../types/crm';
import {
  analyzeBriefWithAi,
  generateCompleteJdWithAi,
  saveJobDescriptionToFirestore,
  deleteJobDescriptionFromFirestore,
  subscribeJobDescriptions,
} from '../../services/jobDescriptionService';
import {
  getLogoUrlForDomain,
  cleanDomain,
  fileToBase64,
  PRESET_BRANDS,
} from './utils/logoHelper';
import { downloadJobDescriptionPdf } from './utils/pdfExport';

// Sample client briefs for instant testing
const SAMPLE_BRIEFS: Record<JobCategory, Array<{ title: string; brief: string; company: string; domain: string }>> = {
  renter: [
    {
      title: 'Taj Bengal Reel Creators (Evening Gig)',
      company: 'Taj Bengal',
      domain: 'tajhotels.com',
      brief: 'Need 2 people tomorrow at Taj Bengal from 4 PM to 9 PM for helping at a brand launch mixer. They should have iPhone/good phone camera and shoot raw reels.',
    },
    {
      title: 'Park Street Cafe UGC Shoot',
      company: 'Blue Tokai Coffee',
      domain: 'bluetokaicoffee.com',
      brief: 'Looking for 1 UGC creator this Saturday at our Park Street cafe from 2 to 6 PM. Must shoot aesthetic coffee visuals and deliver 3 edited reels.',
    },
    {
      title: 'Exhibition Stall Support (3 Days)',
      company: 'ITC Hotels',
      domain: 'itchotels.com',
      brief: 'We need 4 energetic student interns for our exhibition stall at Biswa Bangla Mela Prangan for 3 days (10 AM to 7 PM). Interacting with visitors and collecting leads.',
    },
  ],
  normal: [
    {
      title: 'Social Media Marketing Intern (3 Months)',
      company: 'Zomato',
      domain: 'zomato.com',
      brief: 'Looking for a Social Media & Growth Intern in Kolkata. 3 months duration, stipend 12k/month. Work involves Instagram planning, community engagement, and Canva graphics. PPO opportunity for top performer.',
    },
    {
      title: 'Business Development Executive (Trainee)',
      company: 'Swiggy',
      domain: 'swiggy.com',
      brief: 'Hiring BDE Trainees for restaurant onboarding in South Kolkata. Full time role, 20k/month + performance incentives. Fresh graduates welcome. Must have two-wheeler and good communication in Bengali/Hindi/English.',
    },
    {
      title: 'Videographer & Creative Producer Intern',
      company: 'InternsHome',
      domain: 'internshome.com',
      brief: 'Need a creative videography intern at our Hazra Hub for 6 months. Responsibilities include shooting student interviews, editing weekly reels in Premiere Pro/CapCut, and studio lighting setup. Stipend 15k/month.',
    },
  ],
};

export const JobCreatorView: React.FC = () => {
  // Navigation & Sub-view
  const [activeTab, setActiveTab] = useState<'create' | 'saved' | 'guide'>('create');
  const [savedJds, setSavedJds] = useState<CompleteJobDescription[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // STEP 1 State: Job Type & Company Info
  const [jobCategory, setJobCategory] = useState<JobCategory>('renter');
  const [companyName, setCompanyName] = useState<string>('Taj Bengal');
  const [companyWebsite, setCompanyWebsite] = useState<string>('tajhotels.com');
  const [companyLocation, setCompanyLocation] = useState<string>('Alipore, Kolkata');
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string>('https://logo.clearbit.com/tajhotels.com');
  const [companyAbout, setCompanyAbout] = useState<string>('');
  const [logoInputMode, setLogoInputMode] = useState<'domain' | 'url' | 'upload'>('domain');

  // STEP 1: Customizable Role Specifications (Editable in Step 1)
  const [specTitle, setSpecTitle] = useState<string>('Social Media & Growth Intern');
  const [specDepartment, setSpecDepartment] = useState<string>('Marketing & Growth');
  const [specWorkMode, setSpecWorkMode] = useState<string>('On-site (Kolkata Office)');
  const [specDuration, setSpecDuration] = useState<string>('3 Months (Immediate Start)');
  const [specTimings, setSpecTimings] = useState<string>('10:00 AM - 06:00 PM (Mon-Fri)');
  const [specStipend, setSpecStipend] = useState<string>('₹12,000 - ₹15,000 / month');
  const [specPerks, setSpecPerks] = useState<string>('Certificate of Internship, LOR, PPO Opportunity');
  const [specCustomNotes, setSpecCustomNotes] = useState<string>('');

  // Gig specific customizable parameters (Editable in Step 1)
  const [gigRole, setGigRole] = useState<string>('Content Creator & Videographer');
  const [gigVenue, setGigVenue] = useState<string>('Ballygunge Arena, Kolkata');
  const [gigShiftTimings, setGigShiftTimings] = useState<string>('04:00 PM - 09:00 PM (5 hrs)');
  const [gigDates, setGigDates] = useState<string>('This Saturday & Sunday (2 Days)');
  const [gigInternPayout, setGigInternPayout] = useState<string>('₹1,000 / day + ₹200 travel');
  const [gigClientCommercial, setGigClientCommercial] = useState<string>('₹1,500 / day');
  const [gigAttireEquipment, setGigAttireEquipment] = useState<string>('All black attire, Smartphone with 4K video / Gimbal');

  // STEP 2 State: Raw Brief
  const [rawBrief, setRawBrief] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // STEP 3 State: Clarification Q&A (Directly Editable Items)
  const [hasAnalyzed, setHasAnalyzed] = useState<boolean>(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [clarificationQuestions, setClarificationQuestions] = useState<ClarificationQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [freeformClarification, setFreeformClarification] = useState<string>('');
  const [editableDates, setEditableDates] = useState<string>('');
  const [editableTimings, setEditableTimings] = useState<string>('');
  const [editableVenue, setEditableVenue] = useState<string>('');
  const [editableCommercials, setEditableCommercials] = useState<string>('');

  // STEP 4 State: Final Generated JD & Live Edit Mode
  const [isGeneratingJd, setIsGeneratingJd] = useState<boolean>(false);
  const [generatedJd, setGeneratedJd] = useState<CompleteJobDescription | null>(null);
  const [isEditingDoc, setIsEditingDoc] = useState<boolean>(false);
  const [copiedType, setCopiedType] = useState<'full' | 'whatsapp' | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Show Toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Real-time listener for saved JDs
  useEffect(() => {
    const unsub = subscribeJobDescriptions((items) => setSavedJds(items));
    return () => unsub();
  }, []);

  // Update logo automatically when domain changes in 'domain' mode
  const handleDomainChange = (domain: string) => {
    setCompanyWebsite(domain);
    if (logoInputMode === 'domain' && domain.trim()) {
      const detected = getLogoUrlForDomain(domain);
      setCompanyLogoUrl(detected);
    }
  };

  // Handle preset brand click
  const handleSelectPreset = (brand: typeof PRESET_BRANDS[0]) => {
    setCompanyName(brand.name);
    setCompanyWebsite(brand.domain);
    setCompanyLogoUrl(brand.logoUrl);
    showToast(`Loaded ${brand.name} branding & logo`);
  };

  // Handle local file logo upload
  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        setCompanyLogoUrl(base64);
        setLogoInputMode('upload');
        showToast('Company logo uploaded successfully');
      } catch (err) {
        showToast('Failed to load image file');
      }
    }
  };

  // Load sample brief
  const handleLoadSample = (sample: typeof SAMPLE_BRIEFS['renter'][0]) => {
    setCompanyName(sample.company);
    setCompanyWebsite(sample.domain);
    setCompanyLogoUrl(getLogoUrlForDomain(sample.domain));
    setRawBrief(sample.brief);
    // Reset subsequent steps
    setHasAnalyzed(false);
    setGeneratedJd(null);
    setUserAnswers({});
    showToast(`Loaded sample: ${sample.title}`);
  };

  // STEP 2 -> STEP 3: Analyze Brief
  const handleAnalyze = async () => {
    if (!rawBrief.trim()) {
      showToast('Please paste a client requirement brief first');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeBriefWithAi({
        brief: rawBrief,
        jobCategory,
        company: {
          name: companyName,
          website: companyWebsite,
          logoUrl: companyLogoUrl,
          location: companyLocation,
          about: companyAbout,
        },
      });

      setExtractedData(result.extractedData);
      setClarificationQuestions(result.clarificationQuestions);

      // Pre-fill editable confirmed fields
      const datesVal = result.extractedData?.dates && Array.isArray(result.extractedData.dates)
        ? result.extractedData.dates.join(', ')
        : (result.extractedData?.dates || (jobCategory === 'renter' ? '22nd & 23rd August' : '3 Months (Immediate Start)'));
      setEditableDates(datesVal);

      const timingsVal = result.extractedData?.startTime && result.extractedData?.endTime
        ? `${result.extractedData.startTime} – ${result.extractedData.endTime} (${result.extractedData.durationHours || 4} hrs/day)`
        : (result.extractedData?.workingHours || (jobCategory === 'renter' ? '07:00 AM – 11:00 AM (4 hrs/day)' : '10:00 AM – 06:00 PM (Mon-Fri)'));
      setEditableTimings(timingsVal);

      const venueVal = result.extractedData?.venue || companyLocation || 'Kolkata, West Bengal';
      setEditableVenue(venueVal);

      const commsVal = jobCategory === 'renter'
        ? `₹${(result.extractedData?.internPayment || 3150).toLocaleString()} Pay • ₹${(result.extractedData?.clientCommercial || 4410).toLocaleString()} Client`
        : (result.extractedData?.stipendOrSalary || '₹12,000 - ₹15,000 / month');
      setEditableCommercials(commsVal);

      if (result.extractedData?.jobTitle) setSpecTitle(result.extractedData.jobTitle);
      if (result.extractedData?.role) setGigRole(result.extractedData.role);

      // Pre-fill default answers if suggestions exist
      const initialAnswers: Record<string, string> = {};
      result.clarificationQuestions.forEach((q) => {
        if (q.suggestedOptions && q.suggestedOptions.length > 0) {
          initialAnswers[q.id] = q.suggestedOptions[0];
        }
      });
      setUserAnswers(initialAnswers);
      setHasAnalyzed(true);
      showToast('AI analyzed the brief! Review and customize details below.');

      // Smooth scroll down to Step 3
      setTimeout(() => {
        const el = document.getElementById('step-3-questions');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    } catch (err) {
      showToast('Error analyzing brief. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Answer selection for Step 3
  const handleSelectAnswer = (questionId: string, answer: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  // STEP 3 -> STEP 4: Generate Complete JD
  const handleGenerateFinalJd = async () => {
    setIsGeneratingJd(true);
    try {
      const finalAnswers = { ...userAnswers };
      if (editableDates) finalAnswers['dates'] = editableDates;
      if (editableTimings) finalAnswers['timings'] = editableTimings;
      if (editableVenue) finalAnswers['venue'] = editableVenue;
      if (editableCommercials) finalAnswers['commercials'] = editableCommercials;
      if (freeformClarification.trim()) {
        finalAnswers['additionalClientNotes'] = freeformClarification.trim();
      }

      if (jobCategory === 'normal') {
        finalAnswers['specTitle'] = specTitle;
        finalAnswers['specDepartment'] = specDepartment;
        finalAnswers['specWorkMode'] = specWorkMode;
        finalAnswers['specDuration'] = specDuration;
        finalAnswers['specTimings'] = specTimings;
        finalAnswers['specStipend'] = specStipend;
        finalAnswers['specPerks'] = specPerks;
        if (specCustomNotes) finalAnswers['specCustomNotes'] = specCustomNotes;
      } else {
        finalAnswers['gigRole'] = gigRole;
        finalAnswers['gigVenue'] = gigVenue;
        finalAnswers['gigShiftTimings'] = gigShiftTimings;
        finalAnswers['gigDates'] = gigDates;
        finalAnswers['gigInternPayout'] = gigInternPayout;
        finalAnswers['gigClientCommercial'] = gigClientCommercial;
        finalAnswers['gigAttireEquipment'] = gigAttireEquipment;
      }

      const jd = await generateCompleteJdWithAi({
        jobCategory,
        company: {
          name: companyName,
          website: companyWebsite,
          logoUrl: companyLogoUrl,
          location: companyLocation,
          about: companyAbout,
        },
        rawBrief,
        extractedData,
        userAnswers: finalAnswers,
      });

      setGeneratedJd(jd);
      showToast('Complete Job Description created! Ready to download as PDF.');

      // Smooth scroll down to Step 4
      setTimeout(() => {
        const el = document.getElementById('step-4-final-jd');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    } catch (err) {
      showToast('Error generating complete JD. Please try again.');
    } finally {
      setIsGeneratingJd(false);
    }
  };

  // Save JD to Firestore
  const handleSaveToRegistry = async () => {
    if (!generatedJd) return;
    setIsSaving(true);
    try {
      await saveJobDescriptionToFirestore(generatedJd);
      showToast('Job Description saved to database!');
    } catch (err) {
      showToast('Failed to save to database');
    } finally {
      setIsSaving(false);
    }
  };

  // Responsibilities inline editors
  const handleUpdateResponsibility = (idx: number, val: string) => {
    if (!generatedJd) return;
    const next = [...generatedJd.responsibilities];
    next[idx] = val;
    setGeneratedJd({ ...generatedJd, responsibilities: next });
  };
  const handleAddResponsibility = () => {
    if (!generatedJd) return;
    setGeneratedJd({ ...generatedJd, responsibilities: [...generatedJd.responsibilities, 'Execute core brand deliverables and collaborate with team lead'] });
  };
  const handleRemoveResponsibility = (idx: number) => {
    if (!generatedJd) return;
    setGeneratedJd({ ...generatedJd, responsibilities: generatedJd.responsibilities.filter((_, i) => i !== idx) });
  };

  // Requirements inline editors
  const handleUpdateRequirement = (idx: number, val: string) => {
    if (!generatedJd) return;
    const next = [...generatedJd.requirements];
    next[idx] = val;
    setGeneratedJd({ ...generatedJd, requirements: next });
  };
  const handleAddRequirement = () => {
    if (!generatedJd) return;
    setGeneratedJd({ ...generatedJd, requirements: [...generatedJd.requirements, 'College student or recent graduate with high enthusiasm'] });
  };
  const handleRemoveRequirement = (idx: number) => {
    if (!generatedJd) return;
    setGeneratedJd({ ...generatedJd, requirements: generatedJd.requirements.filter((_, i) => i !== idx) });
  };

  // Deliverables inline editors
  const handleUpdateDeliverable = (idx: number, val: string) => {
    if (!generatedJd || !generatedJd.deliverables) return;
    const next = [...generatedJd.deliverables];
    next[idx] = val;
    setGeneratedJd({ ...generatedJd, deliverables: next });
  };
  const handleAddDeliverable = () => {
    if (!generatedJd) return;
    setGeneratedJd({ ...generatedJd, deliverables: [...(generatedJd.deliverables || []), 'Raw footage / asset handover completed same day'] });
  };
  const handleRemoveDeliverable = (idx: number) => {
    if (!generatedJd || !generatedJd.deliverables) return;
    setGeneratedJd({ ...generatedJd, deliverables: generatedJd.deliverables.filter((_, i) => i !== idx) });
  };

  // Perks inline editors
  const handleUpdatePerk = (idx: number, val: string) => {
    if (!generatedJd) return;
    const next = [...generatedJd.perksAndBenefits];
    next[idx] = val;
    setGeneratedJd({ ...generatedJd, perksAndBenefits: next });
  };
  const handleAddPerk = () => {
    if (!generatedJd) return;
    setGeneratedJd({ ...generatedJd, perksAndBenefits: [...generatedJd.perksAndBenefits, 'Certificate of Internship and Letter of Recommendation (LOR)'] });
  };
  const handleRemovePerk = (idx: number) => {
    if (!generatedJd) return;
    setGeneratedJd({ ...generatedJd, perksAndBenefits: generatedJd.perksAndBenefits.filter((_, i) => i !== idx) });
  };

  // Copy Full JD as Markdown
  const handleCopyFullJd = () => {
    if (!generatedJd) return;
    const text = `# ${generatedJd.jobTitle}
**Company:** ${generatedJd.companyName} | ${generatedJd.companyLocation}
**Role Type:** ${generatedJd.employmentType} (${generatedJd.workMode})
**Compensation:** ${generatedJd.compensationText}
**Duration/Dates:** ${generatedJd.durationOrDates} | **Timings:** ${generatedJd.timings}

## Overview
${generatedJd.roleSummary}

## Key Responsibilities
${generatedJd.responsibilities.map((r) => `- ${r}`).join('\n')}

## Requirements & Qualifications
${generatedJd.requirements.map((r) => `- ${r}`).join('\n')}

${generatedJd.deliverables && generatedJd.deliverables.length > 0 ? `## Expected Deliverables\n${generatedJd.deliverables.map((d) => `- ${d}`).join('\n')}\n` : ''}
## Perks & Benefits
${generatedJd.perksAndBenefits.map((p) => `- ${p}`).join('\n')}

**Contact/Apply:** ${generatedJd.contactEmail} | Deadline: ${generatedJd.applicationDeadline}`;

    navigator.clipboard.writeText(text);
    setCopiedType('full');
    setTimeout(() => setCopiedType(null), 2500);
    showToast('Copied full formatted JD to clipboard!');
  };

  // Copy WhatsApp Broadcast Text
  const handleCopyWhatsApp = () => {
    if (!generatedJd) return;
    navigator.clipboard.writeText(generatedJd.whatsappText);
    setCopiedType('whatsapp');
    setTimeout(() => setCopiedType(null), 2500);
    showToast('Copied WhatsApp broadcast message!');
  };

  // Delete saved JD
  const handleDeleteSavedJd = async (id?: string) => {
    if (!id) return;
    if (confirm('Are you sure you want to delete this Job Description?')) {
      await deleteJobDescriptionFromFirestore(id);
      showToast('Job Description deleted');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-950 text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-medium flex items-center gap-2 border border-zinc-700 animate-fadeIn">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              AI Job Description Engine
            </span>
            <span className="text-zinc-300">•</span>
            <span className="text-xs text-zinc-500 font-medium">InternsHome Talent Platform</span>
          </div>
          <h1 className="text-xl font-bold text-zinc-900 mt-1 flex items-center gap-2">
            Job Description Creator
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              PDF & WhatsApp Export
            </span>
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5 max-w-2xl">
            Convert any messy client brief into a verified, high-impact Job Description for either a short-term <strong>Rent an Intern gig</strong> or a <strong>normal career role/internship</strong>.
          </p>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-2">
          <div className="bg-zinc-100 p-0.5 rounded-lg flex items-center border border-zinc-200">
            <button
              onClick={() => setActiveTab('create')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'create'
                  ? 'bg-white text-zinc-900 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Creator Workflow
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'saved'
                  ? 'bg-white text-zinc-900 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              Saved JDs
              <span className="px-1.5 py-0.2 rounded-full bg-zinc-200 text-[10px] font-mono font-bold">
                {savedJds.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'guide'
                  ? 'bg-white text-zinc-900 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Info className="w-3.5 h-3.5 text-zinc-500" />
              Normal Job Checklist
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: CREATOR STEP-BY-STEP WORKFLOW                      */}
      {/* ======================================================== */}
      {activeTab === 'create' && (
        <div className="space-y-8 max-w-5xl mx-auto">
          {/* ====================================================== */}
          {/* STEP 1 (TOP): JOB TYPE & COMPANY DETAILS               */}
          {/* ====================================================== */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
            <div className="bg-zinc-50/80 px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-zinc-900 text-white text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <div>
                  <h2 className="text-sm font-bold text-zinc-900">
                    Step 1: Choose Job Type & Company Details
                  </h2>
                  <p className="text-[11px] text-zinc-500">
                    Select the job category and attach the company identity and logo
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-medium text-zinc-400">Required</span>
            </div>

            <div className="p-6 space-y-6">
              {/* Job Category Cards */}
              <div>
                <label className="text-xs font-bold text-zinc-900 uppercase tracking-wider block mb-2.5">
                  Select Job Category
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Renter Job Option */}
                  <div
                    onClick={() => {
                      setJobCategory('renter');
                      setHasAnalyzed(false);
                      setGeneratedJd(null);
                    }}
                    className={`cursor-pointer rounded-xl p-4 border-2 transition-all relative ${
                      jobCategory === 'renter'
                        ? 'border-emerald-600 bg-emerald-50/40 shadow-xs'
                        : 'border-zinc-200 hover:border-zinc-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          jobCategory === 'renter' ? 'bg-emerald-600 text-white' : 'bg-zinc-100 text-zinc-600'
                        }`}
                      >
                        <Zap className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold text-zinc-900">
                            Rent an Intern (Gig / Event)
                          </h3>
                          {jobCategory === 'renter' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                          Short-term gig, event support, videography, UGC reel creator, stall promoter, or 1–7 day project. Fast student deployment with per-shift or hourly payout.
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          <span className="text-[10px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded font-medium">Reel Creators</span>
                          <span className="text-[10px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded font-medium">Event Photographers</span>
                          <span className="text-[10px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded font-medium">Stall Support</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Normal Job Option */}
                  <div
                    onClick={() => {
                      setJobCategory('normal');
                      setHasAnalyzed(false);
                      setGeneratedJd(null);
                    }}
                    className={`cursor-pointer rounded-xl p-4 border-2 transition-all relative ${
                      jobCategory === 'normal'
                        ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                        : 'border-zinc-200 hover:border-zinc-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          jobCategory === 'normal' ? 'bg-indigo-600 text-white' : 'bg-zinc-100 text-zinc-600'
                        }`}
                      >
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold text-zinc-900">
                            Normal Job (Internship / Full-Time)
                          </h3>
                          {jobCategory === 'normal' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                          Regular 3–6 month college internship or full-time career placement. Includes monthly stipend/CTC, comprehensive responsibilities, qualifications, and PPO opportunities.
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          <span className="text-[10px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded font-medium">Marketing Interns</span>
                          <span className="text-[10px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded font-medium">Software Developers</span>
                          <span className="text-[10px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded font-medium">Operations Trainees</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Interactive Editable Role Specifications Panel */}
                {jobCategory === 'normal' ? (
                  <div className="mt-4 p-4 bg-indigo-50/80 rounded-2xl border border-indigo-200/90 text-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-200/70 pb-2.5">
                      <div>
                        <span className="font-bold text-indigo-950 flex items-center gap-1.5 text-xs">
                          <Pencil className="w-4 h-4 text-indigo-600" />
                          Editable Normal Job Specifications — Customize Requirements Here:
                        </span>
                        <p className="text-[11px] text-zinc-600 mt-0.5">
                          Modify any of these 4 standard role parameters or add custom prerequisites below
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('guide')}
                        className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 underline cursor-pointer shrink-0"
                      >
                        View Full Checklist Guide &rarr;
                      </button>
                    </div>

                    {/* 4 Editable Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* 1. Designation & Dept */}
                      <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <strong className="text-zinc-900 text-xs font-bold block">1. Designation & Dept</strong>
                          <span className="text-[9px] font-semibold bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded">Editable</span>
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-500 font-semibold block mb-0.5">Job Designation</label>
                          <input
                            type="text"
                            value={specTitle}
                            onChange={(e) => setSpecTitle(e.target.value)}
                            placeholder="e.g. Social Media & Growth Intern"
                            className="w-full text-xs p-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-600 bg-zinc-50/60 focus:bg-white font-medium"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-500 font-semibold block mb-0.5">Department</label>
                          <input
                            type="text"
                            value={specDepartment}
                            onChange={(e) => setSpecDepartment(e.target.value)}
                            placeholder="e.g. Marketing & Operations"
                            className="w-full text-xs p-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-600 bg-zinc-50/60 focus:bg-white"
                          />
                        </div>
                      </div>

                      {/* 2. Work Mode & Locality */}
                      <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <strong className="text-zinc-900 text-xs font-bold block">2. Work Mode & Locality</strong>
                          <span className="text-[9px] font-semibold bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded">Editable</span>
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-500 font-semibold block mb-0.5">Work Mode</label>
                          <select
                            value={specWorkMode}
                            onChange={(e) => setSpecWorkMode(e.target.value)}
                            className="w-full text-xs p-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-600 bg-zinc-50/60 focus:bg-white font-medium"
                          >
                            <option value="On-site (Kolkata Office)">On-site (Kolkata Office)</option>
                            <option value="Hybrid (3 Days Office, 2 Remote)">Hybrid (3 Days Office, 2 Remote)</option>
                            <option value="100% Remote / Work from Home">100% Remote / Work from Home</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-500 font-semibold block mb-0.5">Office Locality</label>
                          <input
                            type="text"
                            value={companyLocation}
                            onChange={(e) => setCompanyLocation(e.target.value)}
                            placeholder="e.g. Park Street / Hazra, Kolkata"
                            className="w-full text-xs p-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-600 bg-zinc-50/60 focus:bg-white"
                          />
                        </div>
                      </div>

                      {/* 3. Duration & Timings */}
                      <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <strong className="text-zinc-900 text-xs font-bold block">3. Duration & Timings</strong>
                          <span className="text-[9px] font-semibold bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded">Editable</span>
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-500 font-semibold block mb-0.5">Internship Duration</label>
                          <input
                            type="text"
                            value={specDuration}
                            onChange={(e) => setSpecDuration(e.target.value)}
                            placeholder="e.g. 3 Months (Immediate Start)"
                            className="w-full text-xs p-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-600 bg-zinc-50/60 focus:bg-white font-medium"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-500 font-semibold block mb-0.5">Daily Working Hours</label>
                          <input
                            type="text"
                            value={specTimings}
                            onChange={(e) => setSpecTimings(e.target.value)}
                            placeholder="e.g. 10:00 AM - 06:00 PM (Mon-Fri)"
                            className="w-full text-xs p-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-600 bg-zinc-50/60 focus:bg-white"
                          />
                        </div>
                      </div>

                      {/* 4. Stipend, PPO & Perks */}
                      <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <strong className="text-zinc-900 text-xs font-bold block">4. Stipend, PPO & Perks</strong>
                          <span className="text-[9px] font-semibold bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded">Editable</span>
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-500 font-semibold block mb-0.5">Monthly Pay / Stipend</label>
                          <input
                            type="text"
                            value={specStipend}
                            onChange={(e) => setSpecStipend(e.target.value)}
                            placeholder="e.g. ₹12,000 - ₹15,000 / month"
                            className="w-full text-xs p-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-600 bg-zinc-50/60 focus:bg-white font-bold text-emerald-700"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-500 font-semibold block mb-0.5">Perks & Growth</label>
                          <input
                            type="text"
                            value={specPerks}
                            onChange={(e) => setSpecPerks(e.target.value)}
                            placeholder="e.g. Certificate, LOR, PPO"
                            className="w-full text-xs p-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-600 bg-zinc-50/60 focus:bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Optional custom notes / requirement */}
                    <div className="pt-2 border-t border-indigo-100 flex items-center gap-2">
                      <input
                        type="text"
                        value={specCustomNotes}
                        onChange={(e) => setSpecCustomNotes(e.target.value)}
                        placeholder="Add any extra qualification, candidate batch, or software tool requirement here..."
                        className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-indigo-200 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200/90 text-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-emerald-200/70 pb-2.5">
                      <div>
                        <span className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                          <Pencil className="w-4 h-4 text-emerald-600" />
                          Editable Rent an Intern Gig Specifications — Modify Operational Parameters:
                        </span>
                        <p className="text-[11px] text-zinc-600 mt-0.5">
                          Customize role, shift hours, dates, and intern payouts directly before pasting or analyzing the brief
                        </p>
                      </div>
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        Directly Editable
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* 1. Role & Activity */}
                      <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs space-y-2">
                        <strong className="text-zinc-900 text-xs font-bold block">1. Role & Activity</strong>
                        <div>
                          <label className="text-[10px] text-zinc-500 font-semibold block mb-0.5">Role Title</label>
                          <input
                            type="text"
                            value={gigRole}
                            onChange={(e) => setGigRole(e.target.value)}
                            placeholder="e.g. Content Creator & Videographer"
                            className="w-full text-xs p-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-zinc-50/60 focus:bg-white font-medium"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-500 font-semibold block mb-0.5">Attire / Gear</label>
                          <input
                            type="text"
                            value={gigAttireEquipment}
                            onChange={(e) => setGigAttireEquipment(e.target.value)}
                            placeholder="e.g. All black attire, 4K camera"
                            className="w-full text-xs p-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-zinc-50/60 focus:bg-white"
                          />
                        </div>
                      </div>

                      {/* 2. Venue & City */}
                      <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs space-y-2">
                        <strong className="text-zinc-900 text-xs font-bold block">2. Venue & City</strong>
                        <div>
                          <label className="text-[10px] text-zinc-500 font-semibold block mb-0.5">Event Venue</label>
                          <input
                            type="text"
                            value={gigVenue}
                            onChange={(e) => setGigVenue(e.target.value)}
                            placeholder="e.g. Ballygunge Arena, Kolkata"
                            className="w-full text-xs p-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-zinc-50/60 focus:bg-white font-medium"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-500 font-semibold block mb-0.5">Location Area</label>
                          <input
                            type="text"
                            value={companyLocation}
                            onChange={(e) => setCompanyLocation(e.target.value)}
                            placeholder="e.g. South Kolkata"
                            className="w-full text-xs p-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-zinc-50/60 focus:bg-white"
                          />
                        </div>
                      </div>

                      {/* 3. Shift Timings & Dates */}
                      <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs space-y-2">
                        <strong className="text-zinc-900 text-xs font-bold block">3. Shift Timings & Dates</strong>
                        <div>
                          <label className="text-[10px] text-zinc-500 font-semibold block mb-0.5">Shift Hours</label>
                          <input
                            type="text"
                            value={gigShiftTimings}
                            onChange={(e) => setGigShiftTimings(e.target.value)}
                            placeholder="e.g. 04:00 PM - 09:00 PM (5 hrs)"
                            className="w-full text-xs p-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-zinc-50/60 focus:bg-white font-medium"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-500 font-semibold block mb-0.5">Event Dates</label>
                          <input
                            type="text"
                            value={gigDates}
                            onChange={(e) => setGigDates(e.target.value)}
                            placeholder="e.g. This Saturday & Sunday"
                            className="w-full text-xs p-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-zinc-50/60 focus:bg-white"
                          />
                        </div>
                      </div>

                      {/* 4. Pay & Commercials */}
                      <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs space-y-2">
                        <strong className="text-zinc-900 text-xs font-bold block">4. Pay & Commercials</strong>
                        <div>
                          <label className="text-[10px] text-zinc-500 font-semibold block mb-0.5">Intern Pay / Day</label>
                          <input
                            type="text"
                            value={gigInternPayout}
                            onChange={(e) => setGigInternPayout(e.target.value)}
                            placeholder="e.g. ₹1,000 / day + ₹200 travel"
                            className="w-full text-xs p-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-zinc-50/60 focus:bg-white font-bold text-emerald-700"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-500 font-semibold block mb-0.5">Client Rate / Day</label>
                          <input
                            type="text"
                            value={gigClientCommercial}
                            onChange={(e) => setGigClientCommercial(e.target.value)}
                            placeholder="e.g. ₹1,500 / day"
                            className="w-full text-xs p-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-zinc-50/60 focus:bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Company Details & Logo Configuration */}
              <div className="pt-2 border-t border-zinc-100">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                    Company Information & Branding
                  </label>
                  {/* Preset brand fast pickers */}
                  <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                    <span className="mr-1">Quick Presets:</span>
                    {PRESET_BRANDS.slice(0, 4).map((b) => (
                      <button
                        key={b.name}
                        type="button"
                        onClick={() => handleSelectPreset(b)}
                        className="text-[10px] bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-2 py-0.5 rounded transition font-medium"
                      >
                        {b.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  {/* Company Name & Domain */}
                  <div className="md:col-span-4 space-y-3">
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-700 block mb-1">
                        Company / Brand Name
                      </label>
                      <div className="relative">
                        <Building className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="e.g. Taj Bengal, Zomato, Blue Tokai"
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-zinc-700 block mb-1">
                        Website / Domain (Auto Logo Fetch)
                      </label>
                      <div className="relative">
                        <Globe className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={companyWebsite}
                          onChange={(e) => handleDomainChange(e.target.value)}
                          placeholder="e.g. tajhotels.com, zomato.com"
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-zinc-700 block mb-1">
                        Location / City
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={companyLocation}
                          onChange={(e) => setCompanyLocation(e.target.value)}
                          placeholder="e.g. Park Street / Alipore, Kolkata"
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Logo Selector & Live Preview Box */}
                  <div className="md:col-span-8 bg-zinc-50 rounded-xl p-4 border border-zinc-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-zinc-900 uppercase tracking-wider">
                        Company Logo Integration
                      </span>
                      {/* Logo mode toggle */}
                      <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-zinc-200 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setLogoInputMode('domain')}
                          className={`px-2 py-0.5 rounded font-medium transition ${
                            logoInputMode === 'domain' ? 'bg-zinc-900 text-white' : 'text-zinc-600'
                          }`}
                        >
                          Auto from Domain
                        </button>
                        <button
                          type="button"
                          onClick={() => setLogoInputMode('url')}
                          className={`px-2 py-0.5 rounded font-medium transition ${
                            logoInputMode === 'url' ? 'bg-zinc-900 text-white' : 'text-zinc-600'
                          }`}
                        >
                          Custom URL
                        </button>
                        <button
                          type="button"
                          onClick={() => setLogoInputMode('upload')}
                          className={`px-2 py-0.5 rounded font-medium transition ${
                            logoInputMode === 'upload' ? 'bg-zinc-900 text-white' : 'text-zinc-600'
                          }`}
                        >
                          Upload File
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      {/* Logo Preview Container */}
                      <div className="w-24 h-24 rounded-xl bg-white border border-zinc-200 flex items-center justify-center p-2 shrink-0 shadow-2xs overflow-hidden relative group">
                        {companyLogoUrl ? (
                          <img
                            src={companyLogoUrl}
                            alt={`${companyName} Logo`}
                            className="max-w-full max-h-full object-contain"
                            onError={(e) => {
                              // Fallback to domain Google favicon
                              const target = e.currentTarget;
                              if (!target.src.includes('google.com')) {
                                target.src = `https://www.google.com/s2/favicons?domain=${cleanDomain(companyWebsite)}&sz=128`;
                              }
                            }}
                          />
                        ) : (
                          <div className="text-center text-zinc-400">
                            <Building className="w-8 h-8 mx-auto stroke-1" />
                            <span className="text-[9px] block mt-1">No Logo</span>
                          </div>
                        )}
                      </div>

                      {/* Controls based on mode */}
                      <div className="flex-1 space-y-2 w-full">
                        {logoInputMode === 'domain' && (
                          <div>
                            <p className="text-xs text-zinc-700 font-medium">
                              Logo is automatically pulled from <strong>{companyWebsite || 'domain'}</strong> via Clearbit & Favicon service.
                            </p>
                            <p className="text-[11px] text-zinc-500 mt-0.5">
                              This logo will appear at the top of the generated Job Description PDF.
                            </p>
                          </div>
                        )}

                        {logoInputMode === 'url' && (
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-zinc-700">Paste direct image URL:</label>
                            <input
                              type="text"
                              value={companyLogoUrl}
                              onChange={(e) => setCompanyLogoUrl(e.target.value)}
                              placeholder="https://example.com/logo.png"
                              className="w-full text-xs p-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
                            />
                          </div>
                        )}

                        {logoInputMode === 'upload' && (
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-zinc-700">Choose logo file from your device:</label>
                            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-zinc-300 bg-white hover:bg-zinc-50 cursor-pointer text-xs text-zinc-700 font-medium">
                              <Upload className="w-4 h-4 text-zinc-500" />
                              <span>Select Logo Image (PNG, JPG, SVG)</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleLogoFileUpload}
                                className="hidden"
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ====================================================== */}
          {/* STEP 2: PASTE RAW CLIENT REQUIREMENT                   */}
          {/* ====================================================== */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
            <div className="bg-zinc-50/80 px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-zinc-900 text-white text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <div>
                  <h2 className="text-sm font-bold text-zinc-900">
                    Step 2: Paste Raw Client Requirement
                  </h2>
                  <p className="text-[11px] text-zinc-500">
                    Paste raw text from client WhatsApp messages, emails, or scratchpad notes
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-medium text-zinc-400">Natural Language</span>
            </div>

            <div className="p-6 space-y-4">
              <textarea
                value={rawBrief}
                onChange={(e) => {
                  setRawBrief(e.target.value);
                  setHasAnalyzed(false);
                }}
                rows={4}
                placeholder={
                  jobCategory === 'renter'
                    ? 'e.g. "Need 2 videographers tomorrow at Taj Bengal from 4 PM to 9 PM for helping at an event. They should shoot raw reels with a good phone camera. Food provided."'
                    : 'e.g. "Looking for a Social Media & Growth Intern in Kolkata. 3 months duration, stipend 12k/month. Work involves Instagram planning, community engagement, and Canva graphics. PPO opportunity for top performer."'
                }
                className="w-full text-xs p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900 text-zinc-900 placeholder-zinc-400 leading-relaxed font-sans"
              />

              {/* Sample Brief Chips & Primary Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-zinc-400 font-semibold mr-1">Sample Briefs:</span>
                  {SAMPLE_BRIEFS[jobCategory].map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleLoadSample(sample)}
                      className="text-[11px] px-2.5 py-1 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition font-medium"
                    >
                      {sample.title}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !rawBrief.trim()}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                      Analyzing Brief & Gaps...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Analyze Brief with AI
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ====================================================== */}
          {/* STEP 3: INTERACTIVE CLARIFICATION Q&A                  */}
          {/* ====================================================== */}
          {hasAnalyzed && (
            <div id="step-3-questions" className="bg-white rounded-2xl border-2 border-indigo-200 shadow-sm overflow-hidden animate-fadeIn">
              <div className="bg-indigo-50/80 px-6 py-4 border-b border-indigo-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                    3
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                      Step 3: Answer Clarifying Questions
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                        Interactive AI Assistant
                      </span>
                    </h2>
                    <p className="text-[11px] text-zinc-600">
                      The AI identified missing details needed to create a 100% complete Job Description. Select or customize answers below:
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-indigo-700 font-mono">
                  {clarificationQuestions.length} Questions
                </span>
              </div>

              <div className="p-6 space-y-6">
                {/* Verified Details Extracted Directly From Brief */}
                <div className="bg-gradient-to-r from-emerald-50 via-teal-50/70 to-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </span>
                      <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                        Verified & Confirmed Details (Click Any Box to Edit / Modify)
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-white/90 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                      <Pencil className="w-3 h-3 text-emerald-600" />
                      Editable Parameters
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                    <div className="bg-white/95 p-2.5 rounded-lg border border-emerald-200/80 shadow-2xs space-y-1">
                      <span className="text-[10px] text-zinc-500 font-semibold block uppercase tracking-wider">
                        Dates (Editable)
                      </span>
                      <input
                        type="text"
                        value={editableDates}
                        onChange={(e) => setEditableDates(e.target.value)}
                        placeholder="e.g. 22nd & 23rd August"
                        className="w-full font-bold text-zinc-900 text-xs p-1.5 border border-emerald-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-emerald-50/30 focus:bg-white"
                      />
                    </div>

                    <div className="bg-white/95 p-2.5 rounded-lg border border-emerald-200/80 shadow-2xs space-y-1">
                      <span className="text-[10px] text-zinc-500 font-semibold block uppercase tracking-wider">
                        Shift Timings (Editable)
                      </span>
                      <input
                        type="text"
                        value={editableTimings}
                        onChange={(e) => setEditableTimings(e.target.value)}
                        placeholder="e.g. 07:00 AM – 11:00 AM (4 hrs)"
                        className="w-full font-bold text-emerald-700 text-xs p-1.5 border border-emerald-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-emerald-50/30 focus:bg-white"
                      />
                    </div>

                    <div className="bg-white/95 p-2.5 rounded-lg border border-emerald-200/80 shadow-2xs space-y-1">
                      <span className="text-[10px] text-zinc-500 font-semibold block uppercase tracking-wider">
                        Venue / Location (Editable)
                      </span>
                      <input
                        type="text"
                        value={editableVenue}
                        onChange={(e) => setEditableVenue(e.target.value)}
                        placeholder="e.g. Ballygunge Arena, Kolkata"
                        className="w-full font-bold text-zinc-900 text-xs p-1.5 border border-emerald-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-emerald-50/30 focus:bg-white"
                      />
                    </div>

                    <div className="bg-white/95 p-2.5 rounded-lg border border-emerald-200/80 shadow-2xs space-y-1">
                      <span className="text-[10px] text-zinc-500 font-semibold block uppercase tracking-wider">
                        Commercials & Rates (Editable)
                      </span>
                      <input
                        type="text"
                        value={editableCommercials}
                        onChange={(e) => setEditableCommercials(e.target.value)}
                        placeholder="e.g. ₹3,150 Pay • ₹4,410 Client"
                        className="w-full font-bold text-emerald-800 text-xs p-1.5 border border-emerald-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-emerald-50/30 focus:bg-white"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-emerald-900 leading-snug">
                    <strong>Confirmed:</strong> Shift timings, venue, and dates are editable above. You can also customize your answers to the {clarificationQuestions.length} operational shooting preference questions below:
                  </p>
                </div>

                {/* List of Targeted Questions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {clarificationQuestions.map((q, idx) => (
                    <div
                      key={q.id || idx}
                      className="p-4 rounded-xl bg-zinc-50/70 border border-zinc-200/90 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <label className="text-xs font-bold text-zinc-900 leading-snug">
                          {idx + 1}. {q.question}
                        </label>
                      </div>
                      {q.context && (
                        <p className="text-[11px] text-zinc-500 italic">
                          {q.context}
                        </p>
                      )}

                      {/* Clickable Quick Option Chips */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {q.suggestedOptions.map((opt, oIdx) => {
                          const isSelected = userAnswers[q.id] === opt;
                          return (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() => handleSelectAnswer(q.id, opt)}
                              className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition text-left ${
                                isSelected
                                  ? 'bg-indigo-600 text-white shadow-2xs'
                                  : 'bg-white text-zinc-700 border border-zinc-200 hover:border-zinc-400'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>

                      {/* Custom Answer Input */}
                      <div className="pt-1">
                        <input
                          type="text"
                          value={userAnswers[q.id] || ''}
                          onChange={(e) => handleSelectAnswer(q.id, e.target.value)}
                          placeholder="Or type custom answer here..."
                          className="w-full text-xs px-3 py-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Optional freeform client response input */}
                <div className="pt-3 border-t border-zinc-100 space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
                    Additional Client Notes or Raw WhatsApp Reply (Optional):
                  </label>
                  <input
                    type="text"
                    value={freeformClarification}
                    onChange={(e) => setFreeformClarification(e.target.value)}
                    placeholder='e.g. "Also make sure they wear black shirts and bring a laptop for uploading files same night."'
                    className="w-full text-xs px-3.5 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white text-zinc-900"
                  />
                </div>

                {/* Action CTA to generate final JD */}
                <div className="flex items-center justify-between pt-4 border-t border-zinc-200">
                  <span className="text-xs text-zinc-500">
                    All clarifications will be woven into the formal Job Description and PDF export.
                  </span>

                  <button
                    type="button"
                    onClick={handleGenerateFinalJd}
                    disabled={isGeneratingJd}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
                  >
                    {isGeneratingJd ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-indigo-200" />
                        Generating Polished JD...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        Apply Answers & Generate Complete JD
                        <ArrowRight className="w-4 h-4 text-indigo-200" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ====================================================== */}
          {/* STEP 4: FINAL GENERATED JOB DESCRIPTION & PDF EXPORT   */}
          {/* ====================================================== */}
          {generatedJd && (
            <div id="step-4-final-jd" className="space-y-4 animate-fadeIn">
              {/* Header Bar with Action Buttons */}
              <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                    4
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                      Step 4: Final Job Description Generated!
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Ready for Distribution
                      </span>
                    </h2>
                    <p className="text-[11px] text-zinc-500">
                      Download the high-resolution branded PDF or copy the WhatsApp broadcast text
                    </p>
                  </div>
                </div>

                {/* Primary Export Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Edit Mode Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsEditingDoc(!isEditingDoc)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer ${
                      isEditingDoc
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                    }`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>{isEditingDoc ? 'Done Editing' : 'Edit JD Details'}</span>
                  </button>

                  {/* Download PDF button */}
                  <button
                    type="button"
                    onClick={() => downloadJobDescriptionPdf(generatedJd)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    Download as PDF
                  </button>

                  {/* Copy WhatsApp Broadcast */}
                  <button
                    type="button"
                    onClick={handleCopyWhatsApp}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
                  >
                    {copiedType === 'whatsapp' ? <Check className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                    {copiedType === 'whatsapp' ? 'Copied WhatsApp!' : 'Copy WhatsApp Text'}
                  </button>

                  {/* Copy Full JD */}
                  <button
                    type="button"
                    onClick={handleCopyFullJd}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-medium transition cursor-pointer"
                  >
                    {copiedType === 'full' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedType === 'full' ? 'Copied Full JD!' : 'Copy Full JD'}
                  </button>

                  {/* Save to Database */}
                  <button
                    type="button"
                    onClick={handleSaveToRegistry}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-medium transition cursor-pointer"
                  >
                    {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    Save to DB
                  </button>
                </div>
              </div>

              {/* LIVE DOCUMENT PREVIEW CARD (Mirrors the PDF layout) */}
              <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8 space-y-6">
                {isEditingDoc && (
                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between text-xs text-indigo-900">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Pencil className="w-3.5 h-3.5 text-indigo-600" />
                      Edit Mode Active: Directly modify any text, title, bullets, or numbers below. Changes sync live to PDF and WhatsApp!
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingDoc(false)}
                      className="text-xs font-bold text-indigo-700 hover:underline cursor-pointer"
                    >
                      Close Edit Mode &rarr;
                    </button>
                  </div>
                )}

                {/* Header Table / Flex */}
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4 pb-6 border-b border-zinc-200">
                  <div className="space-y-2 flex-1">
                    <span
                      className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md ${
                        generatedJd.jobCategory === 'renter'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}
                    >
                      {generatedJd.jobCategory === 'renter'
                        ? '⚡ Rent an Intern — Short-Term Gig'
                        : '💼 Normal Job — Full-Time / Internship'}
                    </span>

                    {isEditingDoc ? (
                      <div>
                        <label className="text-[10px] text-zinc-500 font-semibold block mb-0.5 uppercase tracking-wider">
                          Job Title (Editable)
                        </label>
                        <input
                          type="text"
                          value={generatedJd.jobTitle}
                          onChange={(e) => setGeneratedJd({ ...generatedJd, jobTitle: e.target.value })}
                          className="w-full text-xl font-black text-zinc-900 border border-indigo-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-600 bg-white"
                        />
                      </div>
                    ) : (
                      <h2 className="text-2xl font-black text-zinc-900 tracking-tight">
                        {generatedJd.jobTitle}
                      </h2>
                    )}

                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600 font-medium">
                      <strong className="text-zinc-900">{generatedJd.companyName}</strong>
                      {generatedJd.companyWebsite && (
                        <>
                          <span>•</span>
                          <span className="text-indigo-600">{generatedJd.companyWebsite}</span>
                        </>
                      )}
                      <span>•</span>
                      {isEditingDoc ? (
                        <input
                          type="text"
                          value={generatedJd.locationAddress}
                          onChange={(e) => setGeneratedJd({ ...generatedJd, locationAddress: e.target.value })}
                          className="text-xs p-1 border border-zinc-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-600"
                        />
                      ) : (
                        <span>{generatedJd.locationAddress}</span>
                      )}
                    </div>
                  </div>

                  {/* Logo Display */}
                  {generatedJd.companyLogoUrl && (
                    <div className="w-28 h-16 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-center p-2 shrink-0">
                      <img
                        src={generatedJd.companyLogoUrl}
                        alt={`${generatedJd.companyName} logo`}
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    </div>
                  )}
                </div>

                {/* Metadata 4-Box Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-zinc-50 rounded-xl p-4 border border-zinc-200/80">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Work Mode
                    </span>
                    {isEditingDoc ? (
                      <select
                        value={generatedJd.workMode}
                        onChange={(e) => setGeneratedJd({ ...generatedJd, workMode: e.target.value as any })}
                        className="w-full text-xs font-bold p-1 rounded border border-zinc-200 bg-white"
                      >
                        <option value="On-site">On-site</option>
                        <option value="Hybrid">Hybrid</option>
                        <option value="Remote">Remote</option>
                      </select>
                    ) : (
                      <span className="text-xs font-bold text-zinc-900 block">
                        {generatedJd.workMode}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Duration / Dates
                    </span>
                    {isEditingDoc ? (
                      <input
                        type="text"
                        value={generatedJd.durationOrDates}
                        onChange={(e) => setGeneratedJd({ ...generatedJd, durationOrDates: e.target.value })}
                        className="w-full text-xs font-bold p-1 rounded border border-zinc-200 bg-white"
                      />
                    ) : (
                      <span className="text-xs font-bold text-zinc-900 block">
                        {generatedJd.durationOrDates}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Compensation
                    </span>
                    {isEditingDoc ? (
                      <input
                        type="text"
                        value={generatedJd.compensationText}
                        onChange={(e) => setGeneratedJd({ ...generatedJd, compensationText: e.target.value })}
                        className="w-full text-xs font-bold text-emerald-700 p-1 rounded border border-zinc-200 bg-white"
                      />
                    ) : (
                      <span className="text-xs font-bold text-emerald-700 block">
                        {generatedJd.compensationText}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Timings
                    </span>
                    {isEditingDoc ? (
                      <input
                        type="text"
                        value={generatedJd.timings}
                        onChange={(e) => setGeneratedJd({ ...generatedJd, timings: e.target.value })}
                        className="w-full text-xs font-bold p-1 rounded border border-zinc-200 bg-white"
                      />
                    ) : (
                      <span className="text-xs font-bold text-zinc-900 block">
                        {generatedJd.timings}
                      </span>
                    )}
                  </div>
                </div>

                {/* About Company */}
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider border-l-2 border-zinc-900 pl-2">
                    About {generatedJd.companyName}
                  </h3>
                  {isEditingDoc ? (
                    <textarea
                      value={generatedJd.companyAbout || ''}
                      onChange={(e) => setGeneratedJd({ ...generatedJd, companyAbout: e.target.value })}
                      rows={2}
                      className="w-full text-xs p-2 border border-zinc-200 rounded-lg focus:ring-1 focus:ring-indigo-600 bg-white"
                    />
                  ) : (
                    <p className="text-xs text-zinc-700 leading-relaxed pl-2.5">
                      {generatedJd.companyAbout}
                    </p>
                  )}
                </div>

                {/* Role Overview */}
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider border-l-2 border-indigo-600 pl-2">
                    Role Overview
                  </h3>
                  {isEditingDoc ? (
                    <textarea
                      value={generatedJd.roleSummary || ''}
                      onChange={(e) => setGeneratedJd({ ...generatedJd, roleSummary: e.target.value })}
                      rows={2}
                      className="w-full text-xs p-2 border border-zinc-200 rounded-lg focus:ring-1 focus:ring-indigo-600 bg-white"
                    />
                  ) : (
                    <p className="text-xs text-zinc-700 leading-relaxed pl-2.5">
                      {generatedJd.roleSummary}
                    </p>
                  )}
                </div>

                {/* Key Responsibilities */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-l-2 border-indigo-600 pl-2">
                    <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                      Key Responsibilities
                    </h3>
                    {isEditingDoc && (
                      <button
                        type="button"
                        onClick={handleAddResponsibility}
                        className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Bullet</span>
                      </button>
                    )}
                  </div>

                  <ul className="space-y-1.5 pl-2.5">
                    {generatedJd.responsibilities.map((r, idx) => (
                      <li key={idx} className="text-xs text-zinc-700 flex items-center gap-2">
                        <span className="text-indigo-600 font-bold shrink-0">•</span>
                        {isEditingDoc ? (
                          <div className="flex-1 flex items-center gap-1.5">
                            <input
                              type="text"
                              value={r}
                              onChange={(e) => handleUpdateResponsibility(idx, e.target.value)}
                              className="flex-1 text-xs p-1.5 border border-zinc-200 rounded focus:ring-1 focus:ring-indigo-600"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveResponsibility(idx)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span>{r}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Requirements */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-l-2 border-indigo-600 pl-2">
                    <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                      Candidate Requirements & Qualifications
                    </h3>
                    {isEditingDoc && (
                      <button
                        type="button"
                        onClick={handleAddRequirement}
                        className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Bullet</span>
                      </button>
                    )}
                  </div>

                  <ul className="space-y-1.5 pl-2.5">
                    {generatedJd.requirements.map((req, idx) => (
                      <li key={idx} className="text-xs text-zinc-700 flex items-center gap-2">
                        <span className="text-indigo-600 font-bold shrink-0">•</span>
                        {isEditingDoc ? (
                          <div className="flex-1 flex items-center gap-1.5">
                            <input
                              type="text"
                              value={req}
                              onChange={(e) => handleUpdateRequirement(idx, e.target.value)}
                              className="flex-1 text-xs p-1.5 border border-zinc-200 rounded focus:ring-1 focus:ring-indigo-600"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveRequirement(idx)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span>{req}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Deliverables / Equipment */}
                {generatedJd.deliverables && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-l-2 border-emerald-600 pl-2">
                      <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                        Expected Deliverables
                      </h3>
                      {isEditingDoc && (
                        <button
                          type="button"
                          onClick={handleAddDeliverable}
                          className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Deliverable</span>
                        </button>
                      )}
                    </div>

                    <ul className="space-y-1.5 pl-2.5">
                      {generatedJd.deliverables.map((del, idx) => (
                        <li key={idx} className="text-xs text-zinc-700 flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          {isEditingDoc ? (
                            <div className="flex-1 flex items-center gap-1.5">
                              <input
                                type="text"
                                value={del}
                                onChange={(e) => handleUpdateDeliverable(idx, e.target.value)}
                                className="flex-1 text-xs p-1.5 border border-zinc-200 rounded focus:ring-1 focus:ring-emerald-600"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveDeliverable(idx)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span>{del}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Perks & Benefits */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-l-2 border-emerald-600 pl-2">
                    <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                      Perks, Benefits & Certificates
                    </h3>
                    {isEditingDoc && (
                      <button
                        type="button"
                        onClick={handleAddPerk}
                        className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Perk</span>
                      </button>
                    )}
                  </div>

                  <ul className="space-y-1.5 pl-2.5">
                    {generatedJd.perksAndBenefits.map((perk, idx) => (
                      <li key={idx} className="text-xs text-zinc-700 flex items-center gap-2">
                        <span className="text-emerald-600 font-bold shrink-0">✓</span>
                        {isEditingDoc ? (
                          <div className="flex-1 flex items-center gap-1.5">
                            <input
                              type="text"
                              value={perk}
                              onChange={(e) => handleUpdatePerk(idx, e.target.value)}
                              className="flex-1 text-xs p-1.5 border border-zinc-200 rounded focus:ring-1 focus:ring-emerald-600"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemovePerk(idx)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span>{perk}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Selection Process */}
                {generatedJd.selectionProcess && generatedJd.selectionProcess.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider border-l-2 border-zinc-900 pl-2">
                      Selection & Hiring Process
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 pl-2.5">
                      {generatedJd.selectionProcess.map((step, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 text-xs bg-zinc-100 text-zinc-800 px-3 py-1 rounded-lg font-medium"
                        >
                          <span className="w-4 h-4 rounded-full bg-zinc-800 text-white text-[10px] flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Document Footer */}
                <div className="pt-6 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-2">
                  <span>
                    Verified Opportunity by <strong>InternsHome</strong> • Apply via {generatedJd.contactEmail}
                  </span>
                  <span>
                    Deadline: <strong>{generatedJd.applicationDeadline}</strong>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: SAVED JOB DESCRIPTIONS DIRECTORY                   */}
      {/* ======================================================== */}
      {activeTab === 'saved' && (
        <div className="space-y-4 max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-900">
              Saved Job Descriptions ({savedJds.length})
            </h2>
            <button
              onClick={() => setActiveTab('create')}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 transition flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Create New JD
            </button>
          </div>

          {savedJds.length === 0 ? (
            <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center space-y-3">
              <FileText className="w-10 h-10 text-zinc-300 mx-auto" />
              <h3 className="text-sm font-bold text-zinc-900">No Job Descriptions Saved Yet</h3>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                Once you generate job descriptions using the AI Creator Workflow, you can save them here for one-click PDF downloading and WhatsApp broadcasts.
              </p>
              <button
                onClick={() => setActiveTab('create')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Start Creator Workflow
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedJds.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-zinc-200 p-5 shadow-xs hover:border-zinc-300 transition space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {item.companyLogoUrl ? (
                        <img
                          src={item.companyLogoUrl}
                          alt={item.companyName}
                          className="w-10 h-10 rounded-lg object-contain bg-zinc-50 border border-zinc-200 p-1 shrink-0"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-500 font-bold text-xs shrink-0">
                          {item.companyName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <span
                          className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.2 rounded ${
                            item.jobCategory === 'renter'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}
                        >
                          {item.jobCategory === 'renter' ? '⚡ Renter Gig' : '💼 Normal Role'}
                        </span>
                        <h3 className="text-sm font-bold text-zinc-900 mt-1 line-clamp-1">
                          {item.jobTitle}
                        </h3>
                        <p className="text-xs text-zinc-500 font-medium">
                          {item.companyName} • {item.locationAddress}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteSavedJd(item.id)}
                      className="p-1 text-zinc-400 hover:text-rose-600 transition"
                      title="Delete JD"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed">
                    {item.roleSummary}
                  </p>

                  <div className="flex items-center justify-between text-xs text-zinc-500 pt-2 border-t border-zinc-100 font-mono">
                    <span className="text-emerald-700 font-bold">{item.compensationText}</span>
                    <span>{item.durationOrDates}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => downloadJobDescriptionPdf(item)}
                      className="flex-1 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-400" />
                      PDF
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(item.whatsappText);
                        showToast('Copied WhatsApp message!');
                      }}
                      className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      WhatsApp
                    </button>
                    <button
                      onClick={() => {
                        setGeneratedJd(item);
                        setActiveTab('create');
                      }}
                      className="p-1.5 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-100 transition"
                      title="Open in View"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: NORMAL JOB REQUIREMENTS CHECKLIST GUIDE            */}
      {/* ======================================================== */}
      {activeTab === 'guide' && (
        <div className="space-y-6 max-w-4xl mx-auto bg-white rounded-2xl border border-zinc-200 p-8 shadow-xs">
          <div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Reference Guide
            </span>
            <h2 className="text-lg font-bold text-zinc-900 mt-1.5">
              What All A Normal Job Description Needs To Have
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              The complete anatomy of a high-converting, professional career role / internship JD:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1.5">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center mb-1">
                1
              </span>
              <h3 className="text-xs font-bold text-zinc-900">Job Title & Designation</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Clear, standard industry title (e.g. <em>Social Media Marketing Intern</em>, <em>Full Stack Developer Trainee</em>). Avoid internal jargon or confusing titles.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1.5">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center mb-1">
                2
              </span>
              <h3 className="text-xs font-bold text-zinc-900">Company Overview & Brand Identity</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Company name, official logo, website, and a 2-3 sentence summary explaining the brand's mission, culture, and growth trajectory.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1.5">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center mb-1">
                3
              </span>
              <h3 className="text-xs font-bold text-zinc-900">Role Type, Duration & Work Mode</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Explicit classification: Full-Time vs 3–6 Month Internship. Specify if it is <strong>On-site (Kolkata office)</strong>, <strong>Hybrid</strong>, or <strong>Remote</strong>, plus weekly timings.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1.5">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center mb-1">
                4
              </span>
              <h3 className="text-xs font-bold text-zinc-900">Core Responsibilities (Day-to-Day)</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                4 to 6 actionable bullet points detailing what the candidate will actually do every day (e.g. managing reels, outreach, coding features, client coordination).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1.5">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center mb-1">
                5
              </span>
              <h3 className="text-xs font-bold text-zinc-900">Qualifications & Skills Required</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Degree/batch criteria (e.g. 2025/2026 students), tool proficiency (Canva, Figma, CapCut, Excel, Python), and soft skills (storytelling, punctual execution).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1.5">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center mb-1">
                6
              </span>
              <h3 className="text-xs font-bold text-zinc-900">Compensation & Stipend / CTC</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Transparent figures (e.g. ₹10,000 – ₹15,000/month or ₹3.5–5 LPA) plus performance bonuses, meal/travel reimbursements, or equipment allowances.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1.5">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center mb-1">
                7
              </span>
              <h3 className="text-xs font-bold text-zinc-900">Perks, Benefits & PPO Opportunity</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Pre-Placement Offer (PPO) opportunity, Official Internship Certificate, Letter of Recommendation (LOR) from CEO/Director, and mentorship.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1.5">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center mb-1">
                8
              </span>
              <h3 className="text-xs font-bold text-zinc-900">Selection Process & How to Apply</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Step-by-step interview rounds (Resume screening &rarr; Portfolio review &rarr; Short virtual call &rarr; Final offer), contact email, and application deadline.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-emerald-900">Ready to build your Job Description?</h4>
              <p className="text-[11px] text-emerald-700">
                Our AI handles all 8 of these components automatically during the workflow.
              </p>
            </div>
            <button
              onClick={() => {
                setJobCategory('normal');
                setActiveTab('create');
              }}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition"
            >
              Create Normal Job Description
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
