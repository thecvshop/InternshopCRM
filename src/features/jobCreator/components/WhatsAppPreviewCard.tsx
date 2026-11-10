import React, { useState } from 'react';
import {
  Copy,
  Check,
  Send,
  Sparkles,
  ShieldAlert,
  Share2,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';

interface WhatsAppPreviewCardProps {
  messageText: string;
  onApprove?: () => void;
  onSaveDraft?: () => void;
  isApproved?: boolean;
}

export const WhatsAppPreviewCard: React.FC<WhatsAppPreviewCardProps> = ({
  messageText,
  onApprove,
  onSaveDraft,
  isApproved = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    // Opens modal explaining WhatsApp Business API integration abstraction
    setShowWhatsAppModal(true);
  };

  const handleOpenWhatsAppWeb = () => {
    const encoded = encodeURIComponent(messageText);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
    setShowWhatsAppModal(false);
  };

  return (
    <div className="bg-white rounded-xl border border-zinc-200/80 shadow-2xs overflow-hidden flex flex-col h-full">
      {/* WhatsApp Header bar */}
      <div className="bg-[#075E54] text-white px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs text-white">
            <MessageCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold leading-tight">InternsHome Community</div>
            <div className="text-[10px] text-emerald-200">Rent an Intern Broadcast Preview</div>
          </div>
        </div>
        <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded-full font-mono">
          Live WhatsApp Format
        </span>
      </div>

      {/* WhatsApp Chat Canvas */}
      <div className="p-4 bg-[#EFEAE2] flex-1 overflow-y-auto max-h-[500px]">
        {/* Message Bubble */}
        <div className="bg-white rounded-lg p-3.5 shadow-xs border border-black/5 text-xs text-zinc-900 leading-relaxed font-sans whitespace-pre-wrap relative max-w-full">
          {messageText || (
            <span className="text-zinc-400 italic">
              Paste or analyze a client requirement to see the generated WhatsApp gig post here...
            </span>
          )}
          <div className="text-right text-[10px] text-zinc-400 mt-2 flex items-center justify-end gap-1">
            <span>Just now</span>
            <span className="text-blue-500 font-bold">✓✓</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-3 bg-zinc-50 border-t border-zinc-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-100 transition-colors shadow-2xs"
            title="Copy message to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-zinc-500" />
                Copy Message
              </>
            )}
          </button>

          <button
            onClick={handleSendWhatsApp}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#075E54] bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors shadow-2xs"
          >
            <Send className="w-3.5 h-3.5" />
            Send to WhatsApp
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {onSaveDraft && (
            <button
              onClick={onSaveDraft}
              className="px-3 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 transition-colors"
            >
              Save Draft
            </button>
          )}

          {onApprove && (
            <button
              onClick={onApprove}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg shadow-2xs transition-colors ${
                isApproved
                  ? 'bg-emerald-700 text-white'
                  : 'bg-zinc-900 text-white hover:bg-zinc-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              {isApproved ? 'Approved ✓' : 'Approve Job'}
            </button>
          )}
        </div>
      </div>

      {/* WhatsApp Integration Modal */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-zinc-200 p-6 animate-fadeIn">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#075E54] flex items-center justify-center border border-emerald-200">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 text-sm">Send to WhatsApp Community</h3>
                <p className="text-xs text-zinc-500">Rent an Intern Gig Distribution</p>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50 rounded-lg border border-amber-200 mb-4 text-xs text-amber-900 space-y-1.5">
              <div className="font-semibold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                WhatsApp Business API integration required
              </div>
              <p className="text-amber-800/90 text-[11px] leading-relaxed">
                Direct automated broadcast via WhatsApp Cloud API will be enabled once your WhatsApp Business Account token is connected. In the meantime, you can broadcast immediately via WhatsApp Web or copy the text.
              </p>
            </div>

            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setShowWhatsAppModal(false)}
                className="px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 bg-zinc-100 text-zinc-800 hover:bg-zinc-200 rounded-lg font-medium flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? 'Copied' : 'Copy Text'}
              </button>
              <button
                onClick={handleOpenWhatsAppWeb}
                className="px-4 py-1.5 bg-[#075E54] text-white hover:bg-[#064e46] rounded-lg font-medium flex items-center gap-1.5 shadow-2xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open WhatsApp Web
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
