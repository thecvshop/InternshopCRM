import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  FileCheck,
  CheckCircle2,
  Printer,
  Download,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  User,
  Calendar,
  Building,
  GraduationCap,
  Phone,
  Mail,
  CheckSquare,
} from 'lucide-react';
import { Student, Agreement } from '../../types/crm';
import { signStudentCommitmentAgreement } from '../../services/firestoreService';

interface CommitmentAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  agreement?: Agreement | null;
  students?: Student[];
  onSignedSuccess?: (newAgreement: Agreement, studentId: string) => void;
}

export const CommitmentAgreementModal: React.FC<CommitmentAgreementModalProps> = ({
  isOpen,
  onClose,
  student,
  agreement,
  students = [],
  onSignedSuccess,
}) => {
  const [internalStudent, setInternalStudent] = useState<Student | null>(student);
  const activeStudent = student || internalStudent;

  const [signatureMode, setSignatureMode] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState(activeStudent?.name || '');
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreedWaitingPeriod, setAgreedWaitingPeriod] = useState(false);
  const [agreedTenureAndFee, setAgreedTenureAndFee] = useState(false);
  const [agreedAllTerms, setAgreedAllTerms] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  // Editable details for the agreement table
  const [details, setDetails] = useState({
    fullName: activeStudent?.name || '',
    college: activeStudent?.college || '',
    courseAndYear: `${activeStudent?.course || ''} ${activeStudent?.graduationYear ? `(${activeStudent.graduationYear})` : ''}`.trim(),
    phone: activeStudent?.phone || '',
    email: activeStudent?.email || '',
    date: new Date().toISOString().split('T')[0],
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  // Sync state when student prop changes
  useEffect(() => {
    setInternalStudent(student);
    const target = student || internalStudent;
    if (target) {
      setTypedName(target.name || '');
      setDetails({
        fullName: target.name || '',
        college: target.college || '',
        courseAndYear: `${target.course || ''} ${target.graduationYear ? `(${target.graduationYear})` : ''}`.trim(),
        phone: target.phone || '',
        email: target.email || '',
        date: new Date().toISOString().split('T')[0],
      });
    } else {
      setTypedName('');
      setDetails({
        fullName: '',
        college: '',
        courseAndYear: '',
        phone: '',
        email: '',
        date: new Date().toISOString().split('T')[0],
      });
    }
    setHasDrawn(false);
    setAgreedWaitingPeriod(false);
    setAgreedTenureAndFee(false);
    setAgreedAllTerms(false);
  }, [student, isOpen]);

  const handleSelectStudentFromList = (stId: string) => {
    const found = students.find((s) => s.id === stId);
    if (found) {
      setInternalStudent(found);
      setTypedName(found.name || '');
      setDetails({
        fullName: found.name || '',
        college: found.college || '',
        courseAndYear: `${found.course || ''} ${found.graduationYear ? `(${found.graduationYear})` : ''}`.trim(),
        phone: found.phone || '',
        email: found.email || '',
        date: new Date().toISOString().split('T')[0],
      });
    }
  };

  // Canvas drawing setup
  useEffect(() => {
    if (!isOpen || signatureMode !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [isOpen, signatureMode]);

  if (!isOpen) return null;

  const isAlreadySigned = Boolean(agreement?.status === 'Signed' || student?.agreementSigned);

  // Canvas draw handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (isAlreadySigned) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawingRef.current = true;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSubmitSignature = async () => {
    if (!activeStudent) {
      alert('Please select or specify a student before submitting the e-signature.');
      return;
    }

    let signatureDataUrl = '';
    if (signatureMode === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) return;
      signatureDataUrl = canvas.toDataURL('image/png');
    } else {
      if (!typedName.trim()) return;
      // Generate signature representation on an offscreen canvas
      const offscreen = document.createElement('canvas');
      offscreen.width = 400;
      offscreen.height = 120;
      const ctx = offscreen.getContext('2d');
      if (ctx) {
        ctx.font = 'italic 34px "Brush Script MT", "Caveat", "Dancing Script", cursive, sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.fillText(typedName.trim(), 20, 70);
        signatureDataUrl = offscreen.toDataURL('image/png');
      }
    }

    setIsSubmitting(true);
    try {
      const savedAgreement = await signStudentCommitmentAgreement(activeStudent.id, {
        studentName: details.fullName.trim() || activeStudent.name,
        signatureDataUrl,
        signatureType: signatureMode,
        participantDetails: {
          fullName: details.fullName.trim() || activeStudent.name,
          college: details.college.trim() || activeStudent.college || 'N/A',
          courseAndYear: details.courseAndYear.trim() || activeStudent.course || 'N/A',
          phone: details.phone.trim() || activeStudent.phone || 'N/A',
          email: details.email.trim() || activeStudent.email || 'N/A',
          signedDate: details.date || new Date().toISOString().split('T')[0],
        },
      });

      setSuccessToast(true);
      if (onSignedSuccess) {
        onSignedSuccess(savedAgreement, activeStudent.id);
      }
      setTimeout(() => {
        setSuccessToast(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error signing commitment agreement:', err);
      alert('Failed to save e-signed agreement. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSign =
    Boolean(activeStudent) &&
    (hasDrawn || (signatureMode === 'type' && typedName.trim().length > 1)) &&
    agreedWaitingPeriod &&
    agreedTenureAndFee &&
    agreedAllTerms &&
    !isAlreadySigned;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-zinc-200 flex flex-col max-h-[94vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150 print:border-none print:shadow-none print:max-h-none print:overflow-visible print:rounded-none">
        {/* Top Header Chrome */}
        <div className="p-4 px-6 border-b border-zinc-200 bg-zinc-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-wide">INTERNSHOP COMMITMENT AGREEMENT</h3>
                {isAlreadySigned ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Signed & Recorded in Database</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold flex items-center gap-1">
                    <span>Laptop E-Sign Station</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">
                Official onboarding legal contract between Internshop and Candidate ({activeStudent?.name || 'Student'}).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              title="Print official document or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5 text-zinc-300" />
              <span className="hidden sm:inline">Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick candidate selector banner when opened without preselected student */}
        {!student && students.length > 0 && !isAlreadySigned && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0 print:hidden">
            <div className="flex items-center gap-2 text-xs text-amber-900 font-medium">
              <User className="w-4 h-4 text-amber-600" />
              <span>Select candidate to populate and sign on this device:</span>
            </div>
            <select
              value={activeStudent?.id || ''}
              onChange={(e) => handleSelectStudentFromList(e.target.value)}
              className="text-xs bg-white border border-amber-300 rounded-lg px-2.5 py-1 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 font-medium"
            >
              <option value="">-- Choose Candidate from Database --</option>
              {students.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.college || 'Candidate'}) {st.agreementSigned ? '✓ Signed' : '⏳ Pending'}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Success Banner */}
        {successToast && (
          <div className="bg-emerald-600 text-white py-2.5 px-6 text-xs font-semibold flex items-center justify-center gap-2 animate-in slide-in-from-top shrink-0">
            <CheckCircle2 className="w-4 h-4" />
            <span>✓ Commitment Agreement successfully E-Signed! Student checklist updated in Firestore.</span>
          </div>
        )}

        {/* Document Body (Scrollable, designed like official paperwork) */}
        <div className="p-6 sm:p-10 overflow-y-auto flex-1 space-y-8 bg-zinc-50/50 print:p-0 print:bg-white print:overflow-visible">
          <div className="max-w-3xl mx-auto bg-white p-8 sm:p-12 border border-zinc-200/90 rounded-2xl shadow-sm text-zinc-800 space-y-6 print:border-none print:shadow-none print:p-0 font-serif leading-relaxed text-sm">
            {/* Document Header */}
            <div className="text-center space-y-2 border-b border-zinc-200 pb-5">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-widest text-zinc-950 uppercase font-sans">
                INTERNSHOP
              </h1>
              <h2 className="text-base sm:text-lg font-bold tracking-wider text-zinc-800 uppercase font-sans">
                COMMITMENT AGREEMENT
              </h2>
              <div className="pt-2 text-xs font-sans text-zinc-500 font-medium flex items-center justify-center gap-2">
                <span>Date:</span>
                <input
                  type="date"
                  value={details.date}
                  onChange={(e) => setDetails({ ...details, date: e.target.value })}
                  disabled={isAlreadySigned}
                  className="border-b border-zinc-300 px-1 py-0.5 text-xs bg-transparent focus:outline-none focus:border-zinc-900 font-sans"
                />
              </div>
            </div>

            {/* 1. PARTIES */}
            <section className="space-y-2">
              <h3 className="font-bold text-sm tracking-wide text-zinc-900 uppercase font-sans">
                1. PARTIES
              </h3>
              <p className="text-xs sm:text-sm text-zinc-700">
                This Agreement is entered into between:
              </p>
              <p className="text-xs sm:text-sm text-zinc-700 pl-4 border-l-2 border-zinc-200">
                <strong>Internshop</strong>, represented by <strong>Dhvani Kankaria, Founder</strong> (hereinafter referred to as “<strong>Internshop</strong>”)
              </p>
              <p className="text-xs font-sans text-zinc-500 uppercase tracking-widest pl-4">AND</p>
              <p className="text-xs sm:text-sm text-zinc-700 pl-4 border-l-2 border-zinc-200">
                <strong>The Participant</strong> (details as provided below, hereinafter referred to as “<strong>Participant</strong>”)
              </p>
            </section>

            {/* 2. BACKGROUND */}
            <section className="space-y-2">
              <h3 className="font-bold text-sm tracking-wide text-zinc-900 uppercase font-sans">
                2. BACKGROUND
              </h3>
              <p className="text-xs sm:text-sm text-zinc-700">
                Internshop offers a structured Training Programme designed to equip participants with practical,
                job-ready skills and subsequently place them into paid internship roles with partner companies.
              </p>
              <p className="text-xs sm:text-sm text-zinc-700">
                This Training Programme is offered <strong>at no cost to the Participant</strong>, subject to the Participant’s full
                compliance with the terms set out in this Agreement.
              </p>
            </section>

            {/* 3. THE COMMITMENT */}
            <section className="space-y-3">
              <h3 className="font-bold text-sm tracking-wide text-zinc-900 uppercase font-sans">
                3. THE COMMITMENT
              </h3>
              <p className="text-xs sm:text-sm text-zinc-700">
                By signing this Agreement, the Participant agrees to the following conditions in their entirety:
              </p>

              <div className="space-y-1.5 pl-3 border-l-2 border-emerald-600">
                <h4 className="font-bold text-xs sm:text-sm text-zinc-900 font-sans">
                  3.1 Placement Waiting Period
                </h4>
                <p className="text-xs sm:text-sm text-zinc-700">
                  Upon completion of the Training Programme, the Participant shall wait for a period of <strong>up to three (3)
                  weeks</strong> (or more in case of special conditions) for Internshop to secure and finalise an internship
                  placement.
                </p>
                <p className="text-xs sm:text-sm text-zinc-700">
                  During this period, the Participant shall <strong>not independently seek, accept, or join any internship, job,
                  or work engagement</strong> — whether paid or unpaid — that would conflict with or replace the placement
                  being arranged by Internshop.
                </p>
              </div>

              <div className="space-y-1.5 pl-3 border-l-2 border-emerald-600">
                <h4 className="font-bold text-xs sm:text-sm text-zinc-900 font-sans">
                  3.2 Minimum Internship Tenure
                </h4>
                <p className="text-xs sm:text-sm text-zinc-700">
                  Once placed by Internshop, the Participant shall complete a <strong>minimum period of three (3) months</strong> with the assigned company.
                </p>
                <p className="text-xs sm:text-sm text-zinc-700">
                  The Participant shall not resign, abandon, or discontinue the internship before the completion of this
                  three-month period without the prior written consent of Internshop.
                </p>
              </div>
            </section>

            {/* 4. CONVERSION TO PAID PROGRAMME */}
            <section className="space-y-2 p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl font-sans">
              <div className="flex items-center gap-1.5 text-amber-900 font-bold text-sm uppercase">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>4. CONVERSION TO PAID PROGRAMME</span>
              </div>
              <p className="text-xs font-semibold text-amber-950 italic">
                This is the most critical clause of this Agreement.
              </p>
              <p className="text-xs text-amber-900">
                If the Participant breaches <u>any</u> of the conditions outlined in Section 3 — including but not limited to:
              </p>
              <ul className="text-xs text-amber-900 list-disc pl-5 space-y-1">
                <li>a) Independently joining another company, internship, or work engagement during the placement waiting period</li>
                <li>b) Leaving the placed internship before the completion of the mandatory three-month tenure</li>
              </ul>
              <p className="text-xs font-bold text-amber-950 pt-1">
                — then the Training Programme shall <u>IMMEDIATELY AND AUTOMATICALLY BE DEEMED A PAID PROGRAMME</u>.
              </p>
              <p className="text-xs text-amber-900">
                The Participant shall become liable to pay Internshop the full programme fee of <strong>INR 3000 (Rupees
                THREE THOUSAND only)</strong> as compensation for the training, resources, mentorship, and placement
                efforts invested by Internshop.
              </p>
              <p className="text-xs font-semibold text-amber-950">
                This fee shall become due and payable immediately upon breach, without the requirement of any further notice from Internshop.
              </p>
            </section>

            {/* 5. WHAT THE PARTICIPANT RECEIVES */}
            <section className="space-y-2">
              <h3 className="font-bold text-sm tracking-wide text-zinc-900 uppercase font-sans">
                5. WHAT THE PARTICIPANT RECEIVES
              </h3>
              <p className="text-xs sm:text-sm text-zinc-700">
                In exchange for honouring this Agreement, the Participant shall receive the following benefits at no additional cost:
              </p>
              <ol className="text-xs sm:text-sm text-zinc-700 list-decimal pl-5 space-y-1.5">
                <li><strong>Free Training:</strong> Full access to Internshop’s structured Training Programme.</li>
                <li><strong>Certificate of Completion:</strong> Issued upon successful completion of the programme and placement process.</li>
                <li><strong>Community Access:</strong> Membership to the Internshop intern community, including networking, peer support, and ongoing learning opportunities.</li>
                <li><strong>Office & Resource Access:</strong> Access to Internshop’s office space and professional resources.</li>
                <li><strong>Guaranteed Paid Gig:</strong> At least one guaranteed paid work opportunity through the Internshop ecosystem.</li>
                <li><strong>Ongoing Support:</strong> Continued mentorship and guidance throughout the internship period.</li>
              </ol>
            </section>

            {/* 6. ACKNOWLEDGEMENT */}
            <section className="space-y-2">
              <h3 className="font-bold text-sm tracking-wide text-zinc-900 uppercase font-sans">
                6. ACKNOWLEDGEMENT
              </h3>
              <p className="text-xs sm:text-sm text-zinc-700">
                By signing below, the Participant confirms and acknowledges that:
              </p>
              <ul className="text-xs sm:text-sm text-zinc-700 list-disc pl-5 space-y-1">
                <li>c) They have read and fully understood all terms of this Agreement.</li>
                <li>d) They are entering into this Agreement voluntarily and without coercion.</li>
                <li>e) They understand that the Training Programme is offered free of charge solely on the condition of their full compliance with this Agreement.</li>
                <li>f) They accept that any breach of this Agreement will result in the automatic conversion of the programme to a paid engagement, and they shall be fully liable for the programme fee.</li>
                <li>g) They acknowledge that Internshop’s placement opportunities are of equal or greater value than alternatives they may independently find.</li>
              </ul>
            </section>

            {/* 7. PARTICIPANT DETAILS & SIGNATURES */}
            <section className="space-y-4 pt-2 font-sans">
              <h3 className="font-bold text-sm tracking-wide text-zinc-900 uppercase">
                7. PARTICIPANT DETAILS & SIGNATURES
              </h3>

              {/* Participant Information Table */}
              <div className="border border-zinc-300 rounded-xl overflow-hidden text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 border-b border-zinc-200 bg-zinc-50">
                  <span className="p-2.5 font-bold text-zinc-700 sm:border-r border-zinc-200">Full Name</span>
                  <div className="col-span-2 p-2">
                    <input
                      type="text"
                      disabled={isAlreadySigned}
                      value={details.fullName}
                      onChange={(e) => setDetails({ ...details, fullName: e.target.value })}
                      placeholder="Candidate Full Name"
                      className="w-full bg-transparent px-2 py-1 font-semibold text-zinc-900 focus:outline-none focus:bg-white rounded"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 border-b border-zinc-200 bg-white">
                  <span className="p-2.5 font-bold text-zinc-700 sm:border-r border-zinc-200">College / Institution</span>
                  <div className="col-span-2 p-2">
                    <input
                      type="text"
                      disabled={isAlreadySigned}
                      value={details.college}
                      onChange={(e) => setDetails({ ...details, college: e.target.value })}
                      placeholder="e.g. St. Xavier's College, Kolkata"
                      className="w-full bg-transparent px-2 py-1 text-zinc-900 focus:outline-none focus:bg-zinc-50 rounded"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 border-b border-zinc-200 bg-zinc-50">
                  <span className="p-2.5 font-bold text-zinc-700 sm:border-r border-zinc-200">Course & Year</span>
                  <div className="col-span-2 p-2">
                    <input
                      type="text"
                      disabled={isAlreadySigned}
                      value={details.courseAndYear}
                      onChange={(e) => setDetails({ ...details, courseAndYear: e.target.value })}
                      placeholder="e.g. B.Com Marketing (Final Year 2026)"
                      className="w-full bg-transparent px-2 py-1 text-zinc-900 focus:outline-none focus:bg-white rounded"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 border-b border-zinc-200 bg-white">
                  <span className="p-2.5 font-bold text-zinc-700 sm:border-r border-zinc-200">Phone Number</span>
                  <div className="col-span-2 p-2">
                    <input
                      type="tel"
                      disabled={isAlreadySigned}
                      value={details.phone}
                      onChange={(e) => setDetails({ ...details, phone: e.target.value })}
                      placeholder="10-digit mobile number"
                      className="w-full bg-transparent px-2 py-1 text-zinc-900 focus:outline-none focus:bg-zinc-50 rounded"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 bg-zinc-50">
                  <span className="p-2.5 font-bold text-zinc-700 sm:border-r border-zinc-200">Email Address</span>
                  <div className="col-span-2 p-2">
                    <input
                      type="email"
                      disabled={isAlreadySigned}
                      value={details.email}
                      onChange={(e) => setDetails({ ...details, email: e.target.value })}
                      placeholder="candidate@email.com"
                      className="w-full bg-transparent px-2 py-1 text-zinc-900 focus:outline-none focus:bg-white rounded"
                    />
                  </div>
                </div>
              </div>

              {/* Signatures Columns (Participant & Internshop) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                {/* FOR THE PARTICIPANT */}
                <div className="p-4 border border-zinc-300 rounded-xl space-y-3 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider text-zinc-900">
                      FOR THE PARTICIPANT
                    </span>
                    {!isAlreadySigned && (
                      <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-lg text-[10px]">
                        <button
                          type="button"
                          onClick={() => setSignatureMode('draw')}
                          className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                            signatureMode === 'draw' ? 'bg-white shadow-2xs text-zinc-900' : 'text-zinc-500'
                          }`}
                        >
                          Draw
                        </button>
                        <button
                          type="button"
                          onClick={() => setSignatureMode('type')}
                          className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                            signatureMode === 'type' ? 'bg-white shadow-2xs text-zinc-900' : 'text-zinc-500'
                          }`}
                        >
                          Type
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Signature display / drawing area */}
                  {isAlreadySigned ? (
                    <div className="h-28 border border-emerald-200 rounded-lg bg-emerald-50/40 p-2 flex flex-col items-center justify-center">
                      {agreement?.signatureDataUrl ? (
                        <img
                          src={agreement.signatureDataUrl}
                          alt="Student Signature"
                          className="max-h-20 max-w-full object-contain"
                        />
                      ) : (
                        <div className="font-serif italic text-lg text-zinc-900">
                          {student?.name || 'Verified Signature'}
                        </div>
                      )}
                      <span className="text-[10px] text-emerald-700 font-semibold mt-1">
                        ✓ Digitally Signed on {student?.agreementSignedAt ? new Date(student.agreementSignedAt).toLocaleDateString() : details.date}
                      </span>
                    </div>
                  ) : signatureMode === 'draw' ? (
                    <div className="space-y-1.5">
                      <div className="relative border-2 border-dashed border-zinc-300 rounded-lg bg-zinc-50/80 overflow-hidden group hover:border-zinc-400 transition">
                        <canvas
                          ref={canvasRef}
                          width={340}
                          height={110}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                          className="w-full h-28 touch-none cursor-crosshair block"
                        />
                        {!hasDrawn && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-zinc-400 text-xs">
                            ✍️ Sign with touchpad / mouse here
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-zinc-500">
                        <span>Sign directly on laptop screen / trackpad</span>
                        {hasDrawn && (
                          <button
                            type="button"
                            onClick={clearCanvas}
                            className="text-rose-600 hover:text-rose-800 flex items-center gap-1 font-medium cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Clear</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="border border-zinc-300 rounded-lg p-3 bg-zinc-50 h-28 flex flex-col justify-center">
                        <input
                          type="text"
                          value={typedName}
                          onChange={(e) => setTypedName(e.target.value)}
                          placeholder="Type full legal name..."
                          className="w-full bg-transparent text-xl italic font-serif text-zinc-900 border-b border-zinc-300 focus:outline-none focus:border-zinc-900 pb-1"
                        />
                        <span className="text-[10px] text-zinc-400 mt-2 block">
                          Legal electronic signature generated for: {typedName || details.fullName}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-zinc-200 flex justify-between text-xs text-zinc-600">
                    <span>Signature: <strong>{details.fullName || 'Participant'}</strong></span>
                    <span>Date: <strong>{details.date}</strong></span>
                  </div>
                </div>

                {/* FOR INTERNSHOP */}
                <div className="p-4 border border-zinc-300 rounded-xl space-y-3 bg-zinc-50/50">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider text-zinc-900">
                      FOR INTERNSHOP
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-semibold">
                      Authorised Signatory
                    </span>
                  </div>

                  {/* Dhvani Kankaria Signature representation */}
                  <div className="h-28 border border-zinc-200 rounded-lg bg-white p-3 flex flex-col items-center justify-center relative overflow-hidden">
                    <svg
                      viewBox="0 0 240 80"
                      className="w-48 h-16 text-zinc-900 fill-none stroke-current stroke-2"
                      style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.05))' }}
                    >
                      <path
                        d="M 20 45 C 30 20, 45 15, 55 35 C 65 55, 75 60, 90 35 C 105 10, 110 50, 130 35 C 145 20, 155 45, 175 30 C 190 20, 205 35, 220 25 M 35 30 L 210 28"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <text
                        x="30"
                        y="68"
                        className="text-[14px] fill-zinc-900 font-serif italic"
                        stroke="none"
                      >
                        Dhvani Kankaria
                      </text>
                    </svg>
                    <div className="absolute right-3 bottom-2 text-[9px] text-zinc-400 font-mono">
                      FOUNDER • SEAL
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-200 flex justify-between text-xs text-zinc-600">
                    <span>Signatory: <strong>Dhvani Kankaria, Founder</strong></span>
                    <span>Date: <strong>{details.date}</strong></span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Bottom Laptop Action Bar (Acknowledgement Checkboxes & E-Sign Button) */}
        {!isAlreadySigned && (
          <div className="p-4 px-6 border-t border-zinc-200 bg-white shrink-0 space-y-3 print:hidden">
            <div className="space-y-1.5 text-xs text-zinc-700 bg-zinc-50 p-3 rounded-xl border border-zinc-200">
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreedWaitingPeriod}
                  onChange={(e) => setAgreedWaitingPeriod(e.target.checked)}
                  className="mt-0.5 rounded text-zinc-900 focus:ring-zinc-900"
                />
                <span>
                  <strong>3-Week Placement Period:</strong> I agree to wait up to 3 weeks for Internshop to secure my internship and will not independently take another gig during this window.
                </span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreedTenureAndFee}
                  onChange={(e) => setAgreedTenureAndFee(e.target.checked)}
                  className="mt-0.5 rounded text-zinc-900 focus:ring-zinc-900"
                />
                <span>
                  <strong>3-Month Mandatory Tenure & INR 3,000 Fee:</strong> I agree to complete minimum 3 months with my placed company, and understand breaching these terms converts the program to a paid engagement with a <strong>mandatory INR 3,000 fee</strong> payable immediately.
                </span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreedAllTerms}
                  onChange={(e) => setAgreedAllTerms(e.target.checked)}
                  className="mt-0.5 rounded text-zinc-900 focus:ring-zinc-900"
                />
                <span>
                  <strong>Voluntary Execution:</strong> I have reviewed all 7 sections of this Commitment Agreement on this device and willingly provide my digital e-signature.
                </span>
              </label>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="text-xs text-zinc-500">
                {!activeStudent ? (
                  <span className="text-amber-600 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Please select an enrolled student in the banner above before e-signing.</span>
                  </span>
                ) : !canSign ? (
                  <span className="text-amber-600 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Please provide your signature and check all 3 acknowledgement boxes to submit.</span>
                  </span>
                ) : (
                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Ready to submit. Signing will update {details.fullName}’s database checklist.</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-zinc-200 hover:bg-zinc-100 text-zinc-700 font-medium text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitSignature}
                  disabled={!canSign || isSubmitting}
                  className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-xl transition cursor-pointer flex items-center gap-2 shadow-xs"
                >
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <span>{isSubmitting ? 'Recording E-Signature...' : 'E-Sign & Save to Database'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {isAlreadySigned && (
          <div className="p-4 px-6 border-t border-zinc-200 bg-emerald-50/60 shrink-0 flex items-center justify-between print:hidden">
            <div className="flex items-center gap-2 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>
                <strong>Agreement Verified:</strong> This commitment agreement was e-signed by {details.fullName} and is active in the database.
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-semibold hover:bg-zinc-800 transition cursor-pointer"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
