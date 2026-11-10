import React, { useState, useEffect } from 'react';
import { X, UserPlus, Building, Calendar, CheckSquare, Receipt, Award, Sparkles } from 'lucide-react';
import { addStudent, addLead, addCompany, addInterview, addTask, addInvoice } from '../../services/firestoreService';
import { Student, Lead, Company, Interview, TaskItem, Invoice, LeadStatus, LEAD_STATUS_OPTIONS, StudentStage, PlacementReadiness } from '../../types/crm';

export type QuickCreateType = 'student' | 'lead' | 'company' | 'interview' | 'task' | 'invoice';

interface QuickCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  companies: Company[];
  initialType?: QuickCreateType;
  initialStudentStage?: StudentStage;
}

export const QuickCreateModal: React.FC<QuickCreateModalProps> = ({
  isOpen,
  onClose,
  students,
  companies,
  initialType = 'student',
  initialStudentStage,
}) => {
  const [activeTab, setActiveTab] = useState<QuickCreateType>(initialType);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [studentForm, setStudentForm] = useState({
    name: '',
    email: '',
    phone: '',
    college: '',
    course: '',
    graduationYear: '2026',
    skills: 'React, TypeScript, Tailwind',
    currentStage: (initialStudentStage || 'In Training') as StudentStage,
  });

  useEffect(() => {
    if (isOpen) {
      if (initialType) {
        setActiveTab(initialType);
      }
      if (initialStudentStage) {
        setStudentForm((prev) => ({
          ...prev,
          currentStage: initialStudentStage,
        }));
      }
    }
  }, [isOpen, initialType, initialStudentStage]);

  const [leadForm, setLeadForm] = useState({
    name: '',
    email: '',
    phone: '',
    college: '',
    course: '',
    graduationYear: '2026',
    source: 'Website',
    status: 'In Review' as LeadStatus,
    interestArea: 'Full Stack Development',
    notes: '',
  });

  const [companyForm, setCompanyForm] = useState({
    name: '',
    industry: 'Technology / SaaS',
    location: 'Bangalore',
    website: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    contactRole: 'HR Manager',
  });

  const [interviewForm, setInterviewForm] = useState({
    studentId: '',
    companyId: '',
    roleTitle: 'Software Engineering Intern',
    round: 'Technical Round 1',
    scheduledAt: '',
    mode: 'Google Meet' as const,
    meetUrl: 'https://meet.google.com/new',
  });

  const [taskForm, setTaskForm] = useState({
    title: '',
    priority: 'medium' as const,
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    assigneeName: 'Operations Lead',
    description: '',
  });

  const [invoiceForm, setInvoiceForm] = useState({
    companyId: '',
    service: 'Internship Placement Sourcing Fee',
    taxableValue: 30000,
    dueDate: new Date(Date.now() + 86400000 * 15).toISOString().split('T')[0],
  });

  if (!isOpen) return null;

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const year = new Date().getFullYear();
      const randomCode = Math.floor(1000 + Math.random() * 9000);

      const readinessMap: Record<string, PlacementReadiness> = {
        'In Training': 'In Training',
        'Trained / To Be Placed': 'Interview Ready',
        Interviewing: 'Interview Ready',
        Placed: 'Placed',
        "Didn't Work Out": 'Not Ready',
        'Assignment Pending': 'In Training',
        'Agreement Pending': 'In Training',
        'Portfolio Review': 'In Training',
      };

      await addStudent({
        studentId: `IH-${year}-${randomCode}`,
        name: studentForm.name,
        email: studentForm.email,
        phone: studentForm.phone,
        college: studentForm.college,
        course: studentForm.course,
        graduationYear: studentForm.graduationYear,
        skills: studentForm.skills.split(',').map((s) => s.trim()).filter(Boolean),
        currentStage: studentForm.currentStage,
        placementReadiness: readinessMap[studentForm.currentStage] || 'In Training',
        joinedAt: new Date().toISOString().split('T')[0],
      });
      setSuccessMsg('Student added successfully to live Firestore database!');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1200);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const randomCode = Math.floor(1000 + Math.random() * 9000);
      await addLead({
        leadId: `LD-${randomCode}`,
        name: leadForm.name,
        email: leadForm.email,
        phone: leadForm.phone,
        college: leadForm.college,
        course: leadForm.course,
        graduationYear: leadForm.graduationYear,
        source: leadForm.source,
        status: leadForm.status,
        interestArea: leadForm.interestArea,
        notes: leadForm.notes,
      });
      setSuccessMsg('Lead captured and saved to Firestore!');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1200);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const randomCode = Math.floor(100 + Math.random() * 900);
      await addCompany({
        companyId: `CMP-${randomCode}`,
        name: companyForm.name,
        industry: companyForm.industry,
        location: companyForm.location,
        website: companyForm.website || 'https://' + companyForm.name.toLowerCase().replace(/\s+/g, '') + '.com',
        companySize: '100 - 500',
        status: 'Active',
        contacts: [
          {
            id: 'c_' + Date.now(),
            name: companyForm.contactName || 'Hiring Lead',
            role: companyForm.contactRole,
            email: companyForm.contactEmail || `hr@${companyForm.name.toLowerCase().replace(/\s+/g, '')}.com`,
            phone: companyForm.contactPhone || '+91 99000 11000',
            isPrimary: true,
          },
        ],
      });
      setSuccessMsg('Hiring partner onboarded to Firestore!');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1200);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInterviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const selectedStudent = students.find((s) => s.id === interviewForm.studentId) || students[0];
      const selectedCompany = companies.find((c) => c.id === interviewForm.companyId) || companies[0];

      await addInterview({
        studentId: selectedStudent ? selectedStudent.id : 's1',
        studentName: selectedStudent ? selectedStudent.name : 'Candidate',
        studentCollege: selectedStudent ? selectedStudent.college : '',
        companyId: selectedCompany ? selectedCompany.id : 'c1',
        companyName: selectedCompany ? selectedCompany.name : 'Company',
        roleTitle: interviewForm.roleTitle,
        round: interviewForm.round,
        scheduledAt: interviewForm.scheduledAt || new Date(Date.now() + 86400000).toISOString(),
        mode: interviewForm.mode,
        meetUrl: interviewForm.meetUrl,
        status: 'Confirmed',
      });
      setSuccessMsg('Interview scheduled & Google Calendar event created!');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1200);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addTask({
        title: taskForm.title,
        priority: taskForm.priority,
        status: 'todo',
        dueDate: taskForm.dueDate,
        assigneeName: taskForm.assigneeName,
        description: taskForm.description,
      });
      setSuccessMsg('Task assigned and saved to Firestore!');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1200);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const selectedCompany = companies.find((c) => c.id === invoiceForm.companyId) || companies[0];
      const taxable = Number(invoiceForm.taxableValue) || 30000;
      const cgst = taxable * 0.09;
      const sgst = taxable * 0.09;
      const total = taxable + cgst + sgst;
      const invNum = `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

      await addInvoice({
        invoiceNumber: invNum,
        companyId: selectedCompany ? selectedCompany.id : 'c1',
        companyName: selectedCompany ? selectedCompany.name : 'Hiring Partner',
        service: invoiceForm.service,
        taxableValue: taxable,
        cgst,
        sgst,
        igst: 0,
        total,
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: invoiceForm.dueDate,
        status: 'Generated',
      });
      setSuccessMsg(`Invoice ${invNum} generated with GST breakdown!`);
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1200);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <h3 className="font-semibold text-zinc-900 text-base">Quick Create</h3>
            <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-md font-mono">Live Firestore</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Pills */}
        <div className="flex px-6 pt-3 border-b border-zinc-100 overflow-x-auto gap-1 text-xs">
          {[
            { id: 'student', label: 'Student', icon: UserPlus },
            { id: 'lead', label: 'Lead', icon: Sparkles },
            { id: 'company', label: 'Company', icon: Building },
            { id: 'interview', label: 'Interview', icon: Calendar },
            { id: 'task', label: 'Task', icon: CheckSquare },
            { id: 'invoice', label: 'Invoice', icon: Receipt },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as QuickCreateType)}
                className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium transition cursor-pointer ${
                  active
                    ? 'border-zinc-900 text-zinc-900'
                    : 'border-transparent text-zinc-500 hover:text-zinc-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {successMsg ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-center text-sm font-medium flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              {successMsg}
            </div>
          ) : (
            <>
              {activeTab === 'student' && (
                <form onSubmit={handleStudentSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Full Name *</label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Varun Kapoor"
                        value={studentForm.name}
                        onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                        className="w-full text-sm px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Email *</label>
                      <input
                        required
                        type="email"
                        placeholder="varun@college.edu"
                        value={studentForm.email}
                        onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                        className="w-full text-sm px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Phone *</label>
                      <input
                        required
                        type="text"
                        placeholder="+91 98765 00000"
                        value={studentForm.phone}
                        onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                        className="w-full text-sm px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">College *</label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. IIT Bombay"
                        value={studentForm.college}
                        onChange={(e) => setStudentForm({ ...studentForm, college: e.target.value })}
                        className="w-full text-sm px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Course & Degree</label>
                      <input
                        type="text"
                        placeholder="B.Tech Computer Science"
                        value={studentForm.course}
                        onChange={(e) => setStudentForm({ ...studentForm, course: e.target.value })}
                        className="w-full text-sm px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Initial Stage</label>
                      <select
                        value={studentForm.currentStage}
                        onChange={(e) => setStudentForm({ ...studentForm, currentStage: e.target.value as any })}
                        className="w-full text-sm px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
                      >
                        <option value="In Training">In Training</option>
                        <option value="Trained / To Be Placed">Trained / To Be Placed</option>
                        <option value="Interviewing">Interviewing</option>
                        <option value="Placed">Placed</option>
                        <option value="Didn't Work Out">Didn't Work Out</option>
                        <option value="Assignment Pending">Assignment Pending</option>
                        <option value="Agreement Pending">Agreement Pending</option>
                        <option value="Portfolio Review">Portfolio Review</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Key Skills (comma separated)</label>
                    <input
                      type="text"
                      placeholder="React, TypeScript, SQL, Node.js"
                      value={studentForm.skills}
                      onChange={(e) => setStudentForm({ ...studentForm, skills: e.target.value })}
                      className="w-full text-sm px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    />
                  </div>
                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 border border-zinc-200 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : 'Create Student'}
                    </button>
                  </div>
                </form>
              )}

              {activeTab === 'lead' && (
                <form onSubmit={handleLeadSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Prospect Name *</label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Diya Sharma"
                        value={leadForm.name}
                        onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                        className="w-full text-sm px-3 py-2 border border-zinc-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Email *</label>
                      <input
                        required
                        type="email"
                        placeholder="diya@gmail.com"
                        value={leadForm.email}
                        onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                        className="w-full text-sm px-3 py-2 border border-zinc-200 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Phone *</label>
                      <input
                        required
                        type="text"
                        placeholder="+91 98000 11111"
                        value={leadForm.phone}
                        onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                        className="w-full text-sm px-3 py-2 border border-zinc-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">College</label>
                      <input
                        type="text"
                        placeholder="Delhi University"
                        value={leadForm.college}
                        onChange={(e) => setLeadForm({ ...leadForm, college: e.target.value })}
                        className="w-full text-sm px-3 py-2 border border-zinc-200 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Source</label>
                      <select
                        value={leadForm.source}
                        onChange={(e) => setLeadForm({ ...leadForm, source: e.target.value })}
                        className="w-full text-sm px-3 py-2 border border-zinc-200 rounded-lg bg-white"
                      >
                        <option value="Website">Website</option>
                        <option value="Campus Seminar">Campus Seminar</option>
                        <option value="LinkedIn Campaign">LinkedIn Campaign</option>
                        <option value="Student Referral">Student Referral</option>
                        <option value="Instagram / WhatsApp">Instagram / WhatsApp</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Status</label>
                      <select
                        value={leadForm.status}
                        onChange={(e) => setLeadForm({ ...leadForm, status: e.target.value as LeadStatus })}
                        className="w-full text-sm px-3 py-2 border border-zinc-200 rounded-lg bg-white"
                      >
                        {LEAD_STATUS_OPTIONS.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Domain of Interest</label>
                      <input
                        type="text"
                        placeholder="Full Stack, Data, Cloud"
                        value={leadForm.interestArea}
                        onChange={(e) => setLeadForm({ ...leadForm, interestArea: e.target.value })}
                        className="w-full text-sm px-3 py-2 border border-zinc-200 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 border border-zinc-200 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800"
                    >
                      {loading ? 'Saving...' : 'Capture Lead'}
                    </button>
                  </div>
                </form>
              )}

              {activeTab === 'company' && (
                <form onSubmit={handleCompanySubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Company Name *</label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Swiggy"
                        value={companyForm.name}
                        onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                        className="w-full text-sm px-3 py-2 border border-zinc-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Industry</label>
                      <input
                        type="text"
                        placeholder="Consumer Tech / Logistics"
                        value={companyForm.industry}
                        onChange={(e) => setCompanyForm({ ...companyForm, industry: e.target.value })}
                        className="w-full text-sm px-3 py-2 border border-zinc-200 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Headquarters Location</label>
                      <input
                        type="text"
                        placeholder="Bangalore, India"
                        value={companyForm.location}
                        onChange={(e) => setCompanyForm({ ...companyForm, location: e.target.value })}
                        className="w-full text-sm px-3 py-2 border border-zinc-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Website</label>
                      <input
                        type="url"
                        placeholder="https://swiggy.com"
                        value={companyForm.website}
                        onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                        className="w-full text-sm px-3 py-2 border border-zinc-200 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="border-t border-zinc-100 pt-3">
                    <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider block mb-2">Primary HR Contact</span>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Contact Name"
                        value={companyForm.contactName}
                        onChange={(e) => setCompanyForm({ ...companyForm, contactName: e.target.value })}
                        className="text-xs px-2.5 py-1.5 border border-zinc-200 rounded-lg"
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        value={companyForm.contactEmail}
                        onChange={(e) => setCompanyForm({ ...companyForm, contactEmail: e.target.value })}
                        className="text-xs px-2.5 py-1.5 border border-zinc-200 rounded-lg"
                      />
                      <input
                        type="text"
                        placeholder="Phone"
                        value={companyForm.contactPhone}
                        onChange={(e) => setCompanyForm({ ...companyForm, contactPhone: e.target.value })}
                        className="text-xs px-2.5 py-1.5 border border-zinc-200 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 border border-zinc-200 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800"
                    >
                      {loading ? 'Saving...' : 'Add Company'}
                    </button>
                  </div>
                </form>
              )}

              {activeTab === 'interview' && (
                <form onSubmit={handleInterviewSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Select Candidate *</label>
                      <select
                        required
                        value={interviewForm.studentId}
                        onChange={(e) => setInterviewForm({ ...interviewForm, studentId: e.target.value })}
                        className="w-full text-sm px-3 py-2 border border-zinc-200 rounded-lg bg-white"
                      >
                        <option value="">-- Choose Candidate --</option>
                        {students.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.college})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Select Company *</label>
                      <select
                        required
                        value={interviewForm.companyId}
                        onChange={(e) => setInterviewForm({ ...interviewForm, companyId: e.target.value })}
                        className="w-full text-sm px-3 py-2 border border-zinc-200 rounded-lg bg-white"
                      >
                        <option value="">-- Choose Company --</option>
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Role Title</label>
                      <input
                        type="text"
                        value={interviewForm.roleTitle}
                        onChange={(e) => setInterviewForm({ ...interviewForm, roleTitle: e.target.value })}
                        className="w-full text-sm px-3 py-2 border border-zinc-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Interview Round</label>
                      <input
                        type="text"
                        value={interviewForm.round}
                        onChange={(e) => setInterviewForm({ ...interviewForm, round: e.target.value })}
                        className="w-full text-sm px-3 py-2 border border-zinc-200 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Date & Time</label>
                      <input
                        type="datetime-local"
                        value={interviewForm.scheduledAt}
                        onChange={(e) => setInterviewForm({ ...interviewForm, scheduledAt: e.target.value })}
                        className="w-full text-sm px-3 py-2 border border-zinc-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Meeting Link</label>
                      <input
                        type="url"
                        value={interviewForm.meetUrl}
                        onChange={(e) => setInterviewForm({ ...interviewForm, meetUrl: e.target.value })}
                        className="w-full text-sm px-3 py-2 border border-zinc-200 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 border border-zinc-200 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800"
                    >
                      {loading ? 'Scheduling...' : 'Schedule Interview'}
                    </button>
                  </div>
                </form>
              )}

              {activeTab === 'task' && (
                <form onSubmit={handleTaskSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Task Title *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Follow up on signed agreement"
                      value={taskForm.title}
                      onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                      className="w-full text-sm px-3 py-2 border border-zinc-200 rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Priority</label>
                      <select
                        value={taskForm.priority}
                        onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                        className="w-full text-sm px-3 py-2 border border-zinc-200 rounded-lg bg-white"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Due Date</label>
                      <input
                        type="date"
                        value={taskForm.dueDate}
                        onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                        className="w-full text-sm px-3 py-2 border border-zinc-200 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 border border-zinc-200 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800"
                    >
                      {loading ? 'Creating...' : 'Create Task'}
                    </button>
                  </div>
                </form>
              )}

              {activeTab === 'invoice' && (
                <form onSubmit={handleInvoiceSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Billed Company *</label>
                    <select
                      required
                      value={invoiceForm.companyId}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, companyId: e.target.value })}
                      className="w-full text-sm px-3 py-2 border border-zinc-200 rounded-lg bg-white"
                    >
                      <option value="">-- Choose Company --</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Service Description</label>
                    <input
                      type="text"
                      value={invoiceForm.service}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, service: e.target.value })}
                      className="w-full text-sm px-3 py-2 border border-zinc-200 rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Taxable Amount (₹)</label>
                      <input
                        type="number"
                        value={invoiceForm.taxableValue}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, taxableValue: Number(e.target.value) })}
                        className="w-full text-sm px-3 py-2 border border-zinc-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Due Date</label>
                      <input
                        type="date"
                        value={invoiceForm.dueDate}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                        className="w-full text-sm px-3 py-2 border border-zinc-200 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="p-3 bg-zinc-50 border border-zinc-200/70 rounded-lg text-xs space-y-1">
                    <div className="flex justify-between text-zinc-500">
                      <span>CGST (9%)</span>
                      <span>₹{(invoiceForm.taxableValue * 0.09).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-zinc-500">
                      <span>SGST (9%)</span>
                      <span>₹{(invoiceForm.taxableValue * 0.09).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-zinc-900 border-t border-zinc-200 pt-1 mt-1">
                      <span>Total Invoice</span>
                      <span>₹{(invoiceForm.taxableValue * 1.18).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 border border-zinc-200 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800"
                    >
                      {loading ? 'Generating...' : 'Generate Invoice'}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
