import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  ClipboardPaste,
  Loader2,
  Check,
  ArrowRight,
  RotateCcw,
  Users,
  Clock,
  Briefcase,
  FileText,
  Lightbulb,
} from 'lucide-react';
import {
  simplifyJobDescriptionWithAi,
  SimplifiedJdResult,
} from '../../services/aiJdService';

interface AiJdSimplifierModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialText?: string;
  onApply: (data: {
    simplifiedJd: string;
    detectedInterns?: number | null;
    detectedHours?: number | null;
    applyInternsAndHours?: boolean;
    bulletPoints?: string[];
  }) => void;
}

const SAMPLE_BRIEFS = [
  {
    label: 'Fashion UGC / Model',
    text: 'Hey! We are a D2C streetwear brand shooting our winter drop tomorrow. Need 2 female models for aesthetic UGC reels and photo lookbook. 4 hours from 3 PM to 7 PM in South Kolkata. Must know how to pose naturally for Instagram.',
  },
  {
    label: 'Videographer for Launch',
    text: 'Urgent requirement: Need 1 videographer with good iPhone 15 Pro or gimbal for our new cafe launch party at Park Street on Sunday, 5pm to 9pm (4 hrs). Need raw reel footage handed over same night.',
  },
  {
    label: 'Event Registration & Desk',
    text: 'We are organizing an Edu-Tech summit at Biswa Bangla Convention Centre. Need 3 smart interns for attendee check-in badge counter, guest ushering, and delegate coordination. 9 AM to 3 PM (6 hours). Formal dress code.',
  },
  {
    label: 'Exhibition Stall Support',
    text: 'Looking for 2 energetic interns to manage our stall at Kolkata Jewellery Expo. Tasks include welcoming visitors, distributing flyers, and collecting visitor business cards & phone numbers on an iPad. 11am to 7pm.',
  },
];

export const AiJdSimplifierModal: React.FC<AiJdSimplifierModalProps> = ({
  isOpen,
  onClose,
  initialText = '',
  onApply,
}) => {
  const [rawText, setRawText] = useState(initialText);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SimplifiedJdResult | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [applyNumbers, setApplyNumbers] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRawText(initialText || '');
      setError(null);
      setCopied(false);
      // If initial text is already rich (>30 chars), we can keep it ready
      if (initialText && initialText.trim().length > 30) {
        setRawText(initialText.trim());
      }
    } else {
      setResult(null);
      setEditedTitle('');
    }
  }, [isOpen, initialText]);

  if (!isOpen) return null;

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setRawText(text);
        setError(null);
      }
    } catch {
      setError('Could not access clipboard. Please paste manually into the box.');
    }
  };

  const handleSimplify = async () => {
    if (!rawText.trim()) {
      setError('Please paste or type the client’s message or job brief first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const simplified = await simplifyJobDescriptionWithAi(rawText);
      setResult(simplified);
      setEditedTitle(simplified.simplifiedJd);
    } catch (err: any) {
      setError(err?.message || 'Failed to simplify job description.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    const finalTitle = editedTitle.trim() || result?.simplifiedJd || '';
    if (!finalTitle) return;

    onApply({
      simplifiedJd: finalTitle,
      detectedInterns: result?.detectedInterns,
      detectedHours: result?.detectedHours,
      applyInternsAndHours:
        applyNumbers &&
        Boolean(result?.detectedInterns || result?.detectedHours),
      bulletPoints: result?.bulletPoints,
    });
    onClose();
  };

  return (
    <div
      id="ai-jd-simplifier-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="ai-jd-simplifier-dialog"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-indigo-50 via-purple-50 to-white border-b border-indigo-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-900">
                  AI Job Description Simplifier
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold text-indigo-700 bg-indigo-100 rounded-full">
                  Gemini 3.8 Flash
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">
                Paste raw client WhatsApp messages or email briefs to generate a concise, standardized JD
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Quick Sample Briefs */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-zinc-500 flex items-center gap-1">
                <Lightbulb className="w-3 h-3 text-amber-500" />
                Try sample client briefs:
              </span>
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1 hover:underline"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                Paste from Clipboard
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_BRIEFS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setRawText(sample.text);
                    setError(null);
                    setResult(null);
                  }}
                  className="px-2 py-1 text-[11px] bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-md font-medium transition-colors"
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>

          {/* Raw Textarea */}
          <div>
            <label
              htmlFor="raw-client-jd-textarea"
              className="block text-xs font-semibold text-zinc-700 mb-1"
            >
              Raw Client Message / Brief <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="raw-client-jd-textarea"
              rows={4}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste here e.g. 'Looking for 2 photographers for a boutique clothing brand shoot tomorrow from 3pm to 7pm at Alipore. Need 25 edited pictures + raw reels. Pay 1500 each.'"
              className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 placeholder:text-zinc-400 text-zinc-900 resize-none font-sans leading-relaxed"
            />
            <div className="flex items-center justify-between mt-1 text-[10px] text-zinc-400">
              <span>{rawText.length} characters</span>
              {rawText && (
                <button
                  type="button"
                  onClick={() => {
                    setRawText('');
                    setResult(null);
                  }}
                  className="hover:text-zinc-600 text-zinc-400 underline"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              {error}
            </div>
          )}

          {/* Action to Simplify */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-zinc-400">
              Extracts standardized title, role & task scope
            </span>
            <button
              type="button"
              id="submit-simplify-jd-btn"
              disabled={loading || !rawText.trim()}
              onClick={handleSimplify}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Simplifying with AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Simplify JD with AI</span>
                </>
              )}
            </button>
          </div>

          {/* Result Card */}
          {result && (
            <div
              id="ai-jd-simplified-result-box"
              className="p-4 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/50 border border-indigo-200/90 rounded-xl space-y-3 animate-in fade-in duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-950">
                    Simplified CRM Job Description
                  </span>
                </div>
                {result.detectedRole && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-800 rounded-full border border-indigo-200/60">
                    {result.detectedRole}
                  </span>
                )}
              </div>

              {/* Editable Title Field */}
              <div>
                <input
                  type="text"
                  id="simplified-jd-editable-input"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-white border border-indigo-300 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
                <span className="text-[10px] text-zinc-400 mt-0.5 block">
                  You can edit the title before applying it to the booking form
                </span>
              </div>

              {/* Detected Metrics Chips */}
              {(result.detectedInterns || result.detectedHours) && (
                <div className="flex flex-wrap items-center gap-2 p-2 bg-white/80 border border-indigo-100 rounded-lg text-xs">
                  <span className="text-[11px] font-semibold text-zinc-600">
                    Detected in brief:
                  </span>
                  {result.detectedInterns && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-[11px] rounded border border-blue-200">
                      <Users className="w-3 h-3" />
                      {result.detectedInterns} Intern{result.detectedInterns > 1 ? 's' : ''}
                    </span>
                  )}
                  {result.detectedHours && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 font-bold text-[11px] rounded border border-amber-200">
                      <Clock className="w-3 h-3" />
                      {result.detectedHours} Hour{result.detectedHours > 1 ? 's' : ''}
                    </span>
                  )}
                  <label className="flex items-center gap-1.5 ml-auto text-[11px] text-zinc-700 cursor-pointer font-medium select-none">
                    <input
                      type="checkbox"
                      checked={applyNumbers}
                      onChange={(e) => setApplyNumbers(e.target.checked)}
                      className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Auto-update Interns & Hours in form</span>
                  </label>
                </div>
              )}

              {/* Extracted Key Responsibilities / Scope */}
              {result.bulletPoints && result.bulletPoints.length > 0 && (
                <div>
                  <span className="text-[11px] font-semibold text-zinc-600 block mb-1">
                    Key Deliverables / Scope Summary:
                  </span>
                  <ul className="space-y-1">
                    {result.bulletPoints.map((bp, i) => (
                      <li
                        key={i}
                        className="text-[11px] text-zinc-700 flex items-start gap-1.5"
                      >
                        <span className="text-indigo-500 font-bold mt-0.5">•</span>
                        <span>{bp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 rounded-lg hover:bg-zinc-200/60 transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            {result && (
              <button
                type="button"
                id="apply-simplified-jd-btn"
                onClick={handleApply}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply to Job Description</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
