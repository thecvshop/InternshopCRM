import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, Video, BookOpen, Users, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { Interview, TrainingBatch, TaskItem } from '../../types/crm';
import { Badge } from '../../components/common/Badge';
import { getBatchDisplayTitle } from '../../utils/batchUtils';

interface CalendarViewProps {
  interviews: Interview[];
  batches: TrainingBatch[];
  tasks: TaskItem[];
  onOpenQuickCreate: () => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  interviews,
  batches,
  tasks,
  onOpenQuickCreate,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'interviews' | 'training'>('all');

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-zinc-200/80">
        <div>
          <h3 className="font-semibold text-sm text-zinc-900">Placement & Training Schedule</h3>
          <p className="text-xs text-zinc-500">Real-time consolidated view of interview rounds, training sprints, and follow-ups.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-zinc-100 p-0.5 rounded-lg border border-zinc-200 text-xs font-medium">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                filterType === 'all' ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              All Events
            </button>
            <button
              onClick={() => setFilterType('interviews')}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                filterType === 'interviews' ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Interviews ({interviews.length})
            </button>
            <button
              onClick={() => setFilterType('training')}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                filterType === 'training' ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Cohorts ({batches.length})
            </button>
          </div>

          <button
            onClick={onOpenQuickCreate}
            className="px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-medium hover:bg-zinc-800 transition cursor-pointer shadow-xs"
          >
            + Add Event
          </button>
        </div>
      </div>

      {/* Agenda Timeline List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Scheduled Interviews */}
        {(filterType === 'all' || filterType === 'interviews') && (
          <div className="bg-white border border-zinc-200/80 rounded-xl p-4.5 space-y-3">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2 font-semibold text-xs text-zinc-900">
                <Video className="w-4 h-4 text-blue-600" />
                <span>Interview Coordination ({interviews.length})</span>
              </div>
            </div>

            <div className="space-y-2.5">
              {interviews.map((iv) => (
                <div key={iv.id} className="p-3 border border-zinc-200/80 rounded-lg hover:border-zinc-300 transition space-y-1.5">
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-xs text-zinc-900">{iv.studentName}</span>
                    <Badge variant={iv.status === 'Confirmed' ? 'blue' : 'neutral'}>{iv.status}</Badge>
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    {iv.companyName} • {iv.roleTitle} ({iv.round})
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-600 pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-400" />
                      {new Date(iv.scheduledAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {iv.meetUrl && (
                      <a
                        href={iv.meetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Meet
                      </a>
                    )}
                  </div>
                </div>
              ))}
              {interviews.length === 0 && (
                <div className="p-6 text-center text-xs text-zinc-400">No interviews scheduled.</div>
              )}
            </div>
          </div>
        )}

        {/* Training Cohort Sprints */}
        {(filterType === 'all' || filterType === 'training') && (
          <div className="bg-white border border-zinc-200/80 rounded-xl p-4.5 space-y-3">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2 font-semibold text-xs text-zinc-900">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Training Cohort Sprints ({batches.length})</span>
              </div>
            </div>

            <div className="space-y-2.5">
              {batches.map((b) => (
                <div key={b.id} className="p-3 border border-zinc-200/80 rounded-lg hover:border-zinc-300 transition space-y-1.5">
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-xs text-zinc-900">{getBatchDisplayTitle(b)}</span>
                    <Badge variant={b.status === 'Active' ? 'green' : 'neutral'}>{b.status}</Badge>
                  </div>
                  <div className="text-[11px] text-zinc-500 font-medium">
                    {b.sessionsCount || 14} Sessions • {b.enrolledStudents?.length || 0} Enrolled
                  </div>
                  <div className="text-[11px] text-zinc-600">
                    Dates: {b.startDate} to {b.endDate}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Operational Deadlines & Tasks */}
        <div className="bg-white border border-zinc-200/80 rounded-xl p-4.5 space-y-3">
          <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
            <div className="flex items-center gap-2 font-semibold text-xs text-zinc-900">
              <BookOpen className="w-4 h-4 text-amber-600" />
              <span>Pending Operational Deadlines</span>
            </div>
          </div>

          <div className="space-y-2.5">
            {tasks
              .filter((t) => t.status !== 'Completed')
              .slice(0, 5)
              .map((t) => (
                <div key={t.id} className="p-3 border border-zinc-200/80 rounded-lg space-y-1 text-xs">
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-zinc-900">{t.title}</span>
                    <Badge variant={t.priority === 'urgent' ? 'red' : 'amber'}>{t.priority}</Badge>
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    Assignee: {t.assignedTo} • Due: {t.dueDate}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
