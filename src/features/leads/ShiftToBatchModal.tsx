import React, { useState } from 'react';
import {
  GraduationCap,
  Users,
  X,
  Plus,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Phone,
  Mail,
  Building,
  FileText,
} from 'lucide-react';
import { Lead, Student, TrainingBatch } from '../../types/crm';
import { addTrainingBatch, shiftLeadToTrainingBatch } from '../../services/firestoreService';
import { getBatchDisplayTitle } from '../../utils/batchUtils';

interface ShiftToBatchModalProps {
  leads: Lead[];
  batches: TrainingBatch[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (students: Student[], targetBatchName: string) => void;
}

export const ShiftToBatchModal: React.FC<ShiftToBatchModalProps> = ({
  leads,
  batches,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedBatchId, setSelectedBatchId] = useState<string>(
    batches.length > 0 ? batches[0].id : 'new'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New batch inline form
  const [isCreatingNewBatch, setIsCreatingNewBatch] = useState(batches.length === 0);
  const [newBatchName, setNewBatchName] = useState(`Batch ${batches.length + 1}`);
  const [newBatchCapacity, setNewBatchCapacity] = useState(30);

  if (!isOpen || leads.length === 0) return null;

  const handleShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      let targetBatchId = selectedBatchId;
      let targetBatchName = '';

      if (isCreatingNewBatch || selectedBatchId === 'new') {
        const batchCode = `TB-${new Date().getFullYear()}-${Math.floor(10 + Math.random() * 90)}`;
        const createdBatch = await addTrainingBatch({
          batchId: batchCode,
          name: newBatchName.trim(),
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 86400000 * 45).toISOString().split('T')[0],
          capacity: Number(newBatchCapacity) || 30,
          enrolledStudents: [],
          status: 'Active',
          sessionsCount: 14,
        });
        targetBatchId = createdBatch.id;
        targetBatchName = createdBatch.name;
      } else {
        const found = batches.find((b) => b.id === selectedBatchId);
        targetBatchName = found ? found.name : 'Training Batch';
      }

      const createdStudents: Student[] = [];
      for (const lead of leads) {
        const student = await shiftLeadToTrainingBatch({
          lead,
          batchId: targetBatchId,
          batchName: targetBatchName,
        });
        createdStudents.push(student);
      }

      onSuccess(createdStudents, targetBatchName);
      onClose();
    } catch (err: any) {
      console.error('Error shifting leads to batch:', err);
      setError(err.message || 'Failed to shift leads into training batch.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div
        className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[90vh] my-6 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-zinc-200 bg-zinc-50/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-900 flex items-center gap-2">
                Shift to Training Batch & Student Directory
              </h3>
              <p className="text-xs text-zinc-500">
                {leads.length === 1
                  ? `Shift ${leads[0].name} from Leads into Batch Creation`
                  : `Shift ${leads.length} candidates from Leads into Batch Creation`}
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

        {/* Form Body */}
        <form onSubmit={handleShift} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Operation Notice */}
          <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-xl p-3.5 space-y-2">
            <span className="font-bold text-emerald-950 block text-xs flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              What happens on confirmation:
            </span>
            <ul className="space-y-1 text-emerald-800 text-[11px] list-disc list-inside">
              <li>
                <strong>Added to Student Directory</strong> with all application details (Contact, College, Course, Portfolio/CV links, Original Notes).
              </li>
              <li>
                <strong>Allotted into the selected Training Batch</strong> with active cohort enrollment.
              </li>
              <li>
                <strong>Removed from Leads section</strong> — lead record is cleared so they no longer appear in the inquiry pipeline.
              </li>
            </ul>
          </div>

          {/* Candidates to Shift */}
          <div>
            <label className="font-bold text-zinc-900 block mb-1.5 uppercase tracking-wider text-[10px]">
              Candidates to Shift ({leads.length})
            </label>
            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 border border-zinc-200 rounded-xl p-2 bg-zinc-50/60">
              {leads.map((l) => (
                <div
                  key={l.id}
                  className="bg-white p-2 rounded-lg border border-zinc-200/80 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-zinc-900 block truncate">{l.name}</span>
                    <span className="text-[10px] text-zinc-500 truncate block">
                      {l.college} • {l.phone || l.email}
                    </span>
                  </div>
                  {l.interestArea && (
                    <span className="text-[10px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded font-medium shrink-0 ml-2">
                      {l.interestArea}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Batch Destination Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-zinc-900 block uppercase tracking-wider text-[10px]">
                Target Training Batch
              </label>
              <button
                type="button"
                onClick={() => setIsCreatingNewBatch(!isCreatingNewBatch)}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                {isCreatingNewBatch ? '← Select Existing Batch' : '+ Create New Batch'}
              </button>
            </div>

            {!isCreatingNewBatch ? (
              <div className="space-y-2">
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="w-full p-2.5 border border-zinc-300 rounded-xl bg-white text-xs font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {getBatchDisplayTitle(b)} ({b.enrolledStudents?.length || 0} enrolled)
                    </option>
                  ))}
                </select>

                {batches.length === 0 && (
                  <p className="text-zinc-500 text-xs italic">
                    No active batches yet. Please create a new batch below.
                  </p>
                )}
              </div>
            ) : (
              <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2.5">
                <span className="font-bold text-zinc-900 block text-xs">
                  Create & Assign to New Batch:
                </span>
                <div>
                  <label className="text-[10px] font-semibold text-zinc-600 block mb-0.5">
                    Batch Title / Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newBatchName}
                    onChange={(e) => setNewBatchName(e.target.value)}
                    placeholder="e.g. Batch 6"
                    className="w-full p-2 border border-zinc-200 rounded-lg bg-white text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-zinc-600 block mb-0.5">
                    Target Student Capacity
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={200}
                    value={newBatchCapacity}
                    onChange={(e) => setNewBatchCapacity(Number(e.target.value))}
                    className="w-full p-2 border border-zinc-200 rounded-lg bg-white text-xs font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-zinc-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-zinc-200 rounded-xl text-zinc-700 hover:bg-zinc-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              <GraduationCap className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Enrolling & Removing from Leads...'
                  : `Shift ${leads.length === 1 ? 'Candidate' : `${leads.length} Candidates`} to Batch`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
