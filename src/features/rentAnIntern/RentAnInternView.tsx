import React, { useState, useMemo, useEffect } from 'react';
import {
  Table,
  Plus,
  Search,
  Filter,
  Download,
  ExternalLink,
  MessageSquare,
  Building,
  CheckCircle2,
  Clock,
  Briefcase,
  Trash2,
  Sparkles,
  Phone,
  Link2,
  Calendar,
  IndianRupee,
  Users,
  FolderOpen,
  ArrowUpDown,
  Upload,
  RefreshCw,
  Edit2,
  FileSpreadsheet,
  AlertCircle,
  X,
  Check,
  Info,
} from 'lucide-react';
import { RentAnInternBooking } from '../../types/crm';
import {
  addRentAnInternEntry,
  updateRentAnInternEntry,
  deleteRentAnInternEntry,
  syncRentAnInternBookingsToFirestore,
} from '../../services/firestoreService';
import { INITIAL_RENT_AN_INTERN_BOOKINGS } from '../../data/rentAnInternData';
import {
  calculateRentAnInternPricing,
  getInternshopCoordinationFee,
  resolveInternshopFee,
} from '../../services/rentAnInternPricing';
import { AiJdSimplifierModal } from './AiJdSimplifierModal';

interface RentAnInternViewProps {
  entries: RentAnInternBooking[];
  onOpenQuickCreate?: () => void;
}

// Helper: Convert any date representation ("YYYY-MM-DD", "14-Feb", "5-Mar", "2026-09-22") to "YYYY-MM-DD" for calendar input
export const toIsoDateString = (val?: string): string => {
  if (!val) return '';
  const trimmed = val.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const dMmmMatch = trimmed.match(/^(\d{1,2})-([A-Za-z]{3})(?:-(\d{2,4}))?$/);
  if (dMmmMatch) {
    const day = parseInt(dMmmMatch[1], 10);
    const monthStr = dMmmMatch[2].toLowerCase();
    const yearStr = dMmmMatch[3];
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthIdx = months.indexOf(monthStr);
    if (monthIdx !== -1) {
      let year = new Date().getFullYear();
      if (yearStr) {
        year = yearStr.length === 2 ? 2000 + parseInt(yearStr, 10) : parseInt(yearStr, 10);
      }
      const mm = String(monthIdx + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      return `${year}-${mm}-${dd}`;
    }
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return '';
};

// Helper: Format ISO date string into standard CRM Sheet format "D-MMM" (e.g. "14-Feb", "5-Mar")
export const formatIsoToCrmDate = (isoStr: string, includeYear = false): string => {
  if (!isoStr) return '';
  const parts = isoStr.split('-');
  if (parts.length < 3) return isoStr;
  const year = parts[0];
  const day = parseInt(parts[2], 10);
  const monthNum = parseInt(parts[1], 10) - 1;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = months[monthNum] || '';
  if (includeYear) {
    return `${day}-${monthName}-${year}`;
  }
  return `${day}-${monthName}`;
};

// Helper: Format ISO date string into readable date preview
export const formatIsoToReadable = (isoStr: string): string => {
  if (!isoStr) return '';
  try {
    const parts = isoStr.split('-').map(Number);
    if (parts.length < 3) return isoStr;
    const [y, m, d] = parts;
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoStr;
  }
};

export const RentAnInternView: React.FC<RentAnInternViewProps> = ({ entries }) => {
  const [activeTab, setActiveTab] = useState<'table' | 'new-booking'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('All');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [selectedBooking, setSelectedBooking] = useState<RentAnInternBooking | null>(null);
  const [editingBooking, setEditingBooking] = useState<RentAnInternBooking | null>(null);
  const [deletingBooking, setDeletingBooking] = useState<{ id: string; company: string } | null>(null);
  const [showSheetImportModal, setShowSheetImportModal] = useState(false);
  const [showRateCardModal, setShowRateCardModal] = useState(false);
  const [sheetPasteText, setSheetPasteText] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // AI JD Simplifier Modal state
  const [showAiJdModal, setShowAiJdModal] = useState(false);
  const [aiJdTarget, setAiJdTarget] = useState<'create' | 'edit'>('create');
  const [aiJdInitialText, setAiJdInitialText] = useState('');

  // Form State for New Booking (Default: 3 hours, 1 intern => ₹1,000 earned, ₹200 travel, ₹1,200 total intern payout, ₹1,000 earned by Internshop)
  const initialFormState: Omit<RentAnInternBooking, 'id' | 'createdAt' | 'updatedAt'> = {
    dateOfBooking: formatIsoToCrmDate(new Date().toISOString().split('T')[0]),
    company: '',
    poc: '',
    phone: '',
    hours: 3,
    jobDescription: '',
    workDriveLink: '',
    noOfKids: 1,
    amountEarned: 1000,
    travel: 200,
    totalAmount: 1200,
    amountEarnedByInternshop: 1000,
    clientGrandTotal: 2200,
    status: 'Payment Received',
    notes: '',
  };

  const [formData, setFormData] = useState(initialFormState);

  // Auto-pricing handlers for New Booking Form
  const handleCompanyChange = (newCompany: string) => {
    const existingCompanyBookings = entries.filter(
      (b) => b.company && b.company.trim().toLowerCase() === newCompany.trim().toLowerCase()
    );
    const rateCardFee = getInternshopCoordinationFee(existingCompanyBookings.length);
    setFormData((prev) => {
      const totalAmount = (Number(prev.amountEarned) || 0) + (Number(prev.travel) || 0);
      return {
        ...prev,
        company: newCompany,
        amountEarnedByInternshop: rateCardFee,
        clientGrandTotal: totalAmount + rateCardFee,
      };
    });
  };

  const handleHoursChange = (newHours: number) => {
    setFormData((prev) => {
      const safeKids = Math.max(1, Number(prev.noOfKids) || 1);
      const pricing = calculateRentAnInternPricing(newHours, safeKids);
      const fee = Number(prev.amountEarnedByInternshop) || 1000;
      return {
        ...prev,
        hours: newHours,
        amountEarned: pricing.amountEarned,
        travel: pricing.travel,
        totalAmount: pricing.totalAmount,
        clientGrandTotal: pricing.totalAmount + fee,
      };
    });
  };

  const handleKidsChange = (newKids: number) => {
    const safeKids = Math.max(1, newKids);
    setFormData((prev) => {
      const currentHours = prev.hours !== undefined ? prev.hours : 3;
      const pricing = calculateRentAnInternPricing(currentHours, safeKids);
      const fee = Number(prev.amountEarnedByInternshop) || 1000;
      return {
        ...prev,
        noOfKids: safeKids,
        amountEarned: pricing.amountEarned,
        travel: pricing.travel,
        totalAmount: pricing.totalAmount,
        clientGrandTotal: pricing.totalAmount + fee,
      };
    });
  };

  const handleAmountEarnedChange = (newAmount: number) => {
    setFormData((prev) => {
      const total = newAmount + (Number(prev.travel) || 0);
      const fee = Number(prev.amountEarnedByInternshop) || 1000;
      return {
        ...prev,
        amountEarned: newAmount,
        totalAmount: total,
        clientGrandTotal: total + fee,
      };
    });
  };

  const handleTravelChange = (newTravel: number) => {
    setFormData((prev) => {
      const total = (Number(prev.amountEarned) || 0) + newTravel;
      const fee = Number(prev.amountEarnedByInternshop) || 1000;
      return {
        ...prev,
        travel: newTravel,
        totalAmount: total,
        clientGrandTotal: total + fee,
      };
    });
  };

  const handleInternshopFeeChange = (newFee: number) => {
    setFormData((prev) => {
      const total = (Number(prev.amountEarned) || 0) + (Number(prev.travel) || 0);
      return {
        ...prev,
        amountEarnedByInternshop: newFee,
        clientGrandTotal: total + newFee,
      };
    });
  };

  // Auto-pricing handlers for Edit Booking Modal
  const handleEditHoursChange = (newHours: number) => {
    setEditingBooking((prev) => {
      if (!prev) return null;
      const safeKids = Math.max(1, Number(prev.noOfKids) || 1);
      const pricing = calculateRentAnInternPricing(newHours, safeKids);
      const fee = Number(prev.amountEarnedByInternshop) !== undefined ? Number(prev.amountEarnedByInternshop) : 1000;
      return {
        ...prev,
        hours: newHours,
        amountEarned: pricing.amountEarned,
        travel: pricing.travel,
        totalAmount: pricing.totalAmount,
        clientGrandTotal: pricing.totalAmount + fee,
      };
    });
  };

  const handleEditKidsChange = (newKids: number) => {
    const safeKids = Math.max(1, newKids);
    setEditingBooking((prev) => {
      if (!prev) return null;
      const currentHours = prev.hours !== undefined ? prev.hours : 3;
      const pricing = calculateRentAnInternPricing(currentHours, safeKids);
      const fee = Number(prev.amountEarnedByInternshop) !== undefined ? Number(prev.amountEarnedByInternshop) : 1000;
      return {
        ...prev,
        noOfKids: safeKids,
        amountEarned: pricing.amountEarned,
        travel: pricing.travel,
        totalAmount: pricing.totalAmount,
        clientGrandTotal: pricing.totalAmount + fee,
      };
    });
  };

  const handleEditAmountEarnedChange = (newAmount: number) => {
    if (!editingBooking) return;
    setEditingBooking((prev) => {
      if (!prev) return null;
      const total = newAmount + (Number(prev.travel) || 0);
      const fee = Number(prev.amountEarnedByInternshop) !== undefined ? Number(prev.amountEarnedByInternshop) : 1000;
      return {
        ...prev,
        amountEarned: newAmount,
        totalAmount: total,
        clientGrandTotal: total + fee,
      };
    });
  };

  const handleEditTravelChange = (newTravel: number) => {
    if (!editingBooking) return;
    setEditingBooking((prev) => {
      if (!prev) return null;
      const total = (Number(prev.amountEarned) || 0) + newTravel;
      const fee = Number(prev.amountEarnedByInternshop) !== undefined ? Number(prev.amountEarnedByInternshop) : 1000;
      return {
        ...prev,
        travel: newTravel,
        totalAmount: total,
        clientGrandTotal: total + fee,
      };
    });
  };

  const handleEditInternshopFeeChange = (newFee: number) => {
    if (!editingBooking) return;
    setEditingBooking((prev) => {
      if (!prev) return null;
      const total = (Number(prev.amountEarned) || 0) + (Number(prev.travel) || 0);
      return {
        ...prev,
        amountEarnedByInternshop: newFee,
        clientGrandTotal: total + newFee,
      };
    });
  };

  // Handler to apply AI-simplified JD and auto-fill interns/hours
  const handleApplySimplifiedJd = (data: {
    simplifiedJd: string;
    detectedInterns?: number | null;
    detectedHours?: number | null;
    applyInternsAndHours?: boolean;
    bulletPoints?: string[];
  }) => {
    if (aiJdTarget === 'create') {
      let newKids = formData.noOfKids;
      let newHours = formData.hours;

      if (data.applyInternsAndHours) {
        if (data.detectedInterns && data.detectedInterns > 0) {
          newKids = data.detectedInterns;
        }
        if (data.detectedHours && data.detectedHours > 0) {
          newHours = data.detectedHours;
        }
      }

      const pricing = calculateRentAnInternPricing(newHours, newKids);
      const fee = Number(formData.amountEarnedByInternshop) || 1000;
      const totalAmount = pricing.amountEarned + pricing.travel;

      setFormData((prev) => ({
        ...prev,
        jobDescription: data.simplifiedJd,
        noOfKids: newKids,
        hours: newHours,
        amountEarned: pricing.amountEarned,
        travel: pricing.travel,
        totalAmount,
        clientGrandTotal: totalAmount + fee,
      }));

      setFeedbackMsg({
        type: 'success',
        message: `✨ Job Description simplified to "${data.simplifiedJd}"!`,
      });
    } else if (aiJdTarget === 'edit' && editingBooking) {
      let updatedBooking = {
        ...editingBooking,
        jobDescription: data.simplifiedJd,
      };

      if (data.applyInternsAndHours) {
        let newKids = editingBooking.noOfKids || 1;
        let newHours = editingBooking.hours || 3;
        if (data.detectedInterns && data.detectedInterns > 0) {
          newKids = data.detectedInterns;
        }
        if (data.detectedHours && data.detectedHours > 0) {
          newHours = data.detectedHours;
        }
        const pricing = calculateRentAnInternPricing(newHours, newKids);
        const fee =
          editingBooking.amountEarnedByInternshop !== undefined
            ? editingBooking.amountEarnedByInternshop
            : resolveInternshopFee(editingBooking, entries);
        const totalAmount = pricing.amountEarned + pricing.travel;
        updatedBooking = {
          ...updatedBooking,
          noOfKids: newKids,
          hours: newHours,
          amountEarned: pricing.amountEarned,
          travel: pricing.travel,
          totalAmount,
          clientGrandTotal: totalAmount + fee,
        };
      }

      setEditingBooking(updatedBooking);
      setFeedbackMsg({
        type: 'success',
        message: `✨ Job Description simplified to "${data.simplifiedJd}"!`,
      });
    }
  };

  // Auto-correct any legacy records in Firestore where amount was stored as single-intern rate instead of (rate * kids)
  useEffect(() => {
    if (!entries || entries.length === 0) return;
    entries.forEach((b) => {
      const kids = Number(b.noOfKids) || 1;
      if (b.id === 'rai-booking-1' && (Number(b.amountEarned) < 3000 || Number(b.travel) < 600)) {
        updateRentAnInternEntry(b.id, {
          amountEarned: 3000,
          travel: 600,
          totalAmount: 3600,
          amountEarnedByInternshop: 1000,
          clientGrandTotal: 4600,
        }).catch(console.error);
      } else if (b.id === 'rai-booking-2' && Number(b.amountEarned) < 4000) {
        updateRentAnInternEntry(b.id, {
          amountEarned: 4000,
          totalAmount: 4000,
          amountEarnedByInternshop: 1000,
          clientGrandTotal: 5000,
        }).catch(console.error);
      } else if (b.id === 'rai-booking-3' && Number(b.amountEarned) < 5000) {
        updateRentAnInternEntry(b.id, {
          amountEarned: 5000,
          totalAmount: 5000,
          amountEarnedByInternshop: 1000,
          clientGrandTotal: 6000,
        }).catch(console.error);
      } else if (b.id === 'rai-booking-4' && Number(b.amountEarned) < 5000) {
        updateRentAnInternEntry(b.id, {
          amountEarned: 5000,
          totalAmount: 5000,
          amountEarnedByInternshop: 800,
          clientGrandTotal: 5800,
        }).catch(console.error);
      } else if (kids > 1 && Number(b.amountEarned) === 1000) {
        const correctedEarned = 1000 * kids;
        const currentTravel = Number(b.travel) || 0;
        const correctedTotal = correctedEarned + currentTravel;
        const fee = resolveInternshopFee(b, entries);
        updateRentAnInternEntry(b.id, {
          amountEarned: correctedEarned,
          totalAmount: correctedTotal,
          clientGrandTotal: correctedTotal + fee,
        }).catch(console.error);
      }
    });
  }, [entries]);

  // Filtered and sorted bookings
  const filteredBookings = useMemo(() => {
    return entries.filter((item) => {
      // Search matches
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        item.company?.toLowerCase().includes(query) ||
        item.poc?.toLowerCase().includes(query) ||
        item.phone?.includes(query) ||
        item.jobDescription?.toLowerCase().includes(query) ||
        item.dateOfBooking?.toLowerCase().includes(query);

      // Company filter
      const matchesCompany =
        selectedCompanyFilter === 'All' || item.company === selectedCompanyFilter;

      // Status filter
      const matchesStatus =
        selectedStatusFilter === 'All' || item.status === selectedStatusFilter;

      return matchesSearch && matchesCompany && matchesStatus;
    });
  }, [entries, searchQuery, selectedCompanyFilter, selectedStatusFilter]);

  // Distinct company list
  const companyOptions = useMemo(() => {
    const list = Array.from(new Set(entries.map((e) => e.company).filter(Boolean)));
    return ['All', ...list.sort()];
  }, [entries]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalBookings = entries.length;
    const totalKids = entries.reduce((acc, curr) => acc + (Number(curr.noOfKids) || 0), 0);
    const totalHours = entries.reduce((acc, curr) => acc + (Number(curr.hours) || 0), 0);
    const totalAmount = entries.reduce((acc, curr) => acc + (Number(curr.amountEarned) || 0), 0);
    const totalTravel = entries.reduce((acc, curr) => acc + (Number(curr.travel) || 0), 0);
    const totalInternPayout = totalAmount + totalTravel;
    const totalInternshopEarned = entries.reduce(
      (acc, curr) => acc + resolveInternshopFee(curr, entries),
      0
    );
    const grandClientBilled = totalInternPayout + totalInternshopEarned;

    return {
      totalBookings,
      totalKids,
      totalHours,
      totalAmount,
      totalTravel,
      totalInternPayout,
      totalInternshopEarned,
      grandClientBilled,
    };
  }, [entries]);

  // Form submission handler
  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company || !formData.dateOfBooking) {
      setFeedbackMsg({ type: 'error', message: 'Please provide Date of Booking and Company Name.' });
      return;
    }

    setIsSubmitting(true);
    setFeedbackMsg(null);

    try {
      const totalAmount = (Number(formData.amountEarned) || 0) + (Number(formData.travel) || 0);
      const existingCompanyBookings = entries.filter(
        (b) => b.company && b.company.trim().toLowerCase() === formData.company.trim().toLowerCase()
      );
      const autoFee = getInternshopCoordinationFee(existingCompanyBookings.length);
      const internshopEarned =
        formData.amountEarnedByInternshop !== undefined && !isNaN(Number(formData.amountEarnedByInternshop))
          ? Number(formData.amountEarnedByInternshop)
          : autoFee;
      const clientGrandTotal = totalAmount + internshopEarned;

      await addRentAnInternEntry({
        ...formData,
        hours: Number(formData.hours) || 0,
        noOfKids: Number(formData.noOfKids) || 1,
        amountEarned: Number(formData.amountEarned) || 0,
        travel: Number(formData.travel) || 0,
        totalAmount,
        amountEarnedByInternshop: internshopEarned,
        clientGrandTotal,
      });

      setFeedbackMsg({
        type: 'success',
        message: `Booking for ${formData.company} (${formData.dateOfBooking}) saved successfully to Firestore!`,
      });
      setFormData(initialFormState);
      setActiveTab('table');
    } catch (err) {
      console.error(err);
      setFeedbackMsg({
        type: 'error',
        message: 'Failed to create booking in Firestore. Please verify your connection.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update existing booking
  const handleUpdateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking) return;

    setIsSubmitting(true);
    try {
      const totalAmount = (Number(editingBooking.amountEarned) || 0) + (Number(editingBooking.travel) || 0);
      const internshopEarned =
        editingBooking.amountEarnedByInternshop !== undefined && !isNaN(Number(editingBooking.amountEarnedByInternshop))
          ? Number(editingBooking.amountEarnedByInternshop)
          : resolveInternshopFee(editingBooking, entries);
      const clientGrandTotal = totalAmount + internshopEarned;

      await updateRentAnInternEntry(editingBooking.id, {
        ...editingBooking,
        totalAmount,
        amountEarnedByInternshop: internshopEarned,
        clientGrandTotal,
      });
      setFeedbackMsg({ type: 'success', message: 'Booking updated successfully.' });
      setEditingBooking(null);
    } catch (err) {
      console.error(err);
      setFeedbackMsg({ type: 'error', message: 'Failed to update booking.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete booking handlers
  const handleDeleteBooking = (id: string, company: string) => {
    setDeletingBooking({ id, company });
  };

  const confirmDeleteBooking = async () => {
    if (!deletingBooking) return;
    const { id, company } = deletingBooking;
    try {
      await deleteRentAnInternEntry(id);
      setFeedbackMsg({ type: 'success', message: `Booking for ${company} deleted.` });
      if (selectedBooking?.id === id) setSelectedBooking(null);
    } catch (err) {
      console.error(err);
      setFeedbackMsg({ type: 'error', message: 'Failed to delete booking.' });
    } finally {
      setDeletingBooking(null);
    }
  };

  // Reset to Google Sheet Initial Data
  const handleResetToGoogleSheet = async () => {
    if (!window.confirm('Sync with the official "Intern CRM › Rent An intern" sheet records? This will populate the 13 verified bookings into Firestore.')) {
      return;
    }
    setIsSyncing(true);
    try {
      await syncRentAnInternBookingsToFirestore(INITIAL_RENT_AN_INTERN_BOOKINGS);
      setFeedbackMsg({
        type: 'success',
        message: 'Successfully synced all 13 verified sheet bookings to Firestore!',
      });
    } catch (err) {
      console.error(err);
      setFeedbackMsg({ type: 'error', message: 'Failed to sync with Firestore.' });
    } finally {
      setIsSyncing(false);
    }
  };

  // Parse pasted tab-separated or comma-separated rows from Google Sheets
  const handleImportPastedData = async () => {
    if (!sheetPasteText.trim()) return;
    setIsSyncing(true);

    try {
      const lines = sheetPasteText.split('\n').filter((l) => l.trim().length > 0);
      const parsedBookings: RentAnInternBooking[] = [];

      lines.forEach((line, idx) => {
        // Detect tab or comma separated
        const parts = line.includes('\t') ? line.split('\t') : line.split(',');
        if (parts.length < 2) return;

        // Skip header if pasted
        const first = parts[0].trim().toLowerCase();
        if (first.includes('date') || first.includes('company')) return;

        const dateOfBooking = parts[0]?.trim() || '';
        const company = parts[1]?.trim() || '';
        const poc = parts[2]?.trim() || '';
        const phone = parts[3]?.trim() || '';
        const hours = parseFloat(parts[4]?.trim() || '0') || 0;
        const jobDescription = parts[5]?.trim() || '';
        const workDriveLink = parts[6]?.trim() || '';
        const noOfKids = parseInt(parts[7]?.trim() || '1', 10) || 1;

        // Clean amount string (e.g. ₹1,000.00 -> 1000)
        const cleanAmountStr = (parts[8] || '').replace(/[₹,$\s]/g, '');
        let amountEarned = parseFloat(cleanAmountStr) || 0;

        const cleanTravelStr = (parts[9] || '').replace(/[₹,$\s]/g, '');
        let travel = parseFloat(cleanTravelStr) || 0;

        // If the sheet entered single-intern unit rate (e.g. ₹1,000 for 3 kids), scale by headcount
        if (noOfKids > 1 && amountEarned === 1000) {
          amountEarned = amountEarned * noOfKids;
        }
        if (noOfKids > 1 && travel === 200) {
          travel = travel * noOfKids;
        }

        // Check if 11th column exists for Internshop coordination fee, else auto-calculate per rate card
        const cleanFeeStr = (parts[10] || '').replace(/[₹,$\s]/g, '');
        const customFee = cleanFeeStr ? parseFloat(cleanFeeStr) : undefined;
        const autoFee = getInternshopCoordinationFee(0);
        const amountEarnedByInternshop = customFee !== undefined && !isNaN(customFee) ? customFee : autoFee;
        const totalAmount = amountEarned + travel;
        const clientGrandTotal = totalAmount + amountEarnedByInternshop;

        if (company) {
          parsedBookings.push({
            id: `rai-sheet-import-${Date.now()}-${idx}`,
            dateOfBooking,
            company,
            poc,
            phone,
            hours,
            jobDescription,
            workDriveLink,
            noOfKids,
            amountEarned,
            travel,
            totalAmount,
            amountEarnedByInternshop,
            clientGrandTotal,
            status: amountEarned > 0 ? 'Payment Received' : 'Fulfilled',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      });

      if (parsedBookings.length > 0) {
        await syncRentAnInternBookingsToFirestore(parsedBookings);
        setFeedbackMsg({
          type: 'success',
          message: `Successfully imported and synced ${parsedBookings.length} booking rows to Firestore!`,
        });
        setShowSheetImportModal(false);
        setSheetPasteText('');
      } else {
        setFeedbackMsg({
          type: 'error',
          message: 'No valid rows found. Please copy and paste rows directly from your Google Sheet.',
        });
      }
    } catch (err) {
      console.error(err);
      setFeedbackMsg({ type: 'error', message: 'Failed to parse and save sheet data.' });
    } finally {
      setIsSyncing(false);
    }
  };

  // Export to CSV matching the Google Sheet format with Rate Card breakdown
  const exportToCsv = () => {
    const headers = [
      'Date of Booking',
      'Company',
      'Booking Company POC',
      'Phone Number',
      'Hours',
      'Job Description',
      'Work drive link',
      'No.of Kids',
      'Amount Earned (Intern Pay)',
      'Travel',
      'Total Intern Pay',
      'Total Amount Earned by Internshop',
      'Total Billed (Client)',
      'Status',
    ];

    const rows = filteredBookings.map((b) => {
      const internshopFee = resolveInternshopFee(b, entries);
      const internPay = (Number(b.amountEarned) || 0) + (Number(b.travel) || 0);
      const clientTotal = internPay + internshopFee;
      return [
        `"${b.dateOfBooking || ''}"`,
        `"${b.company || ''}"`,
        `"${b.poc || ''}"`,
        `"${b.phone || ''}"`,
        b.hours,
        `"${(b.jobDescription || '').replace(/"/g, '""')}"`,
        `"${b.workDriveLink || ''}"`,
        b.noOfKids,
        b.amountEarned,
        b.travel,
        internPay,
        internshopFee,
        clientTotal,
        `"${b.status || ''}"`,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rent_an_intern_bookings_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="p-4 bg-white rounded-xl border border-zinc-200/80 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200/60">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">Rent an Intern</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowRateCardModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors shadow-2xs"
            >
              <Info className="w-3.5 h-3.5 text-amber-700" />
              View Rate Card
            </button>

            <button
              onClick={() => setShowSheetImportModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors shadow-2xs"
            >
              <Upload className="w-3.5 h-3.5 text-zinc-500" />
              Paste from Google Sheet
            </button>

            <button
              onClick={handleResetToGoogleSheet}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              Re-sync Sheet Data
            </button>

            <button
              onClick={exportToCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-zinc-500" />
              Export CSV
            </button>

            <button
              onClick={() => setActiveTab(activeTab === 'new-booking' ? 'table' : 'new-booking')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors shadow-2xs ${
                activeTab === 'new-booking'
                  ? 'bg-zinc-900 text-white'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {activeTab === 'new-booking' ? (
                <>
                  <Table className="w-3.5 h-3.5" />
                  View Bookings Table
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  + New Booking
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tab Toggle Navigation */}
        <div className="flex items-center justify-between border-t border-zinc-100 mt-3 pt-3">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('table')}
              className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'table'
                  ? 'bg-zinc-900 text-white shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              Bookings Registry ({entries.length})
            </button>

            <button
              onClick={() => setActiveTab('new-booking')}
              className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'new-booking'
                  ? 'bg-zinc-900 text-white shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              + Add Client Booking
            </button>
          </div>

          <div className="text-xs text-zinc-400 hidden sm:block">
            Auto-synced with Firestore collection <code className="bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-600">/rentAnIntern</code>
          </div>
        </div>

        {/* Feedback message banner */}
        {feedbackMsg && (
          <div
            className={`mt-3 p-3 rounded-lg flex items-center justify-between text-xs ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedbackMsg.message}</span>
            </div>
            <button
              onClick={() => setFeedbackMsg(null)}
              className="text-zinc-400 hover:text-zinc-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div>
        {activeTab === 'table' ? (
          <div className="space-y-4">
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-zinc-200/80 shadow-2xs">
                <div className="flex items-center justify-between text-zinc-500 mb-1">
                  <span className="text-xs font-medium">Total Bookings</span>
                  <Briefcase className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-xl font-bold text-zinc-900">{metrics.totalBookings}</div>
                <span className="text-[11px] text-zinc-500">Hourly gig engagements</span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-zinc-200/80 shadow-2xs">
                <div className="flex items-center justify-between text-zinc-500 mb-1">
                  <span className="text-xs font-medium">Interns Dispatched</span>
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-xl font-bold text-zinc-900">{metrics.totalKids}</div>
                <span className="text-[11px] text-zinc-500">Total kids booked</span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-zinc-200/80 shadow-2xs">
                <div className="flex items-center justify-between text-zinc-500 mb-1">
                  <span className="text-xs font-medium">Total Hours</span>
                  <Clock className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-xl font-bold text-zinc-900">{metrics.totalHours} hrs</div>
                <span className="text-[11px] text-zinc-500">Service duration logged</span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-zinc-200/80 shadow-2xs">
                <div className="flex items-center justify-between text-zinc-500 mb-1">
                  <span className="text-xs font-medium">Interns Payout</span>
                  <IndianRupee className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-xl font-bold text-zinc-900">₹{metrics.totalInternPayout.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                <span className="text-[11px] text-zinc-500">Earned + travel allowance</span>
              </div>

              <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200/80 shadow-2xs">
                <div className="flex items-center justify-between text-amber-900 mb-1">
                  <span className="text-xs font-semibold">Earned by Internshop</span>
                  <Sparkles className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-xl font-bold text-amber-950">₹{metrics.totalInternshopEarned.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                <span className="text-[11px] text-amber-700 font-medium">Rate Card Agency Fees</span>
              </div>

              <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200/80 shadow-2xs">
                <div className="flex items-center justify-between text-emerald-900 mb-1">
                  <span className="text-xs font-semibold">Total Billed (Client)</span>
                  <IndianRupee className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-xl font-bold text-emerald-950">₹{metrics.grandClientBilled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                <span className="text-[11px] text-emerald-700 font-medium">Intern Pay + Agency Fee</span>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="p-3 bg-white rounded-xl border border-zinc-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                {/* Search input */}
                <div className="relative min-w-[240px] max-w-sm flex-1">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search company, POC, phone, or job description..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Company filter */}
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Building className="w-3.5 h-3.5 text-zinc-400" />
                  <select
                    value={selectedCompanyFilter}
                    onChange={(e) => setSelectedCompanyFilter(e.target.value)}
                    className="py-1.5 px-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                  >
                    {companyOptions.map((c) => (
                      <option key={c} value={c}>
                        {c === 'All' ? 'All Companies' : c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status filter */}
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Filter className="w-3.5 h-3.5 text-zinc-400" />
                  <select
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value)}
                    className="py-1.5 px-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Payment Received">Payment Received</option>
                    <option value="Fulfilled">Fulfilled</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Scheduled">Scheduled</option>
                  </select>
                </div>
              </div>

              <div className="text-xs text-zinc-500">
                Showing <strong>{filteredBookings.length}</strong> of <strong>{entries.length}</strong> bookings
              </div>
            </div>

            {/* Table Container */}
            <div className="bg-white rounded-xl border border-zinc-200/80 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-600 font-medium">
                      <th className="py-3 px-3.5 whitespace-nowrap">Date of Booking</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">Company</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">Booking Company POC</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">Phone Number</th>
                      <th className="py-3 px-2.5 text-center whitespace-nowrap">Hours</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">Job Description</th>
                      <th className="py-3 px-3 whitespace-nowrap">Work Drive Link</th>
                      <th className="py-3 px-2.5 text-center whitespace-nowrap">No. of Kids</th>
                      <th className="py-3 px-3 text-right whitespace-nowrap">Amount Earned</th>
                      <th className="py-3 px-3 text-right whitespace-nowrap">Travel</th>
                      <th className="py-3 px-3 text-right whitespace-nowrap font-semibold">Total Intern Pay</th>
                      <th className="py-3 px-3 text-right whitespace-nowrap font-semibold text-amber-900 bg-amber-50/80 border-x border-amber-200/50">
                        Total Amount Earned by Internshop
                      </th>
                      <th className="py-3 px-3 text-right whitespace-nowrap font-bold text-emerald-950 bg-emerald-50/60">
                        Total Billed (Client)
                      </th>
                      <th className="py-3 px-3 text-center whitespace-nowrap">Status</th>
                      <th className="py-3 px-3 text-center whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredBookings.length === 0 ? (
                      <tr>
                        <td colSpan={15} className="py-12 text-center text-zinc-400">
                          <Briefcase className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
                          <p className="font-medium text-zinc-600">No bookings match the search criteria</p>
                          <p className="text-xs text-zinc-400 mt-1">Try resetting the filters or add a new booking.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredBookings.map((b) => {
                        const internPay = (Number(b.amountEarned) || 0) + (Number(b.travel) || 0);
                        const internshopEarned = resolveInternshopFee(b, entries);
                        const clientGrandTotal = internPay + internshopEarned;
                        return (
                          <tr
                            key={b.id}
                            className="hover:bg-zinc-50/80 transition-colors group cursor-pointer"
                            onClick={() => setSelectedBooking(b)}
                          >
                            {/* Date of Booking */}
                            <td className="py-3 px-3.5 font-medium text-zinc-900 whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-zinc-100 text-zinc-800 rounded font-semibold text-[11px]">
                                <Calendar className="w-3 h-3 text-zinc-500" />
                                {b.dateOfBooking || 'N/A'}
                              </div>
                            </td>

                            {/* Company */}
                            <td className="py-3 px-3.5 font-semibold text-zinc-900 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-[10px] border border-emerald-200/60">
                                  {b.company.charAt(0)}
                                </span>
                                <span>{b.company}</span>
                              </div>
                            </td>

                            {/* POC */}
                            <td className="py-3 px-3.5 text-zinc-700 whitespace-nowrap">
                              <span className="font-medium">{b.poc || '—'}</span>
                            </td>

                            {/* Phone */}
                            <td className="py-3 px-3.5 text-zinc-600 whitespace-nowrap font-mono text-[11px]">
                              {b.phone ? (
                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  <a
                                    href={`tel:${b.phone}`}
                                    className="hover:text-emerald-700 hover:underline"
                                    title="Call POC"
                                  >
                                    {b.phone}
                                  </a>
                                  <a
                                    href={`https://wa.me/91${b.phone.replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                    title="Chat on WhatsApp"
                                  >
                                    <MessageSquare className="w-3 h-3" />
                                  </a>
                                </div>
                              ) : (
                                <span className="text-zinc-300">—</span>
                              )}
                            </td>

                            {/* Hours */}
                            <td className="py-3 px-2.5 text-center whitespace-nowrap">
                              <span className="inline-block px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full font-medium text-[11px] border border-purple-200">
                                {b.hours} hrs
                              </span>
                            </td>

                            {/* Job Description */}
                            <td className="py-3 px-3.5 max-w-[220px]">
                              <p className="truncate text-zinc-800 font-medium" title={b.jobDescription}>
                                {b.jobDescription || 'Rent An Intern Gig'}
                              </p>
                              {b.notes && (
                                <p className="text-[10px] text-zinc-400 truncate">{b.notes}</p>
                              )}
                            </td>

                            {/* Work Drive Link */}
                            <td className="py-3 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              {b.workDriveLink ? (
                                <a
                                  href={b.workDriveLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                                >
                                  <FolderOpen className="w-3 h-3" />
                                  Drive Assets
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              ) : (
                                <span className="text-zinc-300 text-[11px] italic">Not attached</span>
                              )}
                            </td>

                            {/* No. of Kids */}
                            <td className="py-3 px-2.5 text-center whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-bold text-[11px] border border-blue-200">
                                <Users className="w-3 h-3" />
                                {b.noOfKids}
                              </span>
                            </td>

                            {/* Amount Earned */}
                            <td className="py-3 px-3 text-right whitespace-nowrap font-medium text-zinc-900">
                              ₹{(Number(b.amountEarned) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>

                            {/* Travel */}
                            <td className="py-3 px-3 text-right whitespace-nowrap text-zinc-600">
                              {b.travel && Number(b.travel) > 0 ? (
                                <span className="text-amber-700 font-medium">
                                  ₹{Number(b.travel).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                              ) : (
                                <span className="text-zinc-300">₹0.00</span>
                              )}
                            </td>

                            {/* Total Intern Pay */}
                            <td className="py-3 px-3 text-right whitespace-nowrap font-semibold text-zinc-900">
                              ₹{internPay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>

                            {/* Total Amount Earned by Internshop */}
                            <td className="py-3 px-3 text-right whitespace-nowrap bg-amber-50/50 border-x border-amber-200/50">
                              <div className="flex flex-col items-end">
                                <span className="font-bold text-amber-950">
                                  ₹{internshopEarned.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                                {internshopEarned < 1000 ? (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-amber-200/70 text-amber-900 font-bold">
                                    Volume Tier
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-zinc-400">
                                    Standard Tier
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Total Billed (Client) */}
                            <td className="py-3 px-3 text-right whitespace-nowrap font-bold text-emerald-950 bg-emerald-50/40">
                              ₹{clientGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>

                            {/* Status */}
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                                  b.status === 'Payment Received'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : b.status === 'Fulfilled'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : b.status === 'In Progress'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                                }`}
                              >
                                {b.status || 'Payment Received'}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingBooking(b);
                                  }}
                                  className="min-w-[34px] min-h-[34px] p-2 inline-flex items-center justify-center text-zinc-400 hover:text-zinc-800 active:text-zinc-950 rounded-lg hover:bg-zinc-100 active:bg-zinc-200 transition-all cursor-pointer touch-manipulation active:scale-95 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                                  title="Edit Booking"
                                  aria-label="Edit Booking"
                                >
                                  <Edit2 className="w-4 h-4 pointer-events-none" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteBooking(b.id, b.company);
                                  }}
                                  className="min-w-[34px] min-h-[34px] p-2 inline-flex items-center justify-center text-zinc-400 hover:text-rose-600 active:text-rose-700 rounded-lg hover:bg-rose-50 active:bg-rose-100 transition-all cursor-pointer touch-manipulation active:scale-95 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                                  title="Delete Booking"
                                  aria-label="Delete Booking"
                                >
                                  <Trash2 className="w-4 h-4 pointer-events-none" />
                                </button>
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
          </div>
        ) : (
          /* Tab 2: New Booking Form */
          <div className="bg-white rounded-xl border border-zinc-200/80 shadow-2xs p-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between border-b border-zinc-200/80 pb-4 mb-6">
              <div>
                <h2 id="add-client-booking-heading" className="text-lg font-semibold text-zinc-900 tracking-tight">
                  Add Client Booking
                </h2>
              </div>
              <button
                type="button"
                id="back-to-registry-btn"
                onClick={() => setActiveTab('table')}
                className="text-xs text-zinc-500 hover:text-zinc-800 underline"
              >
                Back to Registry
              </button>
            </div>

            <form onSubmit={handleCreateBooking} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Date of Booking - Calendar Picker & CRM Formatting */}
                <div id="booking-date-container">
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="booking-date-picker" className="block text-xs font-semibold text-zinc-700">
                      Date of Booking <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-zinc-400">Choose from calendar</span>
                  </div>
                  <div className="relative">
                    <input
                      type="date"
                      id="booking-date-picker"
                      required
                      value={toIsoDateString(formData.dateOfBooking)}
                      onChange={(e) => {
                        const iso = e.target.value;
                        const includeYear = formData.dateOfBooking.split('-').length >= 3;
                        setFormData({
                          ...formData,
                          dateOfBooking: formatIsoToCrmDate(iso, includeYear),
                        });
                      }}
                      onClick={(e) => e.currentTarget.showPicker?.()}
                      className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 text-zinc-900 font-medium cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-zinc-500">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <span className="font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px] shrink-0">
                        {formData.dateOfBooking || 'None'}
                      </span>
                      {toIsoDateString(formData.dateOfBooking) && (
                        <span className="text-zinc-500 text-[10.5px] truncate">
                          ({formatIsoToReadable(toIsoDateString(formData.dateOfBooking))})
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      id="toggle-date-year-btn"
                      onClick={() => {
                        const currentIso = toIsoDateString(formData.dateOfBooking) || new Date().toISOString().split('T')[0];
                        const hasYear = formData.dateOfBooking.split('-').length >= 3;
                        setFormData({
                          ...formData,
                          dateOfBooking: formatIsoToCrmDate(currentIso, !hasYear),
                        });
                      }}
                      className="text-[10px] text-zinc-500 hover:text-zinc-800 underline font-medium shrink-0 ml-2"
                    >
                      {formData.dateOfBooking.split('-').length >= 3 ? 'Use DD-MMM' : '+ Year'}
                    </button>
                  </div>
                </div>

                {/* Company Name */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Company Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ace Blend, CSC, Grid And Grid, AnnaCat"
                    value={formData.company}
                    onChange={(e) => handleCompanyChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
                  />
                  <span className="text-[10px] text-zinc-400">
                    Auto-applies client rate card tier based on previous booking history
                  </span>
                </div>

                {/* Booking Company POC */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Booking Company POC
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Prajay, Ronak Mehta, Trisha Ghelani"
                    value={formData.poc}
                    onChange={(e) => setFormData({ ...formData, poc: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 77109 52379, 6289728992"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
                  />
                </div>

                {/* Hours */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-zinc-700">
                      Hours <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-amber-700 font-medium">Min 3 hrs</span>
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    required
                    value={formData.hours}
                    onChange={(e) => handleHoursChange(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
                  />
                </div>

                {/* No. of Kids (Interns) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-zinc-700">
                      No. of Kids (Interns Dispatched) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-zinc-400">Headcount</span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.noOfKids}
                    onChange={(e) => handleKidsChange(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
                  />
                </div>

                {/* Amount Earned (Base Intern Pay) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-zinc-700">
                      Amount Earned (Intern Pay ₹) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-emerald-700 font-medium">⚡ Rate card auto-fill</span>
                  </div>
                  <input
                    type="number"
                    step="50"
                    min="0"
                    required
                    value={formData.amountEarned}
                    onChange={(e) => handleAmountEarnedChange(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 font-medium text-zinc-900"
                  />
                </div>

                {/* Travel Allowance */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-zinc-700">
                      Travel Allowance (₹)
                    </label>
                    <span className="text-[10px] text-emerald-700 font-medium">₹200/kid</span>
                  </div>
                  <input
                    type="number"
                    step="50"
                    min="0"
                    value={formData.travel}
                    onChange={(e) => handleTravelChange(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 font-medium text-zinc-900"
                  />
                </div>

                {/* Total Amount Earned by Internshop */}
                <div className="md:col-span-2 p-3 bg-amber-50/70 border border-amber-200/90 rounded-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                        <label className="text-xs font-bold text-amber-950">
                          Total Amount Earned by Internshop (Coordination Fee) <span className="text-rose-500">*</span>
                        </label>
                      </div>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        Rate Card Tier: 1–2 bookings: ₹1,000 · 3–5: ₹800 · 6–9: ₹650 · 10+: ₹500
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-amber-900 font-semibold">₹</span>
                      <input
                        type="number"
                        step="50"
                        min="0"
                        required
                        value={formData.amountEarnedByInternshop}
                        onChange={(e) => handleInternshopFeeChange(parseFloat(e.target.value) || 0)}
                        className="w-28 px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg font-bold text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-right"
                      />
                    </div>
                  </div>
                </div>

                {/* Pricing Calculation Banner */}
                <div className="md:col-span-2 p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 font-bold text-[10px]">
                      Rate Card Active
                    </span>
                    <span className="text-zinc-700">
                      Base Intern Pay ({formData.hours} hrs):{' '}
                      <strong className="text-zinc-900">
                        ₹{(Number(formData.amountEarned) / Math.max(1, Number(formData.noOfKids))).toLocaleString('en-IN')}/intern
                      </strong>
                      {' × '}{formData.noOfKids} intern{Number(formData.noOfKids) > 1 ? 's' : ''} = {' '}
                      <strong className="text-zinc-900">
                        ₹{Number(formData.amountEarned).toLocaleString('en-IN')}
                      </strong>
                      {' | '}Travel:{' '}
                      <strong className="text-zinc-900">
                        ₹{(Number(formData.travel) / Math.max(1, Number(formData.noOfKids))).toLocaleString('en-IN')}/intern
                      </strong>
                      {' × '}{formData.noOfKids} intern{Number(formData.noOfKids) > 1 ? 's' : ''} = {' '}
                      <strong className="text-zinc-900">
                        ₹{Number(formData.travel).toLocaleString('en-IN')}
                      </strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRateCardModal(true)}
                    className="text-amber-900 hover:text-amber-950 font-semibold inline-flex items-center gap-1 hover:underline text-[11px]"
                  >
                    <Info className="w-3.5 h-3.5 text-amber-700" />
                    View Rate Card
                  </button>
                </div>

                {/* Job Description with AI Feature */}
                <div className="md:col-span-2" id="job-description-field-container">
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="booking-job-description" className="block text-xs font-semibold text-zinc-700">
                      Job Description <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      id="ai-simplify-jd-trigger-btn"
                      onClick={() => {
                        setAiJdTarget('create');
                        setAiJdInitialText(formData.jobDescription);
                        setShowAiJdModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-900 border border-indigo-200/80 rounded-lg shadow-2xs transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>✨ AI Simplify JD</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      id="booking-job-description"
                      required
                      placeholder="e.g. Model (UGC + Photoshoot), Video and Reel Shoot, Rent An Intern"
                      value={formData.jobDescription}
                      onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 font-medium text-zinc-900"
                    />
                  </div>
                  {/* Smart Prompt when user types/pastes lengthy brief */}
                  {formData.jobDescription.length > 50 && (
                    <div className="mt-1.5 flex items-center justify-between p-2 bg-indigo-50/70 border border-indigo-100 rounded-lg text-[11px] text-indigo-900 animate-in fade-in duration-150">
                      <span className="flex items-center gap-1 text-zinc-600">
                        <Sparkles className="w-3 h-3 text-indigo-600" />
                        Lengthy brief text detected ({formData.jobDescription.length} chars)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setAiJdTarget('create');
                          setAiJdInitialText(formData.jobDescription);
                          setShowAiJdModal(true);
                        }}
                        className="font-bold text-indigo-700 hover:text-indigo-950 underline cursor-pointer"
                      >
                        Simplify with AI →
                      </button>
                    </div>
                  )}
                </div>

                {/* Work Drive Link */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Work Drive Link
                  </label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/drive/folders/..."
                    value={formData.workDriveLink}
                    onChange={(e) => setFormData({ ...formData, workDriveLink: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Booking Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
                  >
                    <option value="Payment Received">Payment Received</option>
                    <option value="Fulfilled">Fulfilled</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Scheduled">Scheduled</option>
                  </select>
                </div>

                {/* Internal Notes */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Internal Notes / Deliverables
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2 reels captured, raw clips shared on drive"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
                  />
                </div>
              </div>

              {/* Total Calculation Preview */}
              <div className="p-4 bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-amber-50/80 rounded-xl border border-emerald-200/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-900">Financial Breakdown:</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                      {formData.hours} hrs · {formData.noOfKids} intern{Number(formData.noOfKids) > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-600 flex flex-wrap gap-x-3 gap-y-1">
                    <span>
                      Intern Base: <strong className="text-zinc-900">₹{(Number(formData.amountEarned) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                    </span>
                    <span>+</span>
                    <span>
                      Travel: <strong className="text-zinc-900">₹{(Number(formData.travel) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                    </span>
                    <span>=</span>
                    <span>
                      Intern Pay: <strong className="text-indigo-900">₹{((Number(formData.amountEarned) || 0) + (Number(formData.travel) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                    </span>
                  </div>
                  <div className="text-xs text-amber-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>
                      Internshop Coordination Fee:{' '}
                      <strong className="text-amber-950">₹{(Number(formData.amountEarnedByInternshop) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                    </span>
                  </div>
                </div>

                <div className="text-left md:text-right pt-2 md:pt-0 border-t md:border-t-0 border-emerald-200/60">
                  <span className="text-[11px] text-zinc-500 font-medium block">Total Billed to Client (Grand Total)</span>
                  <div className="text-2xl font-bold text-emerald-950 tracking-tight">
                    ₹{(((Number(formData.amountEarned) || 0) + (Number(formData.travel) || 0)) + (Number(formData.amountEarnedByInternshop) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-emerald-700 font-medium">Intern Pay + Internshop Fee</span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setActiveTab('table')}
                  className="px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-2xs disabled:opacity-60 flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Saving to Sheet & Firestore...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Save Booking Record
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Drawer: Detailed Booking View */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-fadeIn">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between pb-4 border-b border-zinc-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200">
                      <Briefcase className="w-4 h-4" />
                    </span>
                    <h3 className="text-base font-bold text-zinc-900">{selectedBooking.company}</h3>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    Booked on <span className="font-semibold text-zinc-800">{selectedBooking.dateOfBooking}</span>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="text-zinc-400 hover:text-zinc-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 space-y-4 text-xs">
                {/* Financial Summary */}
                <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2">
                  <div className="flex justify-between items-center text-zinc-600">
                    <span>Base Intern Pay:</span>
                    <span className="font-semibold text-zinc-900">₹{(selectedBooking.amountEarned || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-600">
                    <span>Travel Allowance:</span>
                    <span className="font-semibold text-zinc-900">₹{(selectedBooking.travel || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1.5 border-t border-zinc-200 text-zinc-700 font-medium">
                    <span>Total Intern Payout:</span>
                    <span className="font-semibold text-indigo-900">
                      ₹{((selectedBooking.amountEarned || 0) + (selectedBooking.travel || 0)).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-amber-50 border border-amber-200/70 text-amber-900">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      Earned by Internshop:
                    </span>
                    <span className="font-bold text-amber-950">
                      ₹{resolveInternshopFee(selectedBooking, entries).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-zinc-200 font-bold text-emerald-900 text-sm">
                    <span>Total Billed to Client:</span>
                    <span>
                      ₹{(((selectedBooking.amountEarned || 0) + (selectedBooking.travel || 0)) + resolveInternshopFee(selectedBooking, entries)).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Details Breakdown */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                    <span className="text-[11px] text-zinc-500 block mb-0.5">Booking POC</span>
                    <span className="font-semibold text-zinc-900">{selectedBooking.poc || 'N/A'}</span>
                  </div>

                  <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                    <span className="text-[11px] text-zinc-500 block mb-0.5">Contact Phone</span>
                    <span className="font-semibold text-zinc-900">{selectedBooking.phone || 'N/A'}</span>
                  </div>

                  <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                    <span className="text-[11px] text-zinc-500 block mb-0.5">Duration</span>
                    <span className="font-semibold text-zinc-900">{selectedBooking.hours} Hours</span>
                  </div>

                  <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                    <span className="text-[11px] text-zinc-500 block mb-0.5">Interns Assigned</span>
                    <span className="font-semibold text-zinc-900">{selectedBooking.noOfKids} Interns ("Kids")</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-zinc-700 block mb-1">Job Description</span>
                  <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 font-medium text-zinc-800">
                    {selectedBooking.jobDescription}
                  </div>
                </div>

                {selectedBooking.workDriveLink && (
                  <div>
                    <span className="text-[11px] font-semibold text-zinc-700 block mb-1">Work Drive Link</span>
                    <a
                      href={selectedBooking.workDriveLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors w-full"
                    >
                      <FolderOpen className="w-4 h-4 shrink-0" />
                      <span className="truncate">{selectedBooking.workDriveLink}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0 ml-auto" />
                    </a>
                  </div>
                )}

                {selectedBooking.notes && (
                  <div>
                    <span className="text-[11px] font-semibold text-zinc-700 block mb-1">Notes / Logs</span>
                    <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 text-zinc-600">
                      {selectedBooking.notes}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setEditingBooking(selectedBooking);
                  setSelectedBooking(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-100 active:bg-zinc-200 active:scale-95 transition-all cursor-pointer touch-manipulation"
              >
                <Edit2 className="w-4 h-4 pointer-events-none" />
                Edit Booking
              </button>

              <button
                type="button"
                onClick={() => handleDeleteBooking(selectedBooking.id, selectedBooking.company)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 active:bg-rose-200 active:scale-95 transition-all cursor-pointer touch-manipulation"
              >
                <Trash2 className="w-4 h-4 pointer-events-none" />
                Delete Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Booking Modal */}
      {editingBooking && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-zinc-200 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 mb-4">
              <h3 className="font-semibold text-zinc-900 text-sm">
                Edit Booking for {editingBooking.company} ({editingBooking.dateOfBooking})
              </h3>
              <button onClick={() => setEditingBooking(null)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateBooking} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div id="edit-booking-date-container">
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="edit-booking-date-picker" className="block text-zinc-600 font-medium">Date of Booking</label>
                    <span className="text-[10px] text-zinc-400">Choose from calendar</span>
                  </div>
                  <input
                    type="date"
                    id="edit-booking-date-picker"
                    value={toIsoDateString(editingBooking.dateOfBooking)}
                    onChange={(e) => {
                      const iso = e.target.value;
                      const includeYear = (editingBooking.dateOfBooking || '').split('-').length >= 3;
                      setEditingBooking({
                        ...editingBooking,
                        dateOfBooking: formatIsoToCrmDate(iso, includeYear),
                      });
                    }}
                    onClick={(e) => e.currentTarget.showPicker?.()}
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs cursor-pointer text-zinc-900 font-medium"
                  />
                  <div className="flex items-center justify-between mt-1 text-[10px] text-zinc-500">
                    <span className="font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                      {editingBooking.dateOfBooking || 'None'}
                    </span>
                    <button
                      type="button"
                      id="edit-toggle-date-year-btn"
                      onClick={() => {
                        const currentIso = toIsoDateString(editingBooking.dateOfBooking) || new Date().toISOString().split('T')[0];
                        const hasYear = (editingBooking.dateOfBooking || '').split('-').length >= 3;
                        setEditingBooking({
                          ...editingBooking,
                          dateOfBooking: formatIsoToCrmDate(currentIso, !hasYear),
                        });
                      }}
                      className="text-zinc-500 hover:text-zinc-800 underline font-medium"
                    >
                      {(editingBooking.dateOfBooking || '').split('-').length >= 3 ? 'Use DD-MMM' : '+ Year'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-zinc-600 font-medium mb-1">Company</label>
                  <input
                    type="text"
                    value={editingBooking.company}
                    onChange={(e) => setEditingBooking({ ...editingBooking, company: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 font-medium mb-1">POC Name</label>
                  <input
                    type="text"
                    value={editingBooking.poc}
                    onChange={(e) => setEditingBooking({ ...editingBooking, poc: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 font-medium mb-1">Phone</label>
                  <input
                    type="text"
                    value={editingBooking.phone}
                    onChange={(e) => setEditingBooking({ ...editingBooking, phone: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-zinc-600 font-medium">Hours</label>
                    <span className="text-[10px] text-amber-700">Min 3 hrs</span>
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={editingBooking.hours}
                    onChange={(e) => handleEditHoursChange(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-zinc-600 font-medium">No. of Kids</label>
                    <span className="text-[10px] text-zinc-400">Headcount</span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    value={editingBooking.noOfKids}
                    onChange={(e) => handleEditKidsChange(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-zinc-600 font-medium">Amount Earned (₹)</label>
                    <span className="text-[10px] text-emerald-700 font-medium">Auto-calculated</span>
                  </div>
                  <input
                    type="number"
                    step="50"
                    min="0"
                    value={editingBooking.amountEarned}
                    onChange={(e) => handleEditAmountEarnedChange(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-900"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-zinc-600 font-medium">Travel (₹)</label>
                    <span className="text-[10px] text-emerald-700 font-medium">₹200/kid</span>
                  </div>
                  <input
                    type="number"
                    step="50"
                    min="0"
                    value={editingBooking.travel}
                    onChange={(e) => handleEditTravelChange(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-900"
                  />
                </div>
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-amber-900 font-semibold">Total Amount Earned by Internshop (₹)</label>
                    <span className="text-[10px] text-amber-700 font-medium">Rate Card Agency Fee</span>
                  </div>
                  <input
                    type="number"
                    step="50"
                    min="0"
                    value={
                      editingBooking.amountEarnedByInternshop !== undefined
                        ? editingBooking.amountEarnedByInternshop
                        : resolveInternshopFee(editingBooking, entries)
                    }
                    onChange={(e) => handleEditInternshopFeeChange(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-amber-50/60 border border-amber-200 rounded-lg text-xs font-semibold text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>

              {/* Total Calculation Preview in Edit Modal */}
              <div className="p-3 bg-gradient-to-r from-emerald-50 via-teal-50 to-amber-50 rounded-xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-zinc-900">Total Client Invoiced:</span>
                  <p className="text-[11px] text-zinc-600">
                    Intern Pay: ₹{((Number(editingBooking.amountEarned) || 0) + (Number(editingBooking.travel) || 0)).toLocaleString('en-IN')}
                    {' ('}Base: ₹{Number(editingBooking.amountEarned || 0).toLocaleString('en-IN')} + Travel: ₹{Number(editingBooking.travel || 0).toLocaleString('en-IN')}{')'}
                    {' + '}
                    Internshop Fee: ₹{(editingBooking.amountEarnedByInternshop !== undefined ? Number(editingBooking.amountEarnedByInternshop) : resolveInternshopFee(editingBooking, entries)).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-emerald-950">
                    ₹{(((Number(editingBooking.amountEarned) || 0) + (Number(editingBooking.travel) || 0)) + (editingBooking.amountEarnedByInternshop !== undefined ? Number(editingBooking.amountEarnedByInternshop) : resolveInternshopFee(editingBooking, entries))).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-emerald-700 font-medium">Grand Total</span>
                </div>
              </div>

              <div id="edit-job-description-field-container">
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="edit-booking-job-description" className="block text-zinc-600 font-medium">Job Description</label>
                  <button
                    type="button"
                    id="edit-ai-simplify-jd-trigger-btn"
                    onClick={() => {
                      setAiJdTarget('edit');
                      setAiJdInitialText(editingBooking.jobDescription || '');
                      setShowAiJdModal(true);
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[10.5px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-indigo-600" />
                    <span>AI Simplify</span>
                  </button>
                </div>
                <input
                  type="text"
                  id="edit-booking-job-description"
                  value={editingBooking.jobDescription}
                  onChange={(e) => setEditingBooking({ ...editingBooking, jobDescription: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-zinc-600 font-medium mb-1">Work Drive Link</label>
                <input
                  type="url"
                  value={editingBooking.workDriveLink}
                  onChange={(e) => setEditingBooking({ ...editingBooking, workDriveLink: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-zinc-600 font-medium mb-1">Status</label>
                <select
                  value={editingBooking.status}
                  onChange={(e) => setEditingBooking({ ...editingBooking, status: e.target.value as any })}
                  className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg"
                >
                  <option value="Payment Received">Payment Received</option>
                  <option value="Fulfilled">Fulfilled</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Scheduled">Scheduled</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setEditingBooking(null)}
                  className="px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-60"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Paste from Google Sheet */}
      {showSheetImportModal && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-zinc-200 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 mb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <h3 className="font-semibold text-zinc-900 text-sm">Paste Rows from Google Sheets</h3>
              </div>
              <button onClick={() => setShowSheetImportModal(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-500 mb-3">
              Open your <strong>Intern CRM</strong> sheet, select rows from the <strong>Rent An intern</strong> tab (columns: Date of Booking, Company, POC, Phone, Hours, Job Description, Work Drive Link, No. of Kids, Amount Earned, Travel), copy (<kbd className="bg-zinc-100 px-1 py-0.5 rounded text-zinc-700">Ctrl+C</kbd>), and paste below:
            </p>

            <textarea
              rows={8}
              value={sheetPasteText}
              onChange={(e) => setSheetPasteText(e.target.value)}
              placeholder="14-Feb	Ace Blend	Prajay	77109 52379	5	🚨 Rent An Intern	https://...	3	₹1,000.00	₹200.00&#10;5-Mar	CSC	Ronak Mehta	99034 50596	3	📢 Rent An Intern		4	₹1,000.00	"
              className="w-full p-3 font-mono text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />

            <div className="flex items-center justify-between mt-4">
              <span className="text-[11px] text-zinc-400">
                Tabs or commas will be detected automatically
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowSheetImportModal(false)}
                  className="px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImportPastedData}
                  disabled={isSyncing || !sheetPasteText.trim()}
                  className="px-4 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      Import & Sync to Firestore
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Official Physical Presence Rate Card */}
      {showRateCardModal && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-zinc-200 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-100 flex items-start justify-between bg-gradient-to-r from-amber-50/50 to-rose-50/30">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-0.5 bg-red-600 rounded-full inline-block"></span>
                  <span className="text-[11px] font-bold tracking-wider text-amber-900 uppercase">
                    PRICING · PHYSICAL PRESENCE GIGS
                  </span>
                </div>
                <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
                  Stall · BTS Content
                </h2>
                <h3 className="text-base text-red-700 font-semibold italic">
                  Vox-pop · Anchoring
                </h3>
              </div>
              <button
                onClick={() => setShowRateCardModal(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 text-zinc-800 text-xs">
              {/* Section 1: Intern Pay */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-red-600"></span>
                  <span className="text-xs font-bold text-zinc-800 uppercase tracking-wide">
                    ① INTERN PAY — payment will be to internshop for them
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Card 1: Minimum 3 hours */}
                  <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                        MINIMUM
                      </span>
                      <span className="text-xs text-zinc-500">3 hours</span>
                    </div>
                    <div className="mt-2 text-xl font-bold text-zinc-900">
                      ₹1,000
                    </div>
                  </div>

                  {/* Card 2: Standard 5 hours */}
                  <div className="p-3.5 bg-red-800 text-white rounded-xl shadow-xs flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-red-200 uppercase tracking-wider block">
                        STANDARD
                      </span>
                      <span className="text-xs text-red-100">5 hours</span>
                    </div>
                    <div className="mt-2 text-xl font-bold text-white">
                      ₹1,750
                    </div>
                  </div>

                  {/* Card 3: Full Day 8 hours */}
                  <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                        FULL DAY
                      </span>
                      <span className="text-xs text-zinc-500">8 hours</span>
                    </div>
                    <div className="mt-2 text-xl font-bold text-zinc-900">
                      ₹2,800
                    </div>
                  </div>

                  {/* Card 4: Beyond extra hours */}
                  <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                        BEYOND
                      </span>
                      <span className="text-xs text-zinc-500">extra hours</span>
                    </div>
                    <div className="mt-2 text-xl font-bold text-zinc-900">
                      ₹400<span className="text-xs font-normal text-zinc-500">/hr</span>
                    </div>
                  </div>
                </div>

                {/* Travel Card */}
                <div className="mt-3 p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center gap-3">
                  <span className="text-xl">🚕</span>
                  <div>
                    <span className="font-semibold text-zinc-900">Travel reimbursement:</span>{' '}
                    <span className="text-amber-900 font-bold">₹200 flat within city</span>
                    <span className="text-zinc-600"> · Actuals outside city · Paid directly to intern</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Coordination Fee */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-red-600"></span>
                  <span className="text-xs font-bold text-zinc-800 uppercase tracking-wide">
                    ② INTERN SHOP COORDINATION FEE — YOU PAY US
                  </span>
                </div>

                <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      FLAT FEE · PER BOOKING
                    </span>
                    <span className="text-2xl font-bold text-red-700">₹1,000</span>
                  </div>
                  <ul className="text-xs text-zinc-600 space-y-1">
                    <li className="flex items-center gap-1.5 text-zinc-700">
                      <span className="text-red-600 font-bold">✓</span> Covers intern-matching & vetting
                    </li>
                    <li className="flex items-center gap-1.5 text-zinc-700">
                      <span className="text-red-600 font-bold">✓</span> Pre-day brand briefing & orientation
                    </li>
                    <li className="flex items-center gap-1.5 text-zinc-700">
                      <span className="text-red-600 font-bold">✓</span> Post-gig debrief & work review
                    </li>
                  </ul>
                </div>
              </div>

              {/* Section 3: Volume Discounts */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                  <span className="text-xs font-bold text-zinc-800 uppercase tracking-wide">
                    VOLUME DISCOUNT · RESETS JANUARY 1 EACH YEAR
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 bg-white border border-zinc-200 rounded-lg flex justify-between items-center">
                    <span className="text-zinc-600 font-medium">1 – 2 bookings</span>
                    <span className="font-bold text-zinc-900">₹1,000</span>
                  </div>
                  <div className="p-2.5 bg-white border border-zinc-200 rounded-lg flex justify-between items-center">
                    <div>
                      <span className="text-zinc-600 font-medium block">3 – 5 bookings</span>
                      <span className="text-[10px] font-semibold text-rose-600">save ₹200</span>
                    </div>
                    <span className="font-bold text-zinc-900">₹800</span>
                  </div>
                  <div className="p-2.5 bg-white border border-zinc-200 rounded-lg flex justify-between items-center">
                    <div>
                      <span className="text-zinc-600 font-medium block">6 – 9 bookings</span>
                      <span className="text-[10px] font-semibold text-rose-600">save ₹350</span>
                    </div>
                    <span className="font-bold text-zinc-900">₹650</span>
                  </div>
                  <div className="p-2.5 bg-amber-100/70 border border-amber-300 rounded-lg flex justify-between items-center">
                    <div>
                      <span className="text-amber-900 font-bold block">10+ bookings</span>
                      <span className="text-[10px] font-semibold text-red-700">save half!</span>
                    </div>
                    <span className="font-bold text-amber-900">₹500</span>
                  </div>
                </div>
              </div>

              {/* Quick reference guide */}
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-600 space-y-1">
                <span className="font-bold text-zinc-900 block">Pricing Formula in Rent An Intern:</span>
                <p>• <strong>Amount Earned</strong> = Intern base pay (₹1,000 for 3h, ₹1,750 for 5h, ₹2,800 for 8h, or ₹400/hr extra) × number of interns.</p>
                <p>• <strong>Travel Allowance</strong> = ₹200 flat × number of interns.</p>
                <p>• <strong>Total Amount</strong> = Amount Earned + Travel Allowance.</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between">
              <span className="text-[11px] text-zinc-500">
                Auto-calculation is active in both New Booking and Edit modal.
              </span>
              <button
                type="button"
                onClick={() => setShowRateCardModal(false)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer touch-manipulation"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Delete Booking (Tappable In-App Confirmation) */}
      {deletingBooking && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-zinc-200 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200/60">
                <Trash2 className="w-5 h-5 pointer-events-none" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Delete Booking</h3>
                <p className="text-xs text-zinc-500">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Are you sure you want to remove the booking for{' '}
              <strong className="text-zinc-900 font-semibold">{deletingBooking.company}</strong>?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setDeletingBooking(null)}
                className="px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200 rounded-lg transition-colors cursor-pointer touch-manipulation"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteBooking}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 active:scale-95 rounded-lg transition-all cursor-pointer touch-manipulation shadow-xs"
              >
                Delete Booking
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal: AI Job Description Simplifier */}
      <AiJdSimplifierModal
        isOpen={showAiJdModal}
        onClose={() => setShowAiJdModal(false)}
        initialText={aiJdInitialText}
        onApply={handleApplySimplifiedJd}
      />
    </div>
  );
};
