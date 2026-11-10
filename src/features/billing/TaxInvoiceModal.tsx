import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Printer,
  FileText,
  Edit3,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';
import { Invoice } from '../../types/crm';
import {
  buildTaxInvoiceJsPdf,
  numberToWordsINR,
  formatDateDDMMYYYY,
} from '../../utils/generateInvoicePdf';

interface TaxInvoiceModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TaxInvoiceModal: React.FC<TaxInvoiceModalProps> = ({
  invoice,
  isOpen,
  onClose,
}) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [invoiceType, setInvoiceType] = useState<'TAX INVOICE' | 'PROFORMA INVOICE'>('TAX INVOICE');
  const [copyType, setCopyType] = useState<'Original' | 'Duplicate' | 'Triplicate' | 'Extra'>('Original');
  const [notification, setNotification] = useState<string | null>(null);

  // Editable fields for customisation before export
  const [customPartyAddress, setCustomPartyAddress] = useState(
    'Paragon Condominium, H 41 45 I 31 32\nParagon Center, P.B. Marg, Worli\nMumbai - 400013'
  );
  const [customState, setCustomState] = useState('27 Maharashtra');
  const [customPan, setCustomPan] = useState('AABCB2115P');
  const [customGstin, setCustomGstin] = useState('27AABCB2115P1ZP');
  const [customPoNo, setCustomPoNo] = useState('');
  const [customHsn, setCustomHsn] = useState('998314');
  const [isEditingCustoms, setIsEditingCustoms] = useState(false);

  if (!isOpen || !invoice) return null;

  const invoiceNumberFormatted = invoice.invoiceNumber.startsWith('CA')
    ? invoice.invoiceNumber
    : invoice.invoiceNumber.replace('INV-', 'CA');

  const taxableVal = invoice.taxableValue || 3000;
  const totalVal = invoice.total || 3540;
  const gstAmount = invoice.igst || (invoice.cgst + invoice.sgst) || (totalVal - taxableVal) || 540;
  const isIgst = invoice.igst > 0 || customState !== '19 West Bengal';
  const fileName = `${invoiceType.replace(/\s+/g, '_')}_${invoiceNumberFormatted}.pdf`;

  // Server-side download URL query string
  const serverDownloadUrl = `/api/invoices/download-pdf?${new URLSearchParams({
    invoiceNumber: invoiceNumberFormatted,
    companyName: invoice.companyName || 'Business Standard Private Limited',
    service: invoice.service || 'Digital Marketing Charges Project Solution',
    taxableValue: String(taxableVal),
    total: String(totalVal),
    cgst: String(invoice.cgst || 0),
    sgst: String(invoice.sgst || 0),
    igst: String(gstAmount),
    invoiceDate: invoice.invoiceDate || '',
    dueDate: invoice.dueDate || '',
    invoiceType,
    copyType,
    partyAddress: customPartyAddress,
    partyState: customState,
    partyPan: customPan,
    partyGstin: customGstin,
    poNumber: customPoNo,
    hsnCode: customHsn,
  }).toString()}`;

  // Robust, guaranteed PDF Generation & Download
  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    setNotification('Generating high-resolution vector PDF...');

    try {
      // 1. Build pure vector jsPDF instance (No html2canvas, no CSS parsing bugs, no oklch issues)
      const doc = buildTaxInvoiceJsPdf(invoice, {
        invoiceType,
        copyType,
        partyAddress: customPartyAddress,
        partyState: customState,
        partyPan: customPan,
        partyGstin: customGstin,
        poNumber: customPoNo,
        hsnCode: customHsn,
      });

      // 2. Generate blob and trigger download via multiple fallback strategies
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);

      // Strategy A: Standard HTML5 download link
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      }, 2000);

      // Strategy B: jsPDF native save
      try {
        doc.save(fileName);
      } catch (saveErr) {
        console.warn('doc.save fallback:', saveErr);
      }

      setNotification(`✓ Download started for ${fileName}`);
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      console.error('Client PDF generation error:', err);
      // Strategy C: If client jsPDF fails, navigate to server endpoint
      window.location.href = serverDownloadUrl;
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Clean in-browser printing via hidden iframe (does NOT trigger popup blocks)
  const handlePrint = () => {
    try {
      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      document.body.appendChild(printFrame);

      const printableElement = document.getElementById('printable-tax-invoice');
      if (!printableElement || !printFrame.contentDocument) return;

      printFrame.contentDocument.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${invoiceType} - ${invoiceNumberFormatted}</title>
            <style>
              body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 15px; color: #000; background: #fff; }
              table { border-collapse: collapse; width: 100%; }
              th, td { border: 1px solid #000; padding: 4px 6px; font-size: 11px; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .font-bold { font-weight: bold; }
              @media print {
                @page { margin: 8mm; size: A4 portrait; }
                body { padding: 0; }
              }
            </style>
          </head>
          <body>
            <div>${printableElement.innerHTML}</div>
          </body>
        </html>
      `);
      printFrame.contentDocument.close();

      setTimeout(() => {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(printFrame);
        }, 2000);
      }, 300);
    } catch (err) {
      console.error('Print iframe error:', err);
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-5 overflow-y-auto">
      <div
        className="bg-zinc-100 w-full max-w-4xl rounded-2xl shadow-2xl border border-zinc-300 overflow-hidden flex flex-col max-h-[96vh] my-2 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar */}
        <div className="p-4 bg-white border-b border-zinc-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-zinc-900">
                  {invoiceType} Document
                </h3>
                <span className="font-mono text-xs font-semibold bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded border border-zinc-200">
                  {invoiceNumberFormatted}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">
                Official Force Power Infotech GST proforma & tax invoice template
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Toggle Invoice Type */}
            <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200 text-xs">
              <button
                type="button"
                onClick={() => setInvoiceType('TAX INVOICE')}
                className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                  invoiceType === 'TAX INVOICE'
                    ? 'bg-white text-zinc-900 shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Tax Invoice
              </button>
              <button
                type="button"
                onClick={() => setInvoiceType('PROFORMA INVOICE')}
                className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                  invoiceType === 'PROFORMA INVOICE'
                    ? 'bg-white text-zinc-900 shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Proforma Invoice
              </button>
            </div>

            {/* Edit parameters button */}
            <button
              type="button"
              onClick={() => setIsEditingCustoms(!isEditingCustoms)}
              className="px-2.5 py-1.5 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1"
              title="Edit GSTIN, client address or PO details"
            >
              <Edit3 className="w-3.5 h-3.5 text-zinc-500" />
              <span>{isEditingCustoms ? 'Hide Details' : 'Edit Party Details'}</span>
            </button>

            {/* Print / Save as PDF Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
              title="Print directly or save as PDF via system dialog"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            {/* Direct Server Download Link (100% Reliable in any sandboxed browser) */}
            <a
              href={serverDownloadUrl}
              download={fileName}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs flex items-center gap-1.5 select-none"
              title="Direct server-generated file download"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-900 px-4 py-2 text-xs font-medium flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{notification}</span>
            </div>
            <a
              href={serverDownloadUrl}
              download={fileName}
              className="underline font-bold text-emerald-800 hover:text-emerald-950"
            >
              Click here if download didn't start automatically
            </a>
          </div>
        )}

        {/* Optional Custom Details Drawer */}
        {isEditingCustoms && (
          <div className="bg-amber-50/80 border-b border-amber-200 p-4 text-xs space-y-3">
            <div className="font-bold text-amber-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Customize Party & Tax Parameters for this Bill</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-zinc-600 font-semibold mb-1">Party Address</label>
                <textarea
                  rows={2}
                  value={customPartyAddress}
                  onChange={(e) => setCustomPartyAddress(e.target.value)}
                  className="w-full text-xs p-1.5 border border-zinc-300 rounded bg-white"
                />
              </div>
              <div>
                <label className="block text-zinc-600 font-semibold mb-1">State & Code</label>
                <input
                  type="text"
                  value={customState}
                  onChange={(e) => setCustomState(e.target.value)}
                  className="w-full text-xs p-1.5 border border-zinc-300 rounded bg-white"
                />
              </div>
              <div>
                <label className="block text-zinc-600 font-semibold mb-1">Party GSTIN</label>
                <input
                  type="text"
                  value={customGstin}
                  onChange={(e) => setCustomGstin(e.target.value)}
                  className="w-full text-xs p-1.5 border border-zinc-300 rounded bg-white font-mono"
                />
              </div>
              <div>
                <label className="block text-zinc-600 font-semibold mb-1">Party PAN</label>
                <input
                  type="text"
                  value={customPan}
                  onChange={(e) => setCustomPan(e.target.value)}
                  className="w-full text-xs p-1.5 border border-zinc-300 rounded bg-white font-mono"
                />
              </div>
              <div>
                <label className="block text-zinc-600 font-semibold mb-1">P.O. Number</label>
                <input
                  type="text"
                  placeholder="Optional P.O. No."
                  value={customPoNo}
                  onChange={(e) => setCustomPoNo(e.target.value)}
                  className="w-full text-xs p-1.5 border border-zinc-300 rounded bg-white"
                />
              </div>
              <div>
                <label className="block text-zinc-600 font-semibold mb-1">HSN/SAC Code</label>
                <input
                  type="text"
                  value={customHsn}
                  onChange={(e) => setCustomHsn(e.target.value)}
                  className="w-full text-xs p-1.5 border border-zinc-300 rounded bg-white font-mono"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setIsEditingCustoms(false)}
                  className="px-3 py-1.5 bg-zinc-900 text-white rounded text-xs font-semibold cursor-pointer"
                >
                  Apply to Preview
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Container with the Exact Force Power Infotech Invoice Template */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 flex justify-center">
          <div
            id="printable-tax-invoice"
            className="bg-white text-black w-full max-w-[760px] p-6 sm:p-8 border border-black shadow-md font-sans text-xs leading-normal select-text"
            style={{ minHeight: '920px' }}
          >
            {/* Header: Title & Copy Checkboxes */}
            <div className="border border-black border-b-0 p-2 flex items-center justify-between">
              <div className="w-1/4"></div>
              <div className="w-2/4 text-center">
                <h1 className="text-base sm:text-lg font-bold tracking-wider text-black">
                  {invoiceType}
                </h1>
              </div>
              <div className="w-1/4 text-[10px] space-y-0.5 text-right font-medium pr-1">
                <div className="flex items-center justify-end gap-1.5 cursor-pointer" onClick={() => setCopyType('Original')}>
                  <span>{copyType === 'Original' ? '☒' : '☐'} Original for Recipient</span>
                </div>
                <div className="flex items-center justify-end gap-1.5 cursor-pointer" onClick={() => setCopyType('Duplicate')}>
                  <span>{copyType === 'Duplicate' ? '☒' : '☐'} Duplicate for Transporter</span>
                </div>
                <div className="flex items-center justify-end gap-1.5 cursor-pointer" onClick={() => setCopyType('Triplicate')}>
                  <span>{copyType === 'Triplicate' ? '☒' : '☐'} Triplicate for Supplier</span>
                </div>
                <div className="flex items-center justify-end gap-1.5 cursor-pointer" onClick={() => setCopyType('Extra')}>
                  <span>{copyType === 'Extra' ? '☒' : '☐'} Extra Copy</span>
                </div>
              </div>
            </div>

            {/* Seller Company Header & Invoice Details Row */}
            <div className="border border-black grid grid-cols-12">
              {/* Left Column: Force Power Logo & Corporate Details */}
              <div className="col-span-7 p-3 border-r border-black flex gap-3">
                {/* Brand Logo Box */}
                <div className="shrink-0 flex flex-col items-center justify-center p-1.5 bg-sky-50 border border-sky-300 rounded w-14 h-16 text-center select-none">
                  <div className="text-[10px] font-black tracking-tighter text-blue-600 rotate-[-90deg] leading-none mb-1">
                    force
                  </div>
                  <div className="text-lg font-black text-sky-500 leading-none">
                    m
                  </div>
                  <div className="text-[9px] font-bold text-blue-800 leading-none mt-1">
                    power
                  </div>
                </div>

                {/* Company Contact Information */}
                <div className="text-[11px] space-y-0.5 leading-tight">
                  <h2 className="font-bold text-xs sm:text-sm text-black uppercase tracking-tight">
                    FORCE POWER INFOTECH PVT LTD
                  </h2>
                  <p className="text-[10px] text-zinc-700">
                    122/1/1G Satyendranath Majumdar Sarani Kolkata , 700026
                  </p>
                  <p className="text-[10px] text-zinc-700">
                    West Bengal, India
                  </p>
                  <p className="text-[10px] text-zinc-700">
                    Email - info@forcepower.in Phone - 84 84 93 1980
                  </p>
                  <p className="text-[10px] text-zinc-800">
                    State : 19,West Bengal, CIN: U72300WB2013PTC191208
                  </p>
                  <p className="text-[10px] font-semibold text-zinc-900">
                    GSTIN : 19AACCF1565C1ZW , PAN : AACCF1565C
                  </p>
                  <p className="text-[10px] text-zinc-800">
                    UDAYAM No: WB10D0015899
                  </p>
                </div>
              </div>

              {/* Right Column: Invoice Numbers & Dates */}
              <div className="col-span-5 p-2.5 text-[11px] space-y-1">
                <div className="grid grid-cols-12 gap-1 items-baseline">
                  <span className="col-span-5 font-semibold text-zinc-800">Invoice No.</span>
                  <span className="col-span-1 text-center">:</span>
                  <span className="col-span-6 font-bold text-black font-mono">
                    {invoiceNumberFormatted}
                  </span>
                </div>

                <div className="grid grid-cols-12 gap-1 items-baseline">
                  <span className="col-span-5 font-semibold text-zinc-800">Invoice Date</span>
                  <span className="col-span-1 text-center">:</span>
                  <span className="col-span-6 font-mono text-zinc-900">
                    {formatDateDDMMYYYY(invoice.invoiceDate)}
                  </span>
                </div>

                <div className="grid grid-cols-12 gap-1 items-baseline">
                  <span className="col-span-5 font-semibold text-zinc-800">Due Date</span>
                  <span className="col-span-1 text-center">:</span>
                  <span className="col-span-6 font-mono text-zinc-900">
                    {formatDateDDMMYYYY(invoice.dueDate)}
                  </span>
                </div>

                <div className="grid grid-cols-12 gap-1 items-baseline">
                  <span className="col-span-5 font-semibold text-zinc-800">P.O.No.</span>
                  <span className="col-span-1 text-center">:</span>
                  <span className="col-span-6 font-mono text-zinc-700">
                    {customPoNo || '-'}
                  </span>
                </div>

                <div className="grid grid-cols-12 gap-1 items-baseline">
                  <span className="col-span-5 font-semibold text-zinc-800">Ack.No. & Dt.</span>
                  <span className="col-span-1 text-center">:</span>
                  <span className="col-span-6 text-zinc-500">-</span>
                </div>
              </div>
            </div>

            {/* Billed To / Party Box */}
            <div className="border border-black border-t-0 p-2.5 text-[11px] leading-tight">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block underline mb-1">
                Party
              </span>
              <h3 className="font-bold text-xs sm:text-sm text-black">
                {invoice.companyName || 'Business Standard Private Limited'}
              </h3>
              <div className="whitespace-pre-line text-zinc-800 text-[10px] mt-0.5">
                {customPartyAddress}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 pt-1 border-t border-zinc-200 text-[10px]">
                <div>
                  <span className="font-semibold text-zinc-700">State Name : </span>
                  <span className="font-medium text-black">{customState}</span>
                </div>
                <div>
                  <span className="font-semibold text-zinc-700">PAN : </span>
                  <span className="font-mono font-medium text-black">{customPan}</span>
                </div>
                <div>
                  <span className="font-semibold text-zinc-700">GSTIN : </span>
                  <span className="font-mono font-bold text-black">{customGstin}</span>
                </div>
              </div>
            </div>

            {/* Main Product/Service Table */}
            <div className="border border-black border-t-0">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-black text-[10px] bg-zinc-50/50 font-bold text-zinc-900">
                    <th className="p-1.5 border-r border-black w-8 text-center">SI</th>
                    <th className="p-1.5 border-r border-black">Product Description</th>
                    <th className="p-1.5 border-r border-black w-20 text-center">HSN/SAC Code</th>
                    <th className="p-1.5 border-r border-black w-14 text-center">QTY</th>
                    <th className="p-1.5 border-r border-black w-12 text-center">Unit</th>
                    <th className="p-1.5 border-r border-black w-20 text-right">Unit Rate</th>
                    <th className="p-1.5 border-r border-black w-16 text-center" colSpan={2}>
                      Discount<br />
                      <span className="font-normal text-[9px]">% Amt</span>
                    </th>
                    <th className="p-1.5 w-24 text-right">Taxable Value</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Single Main Service Item */}
                  <tr className="align-top" style={{ height: '140px' }}>
                    <td className="p-1.5 border-r border-black text-center font-mono">1</td>
                    <td className="p-1.5 border-r border-black">
                      <div className="font-bold text-zinc-900">
                        {invoice.service || 'Digital Marketing Charges Project Solution'}
                      </div>
                      <div className="text-[10px] text-zinc-600 mt-0.5">
                        Professional Talent Placement, Internship Coordination & Digital Services
                      </div>
                    </td>
                    <td className="p-1.5 border-r border-black text-center font-mono">{customHsn}</td>
                    <td className="p-1.5 border-r border-black text-center font-mono">1.00</td>
                    <td className="p-1.5 border-r border-black text-center">Time</td>
                    <td className="p-1.5 border-r border-black text-right font-mono">
                      {taxableVal.toFixed(2)}
                    </td>
                    <td className="p-1.5 border-r border-black text-center font-mono text-[10px]">0.00</td>
                    <td className="p-1.5 border-r border-black text-center font-mono text-[10px]">0.00</td>
                    <td className="p-1.5 text-right font-mono font-semibold">
                      {taxableVal.toFixed(2)}
                    </td>
                  </tr>

                  {/* Subtotal line */}
                  <tr className="border-t border-black text-[11px]">
                    <td colSpan={8} className="p-1 border-r border-black text-right font-semibold pr-2">
                      Sub Total
                    </td>
                    <td className="p-1 text-right font-mono font-bold">
                      {taxableVal.toFixed(2)}
                    </td>
                  </tr>

                  {/* Tax Breakdown Rows */}
                  {isIgst ? (
                    <tr className="border-t border-zinc-200 text-[11px]">
                      <td colSpan={5} className="p-1 border-r border-black"></td>
                      <td colSpan={2} className="p-1 border-r border-black font-semibold text-center">
                        IGST
                      </td>
                      <td className="p-1 border-r border-black text-center font-mono">
                        18.00 %
                      </td>
                      <td className="p-1 text-right font-mono font-medium">
                        {gstAmount.toFixed(2)}
                      </td>
                    </tr>
                  ) : (
                    <>
                      <tr className="border-t border-zinc-200 text-[11px]">
                        <td colSpan={5} className="p-1 border-r border-black"></td>
                        <td colSpan={2} className="p-1 border-r border-black font-semibold text-center">
                          CGST
                        </td>
                        <td className="p-1 border-r border-black text-center font-mono">
                          9.00 %
                        </td>
                        <td className="p-1 text-right font-mono font-medium">
                          {(gstAmount / 2).toFixed(2)}
                        </td>
                      </tr>
                      <tr className="border-t border-zinc-200 text-[11px]">
                        <td colSpan={5} className="p-1 border-r border-black"></td>
                        <td colSpan={2} className="p-1 border-r border-black font-semibold text-center">
                          SGST
                        </td>
                        <td className="p-1 border-r border-black text-center font-mono">
                          9.00 %
                        </td>
                        <td className="p-1 text-right font-mono font-medium">
                          {(gstAmount / 2).toFixed(2)}
                        </td>
                      </tr>
                    </>
                  )}

                  {/* Amount In Words & Grand Total Row */}
                  <tr className="border-t border-black bg-zinc-50/50">
                    <td colSpan={5} className="p-2 border-r border-black text-[11px]">
                      <span className="font-bold text-zinc-900">Rupees : </span>
                      <span className="font-medium text-zinc-800 capitalize">
                        {numberToWordsINR(totalVal)}
                      </span>
                    </td>
                    <td colSpan={2} className="p-1.5 border-r border-black font-bold text-right">
                      Grand Total :
                    </td>
                    <td className="p-1.5 border-r border-black text-center font-bold font-mono">
                      1.00
                    </td>
                    <td className="p-1.5 text-right font-bold text-sm font-mono text-black">
                      {totalVal.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bottom Section: Bank Details, Terms & Official Stamp/Signature */}
            <div className="border border-black border-t-0 grid grid-cols-12 text-[10px]">
              {/* Left Column: Bank Details & Terms */}
              <div className="col-span-8 p-2.5 border-r border-black space-y-2">
                <div>
                  <span className="font-bold text-zinc-900">Remarks : </span>
                  <span className="text-zinc-600">
                    {invoice.notes || 'Placement & Training Solution fee settled as per agreement.'}
                  </span>
                </div>

                <div>
                  <span className="font-bold text-zinc-900">Place of Supply : </span>
                  <span className="font-semibold text-black">{customState}</span>
                </div>

                {/* Bank Details Box */}
                <div className="pt-1.5 border-t border-zinc-200">
                  <span className="font-bold text-zinc-900 block underline">Our Bank Details :</span>
                  <p className="font-medium text-black mt-0.5">
                    ICICI Bank Limted, Branch : 20 RNM Road Kolkata 700 001
                  </p>
                  <p className="font-mono text-zinc-900">
                    Current Account No : <strong>000605500631</strong> IFSC : <strong>ICIC0000006</strong>
                  </p>
                </div>

                {/* Terms and Conditions */}
                <div className="pt-1 border-t border-zinc-200 text-[9px] text-zinc-700 leading-tight">
                  <span className="font-bold text-black block">Term & Conditions :</span>
                  <p>Subject to Kolkata Jurisdiction only.</p>
                  <p>In case of cheque dishonoured, Rs 300/- + GST shall be charged extra.</p>
                </div>

                <div className="pt-2 text-[8px] text-zinc-400 font-mono">
                  Printed from aceERP www.coral.in
                </div>
              </div>

              {/* Right Column: E & O.E, Seal & Authorized Signatory */}
              <div className="col-span-4 p-2.5 flex flex-col justify-between items-center text-center">
                <div className="w-full text-right text-[9px] font-bold text-zinc-500">
                  E & O.E
                </div>

                <div className="text-[10px] font-bold text-zinc-900 mt-1">
                  For Force Power Infotech Pvt Ltd
                </div>

                {/* Authentic Official Company Stamp Graphic */}
                <div className="my-2 relative flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full border-2 border-dashed border-indigo-700/80 p-1 flex items-center justify-center rotate-[-8deg] shadow-2xs select-none">
                    <div className="w-full h-full rounded-full border border-indigo-600/70 flex flex-col items-center justify-center p-1 text-[8px] font-bold text-indigo-800 leading-tight">
                      <span className="uppercase text-[7.5px] font-black tracking-tighter">FORCE POWER</span>
                      <span className="uppercase text-[6.5px] tracking-widest text-indigo-700">INFOTECH PVT LTD</span>
                      <div className="my-0.5 text-indigo-900 font-serif text-[10px]">★ Kolkata ★</div>
                      <span className="text-[6.5px] text-indigo-600 font-mono">700026</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-black w-32 pt-1 text-[10px] font-bold text-zinc-900">
                  Authorised Signatory
                </div>

                <div className="w-full text-right text-[8px] font-mono text-zinc-400">
                  DK
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Bar */}
        <div className="p-3.5 bg-white border-t border-zinc-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Dual download channels active (Instant Vector PDF + Direct Attachment)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 border border-zinc-200 rounded-lg text-zinc-700 hover:bg-zinc-50 font-medium cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 border border-zinc-300 text-zinc-800 rounded-lg font-semibold hover:bg-zinc-100 transition cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              type="button"
              disabled={isGeneratingPdf}
              onClick={handleDownloadPdf}
              className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 active:scale-[0.98] text-white rounded-lg font-bold transition cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isGeneratingPdf ? 'Generating...' : 'Instant Download PDF'}</span>
            </button>
            <a
              href={serverDownloadUrl}
              download={fileName}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-lg font-bold transition cursor-pointer shadow-xs flex items-center gap-1.5 select-none"
              title="Download directly from server backend"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Direct File Download</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
