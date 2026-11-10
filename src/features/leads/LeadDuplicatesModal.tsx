import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  Trash2,
  CheckCircle2,
  Sparkles,
  Phone,
  Mail,
  GraduationCap,
  Calendar,
  Building,
  ShieldAlert,
  ExternalLink,
  Eye,
} from 'lucide-react';
import { Lead } from '../../types/crm';
import { DuplicateGroup } from '../../utils/duplicateDetection';
import { deleteLead } from '../../services/firestoreService';
import { Badge } from '../../components/common/Badge';

interface LeadDuplicatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: DuplicateGroup<Lead>[];
  totalDuplicateCount: number;
  totalLeads: number;
  onSelectLead?: (lead: Lead) => void;
}

export const LeadDuplicatesModal: React.FC<LeadDuplicatesModalProps> = ({
  isOpen,
  onClose,
  groups,
  totalDuplicateCount,
  totalLeads,
  onSelectLead,
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isCleaningAll, setIsCleaningAll] = useState(false);
  const [showAutoCleanConfirm, setShowAutoCleanConfirm] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Remove individual duplicate lead
  const handleDeleteOne = async (lead: Lead) => {
    if (!confirm(`Are you sure you want to remove duplicate lead inquiry for "${lead.name}" (${lead.leadId})?`)) {
      return;
    }

    setDeletingId(lead.id);
    try {
      await deleteLead(lead.id, lead.name);
      showToast(`✓ Removed duplicate lead: ${lead.name} (${lead.leadId})`);
    } catch (err: any) {
      console.error('Failed to delete duplicate lead:', err);
      alert('Error removing lead: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  // Keep one lead and delete others in the group
  const handleKeepThis = async (keepLead: Lead, group: DuplicateGroup<Lead>) => {
    const toDelete = group.items.filter((item) => item.id !== keepLead.id);
    if (!confirm(`Keep lead "${keepLead.name}" (${keepLead.leadId}) and remove the other ${toDelete.length} duplicate inquiry records?`)) {
      return;
    }

    setDeletingId(keepLead.id);
    try {
      for (const item of toDelete) {
        await deleteLead(item.id, item.name);
      }
      showToast(`✓ Kept ${keepLead.name} and cleaned ${toDelete.length} duplicate leads.`);
    } catch (err: any) {
      console.error('Failed to clean duplicate leads:', err);
      alert('Error cleaning duplicate leads: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  // Auto clean all duplicates across all groups (keeps the first/primary item in each cluster)
  const handleAutoCleanAll = async () => {
    setIsCleaningAll(true);
    let deletedCount = 0;

    try {
      for (const group of groups) {
        const toDelete = group.items.slice(1);
        for (const item of toDelete) {
          await deleteLead(item.id, item.name);
          deletedCount++;
        }
      }
      showToast(`✓ Successfully auto-cleaned ${deletedCount} duplicate lead inquiries!`);
      setShowAutoCleanConfirm(false);
    } catch (err: any) {
      console.error('Error auto-cleaning duplicate leads:', err);
      alert('Error during auto-cleanup: ' + err.message);
    } finally {
      setIsCleaningAll(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div
        className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[92vh] my-6 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-zinc-200 bg-amber-50/50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-zinc-900">
                  Leads Pipeline Duplicate Detection
                </h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  {groups.length} Duplicate Clusters
                </span>
              </div>
              <p className="text-xs text-zinc-600">
                Scanned {totalLeads} active leads. Found {totalDuplicateCount} redundant inquiry submissions matching phone, email, or full name.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast Banner */}
        {notification && (
          <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-emerald-900 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* Top Action Bar */}
        {groups.length > 0 && (
          <div className="px-5 py-3 bg-zinc-50 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-zinc-600">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Review candidate inquiries below to keep the valid application and purge duplicates.
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {showAutoCleanConfirm ? (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 p-1.5 rounded-xl">
                  <span className="text-rose-800 font-bold text-[11px] pl-1">
                    Delete {totalDuplicateCount} duplicate leads?
                  </span>
                  <button
                    type="button"
                    disabled={isCleaningAll}
                    onClick={handleAutoCleanAll}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    {isCleaningAll ? 'Cleaning...' : 'Yes, Clean All'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAutoCleanConfirm(false)}
                    className="px-2 py-1 text-zinc-600 hover:text-zinc-900 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAutoCleanConfirm(true)}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Auto-Clean All ({totalDuplicateCount})</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Modal Body - Groups List */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5 text-xs">
          {groups.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-zinc-900">
                  No Duplicate Leads Found!
                </h4>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
                  All {totalLeads} active leads in the inquiry pipeline have distinct contact numbers, emails, and names.
                </p>
              </div>
            </div>
          ) : (
            groups.map((group, groupIdx) => (
              <div
                key={group.id}
                className="bg-white border-2 border-zinc-200/90 rounded-2xl p-4 shadow-2xs space-y-3"
              >
                {/* Cluster Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-zinc-900 text-white font-bold text-xs flex items-center justify-center">
                      {groupIdx + 1}
                    </span>
                    <span className="font-bold text-zinc-900 text-sm">
                      {group.matchReason}
                    </span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">
                      Match by {group.matchType}
                    </span>
                  </div>

                  <span className="text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg self-start sm:self-auto">
                    {group.items.length} Duplicate Leads
                  </span>
                </div>

                {/* Candidate Comparison Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {group.items.map((lead, idx) => {
                    const isFirst = idx === 0;
                    const isDeleting = deletingId === lead.id;

                    return (
                      <div
                        key={lead.id}
                        className={`p-3.5 rounded-xl border-2 flex flex-col justify-between transition-all relative ${
                          isFirst
                            ? 'border-emerald-300 bg-emerald-50/20'
                            : 'border-zinc-200 bg-zinc-50/40'
                        }`}
                      >
                        {/* Status Tag */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[11px] font-bold text-zinc-900 bg-white border border-zinc-200 px-1.5 py-0.5 rounded shadow-2xs">
                              {lead.leadId}
                            </span>
                            {isFirst ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                Recommended Primary
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                                Potential Duplicate
                              </span>
                            )}
                          </div>

                          <Badge
                            variant={
                              lead.status === 'Approved for IS'
                                ? 'green'
                                : lead.status === 'Reject'
                                ? 'neutral'
                                : 'blue'
                            }
                          >
                            {lead.status}
                          </Badge>
                        </div>

                        {/* Lead Details */}
                        <div className="space-y-1.5 my-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {lead.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <h5 className="font-bold text-sm text-zinc-900 truncate">
                                {lead.name}
                              </h5>
                              <p className="text-[11px] text-zinc-500 truncate">
                                {lead.college || 'College N/A'} • {lead.course || 'Degree N/A'}
                              </p>
                            </div>
                          </div>

                          {/* Contact & Source Info */}
                          <div className="pt-2 border-t border-zinc-200/60 grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-zinc-600">
                            <div className="flex items-center gap-1.5 truncate">
                              <Phone className="w-3 h-3 text-zinc-400 shrink-0" />
                              <span className="font-mono">{lead.phone || 'No phone'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 truncate">
                              <Mail className="w-3 h-3 text-zinc-400 shrink-0" />
                              <span className="truncate" title={lead.email}>
                                {lead.email}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 truncate">
                              <Sparkles className="w-3 h-3 text-zinc-400 shrink-0" />
                              <span className="truncate">Source: {lead.source || 'Direct'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 truncate">
                              <Calendar className="w-3 h-3 text-zinc-400 shrink-0" />
                              <span className="truncate">{lead.interestArea || 'General Track'}</span>
                            </div>
                          </div>

                          {/* Original Lead Note if present */}
                          {lead.notes && (
                            <div className="text-[10px] text-zinc-500 bg-white p-2 rounded-lg border border-zinc-200/60 line-clamp-2 mt-1">
                              <strong>Notes:</strong> {lead.notes}
                            </div>
                          )}
                        </div>

                        {/* Actions for this lead */}
                        <div className="pt-3 border-t border-zinc-200/80 flex items-center justify-between gap-2 mt-auto">
                          <button
                            type="button"
                            onClick={() => handleKeepThis(lead, group)}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition cursor-pointer shadow-2xs inline-flex items-center gap-1"
                            title="Keep this lead and remove other duplicates in this group"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Keep This Only</span>
                          </button>

                          <div className="flex items-center gap-1.5">
                            {onSelectLead && (
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectLead(lead);
                                  onClose();
                                }}
                                className="p-1.5 text-zinc-500 hover:text-zinc-900 rounded-lg hover:bg-zinc-200/60 transition cursor-pointer"
                                title="View full lead details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={isDeleting}
                              onClick={() => handleDeleteOne(lead)}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-semibold text-xs transition cursor-pointer inline-flex items-center gap-1 disabled:opacity-50"
                              title="Delete this individual duplicate lead"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              <span>{isDeleting ? 'Removing...' : 'Remove Duplicate'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-200 bg-white flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            Deletions purge from Leads collection and maintain clean CRM pipeline.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
