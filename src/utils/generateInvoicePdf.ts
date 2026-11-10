import { jsPDF } from 'jspdf';
import { Invoice } from '../types/crm';

export interface InvoicePdfOptions {
  invoiceType?: 'TAX INVOICE' | 'PROFORMA INVOICE';
  copyType?: 'Original' | 'Duplicate' | 'Triplicate' | 'Extra';
  partyAddress?: string;
  partyState?: string;
  partyPan?: string;
  partyGstin?: string;
  poNumber?: string;
  hsnCode?: string;
}

// Convert numbers to Indian Rupees in words
export function numberToWordsINR(amount: number): string {
  if (!amount || amount === 0) return 'Zero Rupees only.';

  const singleDigits = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const twoDigits = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tensMultiple = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertBelowThousand(n: number): string {
    let str = '';
    if (n >= 100) {
      str += singleDigits[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += tensMultiple[Math.floor(n / 10)] + ' ';
      n %= 10;
    } else if (n >= 10) {
      str += twoDigits[n - 10] + ' ';
      return str.trim();
    }
    if (n > 0) {
      str += singleDigits[n] + ' ';
    }
    return str.trim();
  }

  const intPart = Math.floor(amount);
  const crore = Math.floor(intPart / 10000000);
  const lakh = Math.floor((intPart % 10000000) / 100000);
  const thousand = Math.floor((intPart % 100000) / 1000);
  const remainder = intPart % 1000;

  let result = '';
  if (crore > 0) result += convertBelowThousand(crore) + ' Crore ';
  if (lakh > 0) result += convertBelowThousand(lakh) + ' Lakh ';
  if (thousand > 0) result += convertBelowThousand(thousand) + ' Thousand ';
  if (remainder > 0) result += convertBelowThousand(remainder) + ' ';

  result = result.trim();
  return result ? `${result} only.` : 'Zero only.';
}

export function formatDateDDMMYYYY(dateStr?: string): string {
  if (!dateStr) {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  }
  if (dateStr.includes('/')) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Generates a pixel-perfect, pure vector jsPDF document
 * matching the official FORCE POWER INFOTECH PVT LTD Tax/Proforma Invoice.
 * 
 * Does NOT depend on html2canvas or Tailwind styles, eliminating any oklch color parsing errors.
 */
export function buildTaxInvoiceJsPdf(
  invoice: Invoice,
  options: InvoicePdfOptions = {}
): jsPDF {
  const {
    invoiceType = 'TAX INVOICE',
    copyType = 'Original',
    partyAddress = 'Paragon Condominium, H 41 45 I 31 32\nParagon Center, P.B. Marg, Worli\nMumbai - 400013',
    partyState = '27 Maharashtra',
    partyPan = 'AABCB2115P',
    partyGstin = '27AABCB2115P1ZP',
    poNumber = '',
    hsnCode = '998314',
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const startX = 12;
  const endX = pageWidth - 12;
  const contentWidth = endX - startX; // 186mm

  let curY = 12;

  // Outer border box around the entire invoice
  const boxTop = curY;
  const boxBottom = 285;
  const boxHeight = boxBottom - boxTop;

  // Set line properties
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);

  // 1. TOP HEADER BANNER (Title & Copy Checkboxes)
  const headerHeight = 14;
  doc.rect(startX, curY, contentWidth, headerHeight);

  // Title in Center
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text(invoiceType, startX + contentWidth / 2, curY + 9, { align: 'center' });

  // Copy Checkboxes on Right
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const copyX = endX - 45;
  const checkMark = (type: string) => (copyType === type ? '[X]' : '[  ]');
  doc.text(`${checkMark('Original')} Original for Recipient`, copyX, curY + 3.8);
  doc.text(`${checkMark('Duplicate')} Duplicate for Transporter`, copyX, curY + 6.8);
  doc.text(`${checkMark('Triplicate')} Triplicate for Supplier`, copyX, curY + 9.8);
  doc.text(`${checkMark('Extra')} Extra Copy`, copyX, curY + 12.8);

  curY += headerHeight;

  // 2. COMPANY HEADER & INVOICE DETAILS ROW
  const companyRowHeight = 44;
  doc.rect(startX, curY, contentWidth, companyRowHeight);

  // Vertical divider between Company (60%) and Invoice details (40%)
  const dividerX = startX + 112;
  doc.line(dividerX, curY, dividerX, curY + companyRowHeight);

  // Company Details (Left)
  // Logo placeholder box
  doc.setFillColor(240, 248, 255);
  doc.rect(startX + 3, curY + 4, 14, 16, 'F');
  doc.setDrawColor(56, 140, 230);
  doc.rect(startX + 3, curY + 4, 14, 16, 'S');
  doc.setDrawColor(0, 0, 0);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(30, 90, 200);
  doc.text('FORCE', startX + 10, curY + 8, { align: 'center' });
  doc.setFontSize(10);
  doc.text('m', startX + 10, curY + 13, { align: 'center' });
  doc.setFontSize(6);
  doc.text('POWER', startX + 10, curY + 17, { align: 'center' });

  // Company Text
  const compX = startX + 20;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('FORCE POWER INFOTECH PVT LTD', compX, curY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('122/1/1G Satyendranath Majumdar Sarani Kolkata , 700026', compX, curY + 12);
  doc.text('West Bengal, India', compX, curY + 16);
  doc.text('Email - info@forcepower.in  Phone - 84 84 93 1980', compX, curY + 20);
  doc.text('State : 19,West Bengal, CIN: U72300WB2013PTC191208', compX, curY + 24);
  doc.setFont('helvetica', 'bold');
  doc.text('GSTIN : 19AACCF1565C1ZW , PAN : AACCF1565C', compX, curY + 29);
  doc.setFont('helvetica', 'normal');
  doc.text('UDAYAM No: WB10D0015899', compX, curY + 34);

  // Invoice Details (Right)
  const invMetaX = dividerX + 3;
  const invoiceNum = invoice.invoiceNumber.startsWith('CA')
    ? invoice.invoiceNumber
    : invoice.invoiceNumber.replace('INV-', 'CA');

  const metaRows = [
    { label: 'Invoice No.', value: invoiceNum, isBold: true },
    { label: 'Invoice Date', value: formatDateDDMMYYYY(invoice.invoiceDate), isBold: false },
    { label: 'Due Date', value: formatDateDDMMYYYY(invoice.dueDate), isBold: false },
    { label: 'P.O.No.', value: poNumber || '-', isBold: false },
    { label: 'Ack.No. & Dt.', value: '-', isBold: false },
  ];

  let metaY = curY + 7;
  for (const row of metaRows) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(row.label, invMetaX, metaY);
    doc.text(':', invMetaX + 25, metaY);

    if (row.isBold) {
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setFont('helvetica', 'normal');
    }
    doc.text(row.value, invMetaX + 29, metaY);
    metaY += 7;
  }

  curY += companyRowHeight;

  // 3. BILLED TO / PARTY BOX
  const partyHeight = 32;
  doc.rect(startX, curY, contentWidth, partyHeight);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Party', startX + 3, curY + 5);

  doc.setFontSize(9.5);
  doc.text(invoice.companyName || 'Business Standard Private Limited', startX + 3, curY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const addressLines = partyAddress.split('\n');
  let addrY = curY + 14.5;
  for (const line of addressLines) {
    doc.text(line, startX + 3, addrY);
    addrY += 4;
  }

  // Horizontal sub-line for State, PAN, GSTIN
  const partyBottomBarY = curY + partyHeight - 7;
  doc.line(startX, partyBottomBarY, endX, partyBottomBarY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('State Name :', startX + 3, partyBottomBarY + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.text(partyState, startX + 22, partyBottomBarY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.text('PAN :', startX + 75, partyBottomBarY + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.text(partyPan, startX + 85, partyBottomBarY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.text('GSTIN :', startX + 130, partyBottomBarY + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.text(partyGstin, startX + 142, partyBottomBarY + 4.5);

  curY += partyHeight;

  // 4. MAIN ITEMS TABLE
  const tableTopY = curY;
  const tableHeaderHeight = 9;
  const tableHeight = 92;

  doc.rect(startX, tableTopY, contentWidth, tableHeight);

  // Column definitions (widths in mm)
  // Total = 186mm
  const cols = [
    { id: 'sl', width: 10, align: 'center', header: 'SI' },
    { id: 'desc', width: 70, align: 'left', header: 'Product Description' },
    { id: 'hsn', width: 20, align: 'center', header: 'HSN/SAC\nCode' },
    { id: 'qty', width: 15, align: 'center', header: 'QTY' },
    { id: 'unit', width: 13, align: 'center', header: 'Unit' },
    { id: 'rate', width: 22, align: 'right', header: 'Unit Rate' },
    { id: 'disc', width: 14, align: 'center', header: 'Discount\n%  Amt' },
    { id: 'taxable', width: 22, align: 'right', header: 'Taxable Value' },
  ];

  // Draw header background
  doc.setFillColor(248, 248, 248);
  doc.rect(startX, tableTopY, contentWidth, tableHeaderHeight, 'F');
  doc.line(startX, tableTopY + tableHeaderHeight, endX, tableTopY + tableHeaderHeight);

  // Draw header column dividers & labels
  let curColX = startX;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);

  for (let i = 0; i < cols.length; i++) {
    const col = cols[i];
    if (i > 0) {
      doc.line(curColX, tableTopY, curColX, tableTopY + tableHeight);
    }

    const headerX = col.align === 'center'
      ? curColX + col.width / 2
      : col.align === 'right'
      ? curColX + col.width - 2
      : curColX + 2;

    if (col.header.includes('\n')) {
      const parts = col.header.split('\n');
      doc.text(parts[0], headerX, tableTopY + 3.5, { align: col.align as any });
      doc.text(parts[1], headerX, tableTopY + 7, { align: col.align as any });
    } else {
      doc.text(col.header, headerX, tableTopY + 6, { align: col.align as any });
    }

    curColX += col.width;
  }

  // Render Table Item Row 1
  const itemRowY = tableTopY + tableHeaderHeight + 6;
  const taxableVal = invoice.taxableValue || 3000;
  const totalVal = invoice.total || 3540;
  const gstAmount = invoice.igst || (invoice.cgst + invoice.sgst) || (totalVal - taxableVal) || 540;
  const isIgst = invoice.igst > 0 || partyState !== '19 West Bengal';

  // SI
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('1', startX + cols[0].width / 2, itemRowY, { align: 'center' });

  // Description
  const descColX = startX + cols[0].width + 2;
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.service || 'Digital Marketing Charges Project Solution', descColX, itemRowY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  doc.text('Professional Talent Placement & Industry Project Solution', descColX, itemRowY + 4);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);

  // HSN
  const hsnColX = startX + cols[0].width + cols[1].width + cols[2].width / 2;
  doc.text(hsnCode, hsnColX, itemRowY, { align: 'center' });

  // QTY
  const qtyColX = startX + cols[0].width + cols[1].width + cols[2].width + cols[3].width / 2;
  doc.text('1.00', qtyColX, itemRowY, { align: 'center' });

  // Unit
  const unitColX = startX + cols[0].width + cols[1].width + cols[2].width + cols[3].width + cols[4].width / 2;
  doc.text('Time', unitColX, itemRowY, { align: 'center' });

  // Unit Rate
  const rateColX = startX + cols[0].width + cols[1].width + cols[2].width + cols[3].width + cols[4].width + cols[5].width - 2;
  doc.text(taxableVal.toFixed(2), rateColX, itemRowY, { align: 'right' });

  // Discount % & Amt
  const discColX = startX + cols[0].width + cols[1].width + cols[2].width + cols[3].width + cols[4].width + cols[5].width + cols[6].width / 2;
  doc.setFontSize(7);
  doc.text('0.00   0.00', discColX, itemRowY, { align: 'center' });
  doc.setFontSize(8);

  // Taxable Value
  const taxColX = endX - 2;
  doc.text(taxableVal.toFixed(2), taxColX, itemRowY, { align: 'right' });

  // Table Subtotal and Tax Rows at Bottom of Table
  const subTotalY = tableTopY + tableHeight - 20;
  doc.line(startX, subTotalY, endX, subTotalY);

  // Sub Total line
  doc.setFont('helvetica', 'bold');
  doc.text('Sub Total', startX + contentWidth - cols[7].width - 4, subTotalY + 4.5, { align: 'right' });
  doc.text(taxableVal.toFixed(2), endX - 2, subTotalY + 4.5, { align: 'right' });

  // Tax Row (IGST or CGST/SGST)
  const taxRowY = subTotalY + 6;
  doc.line(startX + cols[0].width + cols[1].width + cols[2].width + cols[3].width + cols[4].width, taxRowY, endX, taxRowY);

  if (isIgst) {
    const taxLabelX = startX + cols[0].width + cols[1].width + cols[2].width + cols[3].width + cols[4].width + 2;
    doc.setFont('helvetica', 'normal');
    doc.text('IGST', taxLabelX, taxRowY + 4.5);
    doc.text('18.00 %', taxLabelX + 16, taxRowY + 4.5);
    doc.text(gstAmount.toFixed(2), endX - 2, taxRowY + 4.5, { align: 'right' });
  } else {
    const halfGst = gstAmount / 2;
    const taxLabelX = startX + cols[0].width + cols[1].width + cols[2].width + cols[3].width + cols[4].width + 2;
    doc.setFont('helvetica', 'normal');
    doc.text('CGST', taxLabelX, taxRowY + 3.5);
    doc.text('9.00 %', taxLabelX + 16, taxRowY + 3.5);
    doc.text(halfGst.toFixed(2), endX - 2, taxRowY + 3.5, { align: 'right' });

    doc.text('SGST', taxLabelX, taxRowY + 6.5);
    doc.text('9.00 %', taxLabelX + 16, taxRowY + 6.5);
    doc.text(halfGst.toFixed(2), endX - 2, taxRowY + 6.5, { align: 'right' });
  }

  // Grand Total & Amount In Words Row
  const grandTotalRowY = tableTopY + tableHeight - 8;
  doc.line(startX, grandTotalRowY, endX, grandTotalRowY);

  // Amount In Words (Left 65%)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Rupees :', startX + 3, grandTotalRowY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.text(numberToWordsINR(totalVal), startX + 16, grandTotalRowY + 5.5);

  // Grand Total (Right 35%)
  doc.setFont('helvetica', 'bold');
  doc.text('Grand Total :', endX - cols[7].width - cols[6].width - 6, grandTotalRowY + 5.5, { align: 'right' });
  doc.text('1.00', startX + cols[0].width + cols[1].width + cols[2].width + cols[3].width / 2, grandTotalRowY + 5.5, { align: 'center' });
  doc.setFontSize(9);
  doc.text(totalVal.toFixed(2), endX - 2, grandTotalRowY + 5.5, { align: 'right' });

  curY += tableHeight;

  // 5. FOOTER: BANK DETAILS, TERMS & AUTHORISED SIGNATORY
  const footerHeight = boxBottom - curY;
  doc.rect(startX, curY, contentWidth, footerHeight);

  // Vertical divider between Bank/Terms (65%) and Signatory (35%)
  const footerDivX = startX + 120;
  doc.line(footerDivX, curY, footerDivX, curY + footerHeight);

  // Remarks
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Remarks :', startX + 3, curY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.notes || 'Placement solution charges settled as per agreement.', startX + 18, curY + 5);

  // Place of Supply
  doc.setFont('helvetica', 'bold');
  doc.text('Place of Supply :', startX + 3, curY + 10);
  doc.setFont('helvetica', 'normal');
  doc.text(partyState, startX + 27, curY + 10);

  // Bank Details
  doc.line(startX, curY + 13, footerDivX, curY + 13);
  doc.setFont('helvetica', 'bold');
  doc.text('Our Bank Details :', startX + 3, curY + 17.5);

  doc.setFont('helvetica', 'normal');
  doc.text('ICICI Bank Limted, Branch : 20 RNM Road Kolkata 700 001', startX + 3, curY + 22);
  doc.text('Current Account No 000605500631 IFSC : ICIC0000006', startX + 3, curY + 26);

  // Terms and Conditions
  doc.line(startX, curY + 29, footerDivX, curY + 29);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('Term & Conditions :', startX + 3, curY + 33);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Subject to Kolkata Jurisdiction only.', startX + 3, curY + 36.5);
  doc.text('In case of cheque dishonoured, Rs 300/- + GST shall be charged extra.', startX + 3, curY + 39.5);

  doc.setFontSize(6);
  doc.setTextColor(120, 120, 120);
  doc.text('Printed from aceERP www.coral.in', startX + 3, curY + footerHeight - 3);
  doc.setTextColor(0, 0, 0);

  // Right Side: E & O.E, Seal & Authorised Signatory
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('E & O.E', endX - 3, curY + 5, { align: 'right' });

  doc.setFontSize(7.5);
  doc.text('For Force Power Infotech Pvt Ltd', footerDivX + (endX - footerDivX) / 2, curY + 11, { align: 'center' });

  // Official Circular Company Seal in Vector
  const stampCenterX = footerDivX + (endX - footerDivX) / 2;
  const stampCenterY = curY + 26;

  doc.setDrawColor(50, 40, 160);
  doc.setLineWidth(0.4);
  doc.circle(stampCenterX, stampCenterY, 11);
  doc.circle(stampCenterX, stampCenterY, 9.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.8);
  doc.setTextColor(50, 40, 160);
  doc.text('FORCE POWER INFOTECH', stampCenterX, stampCenterY - 4.5, { align: 'center' });
  doc.text('PVT. LTD.', stampCenterX, stampCenterY - 1.5, { align: 'center' });
  doc.setFontSize(6);
  doc.text('* Kolkata *', stampCenterX, stampCenterY + 2.5, { align: 'center' });
  doc.setFontSize(4.5);
  doc.text('700026', stampCenterX, stampCenterY + 5.5, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);

  // Signatory Line
  doc.line(stampCenterX - 18, curY + footerHeight - 9, stampCenterX + 18, curY + footerHeight - 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Authorised Signatory', stampCenterX, curY + footerHeight - 5.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('DK', endX - 3, curY + footerHeight - 3, { align: 'right' });

  return doc;
}
