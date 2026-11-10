import React, { useState, useMemo } from 'react';
import {
  Building,
  Plus,
  Search,
  MapPin,
  Globe,
  Users,
  Briefcase,
  Mail,
  Phone,
  ExternalLink,
  Calendar,
  GraduationCap,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  MessageSquare,
  Sparkles,
  RefreshCw,
  X,
  FileText,
  ChevronRight,
  Eye,
  Filter,
  Pencil,
  Trash2,
  Save,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Company, CompanyContact, JobRole, Placement, Student } from '../../types/crm';
import { PARTNER_COMPANY_ROLES } from '../../data/partnerCompanyRoles';
import {
  addCompany,
  updateCompany,
  addJobRole,
  updateJobRole,
  deleteJobRole,
  addPlacement,
  updatePlacement,
} from '../../services/firestoreService';
import { Badge } from '../../components/common/Badge';

export interface CompanyInternHistoryItem {
  id: string;
  placementId?: string;
  studentId?: string;
  studentName: string;
  studentPhoto?: string;
  roleTitle: string;
  stipend: string;
  status: 'Currently Working' | 'Past Intern' | 'Brand Project Intern';
  joiningDate: string;
  duration: string;
  location: string;
  skills: string[];
  portfolioUrl?: string;
  resumeUrl?: string;
  phone?: string;
  email?: string;
  college?: string;
  batchName?: string;
  notes?: string;
  student?: Student;
}

interface CompaniesViewProps {
  companies: Company[];
  roles: JobRole[];
  placements?: Placement[];
  students?: Student[];
  onSelectStudent?: (student: Student) => void;
  onOpenQuickCreate: () => void;
  onNavigateToMatching?: (companyId?: string, roleId?: string) => void;
}

export const CompaniesView: React.FC<CompaniesViewProps> = ({
  companies,
  roles,
  placements = [],
  students = [],
  onSelectStudent,
  onOpenQuickCreate,
  onNavigateToMatching,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Prospect' | 'Dormant'>('All');
  const [filterWithInternsOnly, setFilterWithInternsOnly] = useState(false);

  // Drawer state for "View All Data"
  const [activeCompanyForDrawer, setActiveCompanyForDrawer] = useState<Company | null>(null);
  const [drawerTab, setDrawerTab] = useState<'interns' | 'roles' | 'overview'>('interns');

  // Modals for adding role & recording intern
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [showAddInternModal, setShowAddInternModal] = useState(false);
  const [targetCompanyForModal, setTargetCompanyForModal] = useState<Company | null>(null);

  // ==========================================
  // EDIT COMPANY STATE & MODAL
  // ==========================================
  const [showEditCompanyModal, setShowEditCompanyModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [companyFeedback, setCompanyFeedback] = useState<string | null>(null);

  const [editCompanyForm, setEditCompanyForm] = useState({
    name: '',
    companyId: '',
    industry: '',
    website: '',
    location: '',
    companySize: '11-50',
    status: 'Active' as 'Active' | 'Prospect' | 'Dormant',
    accountOwnerName: 'Placement Team',
    notes: '',
    contacts: [] as CompanyContact[],
  });

  // ==========================================
  // ADD COMPANY MODAL
  // ==========================================
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [isSubmittingCompany, setIsSubmittingCompany] = useState(false);
  const [newCompanyForm, setNewCompanyForm] = useState({
    name: '',
    companyId: `CMP-${Math.floor(100 + Math.random() * 900)}`,
    industry: 'Marketing & Digital Media',
    website: '',
    location: 'Kolkata, West Bengal',
    companySize: '11-50',
    status: 'Active' as 'Active' | 'Prospect' | 'Dormant',
    accountOwnerName: 'Placement Team',
    contactName: '',
    contactRole: 'Hiring Manager / Founder',
    contactPhone: '',
    contactEmail: '',
    notes: '',
  });

  // ==========================================
  // EDIT ROLE STATE & MODAL
  // ==========================================
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<JobRole | null>(null);
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [editRoleForm, setEditRoleForm] = useState({
    title: '',
    department: '',
    workMode: 'Hybrid' as 'Remote' | 'Hybrid' | 'Onsite',
    location: '',
    stipend: '',
    openings: 1,
    skills: '',
    status: 'Open' as 'Draft' | 'Open' | 'Shortlisting' | 'Interviewing' | 'Filled' | 'Closed',
    requirements: '',
  });

  // ==========================================
  // EDIT INTERN PLACEMENT MODAL
  // ==========================================
  const [showEditInternModal, setShowEditInternModal] = useState(false);
  const [editingIntern, setEditingIntern] = useState<CompanyInternHistoryItem | null>(null);
  const [isSavingIntern, setIsSavingIntern] = useState(false);
  const [editInternForm, setEditInternForm] = useState({
    studentName: '',
    roleTitle: '',
    status: 'Currently Working' as 'Currently Working' | 'Past Intern' | 'Brand Project Intern',
    stipend: '',
    joiningDate: '',
    duration: '',
    location: '',
    notes: '',
  });

  // Intern filters inside drawer
  const [internFilter, setInternFilter] = useState<'all' | 'working' | 'past'>('all');
  const [internSearch, setInternSearch] = useState('');
  const [statusOverrides, setStatusOverrides] = useState<Record<string, 'Currently Working' | 'Past Intern'>>({});
  const [isSubmittingIntern, setIsSubmittingIntern] = useState(false);

  // New role form
  const [roleForm, setRoleForm] = useState({
    title: '',
    department: 'Marketing & Media',
    workMode: 'Hybrid' as const,
    location: 'Kolkata',
    skills: 'Content Writing, Video editing, Canva',
    stipend: '₹12,000 / month',
    openings: 2,
  });

  // Record intern form
  const [internForm, setInternForm] = useState({
    studentId: '',
    studentName: '',
    roleTitle: 'Content Writing & Video Editing Intern',
    status: 'Currently Working' as 'Currently Working' | 'Past Intern',
    joiningDate: 'Nov 2025',
    duration: '6 Months',
    stipend: '₹12,000 / month',
    location: 'Kolkata (Hazra Office & On-site)',
    notes: '',
  });

  // Merge Firestore roles with standard partner company roles without duplicates
  const allRoles = useMemo(() => {
    const map = new Map<string, JobRole>();
    PARTNER_COMPANY_ROLES.forEach((r) => map.set(r.id, r));
    (roles || []).forEach((r) => {
      if (r && r.id) map.set(r.id, r);
    });
    return Array.from(map.values());
  }, [roles]);

  /**
   * Derives placed interns and work history for any given company.
   */
  const getCompanyInterns = (company: Company | undefined): CompanyInternHistoryItem[] => {
    if (!company) return [];

    const list: CompanyInternHistoryItem[] = [];
    const seenStudentNames = new Set<string>();

    const compNameLower = company.name.toLowerCase().trim();
    const compIdLower = (company.id || '').toLowerCase();

    // 1. Check real placements collection from Firestore
    (placements || []).forEach((p) => {
      const pCompId = (p.companyId || '').toLowerCase();
      const pCompName = (p.companyName || '').toLowerCase().trim();

      const match =
        pCompId === compIdLower ||
        pCompName === compNameLower ||
        (pCompName && compNameLower && (compNameLower.includes(pCompName) || pCompName.includes(compNameLower))) ||
        (compIdLower.includes('anita') && pCompName.includes('anita'));

      if (match) {
        const student = students.find(
          (s) => s.id === p.studentId || s.name.toLowerCase().trim() === p.studentName.toLowerCase().trim()
        );
        const nameKey = p.studentName.toLowerCase().trim();
        seenStudentNames.add(nameKey);

        const defaultStatus: 'Currently Working' | 'Past Intern' =
          p.status === 'Completed' || p.status === 'Withdrawn' ? 'Past Intern' : 'Currently Working';
        const finalStatus = statusOverrides[p.id] || defaultStatus;

        list.push({
          id: p.id,
          placementId: p.id,
          studentId: p.studentId || student?.id,
          studentName: p.studentName,
          studentPhoto: student?.profilePhoto,
          roleTitle: p.roleTitle || 'Intern',
          stipend: p.stipend || '₹10,000 - ₹15,000 / month',
          status: finalStatus,
          joiningDate: p.joiningDate || 'Nov 2025',
          duration: p.duration || '3 - 6 Months',
          location: p.location || company.location || 'Kolkata',
          skills: student?.skills?.length ? student.skills : ['Content Writing', 'Video editing'],
          portfolioUrl:
            student?.portfolioUrl ||
            (p.studentName.toLowerCase().includes('aariyan')
              ? 'https://canva.link/3rey3hza2kr5y2f'
              : p.studentName.toLowerCase().includes('snigdha')
              ? 'https://www.canva.com/design/DAHBgOSdznM/mYDjQCnv9lNbTLb7rAK3jw/edit'
              : ''),
          resumeUrl: student?.resumeUrl || '',
          phone: student?.phone || (p.studentName.toLowerCase().includes('aariyan') ? '9007895661' : ''),
          email: student?.email || '',
          college: student?.college || '',
          batchName: student?.batchName || '',
          notes: student?.notes || '',
          student,
        });
      }
    });

    // 2. Cross-reference students in directory whose notes or bio indicate placement or brand assignment
    (students || []).forEach((s) => {
      const nameKey = s.name.toLowerCase().trim();
      if (seenStudentNames.has(nameKey)) return;

      const notesLower = (s.notes || '').toLowerCase();
      const bioLower = (s.bio || '').toLowerCase();

      const isPlacedHere =
        notesLower.includes(`company: ${compNameLower}`) ||
        notesLower.includes(compNameLower) ||
        bioLower.includes(compNameLower);

      const isSpecialAnitaAariyan =
        compNameLower.includes('anita') && s.name.toLowerCase().includes('aariyan');

      if (isPlacedHere || isSpecialAnitaAariyan) {
        seenStudentNames.add(nameKey);
        const isProjectOnly = bioLower.includes('brand assigned') && !notesLower.includes('placed in company');

        const defaultStatus: 'Currently Working' | 'Past Intern' | 'Brand Project Intern' = isProjectOnly
          ? 'Brand Project Intern'
          : 'Currently Working';
        const finalStatus = statusOverrides[`st-${s.id}`] || defaultStatus;

        list.push({
          id: `st-${s.id}`,
          studentId: s.id,
          studentName: s.name,
          studentPhoto: s.profilePhoto,
          roleTitle: s.skills?.length ? `${s.skills.slice(0, 2).join(' & ')} Intern` : 'Creative Intern',
          stipend: '₹12,000 / month',
          status: finalStatus,
          joiningDate: 'Nov 2025',
          duration: '6 Months',
          location: s.location || company.location || 'Kolkata',
          skills: s.skills || ['Content Writing', 'Video editing'],
          portfolioUrl:
            s.portfolioUrl ||
            (s.name.toLowerCase().includes('aariyan') ? 'https://canva.link/3rey3hza2kr5y2f' : ''),
          resumeUrl: s.resumeUrl || '',
          phone: s.phone || (s.name.toLowerCase().includes('aariyan') ? '9007895661' : ''),
          email: s.email || '',
          college: s.college || '',
          batchName: s.batchName || 'Batch 4',
          notes: s.notes || '',
          student: s,
        });
      }
    });

    // 3. Fallback specifically for Anita Saraogi to guarantee Aariyan Saha & Snigdha Banerjee visibility
    if (compNameLower.includes('anita')) {
      const hasAariyan = list.some((item) => item.studentName.toLowerCase().includes('aariyan'));
      if (!hasAariyan) {
        list.unshift({
          id: 'manual-aariyan-anita',
          studentName: 'Aariyan Saha',
          roleTitle: 'Content Writing & Video Editing Intern',
          stipend: '₹12,000 / month',
          status: statusOverrides['manual-aariyan-anita'] || 'Currently Working',
          joiningDate: 'Nov 2025',
          duration: '6 Months',
          location: 'Kolkata (Hazra Office & On-site)',
          skills: ['Content Writing', 'Video editing', 'Canva', 'Creative Strategy'],
          portfolioUrl: 'https://canva.link/3rey3hza2kr5y2f',
          phone: '9007895661',
          email: 'aariyansaha532@gmail.com',
          college: 'Scottish Church College • Second Year',
          batchName: 'Batch 4',
        });
      }

      const hasSnigdha = list.some((item) => item.studentName.toLowerCase().includes('snigdha'));
      if (!hasSnigdha) {
        list.push({
          id: 'manual-snigdha-anita',
          studentName: 'Snigdha Banerjee',
          roleTitle: 'Content Writing & Brand Communication Intern',
          stipend: '₹10,000 / month',
          status: statusOverrides['manual-snigdha-anita'] || 'Currently Working',
          joiningDate: 'Nov 2025',
          duration: '6 Months',
          location: 'Kolkata',
          skills: ['Content Writing', 'Brand Communication', 'Canva'],
          portfolioUrl: 'https://www.canva.com/design/DAHBgOSdznM/mYDjQCnv9lNbTLb7rAK3jw/edit',
          phone: '8910236801',
          email: 'snigdhabanerjee@gmail.com',
          college: 'Bhawanipur Education Society College',
          batchName: 'Batch 2',
        });
      }
    }

    return list;
  };

  const getCompanyRoles = (company: Company | undefined): JobRole[] => {
    if (!company) return [];
    return allRoles.filter(
      (r) =>
        r.companyId === company.id ||
        r.companyName?.toLowerCase() === company.name?.toLowerCase() ||
        (company.name && r.companyName?.toLowerCase().includes(company.name.toLowerCase()))
    );
  };

  // Filtered companies for the clean table
  const filteredCompanies = companies.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.industry.toLowerCase().includes(q) ||
      c.location.toLowerCase().includes(q) ||
      (c.contacts && c.contacts.some((ct) => ct.name.toLowerCase().includes(q) || ct.phone.includes(q)));

    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;

    if (filterWithInternsOnly) {
      const interns = getCompanyInterns(c);
      if (interns.length === 0) return false;
    }

    return matchesSearch && matchesStatus;
  });

  // Calculate overall stats
  const totalPlacedCount = useMemo(() => {
    const set = new Set<string>();
    companies.forEach((c) => {
      getCompanyInterns(c).forEach((i) => set.add(i.studentName.toLowerCase().trim()));
    });
    return set.size;
  }, [companies, placements, students]);

  // Handle open drawer
  const handleOpenDrawer = (company: Company) => {
    setActiveCompanyForDrawer(company);
    setDrawerTab('interns');
    setInternFilter('all');
    setInternSearch('');
  };

  // ==========================================
  // OPEN EDIT COMPANY MODAL
  // ==========================================
  const handleOpenEditCompany = (comp: Company, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingCompany(comp);
    setEditCompanyForm({
      name: comp.name || '',
      companyId: comp.companyId || '',
      industry: comp.industry || '',
      website: comp.website || '',
      location: comp.location || '',
      companySize: comp.companySize || '11-50',
      status: comp.status || 'Active',
      accountOwnerName: comp.accountOwnerName || 'Placement Team',
      notes: comp.notes || '',
      contacts: comp.contacts ? [...comp.contacts] : [],
    });
    setShowEditCompanyModal(true);
  };

  // Handle save company modifications
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    setIsSavingCompany(true);
    setCompanyFeedback(null);

    try {
      const updates: Partial<Company> = {
        name: editCompanyForm.name.trim(),
        companyId: editCompanyForm.companyId.trim(),
        industry: editCompanyForm.industry.trim(),
        website: editCompanyForm.website.trim(),
        location: editCompanyForm.location.trim(),
        companySize: editCompanyForm.companySize,
        status: editCompanyForm.status,
        accountOwnerName: editCompanyForm.accountOwnerName.trim(),
        notes: editCompanyForm.notes.trim(),
        contacts: editCompanyForm.contacts,
      };

      await updateCompany(editingCompany.id, updates);

      // Optimistically update active drawer if open
      if (activeCompanyForDrawer && activeCompanyForDrawer.id === editingCompany.id) {
        setActiveCompanyForDrawer({
          ...activeCompanyForDrawer,
          ...updates,
        } as Company);
      }

      setCompanyFeedback('Company profile and contacts saved successfully!');
      setTimeout(() => {
        setShowEditCompanyModal(false);
        setCompanyFeedback(null);
      }, 700);
    } catch (err: any) {
      console.error('Error saving company:', err);
      setCompanyFeedback(`Error: ${err.message || 'Could not save company'}`);
    } finally {
      setIsSavingCompany(false);
    }
  };

  // Contact management in edit modal
  const handleAddContactToForm = () => {
    const newContact: CompanyContact = {
      id: `contact-${Date.now()}`,
      name: '',
      role: 'Point of Contact',
      phone: '',
      email: '',
      isPrimary: editCompanyForm.contacts.length === 0,
    };
    setEditCompanyForm((prev) => ({
      ...prev,
      contacts: [...prev.contacts, newContact],
    }));
  };

  const handleUpdateContactInForm = (id: string, field: keyof CompanyContact, value: any) => {
    setEditCompanyForm((prev) => ({
      ...prev,
      contacts: prev.contacts.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    }));
  };

  const handleRemoveContactFromForm = (id: string) => {
    setEditCompanyForm((prev) => ({
      ...prev,
      contacts: prev.contacts.filter((c) => c.id !== id),
    }));
  };

  // ==========================================
  // ADD NEW COMPANY HANDLER
  // ==========================================
  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyForm.name.trim()) return;
    setIsSubmittingCompany(true);

    try {
      const contacts: CompanyContact[] = [];
      if (newCompanyForm.contactName.trim()) {
        contacts.push({
          id: `contact-${Date.now()}`,
          name: newCompanyForm.contactName.trim(),
          role: newCompanyForm.contactRole.trim(),
          phone: newCompanyForm.contactPhone.trim(),
          email: newCompanyForm.contactEmail.trim(),
          isPrimary: true,
        });
      }

      const created = await addCompany({
        name: newCompanyForm.name.trim(),
        companyId: newCompanyForm.companyId.trim(),
        industry: newCompanyForm.industry.trim(),
        website: newCompanyForm.website.trim(),
        location: newCompanyForm.location.trim(),
        companySize: newCompanyForm.companySize,
        status: newCompanyForm.status,
        accountOwnerName: newCompanyForm.accountOwnerName.trim(),
        notes: newCompanyForm.notes.trim(),
        contacts,
      });

      setShowAddCompanyModal(false);
      setNewCompanyForm({
        name: '',
        companyId: `CMP-${Math.floor(100 + Math.random() * 900)}`,
        industry: 'Marketing & Digital Media',
        website: '',
        location: 'Kolkata, West Bengal',
        companySize: '11-50',
        status: 'Active',
        accountOwnerName: 'Placement Team',
        contactName: '',
        contactRole: 'Hiring Manager / Founder',
        contactPhone: '',
        contactEmail: '',
        notes: '',
      });

      if (created) {
        handleOpenDrawer(created);
      }
    } catch (err: any) {
      console.error('Error creating company:', err);
    } finally {
      setIsSubmittingCompany(false);
    }
  };

  // ==========================================
  // EDIT ROLE HANDLER
  // ==========================================
  const handleOpenEditRole = (role: JobRole, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingRole(role);
    setEditRoleForm({
      title: role.title || '',
      department: role.department || '',
      workMode: role.workMode || 'Hybrid',
      location: role.location || 'Kolkata',
      stipend: role.stipend || '',
      openings: role.openings || 1,
      skills: (role.skills || []).join(', '),
      status: role.status || 'Open',
      requirements: role.requirements || '',
    });
    setShowEditRoleModal(true);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    setIsSavingRole(true);

    try {
      const skillsArray = editRoleForm.skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await updateJobRole(editingRole.id, {
        title: editRoleForm.title.trim(),
        department: editRoleForm.department.trim(),
        workMode: editRoleForm.workMode,
        location: editRoleForm.location.trim(),
        stipend: editRoleForm.stipend.trim(),
        openings: Number(editRoleForm.openings) || 1,
        skills: skillsArray,
        status: editRoleForm.status,
        requirements: editRoleForm.requirements.trim(),
      });

      setShowEditRoleModal(false);
      setEditingRole(null);
    } catch (err: any) {
      console.error('Error updating role:', err);
    } finally {
      setIsSavingRole(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to remove this job role requisition?')) return;
    try {
      await deleteJobRole(roleId);
      setShowEditRoleModal(false);
      setEditingRole(null);
    } catch (err) {
      console.error('Error deleting role:', err);
    }
  };

  // ==========================================
  // EDIT INTERN PLACEMENT HANDLER
  // ==========================================
  const handleOpenEditIntern = (item: CompanyInternHistoryItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingIntern(item);
    setEditInternForm({
      studentName: item.studentName || '',
      roleTitle: item.roleTitle || '',
      status: item.status || 'Currently Working',
      stipend: item.stipend || '',
      joiningDate: item.joiningDate || '',
      duration: item.duration || '',
      location: item.location || '',
      notes: item.notes || '',
    });
    setShowEditInternModal(true);
  };

  const handleSaveIntern = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIntern) return;
    setIsSavingIntern(true);

    try {
      const nextStatus = editInternForm.status === 'Currently Working' ? 'Currently Working' : 'Past Intern';
      setStatusOverrides((prev) => ({ ...prev, [editingIntern.id]: nextStatus }));

      if (editingIntern.placementId) {
        await updatePlacement(editingIntern.placementId, {
          roleTitle: editInternForm.roleTitle.trim(),
          stipend: editInternForm.stipend.trim(),
          joiningDate: editInternForm.joiningDate.trim(),
          duration: editInternForm.duration.trim(),
          location: editInternForm.location.trim(),
          status: editInternForm.status === 'Currently Working' ? 'Joined' : 'Completed',
        });
      }

      setShowEditInternModal(false);
      setEditingIntern(null);
    } catch (err) {
      console.error('Error updating placement:', err);
    } finally {
      setIsSavingIntern(false);
    }
  };

  // Create role form handler
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetComp = targetCompanyForModal || activeCompanyForDrawer;
    if (!targetComp) return;
    try {
      await addJobRole({
        companyId: targetComp.id,
        companyName: targetComp.name,
        title: roleForm.title,
        department: roleForm.department,
        workMode: roleForm.workMode,
        location: roleForm.location,
        skills: roleForm.skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        stipend: roleForm.stipend,
        openings: Number(roleForm.openings) || 1,
        status: 'Open',
      });
      setShowAddRoleModal(false);
      setRoleForm({
        title: '',
        department: 'Marketing & Media',
        workMode: 'Hybrid',
        location: 'Kolkata',
        skills: 'Content Writing, Video editing, Canva',
        stipend: '₹12,000 / month',
        openings: 2,
      });
    } catch (err) {
      console.error('Error adding role:', err);
    }
  };

  // Record placed intern handler
  const handleRecordIntern = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetComp = targetCompanyForModal || activeCompanyForDrawer;
    if (!targetComp) return;

    setIsSubmittingIntern(true);
    try {
      const selectedStudentObj = students.find((s) => s.id === internForm.studentId);
      const studentName = selectedStudentObj ? selectedStudentObj.name : internForm.studentName;
      const studentId = selectedStudentObj ? selectedStudentObj.id : `student-custom-${Date.now()}`;

      await addPlacement({
        studentId,
        studentName,
        studentPhoto: selectedStudentObj?.profilePhoto || '',
        companyId: targetComp.id,
        companyName: targetComp.name,
        roleTitle: internForm.roleTitle,
        stipend: internForm.stipend,
        joiningDate: internForm.joiningDate,
        duration: internForm.duration,
        location: internForm.location || targetComp.location,
        status: internForm.status === 'Currently Working' ? 'Joined' : 'Completed',
        offerDate: new Date().toISOString(),
        placementOwner: 'Hazra Placement Team',
      });

      setShowAddInternModal(false);
      setInternForm({
        studentId: '',
        studentName: '',
        roleTitle: 'Content Writing & Video Editing Intern',
        status: 'Currently Working',
        joiningDate: 'Nov 2025',
        duration: '6 Months',
        stipend: '₹12,000 / month',
        location: 'Kolkata (Hazra Office & On-site)',
        notes: '',
      });
    } catch (err) {
      console.error('Error recording placement:', err);
    } finally {
      setIsSubmittingIntern(false);
    }
  };

  const handleToggleInternStatus = async (item: CompanyInternHistoryItem) => {
    const nextStatus = item.status === 'Currently Working' ? 'Past Intern' : 'Currently Working';
    setStatusOverrides((prev) => ({ ...prev, [item.id]: nextStatus }));

    if (item.placementId) {
      try {
        await updatePlacement(item.placementId, {
          status: nextStatus === 'Currently Working' ? 'Joined' : 'Completed',
        });
      } catch (err) {
        console.error('Failed to update placement status in Firestore:', err);
      }
    }
  };

  // Selected company items for drawer
  const drawerInterns = activeCompanyForDrawer ? getCompanyInterns(activeCompanyForDrawer) : [];
  const drawerRoles = activeCompanyForDrawer ? getCompanyRoles(activeCompanyForDrawer) : [];

  const filteredDrawerInterns = drawerInterns.filter((item) => {
    if (internFilter === 'working' && item.status !== 'Currently Working') return false;
    if (internFilter === 'past' && item.status !== 'Past Intern' && item.status !== 'Brand Project Intern')
      return false;

    if (internSearch) {
      const q = internSearch.toLowerCase();
      const matchName = item.studentName.toLowerCase().includes(q);
      const matchRole = item.roleTitle.toLowerCase().includes(q);
      const matchSkill = item.skills.some((sk) => sk.toLowerCase().includes(q));
      return matchName || matchRole || matchSkill;
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Top Header & Metrics Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            Companies & Hiring Partners
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700">
              {companies.length} Total
            </span>
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Directory of partner brands, placed student cohorts, and active job role requisitions. Everything is fully editable.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddCompanyModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-amber-300" />
            <span>Add New Company</span>
          </button>
        </div>
      </div>

      {/* 4-Stat KPI Summary Row (TARGET SELECTOR div:nth-of-type(2) > div:nth-of-type(1)) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Box 1: Partner Companies (Focus Target) */}
        <div
          onClick={() => {
            if (statusFilter === 'Active') {
              setStatusFilter('All');
            } else {
              setStatusFilter('Active');
            }
          }}
          className="bg-white p-3.5 rounded-xl border border-zinc-200/90 shadow-2xs hover:border-zinc-400 hover:shadow-xs transition cursor-pointer group relative overflow-hidden"
          title="Click to toggle Active / All companies filter"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block group-hover:text-zinc-600 transition">
              Partner Companies
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 group-hover:bg-zinc-900 group-hover:text-white transition">
              {statusFilter === 'Active' ? 'Filtered: Active' : 'Filter by Status'}
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1.5">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-zinc-900">{companies.length}</span>
              <span className="text-xs text-emerald-600 font-medium">
                {companies.filter((c) => c.status === 'Active').length} Active
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowAddCompanyModal(true);
              }}
              className="text-[11px] font-semibold text-zinc-600 hover:text-zinc-900 inline-flex items-center gap-1 bg-zinc-50 hover:bg-zinc-100 px-2 py-1 rounded-md border border-zinc-200 transition"
              title="Add or modify companies"
            >
              <Plus className="w-3 h-3 text-zinc-500" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Box 2: Placed Talent */}
        <div
          onClick={() => setFilterWithInternsOnly(!filterWithInternsOnly)}
          className={`bg-white p-3.5 rounded-xl border shadow-2xs transition cursor-pointer group ${
            filterWithInternsOnly ? 'border-emerald-500 bg-emerald-50/20' : 'border-zinc-200/80 hover:border-zinc-400'
          }`}
          title="Click to filter companies with placed interns"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              Placed Talent
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
              {filterWithInternsOnly ? 'Active Filter' : 'Filter'}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-emerald-700">{totalPlacedCount}</span>
            <span className="text-xs text-zinc-500">Students Deployed</span>
          </div>
        </div>

        {/* Box 3: Active Job Roles */}
        <div
          onClick={() => {
            if (companies.length > 0) {
              setTargetCompanyForModal(companies[0]);
              setShowAddRoleModal(true);
            }
          }}
          className="bg-white p-3.5 rounded-xl border border-zinc-200/80 shadow-2xs hover:border-zinc-400 transition cursor-pointer group"
          title="Click to post a new job role"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              Active Job Roles
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
              + Post Role
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-indigo-600">{allRoles.length}</span>
            <span className="text-xs text-zinc-500">Total Openings</span>
          </div>
        </div>

        {/* Box 4: Location Coverage */}
        <div className="bg-white p-3.5 rounded-xl border border-zinc-200/80 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
            Location Coverage
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-zinc-900">Kolkata</span>
            <span className="text-xs text-zinc-500">Hazra & On-site</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-zinc-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search companies by name, industry, location, or contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-zinc-50/50 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter pills */}
          <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-lg border border-zinc-200 text-xs">
            {(['All', 'Active', 'Prospect', 'Dormant'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                  statusFilter === status
                    ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Toggle with placed interns */}
          <button
            onClick={() => setFilterWithInternsOnly(!filterWithInternsOnly)}
            className={`px-3 py-1 rounded-lg text-xs font-medium border transition flex items-center gap-1.5 cursor-pointer ${
              filterWithInternsOnly
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold'
                : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
            <span>Has Placed Interns</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* CLEAN, FULL-WIDTH TABLE OF ALL COMPANIES (EDITABLE)       */}
      {/* ======================================================== */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/80 border-b border-zinc-200 text-[11px] font-bold text-zinc-500 uppercase tracking-wider select-none">
                <th className="py-3.5 pl-6 pr-4">Company</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Placed Interns</th>
                <th className="py-3.5 px-4">Open Roles</th>
                <th className="py-3.5 px-4">Primary Contact</th>
                <th className="py-3.5 pr-6 pl-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-xs">
              {filteredCompanies.map((comp) => {
                const compInterns = getCompanyInterns(comp);
                const activePlaced = compInterns.filter((i) => i.status === 'Currently Working').length;
                const compRoles = getCompanyRoles(comp);
                const primaryContact = comp.contacts?.[0];

                return (
                  <tr
                    key={comp.id}
                    onClick={() => handleOpenDrawer(comp)}
                    className="hover:bg-zinc-50/80 transition-colors cursor-pointer group"
                  >
                    {/* Company Name & Avatar */}
                    <td className="py-3.5 pl-6 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-indigo-600 transition-colors">
                          {comp.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-zinc-900 text-sm group-hover:text-indigo-600 transition-colors">
                              {comp.name}
                            </span>
                            {comp.companyId && (
                              <span className="text-[10px] font-mono text-zinc-400 bg-zinc-100 px-1.5 py-0.2 rounded">
                                {comp.companyId}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 mt-0.5">
                            <span>{comp.industry}</span>
                            {comp.website && (
                              <a
                                href={comp.website.startsWith('http') ? comp.website : `https://${comp.website}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-zinc-400 hover:text-indigo-600 transition inline-flex items-center"
                                title="Open Website"
                              >
                                <Globe className="w-3 h-3 ml-0.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4 text-zinc-600 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span>{comp.location || 'Kolkata, West Bengal'}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Badge variant={comp.status === 'Active' ? 'green' : 'neutral'}>
                        {comp.status}
                      </Badge>
                    </td>

                    {/* Placed Interns */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {compInterns.length > 0 ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-xs">
                          <GraduationCap className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>
                            {compInterns.length} {compInterns.length === 1 ? 'Intern' : 'Interns'}
                          </span>
                          {activePlaced > 0 && (
                            <span className="text-[10px] text-emerald-600 font-normal">
                              ({activePlaced} active)
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-zinc-400 text-xs font-mono">0 Placed</span>
                      )}
                    </td>

                    {/* Open Roles */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {compRoles.length > 0 ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 font-semibold text-xs">
                          <Briefcase className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>
                            {compRoles.length} {compRoles.length === 1 ? 'Role' : 'Roles'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-zinc-400 text-xs font-mono">None</span>
                      )}
                    </td>

                    {/* Primary Contact */}
                    <td className="py-3.5 px-4 text-zinc-600 whitespace-nowrap">
                      {primaryContact ? (
                        <div>
                          <div className="font-semibold text-zinc-900">{primaryContact.name}</div>
                          <div className="text-[11px] text-zinc-500 flex items-center gap-2 mt-0.5">
                            {primaryContact.phone && (
                              <span className="font-mono">{primaryContact.phone}</span>
                            )}
                            {primaryContact.role && (
                              <>
                                <span>•</span>
                                <span>{primaryContact.role}</span>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-zinc-400 text-xs italic">No contact added</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 pr-6 pl-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Direct Edit Button */}
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditCompany(comp, e)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 hover:border-zinc-400 hover:bg-zinc-100 text-zinc-700 font-semibold text-xs transition cursor-pointer"
                          title="Edit Company Details & Contacts"
                        >
                          <Pencil className="w-3 h-3 text-zinc-500" />
                          <span>Edit</span>
                        </button>

                        {/* Primary View All Data Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenDrawer(comp)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs transition shadow-2xs cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-300" />
                          <span>View All Data</span>
                        </button>

                        {/* Quick add intern button */}
                        <button
                          type="button"
                          onClick={() => {
                            setTargetCompanyForModal(comp);
                            setShowAddInternModal(true);
                          }}
                          className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-700 transition cursor-pointer"
                          title="Record Placed Intern"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredCompanies.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400 text-xs">
                    <Building className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                    <p className="font-semibold text-zinc-700">No companies found matching your criteria.</p>
                    <button
                      onClick={() => setShowAddCompanyModal(true)}
                      className="mt-3 px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add New Company</span>
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* COMPANY 360 DRAWER ("OPTION TO SEE ALL DATA FOR EACH")     */}
      {/* ======================================================== */}
      {activeCompanyForDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-fadeIn">
          <div
            className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-zinc-200 animate-slideInRight"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-6 border-b border-zinc-200 bg-zinc-50/80 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white font-bold text-base flex items-center justify-center shrink-0 shadow-xs">
                  {activeCompanyForDrawer.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-zinc-900">
                      {activeCompanyForDrawer.name}
                    </h2>
                    {activeCompanyForDrawer.companyId && (
                      <span className="text-xs font-mono text-zinc-500 bg-zinc-200/80 px-2 py-0.5 rounded">
                        {activeCompanyForDrawer.companyId}
                      </span>
                    )}
                    <Badge variant={activeCompanyForDrawer.status === 'Active' ? 'green' : 'neutral'}>
                      {activeCompanyForDrawer.status}
                    </Badge>

                    {/* Edit Company Button in Header */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditCompany(activeCompanyForDrawer)}
                      className="p-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/70 rounded-md transition cursor-pointer"
                      title="Edit Company Details & Contacts"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-xs text-zinc-500 mt-1 flex flex-wrap items-center gap-2">
                    <span>{activeCompanyForDrawer.industry}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-zinc-400" />
                      {activeCompanyForDrawer.location || 'Kolkata, West Bengal'}
                    </span>
                    {activeCompanyForDrawer.website && (
                      <>
                        <span>•</span>
                        <a
                          href={
                            activeCompanyForDrawer.website.startsWith('http')
                              ? activeCompanyForDrawer.website
                              : `https://${activeCompanyForDrawer.website}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:underline flex items-center gap-1"
                        >
                          <Globe className="w-3 h-3" />
                          <span>Website</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setActiveCompanyForDrawer(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions Row */}
            <div className="px-6 py-3 bg-white border-b border-zinc-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTargetCompanyForModal(activeCompanyForDrawer);
                    setShowAddInternModal(true);
                  }}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Record Placed Intern</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTargetCompanyForModal(activeCompanyForDrawer);
                    setShowAddRoleModal(true);
                  }}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Post Role Requirement</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenEditCompany(activeCompanyForDrawer)}
                  className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-zinc-200 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5 text-zinc-600" />
                  <span>Edit Company</span>
                </button>
              </div>

              <span className="text-[11px] text-zinc-400 font-mono">
                Full 360 View
              </span>
            </div>

            {/* Tab Switcher */}
            <div className="px-6 border-b border-zinc-200 flex gap-6 text-xs font-semibold bg-white">
              <button
                onClick={() => setDrawerTab('interns')}
                className={`py-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  drawerTab === 'interns'
                    ? 'border-zinc-900 text-zinc-900 font-bold'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <GraduationCap className="w-4 h-4 text-emerald-600" />
                <span>Placed Interns & History ({drawerInterns.length})</span>
              </button>

              <button
                onClick={() => setDrawerTab('roles')}
                className={`py-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  drawerTab === 'roles'
                    ? 'border-zinc-900 text-zinc-900 font-bold'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <Briefcase className="w-4 h-4 text-indigo-600" />
                <span>Job Roles & Openings ({drawerRoles.length})</span>
              </button>

              <button
                onClick={() => setDrawerTab('overview')}
                className={`py-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  drawerTab === 'overview'
                    ? 'border-zinc-900 text-zinc-900 font-bold'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <Building className="w-4 h-4 text-zinc-500" />
                <span>Company Profile & Contacts</span>
              </button>
            </div>

            {/* Drawer Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-50/50">
              {/* TAB 1: PLACED INTERNS */}
              {drawerTab === 'interns' && (
                <div className="space-y-4">
                  {/* Filters for Interns */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-zinc-200 shadow-2xs">
                    <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-lg text-xs">
                      <button
                        onClick={() => setInternFilter('all')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                          internFilter === 'all' ? 'bg-white text-zinc-900 font-bold shadow-2xs' : 'text-zinc-600'
                        }`}
                      >
                        All ({drawerInterns.length})
                      </button>
                      <button
                        onClick={() => setInternFilter('working')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                          internFilter === 'working' ? 'bg-white text-zinc-900 font-bold shadow-2xs' : 'text-zinc-600'
                        }`}
                      >
                        Currently Working (
                        {drawerInterns.filter((i) => i.status === 'Currently Working').length})
                      </button>
                      <button
                        onClick={() => setInternFilter('past')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                          internFilter === 'past' ? 'bg-white text-zinc-900 font-bold shadow-2xs' : 'text-zinc-600'
                        }`}
                      >
                        Past Interns (
                        {
                          drawerInterns.filter(
                            (i) => i.status === 'Past Intern' || i.status === 'Brand Project Intern'
                          ).length
                        }
                        )
                      </button>
                    </div>

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2" />
                      <input
                        type="text"
                        placeholder="Search student or role..."
                        value={internSearch}
                        onChange={(e) => setInternSearch(e.target.value)}
                        className="pl-8 pr-2.5 py-1 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 w-48"
                      />
                    </div>
                  </div>

                  {/* Intern Cards List */}
                  <div className="space-y-3">
                    {filteredDrawerInterns.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white rounded-xl border border-zinc-200 p-4 shadow-2xs hover:border-zinc-300 transition space-y-3 group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            {item.studentPhoto ? (
                              <img
                                src={item.studentPhoto}
                                alt={item.studentName}
                                className="w-10 h-10 rounded-xl object-cover shrink-0 border border-zinc-200"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-zinc-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                {item.studentName.slice(0, 2).toUpperCase()}
                              </div>
                            )}

                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-zinc-900">{item.studentName}</h4>
                                <Badge
                                  variant={item.status === 'Currently Working' ? 'green' : 'neutral'}
                                >
                                  {item.status}
                                </Badge>
                              </div>
                              <p className="text-xs font-semibold text-indigo-700 mt-0.5">
                                {item.roleTitle}
                              </p>
                              <div className="text-[11px] text-zinc-500 flex flex-wrap items-center gap-2 mt-1">
                                {item.college && <span>{item.college}</span>}
                                {item.batchName && (
                                  <>
                                    <span>•</span>
                                    <span className="font-mono">{item.batchName}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Top Right Actions */}
                          <div className="flex items-center gap-2">
                            {/* Edit Placement button */}
                            <button
                              type="button"
                              onClick={(e) => handleOpenEditIntern(item, e)}
                              className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-600 transition cursor-pointer"
                              title="Edit intern role, stipend, dates, notes"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            {/* Status toggle pill */}
                            <button
                              type="button"
                              onClick={() => handleToggleInternStatus(item)}
                              className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                                item.status === 'Currently Working'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                  : 'bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200'
                              }`}
                              title="Click to toggle between Currently Working and Past Intern"
                            >
                              {item.status === 'Currently Working' ? 'Active Intern' : 'Mark Active'}
                            </button>
                          </div>
                        </div>

                        {/* Metadata Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-zinc-100 text-[11px]">
                          <div>
                            <span className="text-zinc-400 block text-[10px]">Stipend</span>
                            <span className="font-semibold text-emerald-700">{item.stipend}</span>
                          </div>
                          <div>
                            <span className="text-zinc-400 block text-[10px]">Joined</span>
                            <span className="font-medium text-zinc-700">{item.joiningDate}</span>
                          </div>
                          <div>
                            <span className="text-zinc-400 block text-[10px]">Duration</span>
                            <span className="font-medium text-zinc-700">{item.duration}</span>
                          </div>
                          <div>
                            <span className="text-zinc-400 block text-[10px]">Location</span>
                            <span className="font-medium text-zinc-700 truncate block">
                              {item.location}
                            </span>
                          </div>
                        </div>

                        {/* Skills chips */}
                        {item.skills && item.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {item.skills.map((skill, sIdx) => (
                              <span
                                key={sIdx}
                                className="text-[10px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded font-medium"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Links & Quick Actions */}
                        <div className="pt-2 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-3">
                            {item.portfolioUrl && (
                              <a
                                href={item.portfolioUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-600 hover:underline flex items-center gap-1 font-medium text-[11px]"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Canva / Portfolio</span>
                              </a>
                            )}
                            {item.phone && (
                              <a
                                href={`https://wa.me/91${item.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-700 hover:underline flex items-center gap-1 font-medium text-[11px]"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>WhatsApp</span>
                              </a>
                            )}
                          </div>

                          {item.student && onSelectStudent && (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectStudent(item.student!);
                                setActiveCompanyForDrawer(null);
                              }}
                              className="text-[11px] font-semibold text-zinc-700 hover:text-zinc-900 flex items-center gap-1 underline cursor-pointer"
                            >
                              <span>View 360 Profile</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {filteredDrawerInterns.length === 0 && (
                      <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center space-y-2">
                        <GraduationCap className="w-8 h-8 text-zinc-300 mx-auto" />
                        <p className="text-xs text-zinc-500 font-medium">
                          No placed intern records found matching this filter.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setTargetCompanyForModal(activeCompanyForDrawer);
                            setShowAddInternModal(true);
                          }}
                          className="mt-2 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Record First Intern Here</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: JOB ROLES */}
              {drawerTab === 'roles' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                        Requisitions & Openings ({drawerRoles.length})
                      </h3>
                      <p className="text-[11px] text-zinc-500">
                        Click edit on any role to change parameters or delete.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setTargetCompanyForModal(activeCompanyForDrawer);
                        setShowAddRoleModal(true);
                      }}
                      className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Post Role Requirement</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {drawerRoles.map((role) => (
                      <div
                        key={role.id}
                        className="bg-white rounded-xl border border-zinc-200 p-4 shadow-2xs space-y-3 group hover:border-zinc-300 transition"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-zinc-900">{role.title}</h4>
                              <Badge
                                variant={
                                  role.status === 'Open'
                                    ? 'green'
                                    : role.status === 'Filled'
                                    ? 'blue'
                                    : 'neutral'
                                }
                              >
                                {role.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-zinc-500 mt-0.5">
                              {role.department} • {role.workMode} ({role.location})
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-bold text-emerald-700 block">{role.stipend}</span>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              {role.openings} Openings
                            </span>
                          </div>
                        </div>

                        {role.skills && role.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {role.skills.map((sk, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded font-medium"
                              >
                                {sk}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => handleOpenEditRole(role, e)}
                              className="px-2.5 py-1 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 rounded-lg text-xs font-semibold flex items-center gap-1 border border-zinc-200 transition cursor-pointer"
                              title="Edit Role Details & Requirements"
                            >
                              <Pencil className="w-3 h-3 text-zinc-500" />
                              <span>Edit Role</span>
                            </button>
                            <span className="text-[11px] text-zinc-400">
                              Ready for matching
                            </span>
                          </div>

                          {onNavigateToMatching && (
                            <button
                              type="button"
                              onClick={() => {
                                onNavigateToMatching(activeCompanyForDrawer.id, role.id);
                                setActiveCompanyForDrawer(null);
                              }}
                              className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3 text-indigo-500" />
                              <span>Match Candidates</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {drawerRoles.length === 0 && (
                      <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center space-y-2">
                        <Briefcase className="w-8 h-8 text-zinc-300 mx-auto" />
                        <p className="text-xs text-zinc-500 font-medium">No open roles currently posted for this partner.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setTargetCompanyForModal(activeCompanyForDrawer);
                            setShowAddRoleModal(true);
                          }}
                          className="mt-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Post Role Now</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: OVERVIEW & CONTACTS (WITH EDIT BUTTONS) */}
              {drawerTab === 'overview' && (
                <div className="space-y-5">
                  {/* Basic Info Card */}
                  <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                      <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                        Company Profile Details
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleOpenEditCompany(activeCompanyForDrawer)}
                        className="px-2.5 py-1 bg-zinc-900 text-white hover:bg-zinc-800 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                      >
                        <Pencil className="w-3 h-3 text-amber-300" />
                        <span>Edit Profile</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-[10px] text-zinc-400 font-bold uppercase block">Company ID</span>
                        <span className="font-semibold text-zinc-900 font-mono">{activeCompanyForDrawer.companyId || 'CMP-DEFAULT'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-400 font-bold uppercase block">Industry Vertical</span>
                        <span className="font-semibold text-zinc-900">{activeCompanyForDrawer.industry}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-400 font-bold uppercase block">Company Size</span>
                        <span className="font-semibold text-zinc-900">{activeCompanyForDrawer.companySize || 'Growing Brand'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-400 font-bold uppercase block">Account Owner</span>
                        <span className="font-semibold text-zinc-900">{activeCompanyForDrawer.accountOwnerName || 'Placement Team'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] text-zinc-400 font-bold uppercase block">Location / Address</span>
                        <span className="font-semibold text-zinc-900">{activeCompanyForDrawer.location || 'Kolkata, West Bengal'}</span>
                      </div>
                      {activeCompanyForDrawer.website && (
                        <div className="col-span-2">
                          <span className="text-[10px] text-zinc-400 font-bold uppercase block">Official Website</span>
                          <a
                            href={activeCompanyForDrawer.website.startsWith('http') ? activeCompanyForDrawer.website : `https://${activeCompanyForDrawer.website}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-indigo-600 hover:underline flex items-center gap-1 mt-0.5"
                          >
                            <Globe className="w-3 h-3" />
                            <span>{activeCompanyForDrawer.website}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      )}
                      {activeCompanyForDrawer.notes && (
                        <div className="col-span-2 bg-zinc-50 p-3 rounded-lg border border-zinc-200 text-zinc-700">
                          <span className="text-[10px] text-zinc-400 font-bold uppercase block mb-1">Internal Notes</span>
                          <p className="text-xs leading-relaxed">{activeCompanyForDrawer.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contacts Card */}
                  <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                      <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                        Authorized Company Contacts ({activeCompanyForDrawer.contacts?.length || 0})
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleOpenEditCompany(activeCompanyForDrawer)}
                        className="px-2.5 py-1 bg-zinc-100 text-zinc-800 hover:bg-zinc-200 rounded-lg text-xs font-semibold flex items-center gap-1 border border-zinc-200 transition cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Manage Contacts</span>
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {activeCompanyForDrawer.contacts?.map((contact, idx) => (
                        <div
                          key={contact.id || idx}
                          className="p-3 rounded-lg border border-zinc-200 bg-zinc-50/60 flex items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-zinc-900">{contact.name}</span>
                              {contact.isPrimary && (
                                <span className="text-[9px] bg-indigo-100 text-indigo-800 font-semibold px-1.5 py-0.2 rounded">
                                  Primary
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-zinc-500">{contact.role}</span>
                          </div>

                          <div className="flex items-center gap-3 text-zinc-600 font-mono text-[11px]">
                            {contact.phone && (
                              <a
                                href={`tel:${contact.phone}`}
                                className="hover:text-zinc-900 flex items-center gap-1"
                              >
                                <Phone className="w-3 h-3 text-zinc-400" />
                                <span>{contact.phone}</span>
                              </a>
                            )}
                            {contact.email && (
                              <a
                                href={`mailto:${contact.email}`}
                                className="hover:text-zinc-900 flex items-center gap-1"
                              >
                                <Mail className="w-3 h-3 text-zinc-400" />
                                <span>{contact.email}</span>
                              </a>
                            )}
                          </div>
                        </div>
                      ))}

                      {(!activeCompanyForDrawer.contacts || activeCompanyForDrawer.contacts.length === 0) && (
                        <div className="text-center py-4 bg-zinc-50 rounded-lg border border-dashed border-zinc-200">
                          <p className="text-xs text-zinc-500">No specific contacts logged yet.</p>
                          <button
                            type="button"
                            onClick={() => handleOpenEditCompany(activeCompanyForDrawer)}
                            className="mt-2 text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
                          >
                            + Add Contact Person
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDIT COMPANY DETAILS & CONTACTS (FULL EDITABILITY) */}
      {/* ======================================================== */}
      {showEditCompanyModal && editingCompany && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div
            className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 border border-zinc-200 my-8 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                  <Pencil className="w-4 h-4 text-indigo-600" />
                  Edit Company: {editingCompany.name}
                </h3>
                <p className="text-[11px] text-zinc-500">
                  Update profile information, address, and authorized contact persons.
                </p>
              </div>
              <button
                onClick={() => setShowEditCompanyModal(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {companyFeedback && (
              <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{companyFeedback}</span>
              </div>
            )}

            <form onSubmit={handleSaveCompany} className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="font-semibold text-zinc-700 block mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={editCompanyForm.name}
                    onChange={(e) => setEditCompanyForm({ ...editCompanyForm, name: e.target.value })}
                    className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="font-semibold text-zinc-700 block mb-1">Company ID Code</label>
                  <input
                    type="text"
                    value={editCompanyForm.companyId}
                    onChange={(e) => setEditCompanyForm({ ...editCompanyForm, companyId: e.target.value })}
                    className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-3 sm:col-span-1">
                  <label className="font-semibold text-zinc-700 block mb-1">Partnership Status</label>
                  <select
                    value={editCompanyForm.status}
                    onChange={(e) => setEditCompanyForm({ ...editCompanyForm, status: e.target.value as any })}
                    className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Prospect">Prospect</option>
                    <option value="Dormant">Dormant</option>
                  </select>
                </div>
                <div className="col-span-3 sm:col-span-1">
                  <label className="font-semibold text-zinc-700 block mb-1">Company Size</label>
                  <select
                    value={editCompanyForm.companySize}
                    onChange={(e) => setEditCompanyForm({ ...editCompanyForm, companySize: e.target.value })}
                    className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
                  >
                    <option value="1-10">1-10 (Early Stage)</option>
                    <option value="11-50">11-50 (Growing Brand)</option>
                    <option value="50-200">50-200 (Mid-Market)</option>
                    <option value="200+">200+ (Enterprise)</option>
                  </select>
                </div>
                <div className="col-span-3 sm:col-span-1">
                  <label className="font-semibold text-zinc-700 block mb-1">Industry Vertical</label>
                  <input
                    type="text"
                    value={editCompanyForm.industry}
                    onChange={(e) => setEditCompanyForm({ ...editCompanyForm, industry: e.target.value })}
                    className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Office Location / Address</label>
                  <input
                    type="text"
                    value={editCompanyForm.location}
                    onChange={(e) => setEditCompanyForm({ ...editCompanyForm, location: e.target.value })}
                    className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Official Website URL</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={editCompanyForm.website}
                    onChange={(e) => setEditCompanyForm({ ...editCompanyForm, website: e.target.value })}
                    className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Internal Notes</label>
                <textarea
                  rows={2}
                  value={editCompanyForm.notes}
                  onChange={(e) => setEditCompanyForm({ ...editCompanyForm, notes: e.target.value })}
                  placeholder="Key contacts, preference for video editors, interview guidelines, etc."
                  className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              {/* Editable Contacts List */}
              <div className="space-y-2 pt-2 border-t border-zinc-100">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-900 text-xs">
                    Company Contacts ({editCompanyForm.contacts.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddContactToForm}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Contact Person</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {editCompanyForm.contacts.map((contact, idx) => (
                    <div
                      key={contact.id || idx}
                      className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2 relative"
                    >
                      <button
                        type="button"
                        onClick={() => handleRemoveContactFromForm(contact.id)}
                        className="absolute right-2 top-2 p-1 text-zinc-400 hover:text-red-600 rounded transition cursor-pointer"
                        title="Remove Contact"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="grid grid-cols-2 gap-2 pr-6">
                        <div>
                          <label className="text-[10px] text-zinc-500 font-semibold block mb-0.5">Name</label>
                          <input
                            type="text"
                            placeholder="Contact Name"
                            value={contact.name}
                            onChange={(e) => handleUpdateContactInForm(contact.id, 'name', e.target.value)}
                            className="w-full p-1.5 border border-zinc-200 rounded-md bg-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-500 font-semibold block mb-0.5">Designation / Role</label>
                          <input
                            type="text"
                            placeholder="Founder / HR"
                            value={contact.role}
                            onChange={(e) => handleUpdateContactInForm(contact.id, 'role', e.target.value)}
                            className="w-full p-1.5 border border-zinc-200 rounded-md bg-white text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-zinc-500 font-semibold block mb-0.5">Phone</label>
                          <input
                            type="text"
                            placeholder="Phone number"
                            value={contact.phone}
                            onChange={(e) => handleUpdateContactInForm(contact.id, 'phone', e.target.value)}
                            className="w-full p-1.5 border border-zinc-200 rounded-md bg-white text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-500 font-semibold block mb-0.5">Email</label>
                          <input
                            type="email"
                            placeholder="email@company.com"
                            value={contact.email}
                            onChange={(e) => handleUpdateContactInForm(contact.id, 'email', e.target.value)}
                            className="w-full p-1.5 border border-zinc-200 rounded-md bg-white text-xs"
                          />
                        </div>
                        <div className="flex items-center pt-4">
                          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-zinc-700">
                            <input
                              type="checkbox"
                              checked={!!contact.isPrimary}
                              onChange={(e) => handleUpdateContactInForm(contact.id, 'isPrimary', e.target.checked)}
                              className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>Primary Contact</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}

                  {editCompanyForm.contacts.length === 0 && (
                    <p className="text-zinc-400 text-xs italic py-2">
                      No contacts added yet. Click &quot;Add Contact Person&quot; above to log authorized hiring coordinators.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowEditCompanyModal(false)}
                  className="px-4 py-2 border border-zinc-200 rounded-lg text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCompany}
                  className="px-4 py-2 bg-zinc-900 text-white rounded-lg font-semibold hover:bg-zinc-800 disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingCompany ? 'Saving Changes...' : 'Save Company Details'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD NEW COMPANY                                    */}
      {/* ======================================================== */}
      {showAddCompanyModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-zinc-200 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-emerald-600" />
                  Onboard New Hiring Partner
                </h3>
                <p className="text-[11px] text-zinc-500">
                  Add a brand or agency to the hiring partners directory.
                </p>
              </div>
              <button
                onClick={() => setShowAddCompanyModal(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCompany} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="font-semibold text-zinc-700 block mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sabyasachi / Blob AI"
                    value={newCompanyForm.name}
                    onChange={(e) => setNewCompanyForm({ ...newCompanyForm, name: e.target.value })}
                    className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="font-semibold text-zinc-700 block mb-1">Company Code / ID</label>
                  <input
                    type="text"
                    value={newCompanyForm.companyId}
                    onChange={(e) => setNewCompanyForm({ ...newCompanyForm, companyId: e.target.value })}
                    className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Industry Vertical</label>
                  <input
                    type="text"
                    placeholder="e.g. Luxury Fashion / Tech"
                    value={newCompanyForm.industry}
                    onChange={(e) => setNewCompanyForm({ ...newCompanyForm, industry: e.target.value })}
                    className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Location / Office</label>
                  <input
                    type="text"
                    placeholder="e.g. Park Street, Kolkata"
                    value={newCompanyForm.location}
                    onChange={(e) => setNewCompanyForm({ ...newCompanyForm, location: e.target.value })}
                    className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Official Website</label>
                  <input
                    type="text"
                    placeholder="e.g. website.com"
                    value={newCompanyForm.website}
                    onChange={(e) => setNewCompanyForm({ ...newCompanyForm, website: e.target.value })}
                    className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Initial Status</label>
                  <select
                    value={newCompanyForm.status}
                    onChange={(e) => setNewCompanyForm({ ...newCompanyForm, status: e.target.value as any })}
                    className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
                  >
                    <option value="Active">Active Partner</option>
                    <option value="Prospect">Prospect</option>
                    <option value="Dormant">Dormant</option>
                  </select>
                </div>
              </div>

              {/* Primary Contact Section */}
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2">
                <span className="font-bold text-zinc-900 block text-xs">Primary Contact Person</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Contact full name"
                    value={newCompanyForm.contactName}
                    onChange={(e) => setNewCompanyForm({ ...newCompanyForm, contactName: e.target.value })}
                    className="p-1.5 border border-zinc-200 rounded-md bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Designation (e.g. Founder)"
                    value={newCompanyForm.contactRole}
                    onChange={(e) => setNewCompanyForm({ ...newCompanyForm, contactRole: e.target.value })}
                    className="p-1.5 border border-zinc-200 rounded-md bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Phone number"
                    value={newCompanyForm.contactPhone}
                    onChange={(e) => setNewCompanyForm({ ...newCompanyForm, contactPhone: e.target.value })}
                    className="p-1.5 border border-zinc-200 rounded-md bg-white font-mono"
                  />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={newCompanyForm.contactEmail}
                    onChange={(e) => setNewCompanyForm({ ...newCompanyForm, contactEmail: e.target.value })}
                    className="p-1.5 border border-zinc-200 rounded-md bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowAddCompanyModal(false)}
                  className="px-4 py-2 border border-zinc-200 rounded-lg text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCompany}
                  className="px-4 py-2 bg-emerald-700 text-white rounded-lg font-semibold hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingCompany ? 'Creating...' : 'Onboard Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDIT JOB ROLE                                      */}
      {/* ======================================================== */}
      {showEditRoleModal && editingRole && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-zinc-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                  <Pencil className="w-4 h-4 text-indigo-600" />
                  Edit Job Role Requisition
                </h3>
                <p className="text-[11px] text-zinc-500">{editingRole.companyName}</p>
              </div>
              <button
                onClick={() => setShowEditRoleModal(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Role Title *</label>
                <input
                  type="text"
                  required
                  value={editRoleForm.title}
                  onChange={(e) => setEditRoleForm({ ...editRoleForm, title: e.target.value })}
                  className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Department</label>
                  <input
                    type="text"
                    value={editRoleForm.department}
                    onChange={(e) => setEditRoleForm({ ...editRoleForm, department: e.target.value })}
                    className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Work Mode</label>
                  <select
                    value={editRoleForm.workMode}
                    onChange={(e) => setEditRoleForm({ ...editRoleForm, workMode: e.target.value as any })}
                    className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
                  >
                    <option value="Hybrid">Hybrid</option>
                    <option value="Onsite">Onsite</option>
                    <option value="Remote">Remote</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="font-semibold text-zinc-700 block mb-1">Stipend</label>
                  <input
                    type="text"
                    value={editRoleForm.stipend}
                    onChange={(e) => setEditRoleForm({ ...editRoleForm, stipend: e.target.value })}
                    className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
                <div className="col-span-1">
                  <label className="font-semibold text-zinc-700 block mb-1">Openings</label>
                  <input
                    type="number"
                    min={1}
                    value={editRoleForm.openings}
                    onChange={(e) => setEditRoleForm({ ...editRoleForm, openings: Number(e.target.value) })}
                    className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
                <div className="col-span-1">
                  <label className="font-semibold text-zinc-700 block mb-1">Status</label>
                  <select
                    value={editRoleForm.status}
                    onChange={(e) => setEditRoleForm({ ...editRoleForm, status: e.target.value as any })}
                    className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
                  >
                    <option value="Open">Open</option>
                    <option value="Shortlisting">Shortlisting</option>
                    <option value="Interviewing">Interviewing</option>
                    <option value="Filled">Filled</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Location</label>
                <input
                  type="text"
                  value={editRoleForm.location}
                  onChange={(e) => setEditRoleForm({ ...editRoleForm, location: e.target.value })}
                  className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Required Skills (comma-separated)</label>
                <input
                  type="text"
                  value={editRoleForm.skills}
                  onChange={(e) => setEditRoleForm({ ...editRoleForm, skills: e.target.value })}
                  className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => handleDeleteRole(editingRole.id)}
                  className="text-red-600 hover:text-red-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Role</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditRoleModal(false)}
                    className="px-3 py-1.5 border border-zinc-200 rounded-lg text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingRole}
                    className="px-4 py-1.5 bg-zinc-900 text-white rounded-lg font-semibold hover:bg-zinc-800 disabled:opacity-50 cursor-pointer"
                  >
                    {isSavingRole ? 'Saving...' : 'Save Role'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDIT INTERN PLACEMENT DETAILS                      */}
      {/* ======================================================== */}
      {showEditInternModal && editingIntern && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-zinc-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                  <Pencil className="w-4 h-4 text-emerald-600" />
                  Edit Intern Placement: {editingIntern.studentName}
                </h3>
                <p className="text-[11px] text-zinc-500">Modify placement status, stipend, and dates.</p>
              </div>
              <button
                onClick={() => setShowEditInternModal(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveIntern} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Student / Candidate Name</label>
                <input
                  type="text"
                  required
                  value={editInternForm.studentName}
                  onChange={(e) => setEditInternForm({ ...editInternForm, studentName: e.target.value })}
                  className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Role / Designation Placed In</label>
                <input
                  type="text"
                  required
                  value={editInternForm.roleTitle}
                  onChange={(e) => setEditInternForm({ ...editInternForm, roleTitle: e.target.value })}
                  className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Status</label>
                  <select
                    value={editInternForm.status}
                    onChange={(e) => setEditInternForm({ ...editInternForm, status: e.target.value as any })}
                    className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
                  >
                    <option value="Currently Working">Currently Working</option>
                    <option value="Past Intern">Past Intern</option>
                    <option value="Brand Project Intern">Brand Project Intern</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Monthly Stipend</label>
                  <input
                    type="text"
                    value={editInternForm.stipend}
                    onChange={(e) => setEditInternForm({ ...editInternForm, stipend: e.target.value })}
                    className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Joining Date</label>
                  <input
                    type="text"
                    value={editInternForm.joiningDate}
                    onChange={(e) => setEditInternForm({ ...editInternForm, joiningDate: e.target.value })}
                    className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Duration</label>
                  <input
                    type="text"
                    value={editInternForm.duration}
                    onChange={(e) => setEditInternForm({ ...editInternForm, duration: e.target.value })}
                    className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Office Location</label>
                <input
                  type="text"
                  value={editInternForm.location}
                  onChange={(e) => setEditInternForm({ ...editInternForm, location: e.target.value })}
                  className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowEditInternModal(false)}
                  className="px-4 py-2 border border-zinc-200 rounded-lg text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingIntern}
                  className="px-4 py-2 bg-emerald-700 text-white rounded-lg font-semibold hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
                >
                  {isSavingIntern ? 'Saving...' : 'Save Placement Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: ADD JOB ROLE                                    */}
      {/* ======================================================== */}
      {showAddRoleModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-zinc-200">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-sm font-bold text-zinc-900">
                Post Role for {targetCompanyForModal?.name || activeCompanyForDrawer?.name}
              </h3>
              <button
                onClick={() => setShowAddRoleModal(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Role Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Content Creator & Video Editing Intern"
                  value={roleForm.title}
                  onChange={(e) => setRoleForm({ ...roleForm, title: e.target.value })}
                  className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Department</label>
                  <input
                    type="text"
                    value={roleForm.department}
                    onChange={(e) => setRoleForm({ ...roleForm, department: e.target.value })}
                    className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Work Mode</label>
                  <select
                    value={roleForm.workMode}
                    onChange={(e) => setRoleForm({ ...roleForm, workMode: e.target.value as any })}
                    className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
                  >
                    <option value="Hybrid">Hybrid</option>
                    <option value="Onsite">Onsite</option>
                    <option value="Remote">Remote</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Monthly Stipend</label>
                  <input
                    type="text"
                    value={roleForm.stipend}
                    onChange={(e) => setRoleForm({ ...roleForm, stipend: e.target.value })}
                    className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Openings</label>
                  <input
                    type="number"
                    min={1}
                    value={roleForm.openings}
                    onChange={(e) => setRoleForm({ ...roleForm, openings: Number(e.target.value) })}
                    className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Required Skills (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Canva, Video editing, Content Writing"
                  value={roleForm.skills}
                  onChange={(e) => setRoleForm({ ...roleForm, skills: e.target.value })}
                  className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowAddRoleModal(false)}
                  className="px-4 py-2 border border-zinc-200 rounded-lg text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-zinc-900 text-white rounded-lg font-semibold hover:bg-zinc-800 cursor-pointer"
                >
                  Post Role Requirement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: RECORD PLACED INTERN                            */}
      {/* ======================================================== */}
      {showAddInternModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-zinc-200">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-sm font-bold text-zinc-900">
                Record Placed Intern at {targetCompanyForModal?.name || activeCompanyForDrawer?.name}
              </h3>
              <button
                onClick={() => setShowAddInternModal(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordIntern} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Select Student from Directory</label>
                <select
                  value={internForm.studentId}
                  onChange={(e) => {
                    const st = students.find((s) => s.id === e.target.value);
                    setInternForm({
                      ...internForm,
                      studentId: e.target.value,
                      studentName: st ? st.name : '',
                    });
                  }}
                  className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
                >
                  <option value="">-- Choose student --</option>
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.college || 'Kolkata'} - {st.stage})
                    </option>
                  ))}
                </select>
              </div>

              {!internForm.studentId && (
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Or Enter Candidate Name Directly</label>
                  <input
                    type="text"
                    placeholder="Candidate full name"
                    value={internForm.studentName}
                    onChange={(e) => setInternForm({ ...internForm, studentName: e.target.value })}
                    className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
              )}

              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Role / Designation Placed In</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Content Writing & Video Editing Intern"
                  value={internForm.roleTitle}
                  onChange={(e) => setInternForm({ ...internForm, roleTitle: e.target.value })}
                  className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Status</label>
                  <select
                    value={internForm.status}
                    onChange={(e) => setInternForm({ ...internForm, status: e.target.value as any })}
                    className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
                  >
                    <option value="Currently Working">Currently Working</option>
                    <option value="Past Intern">Past Intern</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Monthly Stipend</label>
                  <input
                    type="text"
                    value={internForm.stipend}
                    onChange={(e) => setInternForm({ ...internForm, stipend: e.target.value })}
                    className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Joining Date</label>
                  <input
                    type="text"
                    placeholder="e.g. Nov 2025"
                    value={internForm.joiningDate}
                    onChange={(e) => setInternForm({ ...internForm, joiningDate: e.target.value })}
                    className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Duration</label>
                  <input
                    type="text"
                    placeholder="e.g. 6 Months"
                    value={internForm.duration}
                    onChange={(e) => setInternForm({ ...internForm, duration: e.target.value })}
                    className="w-full p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowAddInternModal(false)}
                  className="px-4 py-2 border border-zinc-200 rounded-lg text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingIntern}
                  className="px-4 py-2 bg-emerald-700 text-white rounded-lg font-semibold hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingIntern ? 'Saving...' : 'Record Placement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
