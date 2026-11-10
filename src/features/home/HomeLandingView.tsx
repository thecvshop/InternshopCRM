import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  Users,
  UserPlus,
  UserCheck,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  ChevronRight,
  ArrowUpRight,
  Camera,
  Activity,
  AlertCircle,
  Eye,
} from 'lucide-react';
import {
  InternsHomeEvent,
  EventRegistration,
  EventMedia,
} from '../../types/crm';
import { triggerLumaSync } from '../../services/lumaEventService';
import { EventDetailModal } from './EventDetailModal';

interface HomeLandingViewProps {
  events: InternsHomeEvent[];
  registrations: EventRegistration[];
  media: EventMedia[];
  onNavigate: (view: string) => void;
  onOpenPerson?: (type: 'Lead' | 'Student', id: string) => void;
}

export const HomeLandingView: React.FC<HomeLandingViewProps> = ({
  events,
  registrations,
  media,
  onNavigate,
  onOpenPerson,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<InternsHomeEvent | null>(null);

  const now = new Date();

  // Find nearest upcoming event
  const upcomingEvents = events
    .filter((e) => e.eventStatus !== 'cancelled' && new Date(e.startAt) >= now)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  const nextUpcomingEvent = upcomingEvents[0] || events[0];

  const pastEvents = events
    .filter((e) => e.eventStatus === 'completed' || new Date(e.startAt) < now)
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());

  // Aggregate metrics
  const totalEvents = events.length;
  const totalRegistrations = registrations.length;
  const totalAttended = registrations.filter((r) => r.checkedIn || r.registrationStatus === 'attended').length;
  const totalNewLeads = registrations.filter((r) => r.leadCreated).length;
  const totalExistingMatches = registrations.filter((r) => !r.leadCreated && r.crmPersonId).length;

  const attendanceRate = totalRegistrations > 0 ? Math.round((totalAttended / totalRegistrations) * 100) : 0;

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncStatusMsg(null);
    const res = await triggerLumaSync('manual');
    setIsSyncing(false);
    if (res.success) {
      setSyncStatusMsg({ type: 'success', text: res.message });
    } else {
      setSyncStatusMsg({ type: 'error', text: res.message });
    }
    setTimeout(() => setSyncStatusMsg(null), 6000);
  };

  const formatEventDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  const formatEventTime = (isoStart: string, isoEnd: string) => {
    try {
      const s = new Date(isoStart).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      const e = new Date(isoEnd).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      return `${s} – ${e}`;
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900">
              InternsHome Events & Community
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
              Luma Powered
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1 max-w-2xl leading-relaxed">
            Manage InternsHome offline and online events, synced automatically from your Luma workspace.
            Event registrations seamlessly deduplicate against existing Students & Leads, auto-generating new CRM leads where required.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white transition shadow-2xs disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing Luma...' : 'Sync Now'}</span>
          </button>

          <a
            href="https://luma.com/home"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition"
          >
            <span>Open Luma (luma.com/home)</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncStatusMsg && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between animate-in fade-in duration-150 ${
            syncStatusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {syncStatusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{syncStatusMsg.text}</span>
          </div>
          <button
            onClick={() => setSyncStatusMsg(null)}
            className="text-xs font-bold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-zinc-500 text-xs font-medium">
            <span>Events Hosted</span>
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-900">{totalEvents}</div>
          <span className="text-[10px] text-zinc-400">Past & Upcoming in Luma</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-zinc-500 text-xs font-medium">
            <span>Total Registrations</span>
            <Users className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-900">{totalRegistrations}</div>
          <span className="text-[10px] text-zinc-400">Tracked in eventRegistrations</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-medium">
            <span>Attendance Rate</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-950">{attendanceRate}%</div>
          <span className="text-[10px] text-emerald-700">{totalAttended} attendees verified</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-indigo-700 text-xs font-medium">
            <span>New Leads from Events</span>
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-indigo-950">{totalNewLeads}</div>
          <span className="text-[10px] text-indigo-700">Added to CRM Leads</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-purple-700 text-xs font-medium">
            <span>Existing CRM Contacts</span>
            <UserCheck className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-950">{totalExistingMatches}</div>
          <span className="text-[10px] text-purple-700">Zero duplicates created</span>
        </div>
      </div>

      {/* Featured Nearest Upcoming Event Hero Card */}
      {nextUpcomingEvent && (
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 bg-zinc-50/70 border-b border-zinc-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Next Upcoming Event</h3>
            </div>
            <button
              onClick={() => onNavigate('events_hosted')}
              className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 inline-flex items-center gap-1 cursor-pointer"
            >
              <span>View All Events</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
            <div className="md:col-span-5 relative h-52 md:h-auto bg-zinc-900 overflow-hidden">
              <img
                src={nextUpcomingEvent.coverImage}
                alt={nextUpcomingEvent.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent md:hidden" />
              <div className="absolute top-3 left-3 flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white uppercase tracking-wider">
                  Luma
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/20 text-white backdrop-blur-xs">
                  {nextUpcomingEvent.eventType === 'offline' ? '📍 In-Person' : '🌐 Online'}
                </span>
              </div>
            </div>

            <div className="md:col-span-7 p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <h2 className="text-lg md:text-xl font-bold text-zinc-900 tracking-tight">
                  {nextUpcomingEvent.name}
                </h2>
                <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-600">
                  <span className="flex items-center gap-1 font-medium text-zinc-800">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    {formatEventDate(nextUpcomingEvent.startAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    {formatEventTime(nextUpcomingEvent.startAt, nextUpcomingEvent.endAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                    {nextUpcomingEvent.venue}, {nextUpcomingEvent.city}
                  </span>
                </div>
                <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed pt-1">
                  {nextUpcomingEvent.description}
                </p>
              </div>

              <div className="pt-3 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Registrations</span>
                    <span className="font-bold text-zinc-900">{nextUpcomingEvent.registrationCount} guests</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block">New Leads</span>
                    <span className="font-bold text-indigo-600">{nextUpcomingEvent.newLeadsCount} generated</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Existing CRM</span>
                    <span className="font-bold text-purple-600">{nextUpcomingEvent.existingCRMCount} matched</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedEvent(nextUpcomingEvent)}
                    className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
                  >
                    Event Details & Guests
                  </button>
                  <a
                    href="https://luma.com/home"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Two Column Layout: Upcoming & Recent Events + Latest Registrations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Events Highlights */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
              InternsHome Events Portfolio
            </h3>
            <button
              onClick={() => onNavigate('events_hosted')}
              className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 inline-flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {events.slice(0, 4).map((evt) => (
              <div
                key={evt.id}
                onClick={() => setSelectedEvent(evt)}
                className="p-3.5 bg-white border border-zinc-200/80 rounded-xl hover:border-zinc-300 hover:shadow-2xs transition flex items-center justify-between gap-3 cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={evt.coverImage}
                    alt={evt.name}
                    className="w-12 h-12 rounded-lg object-cover border border-zinc-200 shrink-0"
                  />
                  <div className="min-w-0 space-y-0.5">
                    <h4 className="font-bold text-xs text-zinc-900 group-hover:text-indigo-600 transition truncate">
                      {evt.name}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                      <span>{formatEventDate(evt.startAt)}</span>
                      <span>•</span>
                      <span className="truncate">{evt.venue}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right text-[11px]">
                    <div className="font-bold text-zinc-900">{evt.registrationCount} guests</div>
                    <div className="text-[10px] text-zinc-400">
                      {evt.attendanceCount > 0 ? `${evt.attendanceCount} attended` : `${evt.newLeadsCount} new leads`}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-700 transition" />
                </div>
              </div>
            ))}
          </div>

          {/* Quick Action Cards */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => onNavigate('event_gallery')}
              className="p-4 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-left transition group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1.5">
                <Camera className="w-4 h-4 text-zinc-700" />
                <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-900" />
              </div>
              <h4 className="text-xs font-bold text-zinc-900">Event Gallery</h4>
              <p className="text-[11px] text-zinc-500 mt-0.5">Browse event moments, photos, and student milestones</p>
            </button>

            <button
              onClick={() => onNavigate('leads')}
              className="p-4 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-left transition group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-900" />
              </div>
              <h4 className="text-xs font-bold text-zinc-900">Review Synced Leads</h4>
              <p className="text-[11px] text-zinc-500 mt-0.5">Explore {totalNewLeads} new leads captured from events</p>
            </button>
          </div>
        </div>

        {/* Right Column: Latest Registrations & CRM Matching Stream */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
              Latest Event Registrations
            </h3>
            <span className="text-[11px] text-zinc-400 font-medium">Real-time matching</span>
          </div>

          <div className="bg-white border border-zinc-200/80 rounded-2xl divide-y divide-zinc-100 overflow-hidden shadow-2xs">
            {registrations.slice(0, 6).map((reg) => (
              <div key={reg.id} className="p-3.5 hover:bg-zinc-50/60 transition flex items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-zinc-900">{reg.name}</span>
                    {reg.checkedIn && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    )}
                  </div>
                  <span className="text-[11px] text-zinc-500 block truncate">{reg.eventName || 'InternsHome Event'}</span>
                  <span className="text-[10px] text-zinc-400 block">{reg.email}</span>
                </div>

                <div className="text-right shrink-0">
                  {reg.leadCreated ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
                      <Sparkles className="w-2.5 h-2.5 text-indigo-600" />
                      <span>New Lead</span>
                    </span>
                  ) : reg.crmPersonType === 'Student' ? (
                    <button
                      onClick={() => reg.crmPersonId && onOpenPerson?.('Student', reg.crmPersonId)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 rounded-full hover:bg-purple-100 cursor-pointer"
                    >
                      <UserCheck className="w-2.5 h-2.5 text-purple-600" />
                      <span>Student</span>
                    </button>
                  ) : reg.crmPersonType === 'Lead' ? (
                    <button
                      onClick={() => reg.crmPersonId && onOpenPerson?.('Lead', reg.crmPersonId)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 rounded-full hover:bg-amber-100 cursor-pointer"
                    >
                      <UserPlus className="w-2.5 h-2.5 text-amber-600" />
                      <span>Lead</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-zinc-400">Synced</span>
                  )}
                  <div className="text-[9px] text-zinc-400 mt-1">
                    {new Date(reg.registeredAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Event Modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          registrations={registrations}
          media={media}
          onClose={() => setSelectedEvent(null)}
          onOpenPerson={onOpenPerson}
        />
      )}
    </div>
  );
};
