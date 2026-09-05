const { BrowserWindow, app } = require('electron');
const path = require('path');
const fs = require('fs');

function formatRupiah(val) {
  if (val === null || val === undefined || isNaN(val)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
}

const MONTH_NAMES_INDO = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

function generateUniqueReportNumber(unit, year, month, revenue = 0) {
  const unitCode = unit === 'Restaurant' ? 'RST' : 'BGW';
  const mStr = String(month).padStart(2, '0');
  let hash = 0;
  const seed = `${unit}-${year}-${month}-${revenue}`;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(4, '0').slice(-4);
  return `No: ANDA-${unitCode}/${year}-${mStr}/${hex}`;
}

function generateHtmlContent(reportData, settings, unit, year, month, options = {}) {
  const {
    rows = [],
    totalRevenue = 0,
    taxRate = 0.10,
    taxDue = 0,
    netRevenue = 0,
    daysInMonth = 31,
    activeDaysCount = 0,
    zeroDaysCount = 0,
    avgPerDay = 0,
    maxRevenue = 0,
    minRevenueNonZero = 0
  } = reportData;

  const showSignatures = options?.showSignatures !== false;
  const reportNumber = options?.reportNumber || generateUniqueReportNumber(unit, year, month, totalRevenue);
  const monthName = MONTH_NAMES_INDO[month] || `Bulan ${month}`;
  const businessName = settings?.businessName || 'ANDA BUNGALOWS & RESTAURANT';
  const businessAddress = settings?.businessAddress || 'Jalan Pariwisata Pantai Kuta, Kecamatan Pujut, Lombok Tengah, NTB';
  const contactNumber = settings?.contactNumber || 'HP/WhatsApp: 087750665000';
  const npwpd = settings?.npwpd || 'P.2.0001234.01.23';
  const signName = settings?.signName || 'Pimpinan / Pengelola';

  // SVG Bar Chart generation with ample margins for axes
  const maxBarVal = Math.max(maxRevenue, 1);
  const chartHeight = 85;
  const chartWidth = 460;
  const leftMargin = 38;
  const bottomBaseline = 98;
  const availableWidth = chartWidth - leftMargin - 15;
  const barWidth = Math.max(5, Math.floor(availableWidth / daysInMonth) - 2);

  let barElements = '';
  rows.forEach((r, i) => {
    const bHeight = Math.round((r.amount / maxBarVal) * chartHeight);
    const x = leftMargin + 4 + i * (barWidth + 2);
    const y = bottomBaseline - bHeight;
    const color = r.amount > 0 ? '#334155' : '#e2e8f0';
    barElements += `<rect x="${x}" y="${y}" width="${barWidth}" height="${bHeight}" fill="${color}" rx="1" />`;
    if ((i + 1) % 3 === 1 || i === daysInMonth - 1) {
      barElements += `<text x="${x + barWidth / 2}" y="${bottomBaseline + 11}" font-size="7.5" fill="#475569" text-anchor="middle">${r.dayNumber}</text>`;
    }
  });

  // Table rows HTML
  let tableRowsHtml = '';
  rows.forEach((r, idx) => {
    const hasIncome = r.amount > 0;
    const bg = idx % 2 === 1 ? '#f8fafc' : '#ffffff';
    tableRowsHtml += `
      <tr style="background-color: ${bg}; height: 15px;">
        <td style="border: 1px solid #cbd5e1; text-align: center; color: #475569; font-weight: 500; padding: 1px 2px;">${r.no}</td>
        <td style="border: 1px solid #cbd5e1; text-align: center; font-family: monospace; font-size: 8.5px; white-space: nowrap; padding: 1px 4px;">${r.date}</td>
        <td style="border: 1px solid #cbd5e1; text-align: center; color: #334155; white-space: nowrap; padding: 1px 2px;">${r.dayName}</td>
        <td style="border: 1px solid #cbd5e1; text-align: right; font-weight: ${hasIncome ? '600' : '400'}; color: ${hasIncome ? '#0f172a' : '#94a3b8'}; white-space: nowrap; padding: 1px 4px;">${formatRupiah(r.amount)}</td>
        <td style="border: 1px solid #cbd5e1; text-align: center; font-size: 8px; white-space: nowrap; color: ${hasIncome ? '#047857' : '#94a3b8'}; font-weight: ${hasIncome ? '600' : '400'}; padding: 1px 2px;">${r.status}</td>
        <td style="border: 1px solid #cbd5e1; text-align: right; font-weight: 500; color: #1e293b; white-space: nowrap; padding: 1px 4px;">${formatRupiah(r.cumulative)}</td>
      </tr>
    `;
  });

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Laporan Pendapatan ${unit}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 4mm 6mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #ffffff !important;
      color: #0f172a !important;
      margin: 0;
      padding: 0;
      width: 100%;
    }
    .doc-page {
      width: 100%;
      background: #ffffff;
      padding: 6px 12px;
    }
    .kop {
      text-align: center;
      border-bottom: 1px solid #94a3b8;
      padding-bottom: 4px;
      margin-bottom: 6px;
      position: relative;
    }
    .kop h1 {
      margin: 0;
      font-size: 14px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0f172a;
    }
    .kop h2 {
      margin: 2px 0 0 0;
      font-size: 11.5px;
      font-weight: 700;
      text-transform: uppercase;
      color: #1e293b;
    }
    .kop p {
      margin: 1px 0 0 0;
      font-size: 9px;
      color: #64748b;
    }
    .doc-num-tag {
      position: absolute;
      left: 0;
      top: 2px;
      font-size: 8px;
      font-weight: 700;
      color: #334155;
      font-family: monospace;
      border: 1px solid #cbd5e1;
      padding: 2px 6px;
      background: #f8fafc;
      border-radius: 3px;
    }
    .periode-tag {
      position: absolute;
      right: 0;
      top: 2px;
      font-size: 9.5px;
      font-weight: 700;
      color: #0f172a;
      border: 1px solid #cbd5e1;
      padding: 2px 6px;
      background: #f8fafc;
      border-radius: 3px;
    }
    .meta-bar {
      display: flex;
      justify-content: space-between;
      font-size: 9.5px;
      color: #334155;
      padding: 2px 0 4px 0;
      border-bottom: 1px solid #e2e8f0;
      margin-bottom: 6px;
    }
    .kpi-row {
      display: flex;
      gap: 8px;
      margin-bottom: 6px;
    }
    .kpi-box {
      flex: 1;
      border: 1px solid #cbd5e1;
      border-radius: 3px;
      overflow: hidden;
      text-align: center;
    }
    .kpi-title {
      background: #f1f5f9;
      font-size: 8.5px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 2px 0;
      color: #475569;
      border-bottom: 1px solid #e2e8f0;
    }
    .kpi-val {
      padding: 3px 0;
      font-size: 12px;
      font-weight: 800;
      color: #0f172a;
    }
    .stats-strip {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 4px 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 3px 8px;
      font-size: 8.5px;
      margin-bottom: 6px;
      border-radius: 3px;
    }
    .stats-item {
      display: flex;
      justify-content: space-between;
    }
    .main-grid {
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }
    .table-col {
      width: 480px;
      flex-shrink: 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5px;
    }
    th {
      background: #f1f5f9;
      color: #0f172a;
      font-weight: 700;
      border: 1px solid #cbd5e1;
      padding: 2px 3px;
      text-align: center;
    }
    .footer-total {
      background: #e2e8f0;
      font-weight: 800;
      border-top: 1.5px solid #475569;
    }
    .side-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .chart-container {
      border: 1px solid #e2e8f0;
      border-radius: 3px;
      padding: 4px;
      background: #ffffff;
    }
    .summary-card {
      border: 1px solid #cbd5e1;
      border-radius: 3px;
      overflow: hidden;
      font-size: 8.5px;
    }
    .summary-card-header {
      background: #f1f5f9;
      font-weight: 700;
      text-align: center;
      padding: 2px;
      border-bottom: 1px solid #cbd5e1;
      text-transform: uppercase;
      font-size: 8px;
      color: #334155;
    }
    .summary-card-row {
      display: flex;
      justify-content: space-between;
      padding: 2px 6px;
      border-bottom: 1px solid #f1f5f9;
    }
    .catatan {
      border: 1px solid #e2e8f0;
      background: #fafafa;
      border-radius: 3px;
      padding: 3px 6px;
      font-size: 7.5px;
      color: #475569;
      line-height: 1.2;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      text-align: center;
      font-size: 8.5px;
      padding-top: 4px;
    }
    .signatures > div {
      width: 48%;
    }
    .sign-space {
      height: 28px;
    }
  </style>
</head>
<body>
  <div class="doc-page">
    
    <!-- KOP -->
    <div class="kop">
      <div class="doc-num-tag">${reportNumber}</div>
      <div class="periode-tag">Periode: ${monthName} ${year}</div>
      <h1>LAPORAN PENDAPATAN ${unit.toUpperCase()}</h1>
      <h2>${businessName}</h2>
      <p><strong>NPWPD: ${npwpd}</strong> &bull; ${businessAddress} &bull; ${contactNumber}</p>
    </div>

    <!-- META BAR -->
    <div class="meta-bar">
      <div>
        <span>NPWPD: <strong>${npwpd}</strong></span> &nbsp;&nbsp;|&nbsp;&nbsp;
        <span>Bulan: <strong>${monthName}</strong></span> &nbsp;&nbsp;|&nbsp;&nbsp;
        <span>Tahun: <strong>${year}</strong></span>
      </div>
      <div>
        <span>Tarif Pajak Daerah: <strong>${(taxRate * 100).toFixed(0)}%</strong></span>
      </div>
    </div>

    <!-- 3 KPI BOXES (PURE WHITE & CLEAN) -->
    <div class="kpi-row">
      <div class="kpi-box">
        <div class="kpi-title">TOTAL PENDAPATAN KOTOR</div>
        <div class="kpi-val">${formatRupiah(totalRevenue)}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-title">PAJAK TERUTANG (10%)</div>
        <div class="kpi-val" style="color: #b91c1c;">${formatRupiah(taxDue)}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-title">PENDAPATAN SETELAH PAJAK</div>
        <div class="kpi-val" style="color: #047857;">${formatRupiah(netRevenue)}</div>
      </div>
    </div>

    <!-- STATS STRIP -->
    <div class="stats-strip">
      <div class="stats-item"><span>Jumlah Hari:</span> <strong>${daysInMonth} Hari</strong></div>
      <div class="stats-item"><span>Hari Berpendapatan:</span> <strong>${activeDaysCount} Hari</strong></div>
      <div class="stats-item"><span>Hari Tanpa Pendapatan:</span> <strong>${zeroDaysCount} Hari</strong></div>
      <div class="stats-item"><span>Rata-rata per Hari:</span> <strong>${formatRupiah(avgPerDay)}</strong></div>
      <div class="stats-item"><span>Pendapatan Tertinggi:</span> <strong>${formatRupiah(maxRevenue)}</strong></div>
      <div class="stats-item"><span>Pendapatan Terendah &gt; 0:</span> <strong>${minRevenueNonZero > 0 ? formatRupiah(minRevenueNonZero) : 'Rp 0'}</strong></div>
    </div>

    <!-- MAIN GRID (TABLE + CHART/SUMMARY) -->
    <div class="main-grid">
      
      <!-- LEFT TABLE -->
      <div class="table-col">
        <table>
          <thead>
            <tr>
              <th style="width: 24px;">No.</th>
              <th style="width: 72px;">Tanggal</th>
              <th style="width: 48px;">Hari</th>
              <th style="width: 95px; text-align: right;">Pendapatan (Rp)</th>
              <th style="width: 95px;">Status</th>
              <th style="width: 95px; text-align: right;">Akumulasi (Rp)</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
            <tr class="footer-total" style="height: 16px;">
              <td colspan="3" style="border: 1px solid #94a3b8; text-align: center; font-weight: 800; font-size: 8.5px;">TOTAL PERIODE</td>
              <td style="border: 1px solid #94a3b8; text-align: right; padding: 1px 4px; font-weight: 800; font-size: 9px; white-space: nowrap;">${formatRupiah(totalRevenue)}</td>
              <td style="border: 1px solid #94a3b8; text-align: center; font-weight: 800; color: #b91c1c; font-size: 8.5px;">PAJAK 10%</td>
              <td style="border: 1px solid #94a3b8; text-align: right; padding: 1px 4px; font-weight: 800; color: #b91c1c; font-size: 9px; white-space: nowrap;">${formatRupiah(taxDue)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- RIGHT SIDE: CHART + RINGKASAN PAJAK + SIGNATURES -->
      <div class="side-col">
        
        <!-- CHART -->
        <div class="chart-container">
          <div style="font-size: 8px; font-weight: 700; color: #334155; margin-bottom: 2px; display: flex; justify-content: space-between;">
            <span>GRAFIK PENDAPATAN HARIAN</span>
            <span style="font-weight: 400; color: #64748b;">1 - ${daysInMonth} ${monthName}</span>
          </div>
          <svg viewBox="0 0 460 115" style="width: 100%; height: 115px; display: block;">
            <line x1="${leftMargin}" y1="${bottomBaseline}" x2="${chartWidth - 10}" y2="${bottomBaseline}" stroke="#cbd5e1" stroke-width="1" />
            <line x1="${leftMargin}" y1="10" x2="${leftMargin}" y2="${bottomBaseline}" stroke="#cbd5e1" stroke-width="1" />
            <text x="${leftMargin - 4}" y="14" font-size="7.5" fill="#64748b" font-weight="600" text-anchor="end">${maxRevenue >= 1000000 ? (maxRevenue / 1000000).toFixed(1) + 'M' : (maxRevenue >= 1000 ? (maxRevenue / 1000).toFixed(0) + 'k' : maxRevenue)}</text>
            <text x="${leftMargin - 4}" y="${Math.round(bottomBaseline / 2 + 5)}" font-size="7.5" fill="#64748b" font-weight="600" text-anchor="end">${maxRevenue >= 1000000 ? (maxRevenue / 2000000).toFixed(1) + 'M' : ''}</text>
            <text x="${leftMargin - 4}" y="${bottomBaseline}" font-size="7.5" fill="#64748b" font-weight="600" text-anchor="end">0</text>
            ${barElements}
          </svg>
          <div style="font-size: 7px; color: #94a3b8; font-style: italic; text-align: center;">
            Grafik mengambil data langsung dari kolom Tanggal dan Pendapatan pada tabel laporan.
          </div>
        </div>

        <!-- RINGKASAN PAJAK -->
        <div class="summary-card">
          <div class="summary-card-header">RINGKASAN PAJAK BULANAN</div>
          <div class="summary-card-row"><span>Pendapatan Kotor</span> <strong>${formatRupiah(totalRevenue)}</strong></div>
          <div class="summary-card-row" style="background: #fafafa;"><span>Tarif Pajak</span> <strong>${(taxRate * 100).toFixed(0)}%</strong></div>
          <div class="summary-card-row"><span style="color: #b91c1c; font-weight: 600;">Pajak yang Harus Dibayarkan</span> <strong style="color: #b91c1c;">${formatRupiah(taxDue)}</strong></div>
          <div class="summary-card-row" style="background: #fafafa;"><span style="color: #047857; font-weight: 600;">Pendapatan Setelah Pajak</span> <strong style="color: #047857;">${formatRupiah(netRevenue)}</strong></div>
        </div>

        <!-- SIGNATURES (TOGGLEABLE) -->
        ${showSignatures ? `
        <div class="signatures">
          <div>
            <div style="color: #64748b; font-size: 8px;">Mengetahui / Menyetujui,</div>
            <div style="font-weight: 700; color: #1e293b;">Petugas Pajak Daerah</div>
            <div class="sign-space"></div>
            <div style="font-weight: 700; color: #0f172a;">( ............................................ )</div>
            <div style="color: #64748b; font-size: 7.5px;">NIP. ........................................</div>
          </div>
          <div>
            <div style="color: #64748b; font-size: 8px;">Lombok Tengah, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            <div style="font-weight: 700; color: #1e293b;">Wajib Pajak / Pengelola</div>
            <div class="sign-space"></div>
            <div style="font-weight: 700; color: #0f172a; text-decoration: underline;">( ${signName} )</div>
            <div style="color: #64748b; font-size: 7.5px;">Penanggung Jawab Usaha</div>
          </div>
        </div>
        ` : ''}

      </div>

    </div>

  </div>
</body>
</html>`;
}

async function renderReportToPdf(reportData, settings, unit, year, month, outputPath, options = {}) {
  const html = generateHtmlContent(reportData, settings, unit, year, month, options);

  const printWindow = new BrowserWindow({
    show: false,
    width: 1200,
    height: 850,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load HTML via data URI
  await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

  // Small delay to ensure render complete
  await new Promise(resolve => setTimeout(resolve, 300));

  const pdfBuffer = await printWindow.webContents.printToPDF({
    pageSize: 'A4',
    landscape: true,
    printBackground: true,
    margins: {
      marginType: 'none'
    }
  });

  printWindow.close();
  fs.writeFileSync(outputPath, pdfBuffer);
  return { success: true, filePath: outputPath };
}

module.exports = {
  renderReportToPdf,
  generateHtmlContent
};
