import React, { useState, useEffect } from 'react';
import { Search, User, Building, FileText, CheckSquare, Sparkles, ArrowRight, X, UserCheck, Wand2, Home, Calendar, Camera, FileSpreadsheet } from 'lucide-react';
import { Student, Company, Lead, TaskItem } from '../../types/crm';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  companies: Company[];
  leads: Lead[];
  tasks: TaskItem[];
  onNavigate: (view: string) => void;
  onSelectStudent: (student: Student) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  students,
  companies,
  leads,
  tasks,
  onNavigate,
  onSelectStudent,
}) => {
  const [search, setSearch] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // handled by parent or shortcut
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const query = search.toLowerCase().trim();

  const filteredStudents = query
    ? students.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.studentId.toLowerCase().includes(query) ||
          s.college.toLowerCase().includes(query) ||
          s.skills.some((sk) => sk.toLowerCase().includes(query))
      )
    : students.slice(0, 4);

  const filteredCompanies = query
    ? companies.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.industry.toLowerCase().includes(query) ||
          c.location.toLowerCase().includes(query)
      )
    : companies.slice(0, 3);

  const filteredLeads = query
    ? leads.filter((l) => l.name.toLowerCase().includes(query) || l.college.toLowerCase().includes(query))
    : [];

  const navigationActions = [
    { label: 'Go to Home & Events Hub', view: 'home', icon: Home },
    { label: 'Go to Events Hosted (Luma)', view: 'events_hosted', icon: Calendar },
    { label: 'Go to Event Gallery', view: 'event_gallery', icon: Camera },
    { label: 'Go to Job Creator (Rent an Intern AI)', view: 'job-creator', icon: Wand2 },
    { label: 'Go to Rent an Intern Bookings', view: 'rent-an-intern', icon: UserCheck },
    { label: 'Go to Leads Pipeline', view: 'leads', icon: UserCheck },
    { label: 'Sync with Google Sheet (Leads Parity)', view: 'leads', icon: FileSpreadsheet },
    { label: 'Go to Intern Wall', view: 'students', icon: User },
    { label: 'Go to Matching & Shortlisting', view: 'matching', icon: Sparkles },
    { label: 'Go to Interviews Schedule', view: 'interviews', icon: FileText },
    { label: 'Go to Billing & Invoices', view: 'billing', icon: FileText },
    { label: 'Go to Automation Monitor', view: 'automations', icon: CheckSquare },
  ].filter((a) => !query || a.label.toLowerCase().includes(query));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col">
        {/* Search Input Bar */}
        <div className="px-4 py-3.5 border-b border-zinc-100 flex items-center gap-3">
          <Search className="w-5 h-5 text-zinc-400" />
          <input
            autoFocus
            type="text"
            placeholder="Type a command or search students, companies, leads, tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-base focus:outline-none placeholder-zinc-400 text-zinc-800"
          />
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs text-zinc-400 bg-zinc-100 border border-zinc-200 rounded">
            ESC
          </kbd>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Body */}
        <div className="p-2 max-h-96 overflow-y-auto divide-y divide-zinc-50 text-xs">
          {/* Quick Navigations */}
          {navigationActions.length > 0 && (
            <div className="py-2">
              <span className="px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block mb-1">
                Navigation Commands
              </span>
              {navigationActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => {
                    onNavigate(action.view);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-zinc-700 hover:bg-zinc-100 transition text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <action.icon className="w-4 h-4 text-zinc-400" />
                    <span className="font-medium text-sm">{action.label}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-300" />
                </button>
              ))}
            </div>
          )}

          {/* Students */}
          {filteredStudents.length > 0 && (
            <div className="py-2">
              <span className="px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block mb-1">
                Students ({filteredStudents.length})
              </span>
              {filteredStudents.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    onSelectStudent(s);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-zinc-700 hover:bg-zinc-100 transition text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 font-semibold text-xs">
                      {s.name[0]}
                    </div>
                    <div>
                      <span className="font-medium text-sm text-zinc-900 block">{s.name}</span>
                      <span className="text-[11px] text-zinc-500">
                        {s.studentId} • {s.college} • {s.currentStage}
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded text-[10px] font-medium">
                    {s.placementReadiness}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Companies */}
          {filteredCompanies.length > 0 && (
            <div className="py-2">
              <span className="px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block mb-1">
                Companies ({filteredCompanies.length})
              </span>
              {filteredCompanies.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    onNavigate('companies');
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-zinc-700 hover:bg-zinc-100 transition text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Building className="w-4 h-4 text-zinc-400" />
                    <div>
                      <span className="font-medium text-sm text-zinc-900 block">{c.name}</span>
                      <span className="text-[11px] text-zinc-500">
                        {c.industry} • {c.location}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-zinc-400">{c.openRolesCount || 0} open roles</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
