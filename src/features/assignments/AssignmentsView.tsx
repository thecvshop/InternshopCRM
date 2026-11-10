import React, { useState } from 'react';
import { BookOpen, CheckCircle, Clock, Plus, Search, ExternalLink } from 'lucide-react';
import { Assignment } from '../../types/crm';
import { addAssignment, updateAssignment } from '../../services/firestoreService';
import { Badge } from '../../components/common/Badge';

interface AssignmentsViewProps {
  assignments: Assignment[];
}

export const AssignmentsView: React.FC<AssignmentsViewProps> = ({ assignments }) => {
  const [search, setSearch] = useState('');
  const [reviewModalAssignment, setReviewModalAssignment] = useState<Assignment | null>(null);
  const [reviewScore, setReviewScore] = useState<number>(90);
  const [reviewComment, setReviewComment] = useState<string>('');

  const filtered = assignments.filter((a) => {
    const q = search.toLowerCase();
    return !q || a.studentName.toLowerCase().includes(q) || a.title.toLowerCase().includes(q);
  });

  const handleApprove = async () => {
    if (!reviewModalAssignment) return;
    await updateAssignment(reviewModalAssignment.id, {
      status: 'Approved',
      score: reviewScore,
      comments: reviewComment || 'Exceeds benchmark requirements.',
      reviewer: 'Operations Reviewer',
    });
    setReviewModalAssignment(null);
  };

  const handleReject = async () => {
    if (!reviewModalAssignment) return;
    await updateAssignment(reviewModalAssignment.id, {
      status: 'Revision Required',
      score: reviewScore,
      comments: reviewComment || 'Needs revision on edge cases and structure.',
      reviewer: 'Operations Reviewer',
    });
    setReviewModalAssignment(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-zinc-200/80">
        <div className="relative w-72">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search assignments by student or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-zinc-200 rounded-lg focus:outline-none"
          />
        </div>
        <span className="text-xs text-zinc-500 font-medium">
          Total Submissions & Tasks: <strong>{assignments.length}</strong>
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((a) => (
          <div key={a.id} className="bg-white border border-zinc-200/80 rounded-xl p-4.5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">Candidate</span>
                <h4 className="font-bold text-sm text-zinc-900">{a.studentName}</h4>
              </div>
              <Badge variant={a.status === 'Approved' ? 'green' : 'amber'}>{a.status}</Badge>
            </div>

            <div className="text-xs text-zinc-600 bg-zinc-50 p-3 rounded-lg border border-zinc-100">
              <span className="font-semibold text-zinc-900 block mb-0.5">{a.title}</span>
              <span className="text-zinc-500 text-[11px]">Template: {a.template}</span>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
              <span>Due: {a.dueDate}</span>
              {a.score !== undefined && (
                <span>
                  Score: <strong className="text-zinc-900">{a.score} / 100</strong>
                </span>
              )}
            </div>

            {a.submissionUrl && (
              <a
                href={a.submissionUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>View Submission Code / Files</span>
              </a>
            )}

            <div className="pt-2 border-t border-zinc-100 flex justify-end">
              {a.status !== 'Approved' ? (
                <button
                  onClick={() => {
                    setReviewModalAssignment(a);
                    setReviewScore(a.score || 90);
                    setReviewComment(a.comments || '');
                  }}
                  className="px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-medium hover:bg-zinc-800 cursor-pointer"
                >
                  Review & Grade
                </button>
              ) : (
                <span className="text-xs text-emerald-600 font-medium">Approved by {a.reviewer} ✓</span>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-12 text-xs text-zinc-400 border border-dashed border-zinc-200 rounded-xl">
            No assignments recorded.
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewModalAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div>
              <h3 className="font-bold text-zinc-900 text-base">Grade Assignment</h3>
              <p className="text-xs text-zinc-500">
                {reviewModalAssignment.studentName} — {reviewModalAssignment.title}
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-600 font-medium mb-1">Score (0 - 100)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={reviewScore}
                  onChange={(e) => setReviewScore(Number(e.target.value))}
                  className="w-full text-sm px-3 py-2 border border-zinc-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-zinc-600 font-medium mb-1">Feedback & Review Notes</label>
                <textarea
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Provide concrete strengths and areas of improvement..."
                  className="w-full text-xs px-3 py-2 border border-zinc-200 rounded-lg"
                />
              </div>
            </div>

            <div className="border-t border-zinc-100 pt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReviewModalAssignment(null)}
                className="px-3 py-1.5 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-medium hover:bg-rose-100"
              >
                Request Revision
              </button>
              <button
                type="button"
                onClick={handleApprove}
                className="px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-medium hover:bg-zinc-800"
              >
                Approve & Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
