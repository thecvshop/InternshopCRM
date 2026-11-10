import { CompleteJobDescription } from '../../../types/crm';

/**
 * Triggers a pristine, high-resolution PDF download via browser print engine
 * with custom print stylesheets, company branding, and crisp typography.
 */
export function downloadJobDescriptionPdf(jd: CompleteJobDescription): void {
  const printWindow = window.open('', '_blank', 'width=900,height=1100');
  if (!printWindow) {
    alert('Please allow popups to download the Job Description PDF');
    return;
  }

  const isRenter = jd.jobCategory === 'renter';
  const categoryLabel = isRenter ? 'Rent an Intern — Gig / Event Contract' : 'Career Role — Full-Time / Internship';
  const categoryColor = isRenter ? '#059669' : '#4f46e5';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${jd.jobTitle} - ${jd.companyName} JD</title>
  <style>
    @page {
      size: A4;
      margin: 16mm 18mm 16mm 18mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #18181b;
      line-height: 1.5;
      font-size: 13px;
      margin: 0;
      padding: 24px;
      background: #ffffff;
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid #e4e4e7;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .company-logo {
      max-width: 130px;
      max-height: 60px;
      object-fit: contain;
      border-radius: 6px;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-radius: 4px;
      margin-bottom: 6px;
    }
    .job-title {
      font-size: 24px;
      font-weight: 800;
      color: #09090b;
      margin: 4px 0 2px 0;
      line-height: 1.2;
    }
    .company-subtitle {
      font-size: 13px;
      color: #52525b;
      font-weight: 500;
    }
    .meta-grid {
      display: table;
      width: 100%;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 22px;
    }
    .meta-row {
      display: table-row;
    }
    .meta-cell {
      display: table-cell;
      padding: 4px 12px;
      vertical-align: top;
      font-size: 11.5px;
    }
    .meta-label {
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
      display: block;
      margin-bottom: 2px;
    }
    .meta-value {
      font-weight: 600;
      color: #0f172a;
    }
    .section {
      margin-bottom: 18px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 12.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #0f172a;
      border-left: 3px solid ${categoryColor};
      padding-left: 8px;
      margin: 0 0 8px 0;
    }
    .bullet-list {
      margin: 0;
      padding-left: 18px;
    }
    .bullet-list li {
      margin-bottom: 4px;
      color: #334155;
    }
    .tag-container {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 4px;
    }
    .tag {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      color: #334155;
    }
    .footer {
      margin-top: 30px;
      padding-top: 14px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10.5px;
      color: #64748b;
    }
    @media print {
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>

  <!-- Top Header Table -->
  <table class="header-table" style="width: 100%;">
    <tr>
      <td style="vertical-align: top;">
        <span class="badge" style="background: ${isRenter ? '#ecfdf5' : '#eef2ff'}; color: ${categoryColor}; border: 1px solid ${isRenter ? '#a7f3d0' : '#c7d2fe'};">
          ${categoryLabel}
        </span>
        <h1 class="job-title">${escapeHtml(jd.jobTitle)}</h1>
        <div class="company-subtitle">
          <strong>${escapeHtml(jd.companyName)}</strong>
          ${jd.companyWebsite ? ` • <a href="https://${jd.companyWebsite.replace(/^https?:\/\//, '')}" style="color: #6366f1; text-decoration: none;">${escapeHtml(jd.companyWebsite)}</a>` : ''}
          ${jd.companyLocation ? ` • ${escapeHtml(jd.companyLocation)}` : ''}
        </div>
      </td>
      <td style="vertical-align: top; text-align: right; width: 150px;">
        ${jd.companyLogoUrl ? `<img src="${escapeHtml(jd.companyLogoUrl)}" class="company-logo" alt="${escapeHtml(jd.companyName)} Logo" onerror="this.style.display='none'" />` : ''}
      </td>
    </tr>
  </table>

  <!-- Meta Summary Grid -->
  <div class="meta-grid">
    <div class="meta-row">
      <div class="meta-cell">
        <span class="meta-label">Work Mode</span>
        <span class="meta-value">${escapeHtml(jd.workMode || 'On-site')}</span>
      </div>
      <div class="meta-cell">
        <span class="meta-label">Location</span>
        <span class="meta-value">${escapeHtml(jd.locationAddress || 'Kolkata, India')}</span>
      </div>
      <div class="meta-cell">
        <span class="meta-label">Duration / Dates</span>
        <span class="meta-value">${escapeHtml(jd.durationOrDates || 'Immediate')}</span>
      </div>
      <div class="meta-cell">
        <span class="meta-label">Compensation</span>
        <span class="meta-value" style="color: #059669; font-weight: 700;">${escapeHtml(jd.compensationText || 'Best in Industry')}</span>
      </div>
    </div>
    <div class="meta-row" style="margin-top: 6px;">
      <div class="meta-cell">
        <span class="meta-label">Role Type</span>
        <span class="meta-value">${escapeHtml(jd.employmentType || 'Standard')}</span>
      </div>
      <div class="meta-cell">
        <span class="meta-label">Openings</span>
        <span class="meta-value">${jd.openings || 1} Position(s)</span>
      </div>
      <div class="meta-cell">
        <span class="meta-label">Timings</span>
        <span class="meta-value">${escapeHtml(jd.timings || 'Standard hours')}</span>
      </div>
      <div class="meta-cell">
        <span class="meta-label">Deadline</span>
        <span class="meta-value">${escapeHtml(jd.applicationDeadline || 'Rolling basis')}</span>
      </div>
    </div>
  </div>

  ${jd.companyAbout ? `
  <div class="section">
    <h3 class="section-title">About ${escapeHtml(jd.companyName)}</h3>
    <p style="margin: 0; color: #334155; line-height: 1.6;">${escapeHtml(jd.companyAbout)}</p>
  </div>` : ''}

  ${jd.roleSummary ? `
  <div class="section">
    <h3 class="section-title">Role Overview</h3>
    <p style="margin: 0; color: #334155; line-height: 1.6;">${escapeHtml(jd.roleSummary)}</p>
  </div>` : ''}

  ${jd.responsibilities && jd.responsibilities.length > 0 ? `
  <div class="section">
    <h3 class="section-title">Key Responsibilities</h3>
    <ul class="bullet-list">
      ${jd.responsibilities.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}
    </ul>
  </div>` : ''}

  ${jd.requirements && jd.requirements.length > 0 ? `
  <div class="section">
    <h3 class="section-title">Candidate Requirements & Qualifications</h3>
    <ul class="bullet-list">
      ${jd.requirements.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}
    </ul>
  </div>` : ''}

  ${jd.deliverables && jd.deliverables.length > 0 ? `
  <div class="section">
    <h3 class="section-title">Expected Deliverables</h3>
    <ul class="bullet-list">
      ${jd.deliverables.map((d) => `<li>${escapeHtml(d)}</li>`).join('')}
    </ul>
  </div>` : ''}

  ${jd.perksAndBenefits && jd.perksAndBenefits.length > 0 ? `
  <div class="section">
    <h3 class="section-title">Perks, Benefits & Compensation</h3>
    <ul class="bullet-list">
      ${jd.perksAndBenefits.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}
    </ul>
  </div>` : ''}

  ${jd.selectionProcess && jd.selectionProcess.length > 0 ? `
  <div class="section">
    <h3 class="section-title">Selection & Application Process</h3>
    <ol style="margin: 0; padding-left: 18px;">
      ${jd.selectionProcess.map((s) => `<li style="margin-bottom: 3px; color: #334155;">${escapeHtml(s)}</li>`).join('')}
    </ol>
  </div>` : ''}

  <!-- Footer -->
  <div class="footer">
    <div>
      <span>Verified Opportunity by <strong>InternsHome</strong></span>
      ${jd.contactEmail ? ` • Apply via: <a href="mailto:${escapeHtml(jd.contactEmail)}" style="color: #6366f1;">${escapeHtml(jd.contactEmail)}</a>` : ''}
    </div>
    <div>
      <span>Generated on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 350);
    };
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

function escapeHtml(text?: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
