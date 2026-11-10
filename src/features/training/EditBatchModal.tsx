import React, { useState, useEffect } from 'react';
import {
  X,
  GraduationCap,
  Calendar,
  Users,
  Clock,
  AlertCircle,
  Trash2,
  CheckCircle2,
  MessageCircle,
  Hash,
  Sparkles,
} from 'lucide-react';
import { TrainingBatch } from '../../types/crm';
import { updateTrainingBatch, deleteTrainingBatch } from '../../services/firestoreService';

interface EditBatchModalProps {
  batch: TrainingBatch | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (updatedBatch: TrainingBatch) => void;
  onDelete?: (batchId: string) => void;
  enrolledCount?: number;
}

export const EditBatchModal: React.FC<EditBatchModalProps> = ({
  batch,
  isOpen,
  onClose,
  onSuccess,
  onDelete,
  enrolledCount = 0,
}) => {
  const [formData, setFormData] = useState({
    batchId: '',
    name: '',
    program: '',
    trainerName: '',
    status: 'Active' as 'Active' | 'Upcoming' | 'Completed',
    startDate: '',
    endDate: '',
    sessionsCount: 14,
    capacity: 20,
    whatsappGroup: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync form when batch prop changes
  useEffect(() => {
    if (batch) {
      setFormData({
        batchId: batch.batchId || '',
        name: batch.name || '',
        program: batch.program || '',
        trainerName: batch.trainerName || '',
        status: batch.status || 'Active',
        startDate: batch.startDate || '',
        endDate: batch.endDate || '',
        sessionsCount: batch.sessionsCount ?? 14,
        capacity: batch.capacity ?? 20,
        whatsappGroup: batch.whatsappGroup || '',
      });
      setError(null);
      setShowDeleteConfirm(false);
    }
  }, [batch]);

  if (!isOpen || !batch) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Batch name is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const updates: Partial<TrainingBatch> = {
        batchId: formData.batchId.trim() || batch.batchId,
        name: formData.name.trim(),
        program: formData.program.trim(),
        trainerName: formData.trainerName.trim(),
        status: formData.status,
        startDate: formData.startDate,
        endDate: formData.endDate,
        sessionsCount: Number(formData.sessionsCount) || 14,
        capacity: Number(formData.capacity) || 20,
        whatsappGroup: formData.whatsappGroup.trim() || undefined,
        updatedAt: new Date().toISOString(),
      };

      await updateTrainingBatch(batch.id, updates);

      if (onSuccess) {
        onSuccess({ ...batch, ...updates });
      }
      onClose();
    } catch (err: any) {
      console.error('Error updating training batch:', err);
      setError(err.message || 'Failed to save batch changes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      await deleteTrainingBatch(batch.id);
      if (onDelete) {
        onDelete(batch.id);
      }
      onClose();
    } catch (err: any) {
      console.error('Error deleting training batch:', err);
      setError(err.message || 'Failed to delete batch.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div
        className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[92vh] my-6 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-200 bg-zinc-50/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center shrink-0 shadow-xs">
              <GraduationCap className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-zinc-900">
                  Edit Training Batch
                </h3>
                <span className="font-mono text-xs text-zinc-500 bg-zinc-200/70 px-2 py-0.5 rounded">
                  {batch.batchId}
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Modify cohort schedule, capacity, curriculum track, and trainer details.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Batch Code ID & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-700 font-semibold mb-1 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-zinc-400" />
                <span>Batch Code / ID *</span>
              </label>
              <input
                required
                type="text"
                value={formData.batchId}
                onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                placeholder="e.g. TB-2025-05"
                className="w-full text-xs font-mono px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-zinc-50/50"
              />
            </div>

            <div>
              <label className="block text-zinc-700 font-semibold mb-1">
                Batch Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as 'Active' | 'Upcoming' | 'Completed',
                  })
                }
                className="w-full text-xs px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white font-medium"
              >
                <option value="Active">🟢 Active (Currently Running)</option>
                <option value="Upcoming">🔵 Upcoming (Admissions Open)</option>
                <option value="Completed">⚪ Completed (Past Cohort)</option>
              </select>
            </div>
          </div>

          {/* Batch Name */}
          <div>
            <label className="block text-zinc-700 font-semibold mb-1">
              Batch Title / Name *
            </label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Batch 5"
              className="w-full text-xs px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>

          {/* Schedule & Capacity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-700 font-semibold mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <span>Schedule (Sessions Count)</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={formData.sessionsCount}
                  onChange={(e) => setFormData({ ...formData, sessionsCount: Number(e.target.value) })}
                  className="w-full text-xs px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 pr-16 font-mono"
                />
                <span className="absolute right-3 top-2 text-[11px] text-zinc-400 pointer-events-none">
                  Sessions
                </span>
              </div>
            </div>

            <div>
              <label className="block text-zinc-700 font-semibold mb-1 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-zinc-400" />
                <span>Target Student Capacity</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                  className="w-full text-xs px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 pr-16 font-mono"
                />
                <span className="absolute right-3 top-2 text-[11px] text-zinc-400 pointer-events-none">
                  Students
                </span>
              </div>
            </div>
          </div>

          {/* Current Enrollment Status pill */}
          <div className="px-3.5 py-2.5 border border-zinc-200/80 rounded-xl bg-zinc-50 flex items-center justify-between text-xs">
            <span className="text-zinc-600 font-medium flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>{enrolledCount} Currently Enrolled Candidate{enrolledCount === 1 ? '' : 's'}</span>
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {formData.capacity > 0 ? Math.round((enrolledCount / formData.capacity) * 100) : 0}% Capacity Filled
            </span>
          </div>

          {/* Start Date & End Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-700 font-semibold mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                <span>Start Date</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full text-xs px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            <div>
              <label className="block text-zinc-700 font-semibold mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                <span>End Date</span>
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full text-xs px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
          </div>

          {/* WhatsApp Group Link */}
          <div>
            <label className="block text-zinc-700 font-semibold mb-1 flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>WhatsApp Group Community Link</span>
            </label>
            <input
              type="url"
              value={formData.whatsappGroup}
              onChange={(e) => setFormData({ ...formData, whatsappGroup: e.target.value })}
              placeholder="https://chat.whatsapp.com/..."
              className="w-full text-xs px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>

          {/* Danger Zone: Delete Batch */}
          <div className="pt-2 border-t border-zinc-100">
            {showDeleteConfirm ? (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>Are you sure you want to delete this batch?</span>
                </div>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  This will remove {formData.name || 'this batch'} from the system. Any currently enrolled candidates will remain in the Student Directory.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleDelete}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition cursor-pointer disabled:opacity-50"
                  >
                    {isDeleting ? 'Deleting...' : 'Yes, Delete Batch'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 rounded-lg text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-xs text-rose-600 hover:text-rose-800 font-semibold inline-flex items-center gap-1.5 hover:underline cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete this Training Batch</span>
              </button>
            )}
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-zinc-200 flex items-center justify-between gap-3">
            <span className="text-[11px] text-zinc-400">
              Changes sync in real-time across CRM
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-zinc-200 rounded-xl text-zinc-700 hover:bg-zinc-50 cursor-pointer font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-bold transition cursor-pointer shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{isSubmitting ? 'Saving Changes...' : 'Save Batch Changes'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
