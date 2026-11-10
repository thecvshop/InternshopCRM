import React, { useState } from 'react';
import { CheckSquare, Square, Plus, Search, Calendar, User, Clock, AlertCircle } from 'lucide-react';
import { TaskItem } from '../../types/crm';
import { addTask, updateTask } from '../../services/firestoreService';
import { Badge } from '../../components/common/Badge';

interface TasksViewProps {
  tasks: TaskItem[];
  onOpenQuickCreate: () => void;
}

export const TasksView: React.FC<TasksViewProps> = ({ tasks, onOpenQuickCreate }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = tasks.filter((t) => {
    const q = search.toLowerCase();
    const assigneeStr = (t.assigneeName || t.assignee || '').toLowerCase();
    const matchesSearch =
      !q ||
      t.title.toLowerCase().includes(q) ||
      assigneeStr.includes(q) ||
      (t.relatedEntityName && t.relatedEntityName.toLowerCase().includes(q));

    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleTaskStatus = async (task: TaskItem) => {
    const newStatus = task.status === 'completed' ? 'todo' : 'completed';
    await updateTask(task.id, { status: newStatus });
  };

  const getPriorityVariant = (priority: TaskItem['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'red';
      case 'high':
        return 'amber';
      case 'medium':
        return 'blue';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-zinc-200/80">
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search tasks or assignees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-zinc-200 rounded-lg focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-zinc-200 rounded-lg px-2.5 py-1.5 bg-white text-zinc-700 cursor-pointer focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <button
          onClick={onOpenQuickCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-medium hover:bg-zinc-800 transition cursor-pointer shadow-xs self-end sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Task</span>
        </button>
      </div>

      {/* Task List */}
      <div className="bg-white border border-zinc-200/80 rounded-xl overflow-hidden divide-y divide-zinc-100">
        {filtered.map((t) => {
          const isDone = t.status === 'completed';
          return (
            <div
              key={t.id}
              className={`p-4 flex items-center justify-between hover:bg-zinc-50/70 transition ${
                isDone ? 'opacity-60 bg-zinc-50/40' : ''
              }`}
            >
              <div className="flex items-start gap-3.5">
                <button
                  onClick={() => toggleTaskStatus(t)}
                  className="mt-0.5 text-zinc-400 hover:text-zinc-900 cursor-pointer"
                >
                  {isDone ? (
                    <CheckSquare className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Square className="w-5 h-5 text-zinc-300" />
                  )}
                </button>
                <div>
                  <h4 className={`text-xs font-semibold text-zinc-900 ${isDone ? 'line-through text-zinc-400' : ''}`}>
                    {t.title}
                  </h4>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500 mt-1">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-zinc-400" />
                      {t.assigneeName || t.assignee || 'Staff'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-zinc-400" />
                      Due: {t.dueDate}
                    </span>
                    {t.relatedEntityName && (
                      <>
                        <span>•</span>
                        <span className="bg-zinc-100 px-1.5 py-0.2 rounded text-zinc-700 font-medium">
                          {t.relatedEntityName}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant={getPriorityVariant(t.priority)}>{t.priority}</Badge>
                <Badge variant={isDone ? 'emerald' : 'neutral'}>{t.status}</Badge>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="p-12 text-center text-xs text-zinc-400">
            No tasks found. Click "New Task" to create one.
          </div>
        )}
      </div>
    </div>
  );
};
