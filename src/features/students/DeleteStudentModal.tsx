import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';
import { Student } from '../../types/crm';
import { deleteStudent } from '../../services/firestoreService';

interface DeleteStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onSuccess?: () => void;
}

export const DeleteStudentModal: React.FC<DeleteStudentModalProps> = ({
  isOpen,
  onClose,
  student,
  onSuccess,
}) => {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !student) return null;

  const handleDelete = async () => {
    try {
      setDeleting(true);
      setError(null);
      await deleteStudent(student.id, student.name);
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to delete student:', err);
      setError(err?.message || 'Failed to delete student. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 bg-rose-50/50">
          <div className="flex items-center gap-2.5 text-rose-700">
            <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900">Delete Student</h3>
              <p className="text-[11px] text-zinc-500 font-mono">{student.studentId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={deleting}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg font-medium">
              {error}
            </div>
          )}

          <p className="text-zinc-600 leading-relaxed">
            Are you sure you want to permanently delete{' '}
            <strong className="text-zinc-900 font-semibold">{student.name}</strong> from the Student
            Directory?
          </p>

          <div className="p-3 bg-zinc-50 border border-zinc-200/70 rounded-xl space-y-1">
            <div className="flex justify-between text-zinc-500 text-[11px]">
              <span>College:</span>
              <span className="font-medium text-zinc-800">{student.college || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-zinc-500 text-[11px]">
              <span>Stage:</span>
              <span className="font-medium text-zinc-800">{student.currentStage}</span>
            </div>
            <div className="flex justify-between text-zinc-500 text-[11px]">
              <span>Email:</span>
              <span className="font-mono text-zinc-800">{student.email}</span>
            </div>
          </div>

          <p className="text-[11px] text-rose-600 font-medium">
            This action cannot be undone and removes their record from directory views and placement tracking.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-zinc-50/80 border-t border-zinc-100">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-3.5 py-1.5 text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-100 rounded-xl transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50"
          >
            {deleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Student</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
