const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const initSqlJs = require('sql.js');

let db = null;
let dbPath = null;
let archiveDir = null;

async function getDbPath() {
  if (dbPath) return dbPath;
  const userDataPath = app ? app.getPath('userData') : path.join(__dirname, '..');
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  dbPath = path.join(userDataPath, 'laporan_bapenda.sqlite');
  return dbPath;
}

async function getArchiveDir() {
  if (archiveDir) return archiveDir;
  const userDataPath = app ? app.getPath('userData') : path.join(__dirname, '..');
  archiveDir = path.join(userDataPath, 'arsip_excel');
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }
  return archiveDir;
}

async function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  const filePath = await getDbPath();
  fs.writeFileSync(filePath, buffer);
}

async function initDatabase() {
  const SQL = await initSqlJs();
  const filePath = await getDbPath();

  if (fs.existsSync(filePath)) {
    const filebuffer = fs.readFileSync(filePath);
    db = new SQL.Database(filebuffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unit TEXT NOT NULL,          -- 'Bungalows' or 'Restaurant'
      date TEXT NOT NULL,          -- 'YYYY-MM-DD'
      amount REAL NOT NULL,        -- Pendapatan kotor
      notes TEXT,
      source_file TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_unit_date_entry ON transactions(unit, date, id);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS import_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unit TEXT,
      file_name TEXT,
      records_count INTEGER,
      total_amount REAL,
      stored_path TEXT,
      imported_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migrate column stored_path if table was created in earlier version
  try {
    db.run(`ALTER TABLE import_logs ADD COLUMN stored_path TEXT;`);
  } catch (e) {
    // Column already exists
  }

  // Default settings
  const defaultSettings = {
    businessName: 'ANDA BUNGALOWS & RESTAURANT',
    businessAddress: 'Jalan Pariwisata Pantai Kuta, Kecamatan Pujut, Lombok Tengah, NTB',
    contactNumber: 'HP/WhatsApp: 087750665000',
    npwpd: 'P.2.0001234.01.23',
    taxRate: '0.10', // 10%
    signName: 'Pimpinan / Pengelola',
    signPosition: 'Wajib Pajak Daerah',
    officerName: 'Petugas Bapenda Lombok Tengah',
    officerNip: 'NIP. 19800101 200501 1 001'
  };

  for (const [k, v] of Object.entries(defaultSettings)) {
    const res = db.exec(`SELECT value FROM settings WHERE key = '${k}'`);
    if (res.length === 0 || res[0].values.length === 0) {
      db.run(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, [k, v]);
    }
  }

  await saveDb();
  return db;
}

// Bulk insert raw transaction records for a specific unit with anti-duplication control
async function saveTransactionsBulk(unit, items, fileName = '', mode = 'replace_all_unit') {
  if (!db) await initDatabase();

  // Mode 1: Replace all data in this unit (cleanest option)
  if (mode === 'replace_all_unit') {
    db.run(`DELETE FROM transactions WHERE unit = ?`, [unit]);
  } else if (mode === 'replace_period') {
    // Mode 2: Replace only the specific months in the file
    const periodsInFile = new Set();
    for (const item of items) {
      if (item.date && item.date.length >= 7) {
        periodsInFile.add(item.date.substring(0, 7)); // 'YYYY-MM'
      }
    }

    for (const ym of periodsInFile) {
      db.run(`DELETE FROM transactions WHERE unit = ? AND date LIKE ?`, [unit, `${ym}-%`]);
    }
  }

  let totalInserted = 0;
  let totalGross = 0;
  let skippedCount = 0;

  for (const item of items) {
    if (!item.date || isNaN(item.amount) || item.amount <= 0) continue;
    const amt = parseFloat(item.amount);
    const notesStr = item.notes || '';

    if (mode === 'skip_duplicates') {
      const exists = db.exec(
        `SELECT id FROM transactions WHERE unit = ? AND date = ? AND amount = ? AND notes = ?`,
        [unit, item.date, amt, notesStr]
      );
      if (exists.length > 0 && exists[0].values.length > 0) {
        skippedCount++;
        continue;
      }
    }

    db.run(
      `INSERT INTO transactions (unit, date, amount, notes, source_file) VALUES (?, ?, ?, ?, ?)`,
      [unit, item.date, amt, notesStr, fileName || 'Import Excel']
    );

    totalInserted++;
    totalGross += amt;
  }

  // 3. Archive physical Excel file safely for cross-platform (Windows & macOS)
  let storedArchivePath = null;
  if (sourceFilePath && fs.existsSync(sourceFilePath)) {
    try {
      const archDir = await getArchiveDir();
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const timestampStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
      const safeBaseName = path.basename(sourceFilePath).replace(/[^a-zA-Z0-9._-]/g, '_');
      const archiveFileName = `[${timestampStr}]_[${unit}]_${safeBaseName}`;
      storedArchivePath = path.join(archDir, archiveFileName);
      fs.copyFileSync(sourceFilePath, storedArchivePath);
    } catch (err) {
      console.error('Gagal mengarsipkan file Excel fisik:', err);
    }
  }

  // Log import
  if (totalInserted > 0) {
    db.run(`INSERT INTO import_logs (unit, file_name, records_count, total_amount, stored_path) VALUES (?, ?, ?, ?, ?)`, [
      unit,
      fileName || 'Import Excel',
      totalInserted,
      totalGross,
      storedArchivePath
    ]);
  }

  await saveDb();
  return { success: true, count: totalInserted, totalAmount: totalGross, skippedCount, mode, storedPath: storedArchivePath };
}

// Clean duplicate transactions in the database
async function cleanDuplicateTransactions(unit) {
  if (!db) await initDatabase();
  
  // Count duplicates before
  const beforeCountRes = db.exec(`SELECT COUNT(*) FROM transactions WHERE unit = ?`, [unit]);
  const beforeCount = beforeCountRes.length > 0 ? beforeCountRes[0].values[0][0] : 0;

  db.run(`
    DELETE FROM transactions
    WHERE id NOT IN (
      SELECT MIN(id)
      FROM transactions
      WHERE unit = '${unit}'
      GROUP BY unit, date, amount, notes
    ) AND unit = '${unit}'
  `);

  const afterCountRes = db.exec(`SELECT COUNT(*) FROM transactions WHERE unit = ?`, [unit]);
  const afterCount = afterCountRes.length > 0 ? afterCountRes[0].values[0][0] : 0;
  const removed = beforeCount - afterCount;

  await saveDb();
  return { success: true, removedCount: removed, remainingCount: afterCount };
}

// Get monthly calendar data (Day 1 to End of Month) with aggregations per date
async function getMonthlyReportData(unit, year, month) {
  if (!db) await initDatabase();

  const y = parseInt(year, 10);
  const m = parseInt(month, 10); // 1-12
  const monthStr = m < 10 ? `0${m}` : `${m}`;
  const startDate = `${y}-${monthStr}-01`;

  // Number of days in month
  const daysInMonth = new Date(y, m, 0).getDate();
  const endDate = `${y}-${monthStr}-${daysInMonth < 10 ? '0' + daysInMonth : daysInMonth}`;

  // Group by date and sum total amount
  const query = `
    SELECT date, SUM(amount) as total_amount
    FROM transactions
    WHERE unit = ? AND date >= ? AND date <= ?
    GROUP BY date
    ORDER BY date ASC
  `;

  const results = db.exec(query, [unit, startDate, endDate]);
  const dateMap = {};
  if (results.length > 0 && results[0].values.length > 0) {
    for (const row of results[0].values) {
      dateMap[row[0]] = {
        amount: parseFloat(row[1]) || 0
      };
    }
  }

  const dayNamesIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const rows = [];
  let totalRevenue = 0;
  let activeDaysCount = 0;
  let maxRevenue = 0;
  let cumulativeRevenue = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = d < 10 ? `0${d}` : `${d}`;
    const fullDate = `${y}-${monthStr}-${dayStr}`;
    const dateObj = new Date(y, m - 1, d);
    const dayName = dayNamesIndo[dateObj.getDay()];

    const rec = dateMap[fullDate];
    const amount = rec ? rec.amount : 0;
    const hasIncome = amount > 0;

    if (hasIncome) {
      activeDaysCount++;
      if (amount > maxRevenue) maxRevenue = amount;
    }

    cumulativeRevenue += amount;
    totalRevenue += amount;

    rows.push({
      no: d,
      date: fullDate,
      dayNumber: d,
      dayName: dayName,
      amount: amount,
      status: hasIncome ? 'Ada Pendapatan' : 'Tidak Ada Pendapatan',
      cumulative: cumulativeRevenue,
      notes: rec ? rec.notes : ''
    });
  }

  // Calculate min revenue > 0
  const positiveAmounts = rows.filter(r => r.amount > 0).map(r => r.amount);
  const minRevenueNonZero = positiveAmounts.length > 0 ? Math.min(...positiveAmounts) : 0;

  // Get current tax rate from settings
  const settings = await getAllSettings();
  const taxRate = parseFloat(settings.taxRate) || 0.10;
  const taxDue = Math.round(totalRevenue * taxRate);
  const netRevenue = totalRevenue - taxDue;
  const avgPerDay = daysInMonth > 0 ? totalRevenue / daysInMonth : 0;

  return {
    unit,
    year: y,
    month: m,
    daysInMonth,
    totalRevenue,
    taxRate,
    taxDue,
    netRevenue,
    activeDaysCount,
    zeroDaysCount: daysInMonth - activeDaysCount,
    maxRevenue,
    minRevenueNonZero,
    avgPerDay,
    rows,
    settings
  };
}

// Get all years & months that have recorded transactions
async function getAvailablePeriods() {
  if (!db) await initDatabase();
  const query = `
    SELECT DISTINCT SUBSTR(date, 1, 4) as year, SUBSTR(date, 6, 2) as month, unit, COUNT(*) as cnt
    FROM transactions
    GROUP BY year, month, unit
    ORDER BY year DESC, month DESC
  `;
  const res = db.exec(query);
  const periods = [];
  if (res.length > 0) {
    for (const row of res[0].values) {
      periods.push({
        year: parseInt(row[0], 10),
        month: parseInt(row[1], 10),
        unit: row[2],
        count: row[3]
      });
    }
  }
  return periods;
}

// Get Settings
async function getAllSettings() {
  if (!db) await initDatabase();
  const res = db.exec(`SELECT key, value FROM settings`);
  const settings = {};
  if (res.length > 0) {
    for (const row of res[0].values) {
      settings[row[0]] = row[1];
    }
  }
  return settings;
}

// Save Settings
async function updateSettings(newSettings) {
  if (!db) await initDatabase();
  for (const [k, v] of Object.entries(newSettings)) {
    db.run(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, [k, String(v)]);
  }
  await saveDb();
  return { success: true };
}

// Reset all transactions & logs for a specific unit
async function resetUnitData(unit) {
  if (!db) await initDatabase();
  db.run(`DELETE FROM transactions WHERE unit = ?`, [unit]);
  db.run(`DELETE FROM import_logs WHERE unit = ?`, [unit]);
  await saveDb();
  return { success: true };
}

// Reset entire database (all units & import logs)
async function resetAllDatabase() {
  if (!db) await initDatabase();
  db.run(`DELETE FROM transactions;`);
  db.run(`DELETE FROM import_logs;`);
  await saveDb();
  return { success: true };
}

// Clear transactions by unit and optional month/year
async function deleteTransactions(unit, year = null, month = null) {
  if (!db) await initDatabase();
  if (year && month) {
    const monthStr = month < 10 ? `0${month}` : `${month}`;
    const prefix = `${year}-${monthStr}-%`;
    db.run(`DELETE FROM transactions WHERE unit = ? AND date LIKE ?`, [unit, prefix]);
  } else {
    db.run(`DELETE FROM transactions WHERE unit = ?`, [unit]);
  }
  await saveDb();
  return { success: true };
}

// Get import history
async function getImportHistory() {
  if (!db) await initDatabase();
  const res = db.exec(`SELECT id, unit, file_name, records_count, total_amount, imported_at, stored_path FROM import_logs ORDER BY id DESC LIMIT 25`);
  const history = [];
  if (res.length > 0) {
    for (const row of res[0].values) {
      history.push({
        id: row[0],
        unit: row[1],
        fileName: row[2],
        recordsCount: row[3],
        totalAmount: row[4],
        importedAt: row[5],
        storedPath: row[6] || null
      });
    }
  }
  return history;
}

// Get raw transactions list with SQL pagination
async function getRawTransactions(unit, year = null, month = null, search = '', page = 1, pageSize = 50) {
  if (!db) await initDatabase();

  let whereClause = `WHERE unit = ?`;
  const params = [unit];

  if (year && month) {
    const monthStr = month < 10 ? `0${month}` : `${month}`;
    whereClause += ` AND date LIKE ?`;
    params.push(`${year}-${monthStr}-%`);
  }

  if (search && search.trim()) {
    whereClause += ` AND (date LIKE ? OR notes LIKE ? OR source_file LIKE ?)`;
    const s = `%${search.trim()}%`;
    params.push(s, s, s);
  }

  // 1. Get aggregate totals for filtered dataset (fast)
  const countQuery = `SELECT COUNT(*), COALESCE(SUM(amount), 0) FROM transactions ${whereClause}`;
  const countRes = db.exec(countQuery, params);
  let totalCount = 0;
  let totalGross = 0;
  if (countRes.length > 0 && countRes[0].values.length > 0) {
    totalCount = parseInt(countRes[0].values[0][0], 10) || 0;
    totalGross = parseFloat(countRes[0].values[0][1]) || 0;
  }

  // 2. Query paginated list with LIMIT & OFFSET
  const validPageSize = Math.max(1, parseInt(pageSize, 10) || 50);
  const totalPages = Math.max(1, Math.ceil(totalCount / validPageSize));
  const validPage = Math.min(Math.max(1, parseInt(page, 10) || 1), totalPages);
  const offset = (validPage - 1) * validPageSize;

  const dataQuery = `SELECT id, unit, date, amount, notes, source_file, created_at FROM transactions ${whereClause} ORDER BY date DESC, id DESC LIMIT ? OFFSET ?`;
  const dataParams = [...params, validPageSize, offset];
  const res = db.exec(dataQuery, dataParams);
  const list = [];

  if (res.length > 0) {
    for (const row of res[0].values) {
      list.push({
        id: row[0],
        unit: row[1],
        date: row[2],
        amount: parseFloat(row[3]) || 0,
        notes: row[4] || '',
        sourceFile: row[5] || '',
        createdAt: row[6]
      });
    }
  }

  return {
    list,
    totalCount,
    totalGross,
    page: validPage,
    pageSize: validPageSize,
    totalPages
  };
}

// Get total count of all transactions across database
async function getTotalTransactionsCount() {
  if (!db) await initDatabase();
  const res = db.exec(`SELECT COUNT(*) FROM transactions`);
  if (res.length > 0 && res[0].values.length > 0) {
    return parseInt(res[0].values[0][0], 10) || 0;
  }
  return 0;
}

// Add single transaction
async function addSingleTransaction(unit, date, amount, notes = '') {
  if (!db) await initDatabase();
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0 || !date) {
    throw new Error('Tanggal dan jumlah nominal harus valid');
  }

  db.run(
    `INSERT INTO transactions (unit, date, amount, notes, source_file) VALUES (?, ?, ?, ?, 'Input Manual')`,
    [unit, date, amt, notes]
  );
  await saveDb();
  return { success: true };
}

// Update single transaction
async function updateSingleTransaction(id, date, amount, notes = '') {
  if (!db) await initDatabase();
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0 || !date) {
    throw new Error('Tanggal dan jumlah nominal harus valid');
  }

  db.run(
    `UPDATE transactions SET date = ?, amount = ?, notes = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [date, amt, notes, id]
  );
  await saveDb();
  return { success: true };
}

// Delete single transaction by ID
async function deleteSingleTransaction(id) {
  if (!db) await initDatabase();
  db.run(`DELETE FROM transactions WHERE id = ?`, [id]);
  await saveDb();
  return { success: true };
}

module.exports = {
  initDatabase,
  getDbPath,
  getArchiveDir,
  getTotalTransactionsCount,
  saveTransactionsBulk,
  getMonthlyReportData,
  getAvailablePeriods,
  getAllSettings,
  updateSettings,
  deleteTransactions,
  getImportHistory,
  getRawTransactions,
  addSingleTransaction,
  updateSingleTransaction,
  deleteSingleTransaction,
  cleanDuplicateTransactions,
  resetUnitData,
  resetAllDatabase
};
