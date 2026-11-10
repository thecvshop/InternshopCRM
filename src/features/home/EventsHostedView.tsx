import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  RefreshCw,
  Search,
  Filter,
  Users,
  UserPlus,
  UserCheck,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Plus,
  Radio,
  History,
  AlertCircle,
  Eye,
  Link as LinkIcon,
  DollarSign,
  TrendingUp,
  Receipt,
  FolderOpen,
  X,
  Loader2,
} from 'lucide-react';
import {
  InternsHomeEvent,
  EventRegistration,
  EventMedia,
} from '../../types/crm';
import { triggerLumaSync, recognizeAndImportLumaLink } from '../../services/lumaEventService';
import { EventDetailModal } from './EventDetailModal';

interface EventsHostedViewProps {
  events: InternsHomeEvent[];
  registrations: EventRegistration[];
  media: EventMedia[];
  onOpenPerson?: (type: 'Lead' | 'Student', id: string) => void;
}

export const EventsHostedView: React.FC<EventsHostedViewProps> = ({
  events,
  registrations,
  media,
  onOpenPerson,
}) => {
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'upcoming' | 'today' | 'past' | 'cancelled'>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<InternsHomeEvent | null>(null);

  // Recognize Luma Link Modal State
  const [showRecognizeModal, setShowRecognizeModal] = useState(false);
  const [lumaLinkInput, setLumaLinkInput] = useState('');
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recognizeError, setRecognizeError] = useState<string | null>(null);
  const [recognizedEvents, setRecognizedEvents] = useState<InternsHomeEvent[] | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Financial aggregates
  const totalRevenue = useMemo(() => {
    return events.reduce((sum, e) => sum + (Number(e.totalRevenue) || 0), 0);
  }, [events]);

  const totalExpenses = useMemo(() => {
    return events.reduce((sum, e) => sum + (Number(e.totalExpenses) || 0), 0);
  }, [events]);

  const netEventProfit = totalRevenue - totalExpenses;

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      // Search query
      if (search) {
        const q = search.toLowerCase();
        const matches =
          evt.name.toLowerCase().includes(q) ||
          evt.venue.toLowerCase().includes(q) ||
          evt.city.toLowerCase().includes(q) ||
          evt.description.toLowerCase().includes(q);
        if (!matches) return false;
      }

      const evtStart = new Date(evt.startAt);
      const evtDateStr = evt.startAt.split('T')[0];

      if (filterTab === 'upcoming') {
        return evt.eventStatus !== 'cancelled' && evtStart >= now;
      }
      if (filterTab === 'today') {
        return evtDateStr === todayStr;
      }
      if (filterTab === 'past') {
        return evt.eventStatus === 'completed' || evtStart < now;
      }
      if (filterTab === 'cancelled') {
        return evt.eventStatus === 'cancelled';
      }
      return true;
    });
  }, [events, search, filterTab, todayStr, now]);

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

  const handleHistoricalSync = async () => {
    if (!confirm('Run historical sync for https://luma.com/user/intershome to import all previous events & registrations?')) return;
    setIsSyncing(true);
    setSyncStatusMsg(null);
    const res = await triggerLumaSync('history');
    setIsSyncing(false);
    if (res.success) {
      setSyncStatusMsg({ type: 'success', text: res.message });
    } else {
      setSyncStatusMsg({ type: 'error', text: res.message });
    }
    setTimeout(() => setSyncStatusMsg(null), 7000);
  };

  const handleRecognizeLumaLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lumaLinkInput.trim()) return;
    setIsRecognizing(true);
    setRecognizeError(null);
    setRecognizedEvents(null);
    setImportSuccessMsg(null);

    const res = await recognizeAndImportLumaLink(lumaLinkInput.trim());
    setIsRecognizing(false);
    if (res.success && res.events && res.events.length > 0) {
      setRecognizedEvents(res.events);
      setImportSuccessMsg(res.message);
    } else {
      setRecognizeError(res.message || 'Could not recognize this Luma link. Please check the URL.');
    }
  };

  const formatEventDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-IN', {
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
    <div className="space-y-5">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Events Hosted</h1>
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 rounded-full">
              Luma Synced
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
              Expense & ROI Tracking
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            InternsHome events recognized from Luma. Track ticket charges, expenses, net profits, and Google Drive photos.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Recognize Luma Link Button */}
          <button
            onClick={() => {
              setRecognizedEvents(null);
              setRecognizeError(null);
              setImportSuccessMsg(null);
              setShowRecognizeModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition shadow-2xs cursor-pointer"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Recognize from Luma Link</span>
          </button>

          <button
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white transition shadow-2xs disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Workspace'}</span>
          </button>

          <button
            onClick={handleHistoricalSync}
            disabled={isSyncing}
            title="Import all past events from Luma workspace"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 transition cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-zinc-500" />
            <span>Sync History</span>
          </button>

          <a
            href="https://luma.com/user/intershome"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200 transition"
          >
            <span>lu.ma/user/intershome</span>
            <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
          </a>
        </div>
      </div>

      {/* Financial Overview KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white border border-zinc-200/80 rounded-xl space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 text-[11px] font-medium">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-zinc-600" /> Total Events
            </span>
            <span className="text-zinc-400 font-mono text-[10px]">{events.length} Live</span>
          </div>
          <div className="text-xl font-bold text-zinc-900">{events.length}</div>
          <div className="text-[10px] text-zinc-500">
            {events.filter((e) => e.eventStatus === 'published').length} upcoming • {events.filter((e) => e.eventStatus === 'completed').length} past
          </div>
        </div>

        <div className="p-3.5 bg-white border border-zinc-200/80 rounded-xl space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 text-[11px] font-medium">
            <span className="flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Ticket Revenue
            </span>
            <span className="text-emerald-600 text-[10px] font-semibold">Gross</span>
          </div>
          <div className="text-xl font-bold text-emerald-700">₹{totalRevenue.toLocaleString()}</div>
          <div className="text-[10px] text-zinc-500">
            From event attendee charges & bookings
          </div>
        </div>

        <div className="p-3.5 bg-white border border-zinc-200/80 rounded-xl space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 text-[11px] font-medium">
            <span className="flex items-center gap-1">
              <Receipt className="w-3.5 h-3.5 text-rose-600" /> Event Expenses
            </span>
            <span className="text-rose-600 text-[10px] font-semibold">Total Spent</span>
          </div>
          <div className="text-xl font-bold text-rose-700">₹{totalExpenses.toLocaleString()}</div>
          <div className="text-[10px] text-zinc-500">
            Venue, Sound/AV, F&B, props & operations
          </div>
        </div>

        <div className="p-3.5 bg-white border border-zinc-200/80 rounded-xl space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 text-[11px] font-medium">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" /> Net Event Profit
            </span>
            <span className={`text-[10px] font-bold ${netEventProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {netEventProfit >= 0 ? 'Surplus' : 'Deficit'}
            </span>
          </div>
          <div className={`text-xl font-bold ${netEventProfit >= 0 ? 'text-indigo-900' : 'text-rose-700'}`}>
            {netEventProfit >= 0 ? `+₹${netEventProfit.toLocaleString()}` : `-₹${Math.abs(netEventProfit).toLocaleString()}`}
          </div>
          <div className="text-[10px] text-zinc-500">
            Ticket Revenue minus Total Event Expenses
          </div>
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
            className="text-xs font-bold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="bg-white p-3 rounded-xl border border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {[
            { id: 'all', label: 'All Events' },
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'today', label: 'Today' },
            { id: 'past', label: 'Past Events' },
            { id: 'cancelled', label: 'Cancelled' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition cursor-pointer ${
                filterTab === tab.id
                  ? 'bg-zinc-900 text-white shadow-2xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search events, venue, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
          />
        </div>
      </div>

      {/* Compact Events List / Table with Financial Columns */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 font-semibold text-[11px]">
                <th className="py-3 px-4">Event Details</th>
                <th className="py-3 px-3">Date & Time</th>
                <th className="py-3 px-3">Venue & City</th>
                <th className="py-3 px-3">Ticket Charge</th>
                <th className="py-3 px-3">Revenue</th>
                <th className="py-3 px-3">Expenses</th>
                <th className="py-3 px-3">Net Profit</th>
                <th className="py-3 px-3">Attendance</th>
                <th className="py-3 px-3">Photos / Drive</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-zinc-400 text-xs">
                    No events found matching current criteria. Use &quot;Recognize from Luma Link&quot; above to import events.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((evt) => {
                  const evtExpenses = evt.expenses || [];
                  const expenseSum = evt.totalExpenses ?? evtExpenses.reduce((s, x) => s + (Number(x.amount) || 0), 0);
                  const rev = evt.totalRevenue ?? ((evt.ticketPrice || 0) * (evt.registrationCount || 0));
                  const profit = rev - expenseSum;

                  return (
                    <tr
                      key={evt.id}
                      onClick={() => setSelectedEvent(evt)}
                      className="hover:bg-zinc-50/70 transition cursor-pointer group"
                    >
                      {/* Cover + Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={evt.coverImage || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=120&auto=format&fit=crop&q=80'}
                            alt={evt.name}
                            className="w-11 h-11 rounded-lg object-cover border border-zinc-200 shrink-0"
                          />
                          <div className="max-w-xs space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-zinc-900 group-hover:text-indigo-600 transition truncate">
                                {evt.name}
                              </span>
                              {evt.name.toLowerCase().includes('murder mystery') && (
                                <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 rounded shrink-0">
                                  This Saturday
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-400 font-mono block">
                              luma: {evt.lumaEventId || evt.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-semibold text-zinc-800">{formatEventDate(evt.startAt)}</div>
                        <div className="text-[10px] text-zinc-400">{formatEventTime(evt.startAt, evt.endAt)}</div>
                      </td>

                      {/* Venue & City */}
                      <td className="py-3 px-3">
                        <div className="font-medium text-zinc-800 truncate max-w-[140px]">{evt.venue}</div>
                        <div className="text-[10px] text-zinc-400">{evt.city}</div>
                      </td>

                      {/* Ticket Charge */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {evt.ticketPrice && evt.ticketPrice > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-900">
                            ₹{evt.ticketPrice}
                          </span>
                        ) : (
                          <span className="text-[11px] text-zinc-400">Free</span>
                        )}
                      </td>

                      {/* Revenue */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-bold text-emerald-700">₹{rev.toLocaleString()}</span>
                      </td>

                      {/* Expenses */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-bold text-rose-700">₹{expenseSum.toLocaleString()}</span>
                      </td>

                      {/* Net Profit */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`font-bold inline-flex items-center px-2 py-0.5 rounded text-[10px] ${
                            profit >= 0
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {profit >= 0 ? `+₹${profit.toLocaleString()}` : `-₹${Math.abs(profit).toLocaleString()}`}
                        </span>
                      </td>

                      {/* Attendance */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-semibold text-zinc-900">
                          {evt.attendanceCount > 0 ? `${evt.attendanceCount} attended` : `${evt.registrationCount} regs`}
                        </div>
                        <div className="text-[10px] text-indigo-600">+{evt.newLeadsCount} new leads</div>
                      </td>

                      {/* Photos / Drive Album */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {evt.driveFolderUrl ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            <FolderOpen className="w-3 h-3 text-blue-600" />
                            <span>Drive Album</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-400">No Drive link</span>
                        )}
                      </td>

                      {/* Event Status */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            evt.eventStatus === 'published'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : evt.eventStatus === 'completed'
                              ? 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {evt.eventStatus}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedEvent(evt)}
                            className="px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-md transition cursor-pointer"
                          >
                            Finances & Details
                          </button>
                          {evt.lumaUrl && (
                            <a
                              href={evt.lumaUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open Luma Page"
                              className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recognize Luma Link Modal */}
      {showRecognizeModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-zinc-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-rose-600" />
                <h3 className="text-sm font-bold text-zinc-900">Recognize & Import from Luma Link</h3>
              </div>
              <button
                onClick={() => setShowRecognizeModal(false)}
                className="w-6 h-6 rounded-full hover:bg-zinc-100 text-zinc-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-zinc-600 leading-relaxed">
                Paste any Luma link (e.g. specific event URL like <code className="text-rose-600 bg-rose-50 px-1 py-0.5 rounded font-mono">https://lu.ma/uttn63yk</code> or user profile <code className="text-rose-600 bg-rose-50 px-1 py-0.5 rounded font-mono">https://luma.com/user/intershome</code>). The CRM will parse and recognize past or upcoming events, ticket charges, venues, and timestamps.
              </p>

              <form onSubmit={handleRecognizeLumaLink} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Luma URL *</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      required
                      placeholder="https://lu.ma/uttn63yk or https://luma.com/user/intershome"
                      value={lumaLinkInput}
                      onChange={(e) => setLumaLinkInput(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    />
                    <button
                      type="submit"
                      disabled={isRecognizing || !lumaLinkInput.trim()}
                      className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg disabled:opacity-50 inline-flex items-center gap-1.5 transition cursor-pointer"
                    >
                      {isRecognizing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>{isRecognizing ? 'Recognizing...' : 'Recognize'}</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Error state */}
              {recognizeError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{recognizeError}</span>
                </div>
              )}

              {/* Success / Recognized Cards */}
              {importSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{importSuccessMsg}</span>
                </div>
              )}

              {recognizedEvents && recognizedEvents.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                    Recognized Events ({recognizedEvents.length})
                  </h4>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {recognizedEvents.map((evt) => (
                      <div
                        key={evt.id}
                        className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center gap-3"
                      >
                        <img
                          src={evt.coverImage || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=100&auto=format&fit=crop&q=80'}
                          alt={evt.name}
                          className="w-12 h-12 rounded-lg object-cover border border-zinc-200 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-bold text-zinc-900 truncate">{evt.name}</h5>
                          <div className="text-[10px] text-zinc-500 flex items-center gap-2 mt-0.5">
                            <span>📅 {formatEventDate(evt.startAt)}</span>
                            <span>📍 {evt.venue}</span>
                          </div>
                          <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                            Ticket: {evt.ticketPrice ? `₹${evt.ticketPrice}` : 'Free'} • {evt.registrationCount} guests
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 shrink-0">
                          Imported
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-zinc-100 bg-zinc-50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowRecognizeModal(false)}
                className="px-4 py-1.5 text-xs font-semibold bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
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
