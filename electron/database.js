const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
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
  const userDataPath = app ? app.getPath('userData') : path.join(__dirname, '..');

  // Automatic safeguard: check for legacy database from previous folder
  const legacyDir = path.join(path.dirname(userDataPath), 'laporan-bapenda-dispenda');
  const legacyDb = path.join(legacyDir, 'laporan_bapenda.sqlite');

  if (fs.existsSync(legacyDb)) {
    try {
      let needRestore = false;
      if (!fs.existsSync(filePath)) {
        needRestore = true;
      } else {
        const currentBuffer = fs.readFileSync(filePath);
        const testDb = new SQL.Database(currentBuffer);
        const check = testDb.exec("SELECT COUNT(*) FROM transactions;");
        const count = (check.length > 0 && check[0].values.length > 0) ? check[0].values[0][0] : 0;
        if (count === 0) {
          needRestore = true;
        }
      }

      if (needRestore) {
        const legacyBuffer = fs.readFileSync(legacyDb);
        const testLegacy = new SQL.Database(legacyBuffer);
        const legCheck = testLegacy.exec("SELECT COUNT(*) FROM transactions;");
        const legCount = (legCheck.length > 0 && legCheck[0].values.length > 0) ? legCheck[0].values[0][0] : 0;
        if (legCount > 0) {
          console.log(`Mengimpor ${legCount} data transaksi dari database sebelumnya...`);
          fs.copyFileSync(legacyDb, filePath);

          // Copy archive folder if present
          const legacyArchive = path.join(legacyDir, 'arsip_excel');
          const currentArchive = await getArchiveDir();
          if (fs.existsSync(legacyArchive)) {
            const arcFiles = fs.readdirSync(legacyArchive);
            for (const f of arcFiles) {
              const srcF = path.join(legacyArchive, f);
              const dstF = path.join(currentArchive, f);
              if (!fs.existsSync(dstF)) {
                fs.copyFileSync(srcF, dstF);
              }
            }
          }
        }
      }
    } catch (migErr) {
      console.error('Error during legacy database migration:', migErr);
    }
  }

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

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      pin_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'staff')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    );
  `);

  // Migrate column stored_path if table was created in earlier version
  try {
    db.run(`ALTER TABLE import_logs ADD COLUMN stored_path TEXT;`);
  } catch (e) {
    // Column already exists
  }

  // Seed default users if empty
  try {
    const userCountRes = db.exec("SELECT COUNT(*) FROM users;");
    const userCount = (userCountRes.length > 0 && userCountRes[0].values.length > 0) ? userCountRes[0].values[0][0] : 0;
    if (userCount === 0) {
      const adminPin = hashPin('123456');
      const staffPin = hashPin('1234');
      db.run(`INSERT INTO users (username, pin_hash, salt, full_name, role) VALUES (?, ?, ?, ?, ?)`,
        ['admin', adminPin.hash, adminPin.salt, 'Administrator', 'admin']);
      db.run(`INSERT INTO users (username, pin_hash, salt, full_name, role) VALUES (?, ?, ?, ?, ?)`,
        ['staff', staffPin.hash, staffPin.salt, 'Staff Pelaporan', 'staff']);
    }
  } catch (err) {
    console.error('Failed to seed default users:', err);
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
    officerName: 'Petugas Pajak Daerah',
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

// PIN Hashing using built-in Node.js crypto
function hashPin(pin, salt) {
  if (!salt) {
    salt = crypto.randomBytes(16).toString('hex');
  }
  const hash = crypto.pbkdf2Sync(String(pin), salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

// Get public user list for profile selection on login screen
async function getPublicUsers() {
  if (!db) await initDatabase();
  const res = db.exec(`SELECT id, username, full_name, role FROM users ORDER BY role ASC, full_name ASC;`);
  if (res.length === 0 || res[0].values.length === 0) return [];
  const cols = res[0].columns;
  return res[0].values.map(row => {
    const obj = {};
    cols.forEach((c, i) => obj[c] = row[i]);
    return obj;
  });
}

// Verify user PIN and return session profile
async function verifyUserPin(userId, pin) {
  if (!db) await initDatabase();
  const res = db.exec(`SELECT id, username, pin_hash, salt, full_name, role FROM users WHERE id = ?;`, [userId]);
  if (res.length === 0 || res[0].values.length === 0) {
    return { success: false, error: 'Pengguna tidak ditemukan.' };
  }
  const [id, username, pin_hash, salt, full_name, role] = res[0].values[0];
  const computed = hashPin(String(pin), salt);
  if (computed.hash !== pin_hash) {
    return { success: false, error: 'PIN yang Anda masukkan tidak sesuai.' };
  }
  db.run(`UPDATE users SET last_login = datetime('now', 'localtime') WHERE id = ?;`, [id]);
  await saveDb();
  return {
    success: true,
    user: {
      id,
      username,
      full_name,
      role,
      last_login: new Date().toISOString()
    }
  };
}

// Admin: Get all users with metadata
async function getAllUsers() {
  if (!db) await initDatabase();
  const res = db.exec(`SELECT id, username, full_name, role, created_at, last_login FROM users ORDER BY role ASC, full_name ASC;`);
  if (res.length === 0 || res[0].values.length === 0) return [];
  const cols = res[0].columns;
  return res[0].values.map(row => {
    const obj = {};
    cols.forEach((c, i) => obj[c] = row[i]);
    return obj;
  });
}

// Admin: Create new user
async function createUser({ username, full_name, role, pin }) {
  if (!db) await initDatabase();
  const cleanUsername = String(username || '').trim().toLowerCase();
  const cleanName = String(full_name || '').trim();
  const cleanRole = role === 'admin' ? 'admin' : 'staff';
  const cleanPin = String(pin || '').trim();

  if (!cleanUsername || cleanUsername.length < 3) {
    return { success: false, error: 'Username minimal 3 karakter.' };
  }
  if (!cleanName) {
    return { success: false, error: 'Nama lengkap wajib diisi.' };
  }
  if (!cleanPin || cleanPin.length < 4) {
    return { success: false, error: 'PIN minimal 4 digit angka.' };
  }

  const check = db.exec(`SELECT id FROM users WHERE username = ?;`, [cleanUsername]);
  if (check.length > 0 && check[0].values.length > 0) {
    return { success: false, error: 'Username sudah digunakan, silakan gunakan username lain.' };
  }

  const hashed = hashPin(cleanPin);
  db.run(
    `INSERT INTO users (username, pin_hash, salt, full_name, role) VALUES (?, ?, ?, ?, ?);`,
    [cleanUsername, hashed.hash, hashed.salt, cleanName, cleanRole]
  );
  await saveDb();
  return { success: true };
}

// Admin: Update user
async function updateUser(id, { full_name, role, pin }) {
  if (!db) await initDatabase();
  const cleanName = String(full_name || '').trim();
  const cleanRole = role === 'admin' ? 'admin' : 'staff';

  if (!cleanName) {
    return { success: false, error: 'Nama lengkap wajib diisi.' };
  }

  if (pin && String(pin).trim().length >= 4) {
    const hashed = hashPin(String(pin).trim());
    db.run(
      `UPDATE users SET full_name = ?, role = ?, pin_hash = ?, salt = ? WHERE id = ?;`,
      [cleanName, cleanRole, hashed.hash, hashed.salt, id]
    );
  } else {
    db.run(
      `UPDATE users SET full_name = ?, role = ? WHERE id = ?;`,
      [cleanName, cleanRole, id]
    );
  }
  await saveDb();
  return { success: true };
}

// Admin: Delete user
async function deleteUser(id, currentUserId) {
  if (!db) await initDatabase();
  if (Number(id) === Number(currentUserId)) {
    return { success: false, error: 'Anda tidak dapat menghapus akun yang sedang digunakan.' };
  }
  db.run(`DELETE FROM users WHERE id = ?;`, [id]);
  await saveDb();
  return { success: true };
}

// Change user own PIN
async function changeOwnPin(userId, oldPin, newPin) {
  if (!db) await initDatabase();
  const res = db.exec(`SELECT pin_hash, salt FROM users WHERE id = ?;`, [userId]);
  if (res.length === 0 || res[0].values.length === 0) {
    return { success: false, error: 'Pengguna tidak ditemukan.' };
  }
  const [pin_hash, salt] = res[0].values[0];
  const oldHashed = hashPin(String(oldPin), salt);
  if (oldHashed.hash !== pin_hash) {
    return { success: false, error: 'PIN lama Anda tidak sesuai.' };
  }
  if (!newPin || String(newPin).trim().length < 4) {
    return { success: false, error: 'PIN baru minimal 4 digit angka.' };
  }
  const newHashed = hashPin(String(newPin).trim());
  db.run(`UPDATE users SET pin_hash = ?, salt = ? WHERE id = ?;`, [newHashed.hash, newHashed.salt, userId]);
  await saveDb();
  return { success: true };
}

// Backup current database to destination path
async function backupDatabaseToFile(destPath) {
  if (!db) await initDatabase();
  await saveDb();
  const currentDbPath = await getDbPath();
  fs.copyFileSync(currentDbPath, destPath);
  const stats = fs.statSync(destPath);
  const totalCount = await getTotalTransactionsCount();
  return {
    success: true,
    filePath: destPath,
    fileSize: stats.size,
    totalTransactions: totalCount
  };
}

// Restore database from a backup file with safety verification
async function restoreDatabaseFromFile(backupFilePath) {
  if (!fs.existsSync(backupFilePath)) {
    return { success: false, error: 'Berkas cadangan tidak ditemukan.' };
  }

  // 1. Verify that backup file is valid SQLite and contains transactions table
  const SQL = await initSqlJs();
  let backupBuffer;
  let testDb;
  try {
    backupBuffer = fs.readFileSync(backupFilePath);
    testDb = new SQL.Database(backupBuffer);
    const check = testDb.exec("SELECT COUNT(*) FROM transactions;");
    if (!check || check.length === 0) {
      return { success: false, error: 'Berkas tidak valid: tabel transaksi tidak ditemukan.' };
    }
  } catch (err) {
    return { success: false, error: 'Berkas cadangan rusak atau bukan database SQLite yang valid.' };
  }

  // 2. Safety snapshot of current DB before replacing
  const currentDbPath = await getDbPath();
  if (fs.existsSync(currentDbPath)) {
    const safetyBackup = currentDbPath + '.pre_restore.bak';
    try {
      fs.copyFileSync(currentDbPath, safetyBackup);
    } catch (e) {
      console.warn('Could not create safety snapshot:', e);
    }
  }

  // 3. Write backup to current path and re-initialize
  fs.writeFileSync(currentDbPath, backupBuffer);
  db = new SQL.Database(backupBuffer);

  // 4. Ensure tables and user migrations
  await initDatabase();

  const totalCount = await getTotalTransactionsCount();
  return {
    success: true,
    filePath: currentDbPath,
    totalTransactions: totalCount
  };
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
  resetAllDatabase,
  getPublicUsers,
  verifyUserPin,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  changeOwnPin,
  backupDatabaseToFile,
  restoreDatabaseFromFile
};
