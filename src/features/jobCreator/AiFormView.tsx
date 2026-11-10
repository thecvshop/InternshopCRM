import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Copy,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  Send,
  FileText,
  DollarSign,
  Clock,
  MapPin,
  Users,
  ChevronDown,
  Building,
  Check,
  CheckSquare,
  MessageSquare,
  Share2,
  Trash2,
  Sliders,
  ExternalLink,
  ChevronRight,
  Save,
  Store,
} from 'lucide-react';
import {
  RentInternJob,
  RentInternJobStatus,
  NormalizedRole,
  PricingRule,
} from '../../types/crm';
import {
  saveRentInternJob,
  getNextJobId,
} from '../../services/rentInternJobService';
import { subscribePricingRules, calculateJobPricing } from '../../services/pricingService';
import {
  analyzeBriefWithGemini,
  generateFullRequirementChecklist,
  StructuredAiResponse,
} from '../../services/geminiService';
import {
  generateStandardizedWhatsAppGig,
  fallbackExtractBrief,
} from '../../services/aiBriefService';

interface AiFormViewProps {
  onNavigateToRaiShop: () => void;
}

const SAMPLE_BRIEFS = [
  {
    title: 'Fashion Brand Reel Shoot',
    text: 'Need one person tomorrow from 12:30 for around 3 hours at Theatre Road to shoot content for a fashion brand. They need to shoot some pictures and one reel with a simple edit.',
  },
  {
    title: 'ITC Sonar Event Registration',
    text: 'Need 2 interns for an event at ITC Sonar this Sunday from 3 PM to 9 PM. They need to help with guest registrations and shoot a few reels. Food provided.',
  },
  {
    title: 'Expo Stall Support',
    text: 'Looking for 2 interns for an exhibition stall at Milan Mela on 15th October, 10 AM to 6 PM. Main duty is greeting visitors and scanning badges. Lunch will be provided.',
  },
];

export const AiFormView: React.FC<AiFormViewProps> = ({ onNavigateToRaiShop }) => {
  // Input brief state
  const [clientBrief, setClientBrief] = useState('');
  const [clientReply, setClientReply] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isMergingReply, setIsMergingReply] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Workflow extracted state
  const [hasExtracted, setHasExtracted] = useState(false);
  const [structuredData, setStructuredData] = useState<Partial<RentInternJob> | null>(null);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [pricingCalc, setPricingCalc] = useState<any>(null);

  // Requirement Checklist modal state
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [checklistText, setChecklistText] = useState(generateFullRequirementChecklist());
  const [checklistCopied, setChecklistCopied] = useState(false);

  // UI state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedClarification, setCopiedClarification] = useState(false);
  const [copiedFinalGig, setCopiedFinalGig] = useState(false);
  const [savedJobId, setSavedJobId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribePricingRules((rules) => setPricingRules(rules));
    return () => unsub();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Recalculate pricing
  const computePricing = (jobState: Partial<RentInternJob>) => {
    const calc = calculateJobPricing({
      role: jobState.role || jobState.normalizedRole || 'Event Support',
      normalizedRole: jobState.normalizedRole,
      startTime: jobState.startTime || '12:00 PM',
      endTime: jobState.endTime || '04:00 PM',
      numberOfInterns: jobState.numberOfInterns || 1,
      numberOfDays: jobState.numberOfDays || 1,
      travelIncluded: jobState.travelIncluded,
      travelAmountOverride: jobState.travelAmount,
      pricingRules,
    });
    setPricingCalc(calc);
    return calc;
  };

  // Analyze Brief (Section 8, 9, 10)
  const handleAnalyzeBrief = async () => {
    if (!clientBrief.trim()) {
      showToast('Please paste a client message first');
      return;
    }

    setIsAnalyzing(true);
    try {
      let aiResult: StructuredAiResponse | null = null;
      try {
        aiResult = await analyzeBriefWithGemini(clientBrief.trim());
      } catch (err: any) {
        console.warn('Server Gemini call failed, using heuristic fallback:', err);
        // Fallback extraction
        const fallback = fallbackExtractBrief(clientBrief.trim());
        aiResult = {
          client: fallback.client || '',
          brand: fallback.client || '',
          role: fallback.role || 'Event Support',
          normalizedRole: fallback.normalizedRole || 'Event Support',
          numberOfInterns: fallback.numberOfInterns || 1,
          dates: fallback.dates || ['Tomorrow'],
          startTime: fallback.startTime || '12:30 PM',
          endTime: fallback.endTime || '03:30 PM',
          durationMinutes: (fallback.durationHours || 3) * 60,
          location: {
            venue: fallback.venue || '',
            area: fallback.area || 'Theatre Road',
            city: fallback.city || 'Kolkata',
          },
          scopeOfWork: [fallback.primaryTask || 'Shoot pictures and one reel with simple edit'],
          deliverables: fallback.expectedDeliverables || ['1 edited reel', 'Pictures'],
          deliveryDeadline: fallback.deliveryDeadline || '',
          skills: fallback.requiredSkills || ['Smartphone Videography', 'Video Editing'],
          equipment: fallback.equipmentRequired || ['Smartphone with camera'],
          applicationRequirements: ['Name and phone number', 'College and year'],
          foodProvided: fallback.foodIncluded,
          travelProvided: fallback.travelIncluded,
          missingFields: fallback.missingFields || [],
          clarificationMessage: fallback.clarificationMessage || '',
          confidence: {},
        };
      }

      if (aiResult) {
        // Construct Job State
        const jobState: Partial<RentInternJob> = {
          client: aiResult.client || aiResult.brand || '',
          role: aiResult.role || aiResult.normalizedRole || 'Content Creator',
          normalizedRole: (aiResult.normalizedRole as NormalizedRole) || 'Content Creator',
          numberOfInterns: aiResult.numberOfInterns || 1,
          jobType: 'Gig',
          location: {
            venue: aiResult.location?.venue || '',
            area: aiResult.location?.area || '',
            city: aiResult.location?.city || 'Kolkata',
            remoteType: 'On-site',
          },
          dates: aiResult.dates && aiResult.dates.length > 0 ? aiResult.dates : ['Tomorrow'],
          startTime: aiResult.startTime || '12:30 PM',
          endTime: aiResult.endTime || '03:30 PM',
          durationHours: Math.round((aiResult.durationMinutes || 180) / 60) || 3,
          numberOfDays: 1,
          primaryTask: (aiResult.scopeOfWork && aiResult.scopeOfWork[0]) || 'Content shooting and editing',
          additionalTasks: (aiResult.scopeOfWork && aiResult.scopeOfWork.slice(1)) || [],
          expectedDeliverables: aiResult.deliverables || ['1 edited reel'],
          deliveryDeadline: aiResult.deliveryDeadline || '',
          requiredSkills: aiResult.skills || ['Smartphone Videography'],
          equipmentRequired: aiResult.equipment && aiResult.equipment.length > 0 ? aiResult.equipment : ['Smartphone'],
          foodIncluded: Boolean(aiResult.foodProvided),
          travelIncluded: Boolean(aiResult.travelProvided),
          travelAmount: aiResult.travelProvided ? 200 : 0,
          missingFields: aiResult.missingFields || [],
          clarificationMessage: aiResult.clarificationMessage || '',
          originalClientBrief: clientBrief.trim(),
          clientClarifications: [],
          status: (aiResult.missingFields && aiResult.missingFields.length > 0)
            ? 'Awaiting Client Details'
            : 'Ready for Review',
          priority: 'Medium',
          source: 'WhatsApp',
          jobOwner: 'Operations Team',
        };

        // Missing fields detection check (Section 10)
        const missing: string[] = [];
        if (!jobState.location?.venue && !jobState.location?.area) missing.push('Exact venue or location');
        if (!jobState.client) missing.push('Brand name / Client');
        if (!jobState.numberOfInterns) missing.push('Number of interns needed');
        if (!jobState.startTime || !jobState.endTime) missing.push('Timings (Start & End)');
        if (!jobState.primaryTask) missing.push('Scope of work / deliverables');

        jobState.missingFields = missing;

        // Auto-generate WhatsApp-ready message (Section 10)
        if (missing.length > 0 && !jobState.clarificationMessage) {
          jobState.clarificationMessage = `Just need ${missing.length} quick details:\n\n` +
            missing.map((m, idx) => `${idx + 1}. ${m}?`).join('\n');
        }

        const pricing = computePricing(jobState);
        jobState.internPayment = pricing.totalInternPayment;
        jobState.clientCommercial = pricing.totalClientCommercial;

        // Generate final WhatsApp gig text
        jobState.generatedGigText = generateStandardizedWhatsAppGig(jobState, pricing);

        setStructuredData(jobState);
        setHasExtracted(true);
        showToast('✓ Brief analysed successfully with Gemini');
      }
    } catch (err: any) {
      showToast(`Error analyzing brief: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Merge Client Reply (Section 11)
  const handleMergeClientReply = async () => {
    if (!clientReply.trim()) {
      showToast('Please paste the client reply');
      return;
    }
    if (!structuredData) return;

    setIsMergingReply(true);
    try {
      let merged: StructuredAiResponse | null = null;
      try {
        merged = await analyzeBriefWithGemini(
          clientBrief,
          clientReply.trim(),
          structuredData
        );
      } catch (e) {
        // Fallback merge
        const fallback = fallbackExtractBrief(clientBrief, clientReply.trim(), structuredData);
        merged = {
          client: fallback.client || structuredData.client || '',
          brand: fallback.client || structuredData.client || '',
          role: fallback.role || structuredData.role || 'Content Creator',
          normalizedRole: fallback.normalizedRole || structuredData.normalizedRole || 'Content Creator',
          numberOfInterns: fallback.numberOfInterns || structuredData.numberOfInterns || 1,
          dates: fallback.dates || structuredData.dates || ['Tomorrow'],
          startTime: fallback.startTime || structuredData.startTime || '12:30 PM',
          endTime: fallback.endTime || structuredData.endTime || '03:30 PM',
          durationMinutes: (fallback.durationHours || structuredData.durationHours || 3) * 60,
          location: {
            venue: fallback.venue || structuredData.location?.venue || 'Theatre Road',
            area: fallback.area || structuredData.location?.area || 'Theatre Road',
            city: fallback.city || structuredData.location?.city || 'Kolkata',
          },
          scopeOfWork: structuredData.primaryTask ? [structuredData.primaryTask] : ['Content shoot'],
          deliverables: structuredData.expectedDeliverables || ['1 reel'],
          deliveryDeadline: fallback.deliveryDeadline || structuredData.deliveryDeadline || '',
          skills: fallback.requiredSkills || structuredData.requiredSkills || [],
          equipment: fallback.equipmentRequired || structuredData.equipmentRequired || [],
          applicationRequirements: ['Name and phone', 'College and year'],
          foodProvided: fallback.foodIncluded ?? structuredData.foodIncluded,
          travelProvided: fallback.travelIncluded ?? structuredData.travelIncluded,
          missingFields: fallback.missingFields || [],
          clarificationMessage: '',
          confidence: {},
        };
      }

      if (merged) {
        const updatedClarifications = [
          ...(structuredData.clientClarifications || []),
          {
            timestamp: new Date().toISOString(),
            text: clientReply.trim(),
          },
        ];

        const updated: Partial<RentInternJob> = {
          ...structuredData,
          client: merged.client || merged.brand || structuredData.client,
          role: merged.role || structuredData.role,
          normalizedRole: (merged.normalizedRole as NormalizedRole) || structuredData.normalizedRole,
          numberOfInterns: merged.numberOfInterns || structuredData.numberOfInterns,
          dates: (merged.dates && merged.dates.length > 0) ? merged.dates : structuredData.dates,
          startTime: merged.startTime || structuredData.startTime,
          endTime: merged.endTime || structuredData.endTime,
          location: {
            venue: merged.location?.venue || structuredData.location?.venue || '',
            area: merged.location?.area || structuredData.location?.area || '',
            city: merged.location?.city || structuredData.location?.city || 'Kolkata',
            remoteType: 'On-site',
          },
          foodIncluded: merged.foodProvided ?? structuredData.foodIncluded,
          travelIncluded: merged.travelProvided ?? structuredData.travelIncluded,
          clientClarifications: updatedClarifications,
          missingFields: merged.missingFields || [],
          clarificationMessage: merged.clarificationMessage || '',
          status: (merged.missingFields && merged.missingFields.length > 0)
            ? 'Awaiting Client Details'
            : 'Ready for Review',
        };

        const pricing = computePricing(updated);
        updated.internPayment = pricing.totalInternPayment;
        updated.clientCommercial = pricing.totalClientCommercial;
        updated.generatedGigText = generateStandardizedWhatsAppGig(updated, pricing);

        setStructuredData(updated);
        setClientReply('');
        showToast('✓ Client reply merged and job details updated!');
      }
    } catch (err: any) {
      showToast(`Error merging reply: ${err.message}`);
    } finally {
      setIsMergingReply(false);
    }
  };

  // Save to RAI Shop (Section 14)
  const handleSaveToRaiShop = async (targetStatus: RentInternJobStatus = 'Ready for Review') => {
    if (!structuredData) return;

    setIsSaving(true);
    try {
      const nextId = await getNextJobId();
      const newJob: Omit<RentInternJob, 'id'> = {
        jobId: nextId,
        jobTitle: `${structuredData.normalizedRole || 'Event Support'} for ${structuredData.client || 'Client'}`,
        client: structuredData.client || 'Client',
        clientContact: {
          pocName: '',
          pocPhone: '',
        },
        role: structuredData.role || structuredData.normalizedRole || 'Event Support',
        normalizedRole: structuredData.normalizedRole || 'Event Support',
        numberOfInterns: structuredData.numberOfInterns || 1,
        jobType: 'Gig',
        location: {
          venue: structuredData.location?.venue || 'Kolkata',
          area: structuredData.location?.area || '',
          city: structuredData.location?.city || 'Kolkata',
          remoteType: 'On-site',
        },
        dateType: 'single',
        dates: structuredData.dates && structuredData.dates.length > 0 ? structuredData.dates : ['Upcoming'],
        startTime: structuredData.startTime || '12:00 PM',
        endTime: structuredData.endTime || '04:00 PM',
        numberOfDays: 1,
        durationHours: structuredData.durationHours || 4,
        primaryTask: structuredData.primaryTask || 'On-site gig responsibilities',
        additionalTasks: structuredData.additionalTasks || [],
        expectedDeliverables: structuredData.expectedDeliverables || [],
        deliverableQuantity: '',
        deliveryDeadline: structuredData.deliveryDeadline || '',
        specialInstructions: structuredData.specialInstructions || '',
        requiredSkills: structuredData.requiredSkills || [],
        experienceRequirement: structuredData.experienceRequirement || 'Fresher / Any',
        equipmentRequired: structuredData.equipmentRequired || ['None'],
        askPhoneModel: Boolean(structuredData.askPhoneModel),
        askCameraModel: Boolean(structuredData.askCameraModel),
        askPortfolio: false,
        askWorkSamples: Boolean(structuredData.askWorkSamples),
        askInstagram: false,
        askCollege: true,
        askYear: true,
        clientCommercial: structuredData.clientCommercial || 1500,
        internPayment: structuredData.internPayment || 1000,
        travelIncluded: Boolean(structuredData.travelIncluded),
        travelAmount: structuredData.travelAmount || 0,
        foodIncluded: Boolean(structuredData.foodIncluded),
        jobOwner: 'Operations Team',
        createdBy: 'AI Form',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: targetStatus,
        priority: 'Medium',
        source: 'WhatsApp',
        originalClientBrief: clientBrief,
        clientClarifications: structuredData.clientClarifications || [],
        generatedGigText: structuredData.generatedGigText || generateStandardizedWhatsAppGig(structuredData, pricingCalc),
        missingFields: structuredData.missingFields || [],
        clarificationMessage: structuredData.clarificationMessage || '',
      };

      const docId = await saveRentInternJob(newJob);
      setSavedJobId(nextId);
      showToast(`✓ Job ${nextId} saved to RAI Shop successfully!`);
    } catch (err: any) {
      showToast(`Error saving to RAI Shop: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = (text: string, type: 'clarification' | 'gig') => {
    navigator.clipboard.writeText(text);
    if (type === 'clarification') {
      setCopiedClarification(true);
      setTimeout(() => setCopiedClarification(false), 2000);
      showToast('✓ WhatsApp message copied to clipboard');
    } else {
      setCopiedFinalGig(true);
      setTimeout(() => setCopiedFinalGig(false), 2000);
      showToast('✓ WhatsApp gig post copied to clipboard');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-16 max-w-5xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-medium flex items-center gap-2 animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* START SCREEN HEADER (Section 8) */}
      <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-2xs">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900">
                Create Rent an Intern Job
              </h1>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Paste the client's message and let AI structure the requirement.
            </p>
          </div>

          <button
            type="button"
            onClick={onNavigateToRaiShop}
            className="px-3.5 py-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200/80 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <Store className="w-3.5 h-3.5" />
            <span>Go to RAI Shop</span>
          </button>
        </div>

        {/* INPUT BOX (Section 8) */}
        <div className="mt-5 space-y-3">
          <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider">
            Paste Client Requirement
          </label>
          <div className="relative">
            <textarea
              rows={4}
              placeholder="e.g. Need one person tomorrow from 12:30 for around 3 hours at Theatre Road to shoot content for a fashion brand. They need to shoot some pictures and one reel with a simple edit."
              value={clientBrief}
              onChange={(e) => setClientBrief(e.target.value)}
              className="w-full p-4 text-xs font-medium bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 leading-relaxed resize-none text-zinc-900 placeholder:text-zinc-400"
            />
          </div>

          {/* Quick Sample Briefs */}
          <div className="flex items-center gap-2 flex-wrap text-[11px] text-zinc-500">
            <span className="font-semibold text-zinc-600">Sample Briefs:</span>
            {SAMPLE_BRIEFS.map((sb, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setClientBrief(sb.text)}
                className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-[11px] font-medium transition cursor-pointer"
              >
                {sb.title}
              </button>
            ))}
          </div>

          {/* Buttons: Analyse Brief & Clear (Section 8) */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isAnalyzing || !clientBrief.trim()}
                onClick={handleAnalyzeBrief}
                className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing Brief with Gemini...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Analyse Brief</span>
                  </>
                )}
              </button>

              {clientBrief && (
                <button
                  type="button"
                  onClick={() => {
                    setClientBrief('');
                    setStructuredData(null);
                    setHasExtracted(false);
                    setSavedJobId(null);
                  }}
                  className="px-3.5 py-2.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Checklist trigger under input (Section 8 & 12) */}
            <div className="text-right">
              <span className="text-xs text-zinc-400 mr-2">Don't have a client brief?</span>
              <button
                type="button"
                onClick={() => setIsChecklistModalOpen(true)}
                className="px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition cursor-pointer inline-flex items-center gap-1.5"
              >
                <FileText className="w-3 h-3" />
                <span>Generate Requirement Checklist</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SAVED TO RAI SHOP BANNER */}
      {savedJobId && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-900 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="text-xs font-bold">Job {savedJobId} has been saved to RAI Shop!</p>
              <p className="text-[11px] text-emerald-700">The RAI Shop list has updated automatically.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onNavigateToRaiShop}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition cursor-pointer flex items-center gap-1.5"
          >
            <span>View in RAI Shop</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* AI EXTRACTION & WORKFLOW RESULTS (Section 9, 10, 11, 13) */}
      {hasExtracted && structuredData && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
          {/* SECTION 10: DETAILS FOUND VS STILL REQUIRED */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 bg-zinc-50/80 border-b border-zinc-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800">
                  AI Requirement Analysis
                </h3>
                <p className="text-[11px] text-zinc-500">
                  Information extracted from brief vs pending client details
                </p>
              </div>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  structuredData.missingFields && structuredData.missingFields.length > 0
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}
              >
                {structuredData.missingFields && structuredData.missingFields.length > 0
                  ? `${structuredData.missingFields.length} Details Needed`
                  : 'All Essential Details Found'}
              </span>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* DETAILS FOUND (Section 10) */}
              <div className="p-4 bg-emerald-50/40 border border-emerald-200/80 rounded-xl space-y-2.5">
                <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Details Found</span>
                </h4>
                <ul className="space-y-1.5 text-xs text-zinc-700">
                  {structuredData.role && (
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>
                        <strong className="text-zinc-900">Role:</strong> {structuredData.normalizedRole || structuredData.role}
                      </span>
                    </li>
                  )}
                  {structuredData.client && (
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>
                        <strong className="text-zinc-900">Brand / Client:</strong> {structuredData.client}
                      </span>
                    </li>
                  )}
                  {structuredData.dates && structuredData.dates.length > 0 && (
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>
                        <strong className="text-zinc-900">Date:</strong> {structuredData.dates.join(', ')}
                      </span>
                    </li>
                  )}
                  {structuredData.startTime && (
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>
                        <strong className="text-zinc-900">Time:</strong> {structuredData.startTime} to {structuredData.endTime}
                      </span>
                    </li>
                  )}
                  {structuredData.durationHours && (
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>
                        <strong className="text-zinc-900">Duration:</strong> {structuredData.durationHours} hours
                      </span>
                    </li>
                  )}
                  {(structuredData.location?.venue || structuredData.location?.area) && (
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>
                        <strong className="text-zinc-900">Location:</strong> {[structuredData.location?.venue, structuredData.location?.area].filter(Boolean).join(', ')}
                      </span>
                    </li>
                  )}
                  {structuredData.primaryTask && (
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>
                        <strong className="text-zinc-900">Scope:</strong> {structuredData.primaryTask}
                      </span>
                    </li>
                  )}
                  {structuredData.expectedDeliverables && structuredData.expectedDeliverables.length > 0 && (
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>
                        <strong className="text-zinc-900">Deliverables:</strong> {structuredData.expectedDeliverables.join(', ')}
                      </span>
                    </li>
                  )}
                  {structuredData.foodIncluded && (
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>
                        <strong className="text-zinc-900">Food:</strong> Meals provided on-site
                      </span>
                    </li>
                  )}
                </ul>
              </div>

              {/* STILL REQUIRED (Section 10) */}
              <div className="p-4 bg-amber-50/50 border border-amber-200/80 rounded-xl space-y-2.5">
                <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Still Required</span>
                </h4>
                {structuredData.missingFields && structuredData.missingFields.length > 0 ? (
                  <ul className="space-y-1.5 text-xs text-amber-900 font-medium">
                    {structuredData.missingFields.map((field, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" />
                        <span>{field}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-emerald-800 font-medium flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>No missing information! Ready to approve and publish.</span>
                  </p>
                )}

                {/* Auto-generated WhatsApp message for missing details (Section 10) */}
                {structuredData.clarificationMessage && (
                  <div className="mt-3 pt-3 border-t border-amber-200/80">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-amber-900">
                        WhatsApp-Ready Follow-up:
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(structuredData.clarificationMessage!, 'clarification')}
                        className="px-2 py-0.5 text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 rounded-md transition flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedClarification ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>
                    <pre className="p-2.5 bg-white border border-amber-200 rounded-lg text-xs font-sans whitespace-pre-wrap text-zinc-800 leading-relaxed">
                      {structuredData.clarificationMessage}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 11: CLIENT RESPONSE BOX */}
            <div className="p-5 bg-zinc-50/50 border-t border-zinc-200 space-y-3">
              <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider">
                Paste Client Reply
              </label>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  placeholder="e.g. Venue is Cafe Mocha at Theatre Road, brand is Aura Clothing, need 1 intern"
                  value={clientReply}
                  onChange={(e) => setClientReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && clientReply.trim()) {
                      handleMergeClientReply();
                    }
                  }}
                  className="flex-1 px-3.5 py-2 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-zinc-900"
                />
                <button
                  type="button"
                  disabled={isMergingReply || !clientReply.trim()}
                  onClick={handleMergeClientReply}
                  className="px-4 py-2 text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  {isMergingReply ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5" />
                  )}
                  <span>Merge Response</span>
                </button>
              </div>
              <p className="text-[11px] text-zinc-400">
                Gemini will merge the reply with the original brief without overwriting existing data.
              </p>
            </div>
          </div>

          {/* SECTION 13: FINAL JOB GENERATION & PREVIEW */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 bg-zinc-50/80 border-b border-zinc-200 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800">
                  Standardized Rent an Intern Gig Post
                </h3>
                <p className="text-[11px] text-zinc-500">
                  WhatsApp broadcast format for students and interns
                </p>
              </div>

              {/* Action buttons (Section 14) */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => copyToClipboard(structuredData.generatedGigText || '', 'gig')}
                  className="px-3 py-1.5 text-xs font-semibold text-zinc-700 bg-white hover:bg-zinc-50 border border-zinc-300 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedFinalGig ? 'Copied!' : 'Copy WhatsApp Message'}</span>
                </button>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveToRaiShop('Draft')}
                  className="px-3 py-1.5 text-xs font-semibold text-zinc-700 bg-white hover:bg-zinc-50 border border-zinc-300 rounded-xl transition cursor-pointer"
                >
                  Save Draft
                </button>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveToRaiShop('Approved')}
                  className="px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition cursor-pointer"
                >
                  Approve
                </button>

                {/* Primary Action: Save to RAI Shop */}
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveToRaiShop('Ready for Review')}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  {isSaving ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Save to RAI Shop</span>
                </button>
              </div>
            </div>

            <div className="p-5">
              <pre className="p-4 bg-zinc-950 text-zinc-100 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed border border-zinc-800 select-all shadow-inner">
                {structuredData.generatedGigText || generateStandardizedWhatsAppGig(structuredData, pricingCalc)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* FULL REQUIREMENT CHECKLIST MODAL (Section 12) */}
      {isChecklistModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs"
          onClick={() => setIsChecklistModalOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">
                  Full Requirement Checklist
                </h3>
                <p className="text-xs text-zinc-500">
                  Send this compact message to clients when no brief exists yet
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsChecklistModalOpen(false)}
                className="w-7 h-7 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <textarea
                rows={12}
                value={checklistText}
                onChange={(e) => setChecklistText(e.target.value)}
                className="w-full p-3.5 text-xs font-mono bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/10 text-zinc-900 leading-relaxed resize-none"
              />

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-zinc-400">
                  You can edit the template directly before copying.
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(checklistText);
                      setChecklistCopied(true);
                      setTimeout(() => setChecklistCopied(false), 2000);
                      showToast('✓ Checklist copied to clipboard');
                    }}
                    className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{checklistCopied ? 'Copied!' : 'Copy WhatsApp Message'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
