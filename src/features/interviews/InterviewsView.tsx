import React, { useState } from 'react';
import { Calendar, ExternalLink, Plus, Search, CheckCircle, XCircle, Clock, Video, User } from 'lucide-react';
import { Interview } from '../../types/crm';
import { updateInterview } from '../../services/firestoreService';
import { Badge } from '../../components/common/Badge';

interface InterviewsViewProps {
  interviews: Interview[];
  onOpenQuickCreate: () => void;
}

export const InterviewsView: React.FC<InterviewsViewProps> = ({
  interviews,
  onOpenQuickCreate,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredInterviews = interviews.filter((iv) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      iv.studentName.toLowerCase().includes(q) ||
      iv.companyName.toLowerCase().includes(q) ||
      iv.roleTitle.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'all' || iv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (id: string, status: Interview['status']) => {
    await updateInterview(id, { status });
  };

  const getStatusVariant = (st: Interview['status']) => {
    switch (st) {
      case 'Confirmed':
        return 'blue';
      case 'Completed':
        return 'purple';
      case 'Selected':
        return 'green';
      case 'Rejected':
        return 'red';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-zinc-200/80">
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by student, company, role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-zinc-200 rounded-lg px-2.5 py-1.5 bg-white text-zinc-700 cursor-pointer focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="Proposed">Proposed</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Completed">Completed</option>
            <option value="Selected">Selected</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        <button
          onClick={onOpenQuickCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-medium hover:bg-zinc-800 transition cursor-pointer shadow-xs self-end sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Schedule Interview</span>
        </button>
      </div>

      {/* Interviews Table */}
      <div className="bg-white border border-zinc-200/80 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-50/80 border-b border-zinc-200/80 text-zinc-500 font-medium">
            <tr>
              <th className="py-3 px-4">Candidate</th>
              <th className="py-3 px-4">Hiring Partner & Role</th>
              <th className="py-3 px-4">Round</th>
              <th className="py-3 px-4">Date & Time</th>
              <th className="py-3 px-4">Meeting Mode</th>
              <th className="py-3 px-4">Status & Outcome</th>
              <th className="py-3 px-4 text-right">Join Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filteredInterviews.map((iv) => (
              <tr key={iv.id} className="hover:bg-zinc-50/80 transition">
                <td className="py-3 px-4">
                  <div className="font-semibold text-zinc-900">{iv.studentName}</div>
                  <span className="text-[10px] text-zinc-400">{iv.studentCollege}</span>
                </td>
                <td className="py-3 px-4">
                  <span className="font-medium text-zinc-900 block">{iv.companyName}</span>
                  <span className="text-[10px] text-zinc-400">{iv.roleTitle}</span>
                </td>
                <td className="py-3 px-4 text-zinc-700 font-medium">
                  {iv.round}
                </td>
                <td className="py-3 px-4 text-zinc-600">
                  {new Date(iv.scheduledAt).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
                <td className="py-3 px-4 text-zinc-700">
                  <span className="inline-flex items-center gap-1">
                    <Video className="w-3.5 h-3.5 text-zinc-400" />
                    {iv.mode}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <select
                    value={iv.status}
                    onChange={(e) => handleStatusChange(iv.id, e.target.value as any)}
                    className="text-xs font-medium bg-white border border-zinc-200 rounded-md px-2 py-1 cursor-pointer focus:outline-none"
                  >
                    <option value="Proposed">Proposed</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Completed">Completed</option>
                    <option value="Selected">Selected</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Rescheduled">Rescheduled</option>
                  </select>
                </td>
                <td className="py-3 px-4 text-right">
                  {iv.meetUrl ? (
                    <a
                      href={iv.meetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium hover:underline text-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Meet</span>
                    </a>
                  ) : (
                    <span className="text-zinc-400 text-[11px]">—</span>
                  )}
                </td>
              </tr>
            ))}
            {filteredInterviews.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-zinc-400 text-xs">
                  No interviews scheduled. Click "Schedule Interview" to set one up.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
