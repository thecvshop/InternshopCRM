import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  Users,
  UserPlus,
  UserCheck,
  CheckCircle2,
  Sparkles,
  Search,
  Filter,
  Image as ImageIcon,
  Activity,
  Plus,
  Check,
  Upload,
  DollarSign,
  Receipt,
  TrendingUp,
  FolderOpen,
  Eye,
  Trash2,
  Edit2,
  Link as LinkIcon,
  AlertCircle,
} from 'lucide-react';
import {
  InternsHomeEvent,
  EventRegistration,
  EventMedia,
  EventExpense,
  RegistrationStatus,
} from '../../types/crm';
import {
  markRegistrationAttendance,
  addEventMediaItem,
  addEventExpense,
  deleteEventExpense,
  updateEventFinancials,
  updateEventDriveFolder,
  addDriveLinkToEventGallery,
} from '../../services/lumaEventService';
import { parseGoogleDriveUrl } from '../../utils/driveUtils';

interface EventDetailModalProps {
  event: InternsHomeEvent | null;
  registrations: EventRegistration[];
  media: EventMedia[];
  onClose: () => void;
  onOpenPerson?: (type: 'Lead' | 'Student', id: string) => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  registrations,
  media,
  onClose,
  onOpenPerson,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'finances' | 'registrations' | 'attendees' | 'new_leads' | 'gallery' | 'activity'>('overview');
  const [regSearch, setRegSearch] = useState('');

  // Drive Photo Link State
  const [showAddDriveModal, setShowAddDriveModal] = useState(false);
  const [driveUrlInput, setDriveUrlInput] = useState('');
  const [driveCaption, setDriveCaption] = useState('');
  const [savingDrive, setSavingDrive] = useState(false);
  const [activeDrivePreview, setActiveDrivePreview] = useState(true);

  // Drive Folder Url Direct Edit State
  const [editingDriveFolder, setEditingDriveFolder] = useState(false);
  const [folderUrlInput, setFolderUrlInput] = useState(event?.driveFolderUrl || '');

  // Finance & Expense State
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<EventExpense['category']>('Venue & Space');
  const [expenseAmount, setExpenseAmount] = useState<number | ''>('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expensePaidBy, setExpensePaidBy] = useState('Operations Admin');
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<'UPI' | 'Bank Transfer' | 'Cash' | 'Card'>('UPI');
  const [expenseNotes, setExpenseNotes] = useState('');
  const [savingExpense, setSavingExpense] = useState(false);

  // Ticket Pricing Edit State
  const [editingTicketPrice, setEditingTicketPrice] = useState(false);
  const [ticketPriceInput, setTicketPriceInput] = useState<number>(event?.ticketPrice || 0);

  if (!event) return null;

  const eventRegs = registrations.filter((r) => r.eventId === event.id);
  const eventMedia = media.filter((m) => m.eventId === event.id);
  const expensesList: EventExpense[] = event.expenses || [];

  // Financial computations
  const ticketCharge = event.ticketPrice || 0;
  const regCount = event.registrationCount || eventRegs.length;
  const computedRevenue = event.totalRevenue ?? (ticketCharge * regCount);
  const totalExpenses = event.totalExpenses ?? expensesList.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const netProfit = computedRevenue - totalExpenses;

  // Filtered registrations
  const filteredRegs = eventRegs.filter((r) => {
    if (!regSearch) return true;
    const q = regSearch.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      (r.phone && r.phone.includes(q))
    );
  });

  const attendeeRegs = filteredRegs.filter((r) => r.checkedIn || r.registrationStatus === 'attended');
  const newLeadRegs = filteredRegs.filter((r) => r.leadCreated);

  const parsedDriveFolder = parseGoogleDriveUrl(event.driveFolderUrl || '');
  const parsedModalDrive = parseGoogleDriveUrl(driveUrlInput);

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

  const handleToggleAttendance = async (reg: EventRegistration) => {
    const newAttended = !reg.checkedIn;
    await markRegistrationAttendance(reg.id, newAttended);
  };

  const handleSaveTicketPrice = async () => {
    try {
      const newPrice = Number(ticketPriceInput) || 0;
      await updateEventFinancials(event.id, {
        ticketPrice: newPrice,
        totalRevenue: newPrice * regCount,
      });
      setEditingTicketPrice(false);
    } catch (err) {
      console.error('Failed to update ticket price:', err);
    }
  };

  const handleSaveDriveFolder = async () => {
    try {
      await updateEventDriveFolder(event.id, folderUrlInput.trim());
      setEditingDriveFolder(false);
    } catch (err) {
      console.error('Failed to update Drive folder URL:', err);
    }
  };

  const handleAddDriveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driveUrlInput.trim()) return;
    setSavingDrive(true);
    try {
      await addDriveLinkToEventGallery(
        event.id,
        event.name,
        driveUrlInput.trim(),
        driveCaption.trim() || `Google Drive Photos: ${event.name}`
      );
      setDriveUrlInput('');
      setDriveCaption('');
      setShowAddDriveModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingDrive(false);
    }
  };

  const handleAddExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseTitle.trim() || !expenseAmount) return;
    setSavingExpense(true);
    try {
      await addEventExpense(event.id, {
        eventId: event.id,
        title: expenseTitle.trim(),
        category: expenseCategory,
        amount: Number(expenseAmount),
        date: expenseDate,
        paidBy: expensePaidBy.trim(),
        paymentMethod: expensePaymentMethod,
        notes: expenseNotes.trim(),
      });
      setExpenseTitle('');
      setExpenseAmount('');
      setExpenseNotes('');
      setShowAddExpense(false);
    } catch (err) {
      console.error('Failed to save expense:', err);
    } finally {
      setSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      await deleteEventExpense(event.id, expenseId);
    } catch (err) {
      console.error('Failed to delete expense:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-zinc-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero Header with Cover Image Banner */}
        <div className="relative h-44 md:h-52 w-full bg-zinc-900 shrink-0 overflow-hidden">
          <img
            src={event.coverImage || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80'}
            alt={event.name}
            className="w-full h-full object-cover opacity-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Status Badges */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500 text-white shadow-xs">
              Luma Synced
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/60 text-white backdrop-blur-xs">
              {event.eventType === 'offline' ? 'Offline Event' : event.eventType === 'online' ? 'Online' : 'Hybrid'}
            </span>
            {event.driveFolderUrl && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white shadow-xs flex items-center gap-1">
                <FolderOpen className="w-3 h-3" /> Drive Linked
              </span>
            )}
          </div>

          {/* Bottom Title Bar */}
          <div className="absolute bottom-3 left-4 right-4 flex flex-col md:flex-row md:items-end justify-between gap-2">
            <div className="space-y-1">
              <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight drop-shadow-sm">
                {event.name}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-300 font-medium">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                  {formatEventDate(event.startAt)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  {formatEventTime(event.startAt, event.endAt)}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                  {event.venue}, {event.city}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {event.lumaUrl && (
                <a
                  href={event.lumaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-zinc-900 text-xs font-semibold shadow-xs transition shrink-0"
                >
                  <span>View in Luma</span>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-600" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-4 border-b border-zinc-200 bg-zinc-50/80 overflow-x-auto shrink-0">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'finances', label: `Finances & Expenses (${expensesList.length})` },
            { id: 'registrations', label: `Registrations (${eventRegs.length})` },
            { id: 'attendees', label: `Attendees (${eventRegs.filter((r) => r.checkedIn).length})` },
            { id: 'new_leads', label: `New Leads (${eventRegs.filter((r) => r.leadCreated).length})` },
            { id: 'gallery', label: `Drive Gallery (${eventMedia.length})` },
            { id: 'activity', label: 'Activity' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition cursor-pointer ${
                activeTab === tab.id
                  ? 'border-zinc-900 text-zinc-900'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Quick Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-xl space-y-0.5">
                  <div className="flex items-center gap-1.5 text-zinc-500 text-[11px] font-medium">
                    <Users className="w-3.5 h-3.5 text-zinc-700" />
                    <span>Total Registered</span>
                  </div>
                  <div className="text-xl font-bold text-zinc-900">{event.registrationCount}</div>
                  <span className="text-[10px] text-zinc-400">Synced from Luma</span>
                </div>

                <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl space-y-0.5">
                  <div className="flex items-center gap-1.5 text-emerald-800 text-[11px] font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Attended Event</span>
                  </div>
                  <div className="text-xl font-bold text-emerald-950">{event.attendanceCount}</div>
                  <span className="text-[10px] text-emerald-700 font-medium">
                    {event.registrationCount > 0
                      ? `${Math.round((event.attendanceCount / event.registrationCount) * 100)}% attendance rate`
                      : '0% rate'}
                  </span>
                </div>

                <div className="p-3 bg-indigo-50/60 border border-indigo-200/80 rounded-xl space-y-0.5">
                  <div className="flex items-center gap-1.5 text-indigo-800 text-[11px] font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>New Leads Converted</span>
                  </div>
                  <div className="text-xl font-bold text-indigo-950">{event.newLeadsCount}</div>
                  <span className="text-[10px] text-indigo-700 font-medium">Generated to CRM pipeline</span>
                </div>

                <div className="p-3 bg-purple-50/60 border border-purple-200/80 rounded-xl space-y-0.5">
                  <div className="flex items-center gap-1.5 text-purple-800 text-[11px] font-medium">
                    <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
                    <span>Net Profit / ROI</span>
                  </div>
                  <div className={`text-xl font-bold ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {netProfit >= 0 ? `+₹${netProfit.toLocaleString()}` : `-₹${Math.abs(netProfit).toLocaleString()}`}
                  </div>
                  <span className="text-[10px] text-zinc-500">
                    ₹{computedRevenue.toLocaleString()} rev - ₹{totalExpenses.toLocaleString()} exp
                  </span>
                </div>
              </div>

              {/* Event Description & Location */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="md:col-span-2 space-y-3">
                  <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">About This Event</h3>
                  <p className="text-xs text-zinc-600 leading-relaxed whitespace-pre-line">
                    {event.description}
                  </p>

                  {event.highlights && event.highlights.length > 0 && (
                    <div className="pt-2 space-y-2">
                      <h4 className="text-xs font-bold text-zinc-900">Event Highlights</h4>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {event.highlights.map((h, i) => (
                          <li key={i} className="text-xs text-zinc-700 p-2.5 bg-zinc-50 border border-zinc-200/80 rounded-xl flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Logistics & Drive Folder Sidebar */}
                <div className="space-y-3">
                  <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2.5">
                    <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Event Details</h4>
                    <div className="space-y-1.5 text-xs text-zinc-600">
                      <div><span className="font-semibold text-zinc-900">Venue:</span> {event.venue}</div>
                      <div><span className="font-semibold text-zinc-900">Address:</span> {event.location || event.venue}</div>
                      <div><span className="font-semibold text-zinc-900">City / Zone:</span> {event.city} ({event.area || 'Kolkata'})</div>
                      <div><span className="font-semibold text-zinc-900">Ticket Charge:</span> {ticketCharge > 0 ? `₹${ticketCharge} per person` : 'Free Event'}</div>
                    </div>
                  </div>

                  {/* Drive Folder Attachment */}
                  <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                        <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
                        <span>Google Drive Folder</span>
                      </span>
                      <button
                        onClick={() => setEditingDriveFolder(!editingDriveFolder)}
                        className="text-[10px] text-blue-700 font-semibold hover:underline cursor-pointer"
                      >
                        {editingDriveFolder ? 'Cancel' : 'Edit Link'}
                      </button>
                    </div>

                    {editingDriveFolder ? (
                      <div className="space-y-2 pt-1">
                        <input
                          type="url"
                          placeholder="https://drive.google.com/drive/folders/..."
                          value={folderUrlInput}
                          onChange={(e) => setFolderUrlInput(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-blue-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                        <button
                          onClick={handleSaveDriveFolder}
                          className="w-full py-1 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
                        >
                          Save Folder Link
                        </button>
                      </div>
                    ) : event.driveFolderUrl ? (
                      <div className="space-y-2 pt-1">
                        <a
                          href={event.driveFolderUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-blue-700 hover:underline break-all block"
                        >
                          {event.driveFolderUrl}
                        </a>
                        <button
                          onClick={() => setActiveTab('gallery')}
                          className="text-[11px] font-semibold text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>Open in Gallery Preview</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-[11px] text-zinc-500 space-y-1">
                        <p>No Google Drive folder linked yet.</p>
                        <button
                          onClick={() => setEditingDriveFolder(true)}
                          className="text-blue-700 font-semibold hover:underline cursor-pointer"
                        >
                          + Attach Drive Folder Link
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FINANCES & EXPENSES */}
          {activeTab === 'finances' && (
            <div className="space-y-6">
              {/* Financial KPI Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {/* Ticket Charge per attendee */}
                <div className="p-3.5 bg-white border border-zinc-200 rounded-xl space-y-1 shadow-2xs">
                  <div className="flex items-center justify-between text-zinc-500 text-[11px] font-medium">
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-zinc-700" /> Ticket Charge
                    </span>
                    <button
                      onClick={() => setEditingTicketPrice(!editingTicketPrice)}
                      className="text-[10px] text-indigo-600 font-bold hover:underline cursor-pointer"
                    >
                      {editingTicketPrice ? 'Close' : 'Edit'}
                    </button>
                  </div>
                  {editingTicketPrice ? (
                    <div className="flex items-center gap-1.5 pt-1">
                      <input
                        type="number"
                        min="0"
                        value={ticketPriceInput}
                        onChange={(e) => setTicketPriceInput(Number(e.target.value))}
                        className="w-24 px-2 py-1 text-xs border border-zinc-300 rounded font-bold"
                      />
                      <button
                        onClick={handleSaveTicketPrice}
                        className="px-2 py-1 text-[11px] font-semibold bg-zinc-900 text-white rounded hover:bg-zinc-800 cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <div className="text-xl font-bold text-zinc-900">
                      {ticketCharge > 0 ? `₹${ticketCharge}` : 'Free'}
                    </div>
                  )}
                  <span className="text-[10px] text-zinc-400">Per attendee registration charge</span>
                </div>

                {/* Total Revenue */}
                <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1 shadow-2xs">
                  <div className="text-emerald-800 text-[11px] font-medium flex items-center justify-between">
                    <span>Total Revenue</span>
                    <span className="text-[10px] font-mono text-emerald-700">{regCount} guests</span>
                  </div>
                  <div className="text-xl font-bold text-emerald-950">₹{computedRevenue.toLocaleString()}</div>
                  <span className="text-[10px] text-emerald-700">
                    ₹{ticketCharge} × {regCount} attendees
                  </span>
                </div>

                {/* Total Expenses */}
                <div className="p-3.5 bg-rose-50/60 border border-rose-200 rounded-xl space-y-1 shadow-2xs">
                  <div className="text-rose-800 text-[11px] font-medium flex items-center justify-between">
                    <span>Total Expenses</span>
                    <span className="text-[10px] font-mono text-rose-700">{expensesList.length} items</span>
                  </div>
                  <div className="text-xl font-bold text-rose-950">₹{totalExpenses.toLocaleString()}</div>
                  <span className="text-[10px] text-rose-700">Itemized event expenditure</span>
                </div>

                {/* Net Profit / Margin */}
                <div className="p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-1 shadow-2xs">
                  <div className="text-indigo-800 text-[11px] font-medium flex items-center justify-between">
                    <span>Net Margin</span>
                    <span className={`text-[10px] font-bold ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {netProfit >= 0 ? 'Surplus' : 'Deficit'}
                    </span>
                  </div>
                  <div className={`text-xl font-bold ${netProfit >= 0 ? 'text-indigo-950' : 'text-rose-800'}`}>
                    {netProfit >= 0 ? `+₹${netProfit.toLocaleString()}` : `-₹${Math.abs(netProfit).toLocaleString()}`}
                  </div>
                  <span className="text-[10px] text-zinc-500">
                    Net balance after all payments
                  </span>
                </div>
              </div>

              {/* Expense Ledger Header & Add Button */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Itemized Expense Ledger</h3>
                  <span className="text-[11px] text-zinc-500">Track all costs incurred for this event</span>
                </div>
                <button
                  onClick={() => setShowAddExpense(!showAddExpense)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Expense</span>
                </button>
              </div>

              {/* Add Expense Form */}
              {showAddExpense && (
                <form onSubmit={handleAddExpenseSubmit} className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-3 animate-in fade-in duration-150">
                  <h4 className="text-xs font-bold text-zinc-900">Add New Event Expense</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-zinc-700 mb-1">Expense Title / Item *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Cafe private hall booking deposit, audio rental, snacks"
                        value={expenseTitle}
                        onChange={(e) => setExpenseTitle(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-700 mb-1">Category *</label>
                      <select
                        value={expenseCategory}
                        onChange={(e) => setExpenseCategory(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                      >
                        <option value="Venue & Space">Venue & Space</option>
                        <option value="Food & Beverage">Food & Beverage</option>
                        <option value="Sound & AV">Sound & AV</option>
                        <option value="Decor & Props">Decor & Props</option>
                        <option value="Printing & Badges">Printing & Badges</option>
                        <option value="Staff & Intern Stipends">Staff & Intern Stipends</option>
                        <option value="Marketing & Ads">Marketing & Ads</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-700 mb-1">Amount (₹) *</label>
                      <input
                        type="number"
                        min="1"
                        required
                        placeholder="₹ amount"
                        value={expenseAmount}
                        onChange={(e) => setExpenseAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-700 mb-1">Date</label>
                      <input
                        type="date"
                        value={expenseDate}
                        onChange={(e) => setExpenseDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-700 mb-1">Payment Method</label>
                      <select
                        value={expensePaymentMethod}
                        onChange={(e) => setExpensePaymentMethod(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                      >
                        <option value="UPI">UPI</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cash">Cash</option>
                        <option value="Card">Card</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-700 mb-1">Paid By</label>
                      <input
                        type="text"
                        placeholder="e.g. Operations Admin"
                        value={expensePaidBy}
                        onChange={(e) => setExpensePaidBy(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 mb-1">Notes / Invoice Ref</label>
                    <input
                      type="text"
                      placeholder="Optional notes, invoice number, or vendor details"
                      value={expenseNotes}
                      onChange={(e) => setExpenseNotes(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200">
                    <button
                      type="button"
                      onClick={() => setShowAddExpense(false)}
                      className="px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingExpense}
                      className="px-4 py-1.5 text-xs font-semibold bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 disabled:opacity-50 cursor-pointer"
                    >
                      {savingExpense ? 'Adding...' : 'Save Expense'}
                    </button>
                  </div>
                </form>
              )}

              {/* Expense Table */}
              <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold text-[11px]">
                      <th className="py-2.5 px-3">Expense Item</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 px-3">Paid By</th>
                      <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {expensesList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-zinc-400 text-xs">
                          No expenses logged for this event yet. Click &quot;Add Expense&quot; above to log venue, sound, food, or operational costs.
                        </td>
                      </tr>
                    ) : (
                      expensesList.map((exp) => (
                        <tr key={exp.id} className="hover:bg-zinc-50/60 transition">
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-zinc-900 block">{exp.title}</span>
                            {exp.notes && <span className="text-[10px] text-zinc-400">{exp.notes}</span>}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 text-zinc-700">
                              {exp.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-zinc-600 whitespace-nowrap">{exp.date}</td>
                          <td className="py-2.5 px-3 text-zinc-600 whitespace-nowrap">{exp.paymentMethod || 'UPI'}</td>
                          <td className="py-2.5 px-3 text-zinc-600 whitespace-nowrap">{exp.paidBy || 'Admin'}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-rose-700 whitespace-nowrap">
                            ₹{Number(exp.amount).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <button
                              onClick={() => handleDeleteExpense(exp.id)}
                              title="Delete Expense"
                              className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {expensesList.length > 0 && (
                    <tfoot>
                      <tr className="bg-zinc-50 font-bold border-t border-zinc-200 text-zinc-900">
                        <td colSpan={5} className="py-2.5 px-3 text-right">Total Event Expenses:</td>
                        <td className="py-2.5 px-3 text-right text-rose-700 font-bold">
                          ₹{totalExpenses.toLocaleString()}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: REGISTRATIONS */}
          {activeTab === 'registrations' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search attendee by name, email, phone..."
                    value={regSearch}
                    onChange={(e) => setRegSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
                <div className="text-xs text-zinc-500 font-medium">
                  Showing {filteredRegs.length} of {eventRegs.length} registrations
                </div>
              </div>

              <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold text-[11px]">
                      <th className="py-2.5 px-3">Attendee Name</th>
                      <th className="py-2.5 px-3">Contact</th>
                      <th className="py-2.5 px-3">CRM Match</th>
                      <th className="py-2.5 px-3">Registered At</th>
                      <th className="py-2.5 px-3 text-center">Check-In</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredRegs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-zinc-400 text-xs">
                          No registrations found matching search.
                        </td>
                      </tr>
                    ) : (
                      filteredRegs.map((reg) => (
                        <tr key={reg.id} className="hover:bg-zinc-50/60 transition">
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-zinc-900 block">{reg.name}</span>
                            <span className="text-[10px] text-zinc-400 font-mono">luma: {reg.lumaGuestId || reg.id}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="text-zinc-700">{reg.email}</div>
                            {reg.phone && <div className="text-[10px] text-zinc-400">{reg.phone}</div>}
                          </td>
                          <td className="py-2.5 px-3">
                            {reg.crmPersonType && reg.crmPersonId ? (
                              <button
                                onClick={() => onOpenPerson && onOpenPerson(reg.crmPersonType as any, reg.crmPersonId!)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition cursor-pointer"
                              >
                                <span>{reg.crmPersonType}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </button>
                            ) : reg.leadCreated ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <Sparkles className="w-2.5 h-2.5" /> New Lead
                              </span>
                            ) : (
                              <span className="text-zinc-400 text-[10px]">Unlinked</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-zinc-500 whitespace-nowrap">
                            {new Date(reg.registeredAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => handleToggleAttendance(reg)}
                              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                                reg.checkedIn
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                              }`}
                            >
                              {reg.checkedIn ? '✓ Attended' : 'Check In'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: ATTENDEES */}
          {activeTab === 'attendees' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Verified Attendees</h3>
                  <span className="text-[11px] text-zinc-500">Attendees who checked in or attended the event</span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  {attendeeRegs.length} Attended
                </span>
              </div>

              <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold text-[11px]">
                      <th className="py-2.5 px-3">Attendee</th>
                      <th className="py-2.5 px-3">Contact</th>
                      <th className="py-2.5 px-3">CRM Status</th>
                      <th className="py-2.5 px-3">Check-in Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {attendeeRegs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-zinc-400 text-xs">
                          No attendees checked in yet. Check in attendees from the &quot;Registrations&quot; tab.
                        </td>
                      </tr>
                    ) : (
                      attendeeRegs.map((reg) => (
                        <tr key={reg.id} className="hover:bg-zinc-50/60 transition">
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-zinc-900 block">{reg.name}</span>
                          </td>
                          <td className="py-2.5 px-3 text-zinc-600">
                            <div>{reg.email}</div>
                            {reg.phone && <div className="text-[10px] text-zinc-400">{reg.phone}</div>}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Attended
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-zinc-500 text-[11px]">
                            {reg.attendedAt
                              ? new Date(reg.attendedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                              : 'Verified'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: NEW LEADS */}
          {activeTab === 'new_leads' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">New Leads Generated</h3>
                  <span className="text-[11px] text-zinc-500">First-time contacts ingested from this event into CRM</span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                  {newLeadRegs.length} Leads
                </span>
              </div>

              <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold text-[11px]">
                      <th className="py-2.5 px-3">Lead Name</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">Phone</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {newLeadRegs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-zinc-400 text-xs">
                          No new leads generated yet from this event.
                        </td>
                      </tr>
                    ) : (
                      newLeadRegs.map((reg) => (
                        <tr key={reg.id} className="hover:bg-zinc-50/60 transition">
                          <td className="py-2.5 px-3 font-semibold text-zinc-900">{reg.name}</td>
                          <td className="py-2.5 px-3 text-zinc-700">{reg.email}</td>
                          <td className="py-2.5 px-3 text-zinc-600">{reg.phone || '—'}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Active Lead
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: GOOGLE DRIVE GALLERY */}
          {activeTab === 'gallery' && (
            <div className="space-y-5">
              {/* Top Banner with Google Drive Folder Link & Embedded Preview */}
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <FolderOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900">Event Photos Google Drive Folder</h4>
                      <p className="text-[11px] text-zinc-500">
                        {event.driveFolderUrl || 'No primary Drive folder attached yet.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {event.driveFolderUrl && (
                      <button
                        onClick={() => setActiveDrivePreview(!activeDrivePreview)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-blue-300 text-blue-800 hover:bg-blue-100 transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{activeDrivePreview ? 'Hide Drive Embed' : 'Show Drive Embed'}</span>
                      </button>
                    )}
                    {event.driveFolderUrl && (
                      <a
                        href={event.driveFolderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition shadow-2xs"
                      >
                        <span>Open Drive</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Embedded Google Drive folder viewer */}
                {event.driveFolderUrl && activeDrivePreview && (
                  <div className="pt-2 animate-in fade-in duration-200">
                    <div className="relative rounded-xl overflow-hidden border border-blue-300 bg-white shadow-xs">
                      <iframe
                        src={parsedDriveFolder.embedUrl || `https://drive.google.com/embeddedfolderview?id=${parsedDriveFolder.id}#grid`}
                        className="w-full h-80 border-0"
                        title="Event Photos Drive Folder Preview"
                        allow="autoplay"
                      />
                    </div>
                    <span className="text-[10px] text-zinc-400 mt-1 block">
                      * Embedded preview renders photos directly from Google Drive. Ensure the folder is set to &quot;Anyone with the link can view&quot;.
                    </span>
                  </div>
                )}
              </div>

              {/* User requested button label: "add drive link of the event photos" */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <h4 className="text-xs font-bold text-zinc-900">Event Media & Drive Archives</h4>
                  <span className="text-[11px] text-zinc-500">Synced photos and Google Drive assets</span>
                </div>
                <button
                  onClick={() => setShowAddDriveModal(!showAddDriveModal)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
                  <span>Add drive link of the event photos</span>
                </button>
              </div>

              {/* Add Drive Link Form */}
              {showAddDriveModal && (
                <form onSubmit={handleAddDriveSubmit} className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-blue-600" />
                    <h5 className="text-xs font-bold text-zinc-900">Add Drive Link of Event Photos</h5>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-700 mb-1">Google Drive Link *</label>
                      <input
                        type="url"
                        required
                        placeholder="https://drive.google.com/drive/folders/... or /file/d/..."
                        value={driveUrlInput}
                        onChange={(e) => setDriveUrlInput(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-700 mb-1">Album Title / Caption</label>
                      <input
                        type="text"
                        placeholder="e.g. Official Photographer Drive Album, Booth Photos"
                        value={driveCaption}
                        onChange={(e) => setDriveCaption(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                      />
                    </div>
                  </div>

                  {/* Drive Preview within form */}
                  {driveUrlInput.trim().length > 15 && (
                    <div className="p-3 bg-white border border-zinc-200 rounded-lg space-y-1.5">
                      <span className="text-[11px] font-semibold text-zinc-700 flex items-center gap-1.5">
                        <CheckCircle2 className={`w-3.5 h-3.5 ${parsedModalDrive.isDriveLink ? 'text-emerald-600' : 'text-amber-500'}`} />
                        <span>{parsedModalDrive.label}</span>
                      </span>
                      {parsedModalDrive.type === 'folder' && parsedModalDrive.embedUrl && (
                        <div className="rounded overflow-hidden border border-zinc-200 h-36">
                          <iframe
                            src={parsedModalDrive.embedUrl}
                            className="w-full h-full border-0"
                            title="Drive Preview"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-1 border-t border-zinc-200">
                    <button
                      type="button"
                      onClick={() => setShowAddDriveModal(false)}
                      className="px-3 py-1 text-xs font-semibold text-zinc-600 hover:text-zinc-900 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingDrive}
                      className="px-3.5 py-1 text-xs font-semibold bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
                      <span>{savingDrive ? 'Saving...' : 'Save Drive Link'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Media & Drive Asset Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {eventMedia.length === 0 ? (
                  <div className="col-span-3 py-12 text-center text-zinc-400 text-xs">
                    No photos or Drive links added yet for this event. Click &quot;Add drive link of the event photos&quot; above to link photos.
                  </div>
                ) : (
                  eventMedia.map((m) => {
                    const isDrive = m.isDriveLink || m.type === 'drive_album';
                    return (
                      <div key={m.id} className="group relative rounded-xl overflow-hidden border border-zinc-200 bg-zinc-100 aspect-4/3 flex flex-col justify-between">
                        {m.url && m.url.startsWith('http') && !m.url.includes('drive.google.com/drive/folders') ? (
                          <img
                            src={m.url}
                            alt={m.caption}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-900 via-indigo-900 to-zinc-900 p-3.5 flex flex-col justify-between text-white">
                            <div className="flex items-center justify-between">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-blue-500/80 text-white">
                                Drive Album
                              </span>
                              <FolderOpen className="w-4 h-4 text-blue-300" />
                            </div>
                            <div>
                              <span className="text-[11px] font-bold line-clamp-2">{m.caption}</span>
                              <span className="text-[9px] text-zinc-300">Google Drive Folder</span>
                            </div>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition p-2.5 flex flex-col justify-end">
                          <span className="text-[11px] font-medium text-white line-clamp-2">{m.caption}</span>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[9px] text-zinc-300">{m.uploadedBy}</span>
                            {m.url && (
                              <a
                                href={m.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-blue-300 font-semibold hover:underline inline-flex items-center gap-0.5"
                              >
                                <span>Open</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 7: ACTIVITY */}
          {activeTab === 'activity' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Event Timeline & Sync Logs</h4>
              <div className="space-y-2 border-l-2 border-zinc-200 ml-2 pl-4">
                <div className="relative">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -left-[21px] top-1" />
                  <span className="text-[11px] font-bold text-zinc-900 block">Luma Event Published & Synced</span>
                  <p className="text-[11px] text-zinc-500">
                    Event created on Luma workspace and ingested into Firestore CRM with ticket pricing of ₹{ticketCharge}.
                  </p>
                </div>

                {expensesList.map((exp) => (
                  <div key={exp.id} className="relative pt-2">
                    <span className="w-2 h-2 rounded-full absolute -left-[20px] top-3 bg-rose-500" />
                    <span className="text-[11px] font-semibold text-zinc-800 block">
                      Expense Logged: {exp.title} (₹{Number(exp.amount).toLocaleString()})
                    </span>
                    <p className="text-[10px] text-zinc-400">
                      Paid via {exp.paymentMethod || 'UPI'} by {exp.paidBy || 'Admin'} • {exp.date}
                    </p>
                  </div>
                ))}

                {eventRegs.slice(0, 8).map((reg, idx) => (
                  <div key={idx} className="relative pt-2">
                    <span className={`w-2 h-2 rounded-full absolute -left-[20px] top-3 ${reg.checkedIn ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                    <span className="text-[11px] font-semibold text-zinc-800 block">
                      {reg.checkedIn ? 'Check-in Recorded' : 'New Registration'} — {reg.name}
                    </span>
                    <p className="text-[10px] text-zinc-400">
                      {reg.leadCreated ? 'Created as New Lead in CRM' : `Linked to existing ${reg.crmPersonType || 'contact'}`} • {new Date(reg.registeredAt).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
