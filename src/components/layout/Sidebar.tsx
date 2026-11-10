import React, { useState } from 'react';
import {
  LayoutDashboard,
  Home as HomeIcon,
  Users,
  Building,
  Sparkles,
  Calendar,
  CheckSquare,
  Receipt,
  FileCheck,
  GraduationCap,
  Briefcase,
  Award,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Activity,
  Settings,
  Workflow,
  BookOpen,
  UserCheck,
  Wand2,
  Camera,
  Image as ImageIcon,
} from 'lucide-react';
import { useAuth } from '../../lib/auth/AuthContext';

interface SidebarProps {
  activeView: string;
  onSelectView: (view: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  counts?: {
    students?: number;
    leads?: number;
    companies?: number;
    interviews?: number;
    placements?: number;
    invoices?: number;
    tasks?: number;
    rentAnIntern?: number;
    jobCreator?: number;
    eventsHosted?: number;
    agreements?: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onSelectView,
  collapsed,
  onToggleCollapse,
  counts,
}) => {
  const { role } = useAuth();
  const [homeExpanded, setHomeExpanded] = useState<boolean>(true);

  const isHomeActive = ['home', 'events_hosted', 'event_gallery'].includes(activeView);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'job-creator', label: 'Job Creator', icon: Wand2, count: counts?.jobCreator },
    { id: 'rent-an-intern', label: 'Rent an Intern', icon: UserCheck, count: counts?.rentAnIntern },
    { id: 'leads', label: 'Leads', icon: Sparkles, count: counts?.leads },
    { id: 'students', label: 'Student Directory', icon: Users, count: counts?.students },
    { id: 'matching', label: 'Candidate Matching', icon: Award },
    { id: 'companies', label: 'Companies & Roles', icon: Building, count: counts?.companies },
    { id: 'interviews', label: 'Interviews', icon: Calendar, count: counts?.interviews },
    { id: 'placements', label: 'Placements', icon: Briefcase, count: counts?.placements },
    { id: 'assignments', label: 'Assignments', icon: BookOpen },
    { id: 'training', label: 'Batch Creation', icon: GraduationCap },
    { id: 'agreements', label: 'Agreements & Legal', icon: FileCheck, count: counts?.agreements },
    { id: 'billing', label: 'Billing & Invoices', icon: Receipt, count: counts?.invoices },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, count: counts?.tasks },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'automations', label: 'Automation Monitor', icon: Workflow },
    { id: 'settings', label: 'Settings & Integrations', icon: Settings },
  ];

  // RBAC view visibility filter
  const visibleNavItems = navItems.filter((item) => {
    if (role === 'Student') {
      return ['dashboard', 'students', 'assignments', 'training', 'agreements', 'tasks'].includes(item.id);
    }
    if (role === 'Company POC') {
      return ['dashboard', 'companies', 'interviews', 'placements', 'matching'].includes(item.id);
    }
    if (role === 'Trainer') {
      return ['dashboard', 'students', 'training', 'assignments', 'tasks'].includes(item.id);
    }
    if (role === 'Finance') {
      return ['dashboard', 'billing', 'placements', 'companies'].includes(item.id);
    }
    return true; // Admin, Operations, Placement Team, HR have wide operational access
  });

  return (
    <aside
      className={`h-screen bg-[#fafafa] border-r border-zinc-200/80 flex flex-col justify-between transition-all duration-200 select-none ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top Branding */}
      <div>
        <div className="h-16 px-4 flex items-center justify-between border-b border-zinc-200/60">
          {!collapsed ? (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-950 flex items-center justify-center text-white font-bold text-sm tracking-tight shadow-xs">
                IH
              </div>
              <div>
                <span className="font-semibold text-sm text-zinc-900 tracking-tight block">InternsHome</span>
                <span className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">Ops CRM</span>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 mx-auto rounded-lg bg-zinc-950 flex items-center justify-center text-white font-bold text-sm">
              IH
            </div>
          )}

          <button
            onClick={onToggleCollapse}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200/60 transition cursor-pointer hidden md:block"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation List */}
        <nav className="p-2 space-y-0.5 overflow-y-auto max-h-[calc(100vh-8rem)]">
          {/* Dashboard Item */}
          {visibleNavItems
            .filter((item) => item.id === 'dashboard')
            .map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectView(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                    isActive
                      ? 'bg-zinc-900 text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                  {!collapsed && (
                    <div className="flex items-center justify-between flex-1 truncate">
                      <span className="truncate">{item.label}</span>
                    </div>
                  )}
                </button>
              );
            })}

          {/* HOME SECTION (Expandable & Collapsible) */}
          <div className="pt-1 pb-0.5">
            <div
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeView === 'home'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : isHomeActive
                  ? 'text-zinc-900 font-semibold bg-zinc-200/50'
                  : 'text-zinc-700 hover:text-zinc-900 hover:bg-zinc-200/60'
              }`}
              onClick={() => {
                if (collapsed) {
                  onSelectView('home');
                } else {
                  // Click to toggle or navigate to home
                  if (activeView !== 'home') {
                    onSelectView('home');
                  }
                  setHomeExpanded(!homeExpanded);
                }
              }}
              title={collapsed ? 'Home & Events' : undefined}
            >
              <div className="flex items-center gap-3 truncate">
                <HomeIcon className={`w-4 h-4 shrink-0 ${activeView === 'home' ? 'text-white' : 'text-zinc-700'}`} />
                {!collapsed && (
                  <span className="truncate font-semibold tracking-tight">Home</span>
                )}
              </div>
              {!collapsed && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setHomeExpanded(!homeExpanded);
                  }}
                  className="p-0.5 rounded hover:bg-zinc-300/60 text-zinc-500 hover:text-zinc-900 transition"
                >
                  {homeExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            {/* Sub-items: Events Hosted & Event Gallery */}
            {!collapsed && homeExpanded && (
              <div className="pl-6 pr-1 pt-1 space-y-0.5 border-l-2 border-zinc-200 ml-4 my-1">
                <button
                  onClick={() => onSelectView('events_hosted')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    activeView === 'events_hosted'
                      ? 'bg-zinc-900 text-white shadow-xs font-semibold'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Calendar className={`w-3.5 h-3.5 shrink-0 ${activeView === 'events_hosted' ? 'text-white' : 'text-zinc-400'}`} />
                    <span className="truncate">Events Hosted</span>
                  </div>
                  {counts?.eventsHosted !== undefined && counts.eventsHosted > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${activeView === 'events_hosted' ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-200/80 text-zinc-600'}`}>
                      {counts.eventsHosted}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => onSelectView('event_gallery')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    activeView === 'event_gallery'
                      ? 'bg-zinc-900 text-white shadow-xs font-semibold'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Camera className={`w-3.5 h-3.5 shrink-0 ${activeView === 'event_gallery' ? 'text-white' : 'text-zinc-400'}`} />
                    <span className="truncate">Event Gallery</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Remaining Navigation Items */}
          {visibleNavItems
            .filter((item) => item.id !== 'dashboard')
            .map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectView(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                    isActive
                      ? 'bg-zinc-900 text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                  {!collapsed && (
                    <div className="flex items-center justify-between flex-1 truncate">
                      <span className="truncate">{item.label}</span>
                      {item.count !== undefined && item.count > 0 && (
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                            isActive ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-200/80 text-zinc-600'
                          }`}
                        >
                          {item.count}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
        </nav>
      </div>

      {/* Bottom Profile / Sync Badge */}
      <div className="p-3 border-t border-zinc-200/60">
        {!collapsed ? (
          <div className="flex items-center gap-2.5 p-1.5 rounded-lg bg-white border border-zinc-200/70">
            <div className="w-7 h-7 rounded-full bg-zinc-800 text-white flex items-center justify-center text-xs font-semibold">
              IH
            </div>
            <div className="truncate flex-1">
              <span className="text-xs font-medium text-zinc-800 block truncate">InternsHome Team</span>
              <span className="text-[10px] text-zinc-400 block truncate">Firestore Live Sync</span>
            </div>
          </div>
        ) : (
          <div className="w-7 h-7 mx-auto rounded-full bg-zinc-800 text-white flex items-center justify-center text-xs font-semibold">
            IH
          </div>
        )}
      </div>
    </aside>
  );
};
