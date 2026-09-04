const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// Helper to convert Excel serial date or date string to 'YYYY-MM-DD'
function parseExcelDate(val) {
  if (val === null || val === undefined || val === '') return null;

  // Numeric serial date
  if (typeof val === 'number' && val > 20000 && val < 90000) {
    const utc_days = Math.floor(val - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    const y = date_info.getUTCFullYear();
    const m = String(date_info.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date_info.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // JS Date object
  if (val instanceof Date && !isNaN(val)) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // String
  if (typeof val === 'string') {
    const clean = val.trim();
    if (!clean) return null;

    if (/^\d{5}$/.test(clean)) {
      const numSerial = parseInt(clean, 10);
      if (numSerial > 20000 && numSerial < 90000) {
        return parseExcelDate(numSerial);
      }
    }

    const isoMatch = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${String(isoMatch[2]).padStart(2, '0')}-${String(isoMatch[3]).padStart(2, '0')}`;
    }

    const dmyMatch = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
    if (dmyMatch) {
      return `${dmyMatch[3]}-${String(dmyMatch[2]).padStart(2, '0')}-${String(dmyMatch[1]).padStart(2, '0')}`;
    }

    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  return null;
}

// Clean and convert nominal amount
function parseNominal(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : Math.max(0, val);

  if (typeof val === 'string') {
    let clean = val.replace(/Rp\.?/gi, '').trim();
    if (!clean) return 0;

    if (clean.includes('.') && clean.includes(',')) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else if (clean.includes('.')) {
      const parts = clean.split('.');
      if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
        clean = clean.replace(/\./g, '');
      }
    } else if (clean.includes(',')) {
      const parts = clean.split(',');
      if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
        clean = clean.replace(/,/g, '');
      } else {
        clean = clean.replace(',', '.');
      }
    }

    const num = parseFloat(clean);
    return isNaN(num) ? 0 : Math.max(0, num);
  }

  return 0;
}

// Parse Excel file
function parseRawExcelFile(filePath) {
  const workbook = XLSX.readFile(filePath, { raw: true });
  const sheetNames = workbook.SheetNames;
  const result = {
    fileName: path.basename(filePath),
    sheetCount: sheetNames.length,
    sheets: []
  };

  for (const sheetName of sheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, blankrows: false });
    if (!data || data.length === 0) continue;

    let dateColIdx = -1;
    let amountColIdx = -1;
    let headerRowIdx = -1;

    for (let r = 0; r < Math.min(data.length, 25); r++) {
      const row = data[r];
      if (!Array.isArray(row) || row.length < 2) continue;

      let foundDate = -1;
      let foundAmount = -1;

      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] || '').toLowerCase().trim();
        if (!val || val.length > 40) continue;

        if (foundDate === -1 && (val === 'tanggal' || val === 'date' || val === 'tgl' || val.startsWith('tanggal') || val.startsWith('tgl'))) {
          foundDate = c;
        } else if (foundAmount === -1 && (
          val.includes('pendapatan') || val.includes('total') || val.includes('revenue') || 
          val.includes('gross') || val.includes('nominal') || val.includes('jumlah') || 
          val.includes('omset') || val.includes('sales') || val.includes('harga') || val === 'rp'
        )) {
          foundAmount = c;
        }
      }

      if (foundDate !== -1 && foundAmount !== -1 && foundDate !== foundAmount) {
        dateColIdx = foundDate;
        amountColIdx = foundAmount;
        headerRowIdx = r;
        break;
      }
    }

    if (dateColIdx === -1 || amountColIdx === -1) {
      for (let r = 0; r < Math.min(data.length, 20); r++) {
        const row = data[r];
        if (!Array.isArray(row)) continue;

        let dCol = -1;
        let aCol = -1;

        for (let c = 0; c < row.length; c++) {
          if (dCol === -1 && parseExcelDate(row[c])) {
            dCol = c;
          } else if (aCol === -1 && parseNominal(row[c]) > 0 && typeof row[c] === 'number') {
            aCol = c;
          }
        }

        if (dCol !== -1 && aCol !== -1 && dCol !== aCol) {
          dateColIdx = dCol;
          amountColIdx = aCol;
          headerRowIdx = Math.max(0, r - 1);
          break;
        }
      }
    }

    // Detect optional notes/keterangan column
    let notesColIdx = -1;
    for (let c = 0; c < (data[headerRowIdx] || []).length; c++) {
      if (c !== dateColIdx && c !== amountColIdx) {
        const val = String(data[headerRowIdx][c] || '').toLowerCase().trim();
        if (val.includes('ket') || val.includes('catatan') || val.includes('note') || val.includes('deskripsi') || val.includes('tamu') || val.includes('kamar') || val.includes('shift') || val.includes('uraian')) {
          notesColIdx = c;
          break;
        }
      }
    }
    // If not found, use 3rd column if available
    if (notesColIdx === -1 && (data[headerRowIdx] || []).length > 2 && dateColIdx !== 2 && amountColIdx !== 2) {
      notesColIdx = 2;
    }

    const parsedRows = [];
    const startRow = headerRowIdx + 1;

    for (let r = startRow; r < data.length; r++) {
      const row = data[r];
      if (!row || row.length === 0) continue;

      const rawDate = row[dateColIdx];
      const rawAmount = row[amountColIdx];
      const rawNotes = notesColIdx !== -1 && row[notesColIdx] ? String(row[notesColIdx]).trim() : '';

      const formattedDate = parseExcelDate(rawDate);
      const amount = parseNominal(rawAmount);

      if (formattedDate && amount > 0) {
        parsedRows.push({
          date: formattedDate,
          amount: amount,
          originalRow: r + 1,
          notes: rawNotes
        });
      }
    }

    const lowerName = (sheetName + ' ' + path.basename(filePath)).toLowerCase();
    let suggestedUnit = 'Bungalows';
    if (lowerName.includes('resto') || lowerName.includes('restaurant') || lowerName.includes('makan') || lowerName.includes('f&b') || lowerName.includes('food')) {
      suggestedUnit = 'Restaurant';
    } else if (lowerName.includes('bungalow') || lowerName.includes('villa') || lowerName.includes('kamar') || lowerName.includes('room')) {
      suggestedUnit = 'Bungalows';
    }

    const totalGross = parsedRows.reduce((acc, curr) => acc + curr.amount, 0);

    result.sheets.push({
      sheetName,
      suggestedUnit,
      dateColIdx,
      amountColIdx,
      headerRowIdx,
      totalRows: parsedRows.length,
      totalGross,
      rows: parsedRows
    });
  }

  return result;
}

// Generate official tax Excel Report identical to template
async function generateTaxExcelReport(reportBungalows, reportRestaurant, outputPath, settings) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistem Pelaporan Pajak (Anda Bungalows & Restaurant)';
  workbook.created = new Date();

  const businessName = settings?.businessName || 'ANDA BUNGALOWS & RESTAURANT';
  const businessAddress = settings?.businessAddress || 'Jalan Pariwisata Pantai Kuta, Kecamatan Pujut, Lombok Tengah, NTB';
  const contactNumber = settings?.contactNumber || 'HP/WhatsApp: 087750665000';
  const taxRate = parseFloat(settings?.taxRate) || 0.10;

  const monthNamesIndo = [
    '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  function createUnitReportSheet(sheetName, reportData, unitTitle) {
    const ws = workbook.addWorksheet(sheetName, {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1 }
    });

    const currentMonthName = monthNamesIndo[reportData.month] || 'Agustus';
    const currentYear = reportData.year || 2026;

    // Header styling matching template
    ws.mergeCells('C1:N1');
    ws.getCell('C1').value = `LAPORAN PENDAPATAN ${unitTitle.toUpperCase()}`;
    ws.getCell('C1').font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF1F4E78' } };
    ws.getCell('C1').alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 24;

    ws.mergeCells('C2:N2');
    ws.getCell('C2').value = businessName;
    ws.getCell('C2').font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF16324F' } };
    ws.getCell('C2').alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells('C3:J3');
    ws.getCell('C3').value = `${businessAddress} | ${contactNumber}`;
    ws.getCell('C3').font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF64748B' } };
    ws.getCell('C3').alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells('K3:N3');
    ws.getCell('K3').value = `Periode: ${currentMonthName} ${currentYear}`;
    ws.getCell('K3').font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF1F4E78' } };
    ws.getCell('K3').alignment = { horizontal: 'center', vertical: 'middle' };

    // Meta row (Bulan, Tahun, Tarif Pajak)
    ws.getCell('A4').value = 'Bulan';
    ws.getCell('B4').value = currentMonthName;
    ws.getCell('D4').value = 'Tahun';
    ws.getCell('E4').value = currentYear;
    ws.getCell('F4').value = 'Tarif Pajak';
    ws.getCell('H4').value = taxRate;
    ws.getCell('H4').numFmt = '0%';
    ws.getCell('A4').font = { bold: true };
    ws.getCell('D4').font = { bold: true };
    ws.getCell('F4').font = { bold: true };

    // 3 Large KPI Summary Cards
    // Card 1: TOTAL PENDAPATAN KOTOR (A6:D6, A7:D8)
    ws.mergeCells('A6:D6');
    ws.getCell('A6').value = 'TOTAL PENDAPATAN KOTOR';
    ws.getCell('A6').font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getCell('A6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
    ws.getCell('A6').alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells('A7:D8');
    ws.getCell('A7').value = reportData.totalRevenue || 0;
    ws.getCell('A7').numFmt = '"Rp "#,##0';
    ws.getCell('A7').font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF16324F' } };
    ws.getCell('A7').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };
    ws.getCell('A7').alignment = { horizontal: 'center', vertical: 'middle' };

    // Card 2: PAJAK TERUTANG (F6:I6, F7:I8)
    ws.mergeCells('F6:I6');
    ws.getCell('F6').value = 'PAJAK TERUTANG';
    ws.getCell('F6').font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getCell('F6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
    ws.getCell('F6').alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells('F7:I8');
    ws.getCell('F7').value = reportData.taxDue || 0;
    ws.getCell('F7').numFmt = '"Rp "#,##0';
    ws.getCell('F7').font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFB91C1C' } };
    ws.getCell('F7').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };
    ws.getCell('F7').alignment = { horizontal: 'center', vertical: 'middle' };

    // Card 3: PENDAPATAN SETELAH PAJAK (K6:N6, K7:N8)
    ws.mergeCells('K6:N6');
    ws.getCell('K6').value = 'PENDAPATAN SETELAH PAJAK';
    ws.getCell('K6').font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getCell('K6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
    ws.getCell('K6').alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells('K7:N8');
    ws.getCell('K7').value = reportData.netRevenue || 0;
    ws.getCell('K7').numFmt = '"Rp "#,##0';
    ws.getCell('K7').font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF047857' } };
    ws.getCell('K7').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };
    ws.getCell('K7').alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 10: Secondary metrics strip 1
    ws.mergeCells('A10:C10');
    ws.getCell('A10').value = 'Jumlah Hari';
    ws.getCell('A10').font = { size: 9, color: { argb: 'FF64748B' } };
    ws.getCell('D10').value = reportData.daysInMonth;
    ws.getCell('D10').font = { size: 9, bold: true };

    ws.mergeCells('F10:H10');
    ws.getCell('F10').value = 'Hari Berpendapatan';
    ws.getCell('F10').font = { size: 9, color: { argb: 'FF64748B' } };
    ws.getCell('I10').value = reportData.activeDaysCount;
    ws.getCell('I10').font = { size: 9, bold: true };

    ws.mergeCells('K10:M10');
    ws.getCell('K10').value = 'Hari Tanpa Pendapatan';
    ws.getCell('K10').font = { size: 9, color: { argb: 'FF64748B' } };
    ws.getCell('N10').value = reportData.zeroDaysCount;
    ws.getCell('N10').font = { size: 9, bold: true };

    // Row 12: Secondary metrics strip 2
    ws.mergeCells('A12:C12');
    ws.getCell('A12').value = 'Rata-rata per Hari';
    ws.getCell('A12').font = { size: 9, color: { argb: 'FF64748B' } };
    ws.getCell('D12').value = reportData.avgPerDay;
    ws.getCell('D12').numFmt = '"Rp "#,##0';
    ws.getCell('D12').font = { size: 9, bold: true };

    ws.mergeCells('F12:H12');
    ws.getCell('F12').value = 'Pendapatan Tertinggi';
    ws.getCell('F12').font = { size: 9, color: { argb: 'FF64748B' } };
    ws.getCell('I12').value = reportData.maxRevenue;
    ws.getCell('I12').numFmt = '"Rp "#,##0';
    ws.getCell('I12').font = { size: 9, bold: true };

    ws.mergeCells('K12:M12');
    ws.getCell('K12').value = 'Pendapatan Terendah > 0';
    ws.getCell('K12').font = { size: 9, color: { argb: 'FF64748B' } };
    ws.getCell('N12').value = reportData.minRevenueNonZero || 0;
    ws.getCell('N12').numFmt = '"Rp "#,##0';
    ws.getCell('N12').font = { size: 9, bold: true };

    // Table Header Row 14
    const tableHeaderRow = 14;
    ws.getRow(tableHeaderRow).values = ['No.', 'Tanggal', 'Hari', 'Pendapatan (Rp)', 'Status', 'Akumulasi (Rp)'];
    ws.getRow(tableHeaderRow).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    for (let c = 1; c <= 6; c++) {
      ws.getRow(tableHeaderRow).getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
      ws.getRow(tableHeaderRow).getCell(c).alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // Table Data Rows 15 to 45
    let currentRow = 15;
    for (const item of (reportData.rows || [])) {
      const row = ws.getRow(currentRow);
      row.values = [
        item.no,
        item.date,
        item.dayName,
        item.amount,
        item.status,
        item.cumulative
      ];

      row.font = { name: 'Calibri', size: 9 };
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(2).alignment = { horizontal: 'center' };
      row.getCell(3).alignment = { horizontal: 'center' };
      row.getCell(4).numFmt = '"Rp "#,##0';
      row.getCell(5).alignment = { horizontal: 'center' };
      row.getCell(6).numFmt = '"Rp "#,##0';

      const zebraColor = (currentRow % 2 === 0) ? 'FFEEF3F8' : 'FFFFFFFF';
      for (let c = 1; c <= 6; c++) {
        row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraColor } };
        row.getCell(c).border = {
          top: { style: 'thin', color: { argb: 'FFDCE6F1' } },
          bottom: { style: 'thin', color: { argb: 'FFDCE6F1' } },
          left: { style: 'thin', color: { argb: 'FFDCE6F1' } },
          right: { style: 'thin', color: { argb: 'FFDCE6F1' } }
        };
      }

      if (item.amount === 0) {
        row.getCell(4).font = { color: { argb: 'FF94A3B8' } };
        row.getCell(5).font = { color: { argb: 'FF94A3B8' } };
      } else {
        row.getCell(4).font = { bold: true };
      }

      currentRow++;
    }

    // Row 47: Total Periode
    const totalRowIndex = 47;
    ws.mergeCells(`A${totalRowIndex}:C${totalRowIndex}`);
    ws.getCell(`A${totalRowIndex}`).value = 'TOTAL PERIODE';
    ws.getCell(`A${totalRowIndex}`).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1F4E78' } };
    ws.getCell(`A${totalRowIndex}`).alignment = { horizontal: 'center', vertical: 'middle' };

    ws.getCell(`D${totalRowIndex}`).value = reportData.totalRevenue || 0;
    ws.getCell(`D${totalRowIndex}`).numFmt = '"Rp "#,##0';
    ws.getCell(`D${totalRowIndex}`).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF16324F' } };

    ws.getCell(`E${totalRowIndex}`).value = 'PAJAK 10%';
    ws.getCell(`E${totalRowIndex}`).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFB91C1C' } };
    ws.getCell(`E${totalRowIndex}`).alignment = { horizontal: 'center' };

    ws.getCell(`F${totalRowIndex}`).value = reportData.taxDue || 0;
    ws.getCell(`F${totalRowIndex}`).numFmt = '"Rp "#,##0';
    ws.getCell(`F${totalRowIndex}`).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFB91C1C' } };

    for (let c = 1; c <= 6; c++) {
      ws.getCell(totalRowIndex, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };
      ws.getCell(totalRowIndex, c).border = { top: { style: 'medium' }, bottom: { style: 'double' } };
    }

    // Right Side: Ringkasan Pajak Bulanan Box (Rows 34 - 38)
    ws.mergeCells('H34:N34');
    ws.getCell('H34').value = 'RINGKASAN PAJAK BULANAN';
    ws.getCell('H34').font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getCell('H34').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
    ws.getCell('H34').alignment = { horizontal: 'center', vertical: 'middle' };

    const taxSummaryRows = [
      { label: 'Pendapatan Kotor', val: reportData.totalRevenue, fmt: '"Rp "#,##0', isBold: false },
      { label: 'Tarif Pajak', val: taxRate, fmt: '0%', isBold: false },
      { label: 'Pajak yang Harus Dibayarkan', val: reportData.taxDue, fmt: '"Rp "#,##0', isBold: true, color: 'FFB91C1C' },
      { label: 'Pendapatan Setelah Pajak', val: reportData.netRevenue, fmt: '"Rp "#,##0', isBold: true, color: 'FF047857' }
    ];

    taxSummaryRows.forEach((item, idx) => {
      const r = 35 + idx;
      ws.mergeCells(`H${r}:L${r}`);
      ws.getCell(`H${r}`).value = item.label;
      ws.getCell(`H${r}`).font = { name: 'Calibri', size: 9, bold: item.isBold };
      ws.mergeCells(`M${r}:N${r}`);
      ws.getCell(`M${r}`).value = item.val;
      ws.getCell(`M${r}`).numFmt = item.fmt;
      ws.getCell(`M${r}`).font = { name: 'Calibri', size: 9, bold: item.isBold, color: item.color ? { argb: item.color } : undefined };
    });

    // Catatan box (Rows 40 to 42)
    ws.mergeCells('H40:N42');
    ws.getCell('H40').value = `Catatan: pajak ${unitTitle} dihitung 10% dari pendapatan kotor pada periode yang dipilih.`;
    ws.getCell('H40').font = { name: 'Calibri', size: 8.5, italic: true, color: { argb: 'FF78350F' } };
    ws.getCell('H40').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFDF2' } };
    ws.getCell('H40').alignment = { vertical: 'middle', wrapText: true };

    // Column widths
    ws.getColumn(1).width = 6;
    ws.getColumn(2).width = 13;
    ws.getColumn(3).width = 11;
    ws.getColumn(4).width = 18;
    ws.getColumn(5).width = 20;
    ws.getColumn(6).width = 18;
    ws.getColumn(7).width = 3;
    ws.getColumn(8).width = 13;
    ws.getColumn(9).width = 13;
    ws.getColumn(10).width = 13;
    ws.getColumn(11).width = 13;
    ws.getColumn(12).width = 13;
    ws.getColumn(13).width = 13;
    ws.getColumn(14).width = 13;
  }

  if (reportBungalows) {
    createUnitReportSheet('Laporan Bungalows', reportBungalows, 'Bungalows');
  }
  if (reportRestaurant) {
    createUnitReportSheet('Laporan Restaurant', reportRestaurant, 'Restaurant');
  }

  await workbook.xlsx.writeFile(outputPath);
  return { success: true, filePath: outputPath };
}

// Generate blank template Excel file for user data entry
async function generateImportTemplate(unit = 'Bungalows', outputPath) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Laporan Pajak Anda';
  workbook.created = new Date();

  const sheetName = `Input ${unit}`;
  const ws = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true }]
  });

  // Header Title
  ws.mergeCells('A1:D1');
  ws.getCell('A1').value = `TEMPLATE INPUT PENDAPATAN ${unit.toUpperCase()}`;
  ws.getCell('A1').font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  ws.getCell('A1').alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  ws.getRow(1).height = 28;

  ws.mergeCells('A2:D2');
  ws.getCell('A2').value = 'Isi data transaksi pendapatan Anda di bawah ini, lalu import file ini ke aplikasi.';
  ws.getCell('A2').font = { name: 'Calibri', size: 9.5, italic: true, color: { argb: 'FF64748B' } };
  ws.getCell('A2').alignment = { vertical: 'middle', indent: 1 };
  ws.getRow(2).height = 18;

  // Table Column Headers (Row 4)
  const headers = [
    { key: 'no', header: 'No.', width: 8 },
    { key: 'date', header: 'Tanggal', width: 16 },
    { key: 'amount', header: 'Pendapatan (Rp)', width: 22 },
    { key: 'notes', header: 'Keterangan', width: 35 }
  ];

  ws.getRow(4).height = 24;
  headers.forEach((h, idx) => {
    const colNum = idx + 1;
    const cell = ws.getRow(4).getCell(colNum);
    cell.value = h.header;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: unit === 'Restaurant' ? 'FFD97706' : 'FF0284C7' }
    };
    cell.alignment = {
      horizontal: h.key === 'amount' ? 'right' : (h.key === 'no' ? 'center' : 'left'),
      vertical: 'middle'
    };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } }
    };
    ws.getColumn(colNum).width = h.width;
  });

  // Example rows
  const exampleRows = [
    { no: 1, date: '2026-08-01', amount: unit === 'Restaurant' ? 1250000 : 850000, notes: unit === 'Restaurant' ? 'Dinner Table 4 & 5' : 'Bungalow 1 - Booking Direct' },
    { no: 2, date: '2026-08-01', amount: unit === 'Restaurant' ? 650000 : 1200000, notes: unit === 'Restaurant' ? 'Bar & Beverages' : 'Bungalow 3 - OTA Booking' },
    { no: 3, date: '2026-08-02', amount: unit === 'Restaurant' ? 2400000 : 600000, notes: unit === 'Restaurant' ? 'Group Lunch Buffet' : 'Bungalow 2 - Direct Walk-in' },
    { no: 4, date: '2026-08-03', amount: unit === 'Restaurant' ? 890000 : 1500000, notes: unit === 'Restaurant' ? 'Breakfast & A la carte' : 'Bungalow 4 - Extension' },
    { no: 5, date: '2026-08-04', amount: unit === 'Restaurant' ? 1100000 : 750000, notes: unit === 'Restaurant' ? 'Dinner Event' : 'Bungalow 5 - Booking Online' }
  ];

  exampleRows.forEach((row, i) => {
    const rowNum = 5 + i;
    const r = ws.getRow(rowNum);
    r.height = 20;

    r.getCell(1).value = row.no;
    r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    r.getCell(2).value = row.date;
    r.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };

    r.getCell(3).value = row.amount;
    r.getCell(3).numFmt = '"Rp "#,##0';
    r.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };

    r.getCell(4).value = row.notes;
    r.getCell(4).alignment = { horizontal: 'left', vertical: 'middle' };

    for (let c = 1; c <= 4; c++) {
      r.getCell(c).font = { name: 'Calibri', size: 9.5 };
      r.getCell(c).border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
      if (i % 2 === 1) {
        r.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    }
  });

  // Instructions Guide Box on Side (F4:I10)
  ws.mergeCells('F4:I4');
  ws.getCell('F4').value = 'PETUNJUK PENGISIAN FILE:';
  ws.getCell('F4').font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getCell('F4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
  ws.getCell('F4').alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  const guideLines = [
    '1. Kolom Tanggal: format tanggal bisa YYYY-MM-DD (contoh: 2026-08-01) atau format tanggal Excel biasa.',
    '2. Multi-transaksi diperbolehkan: jika dalam 1 hari ada beberapa booking/transaksi, tulis di baris baru.',
    '3. Kolom Pendapatan: isi hanya nominal angka bruto (contoh: 850000).',
    '4. Kolom Keterangan: opsional (bisa diisi nomor kamar, menu resto, atau sumber booking).',
    '5. Anda dapat menghapus baris contoh di atas dan menggantinya dengan data pendapatan Anda yang sebenarnya.'
  ];

  guideLines.forEach((text, idx) => {
    const rNum = 5 + idx;
    ws.mergeCells(`F${rNum}:I${rNum}`);
    const cell = ws.getCell(`F${rNum}`);
    cell.value = text;
    cell.font = { name: 'Calibri', size: 8.5, color: { argb: 'FF475569' } };
    cell.alignment = { vertical: 'middle', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFDF2' } };
  });

  ws.getColumn(6).width = 18;
  ws.getColumn(7).width = 18;
  ws.getColumn(8).width = 18;
  ws.getColumn(9).width = 18;

  await workbook.xlsx.writeFile(outputPath);
  return { success: true, filePath: outputPath };
}

module.exports = {
  parseRawExcelFile,
  generateTaxExcelReport,
  generateBapendaExcelReport: generateTaxExcelReport,
  generateImportTemplate
};

