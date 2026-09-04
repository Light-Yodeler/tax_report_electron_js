const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const dbService = require('./database');
const excelService = require('./excelService');
const pdfService = require('./pdfService');

let mainWindow = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 900,
    minWidth: 1050,
    minHeight: 700,
    title: 'Rekapitulasi & Pelaporan Pajak Usaha - Anda Bungalows & Restaurant',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    },
    backgroundColor: '#f8fafc',
    show: false
  });

  // Enable Cmd+R / Ctrl+R to reload and Cmd+Option+I to toggle DevTools
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if ((input.control || input.meta) && input.key.toLowerCase() === 'r') {
      mainWindow.reload();
      event.preventDefault();
    }
    if (((input.control || input.meta) && input.alt && input.key.toLowerCase() === 'i') || input.key === 'F12') {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (isDev) {
    const devUrl = 'http://localhost:5173';
    mainWindow.loadURL(devUrl).catch(() => {
      // Retry if vite is still starting
      setTimeout(() => mainWindow.loadURL(devUrl), 1500);
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    await dbService.initDatabase();
  } catch (err) {
    console.error('Error initializing database:', err);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC: File Dialog
ipcMain.handle('dialog:openExcelFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Pilih File Excel Pendapatan (Bungalows / Restaurant)',
    filters: [
      { name: 'Excel / CSV Files', extensions: ['xlsx', 'xls', 'csv'] }
    ],
    properties: ['openFile']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

// IPC: Parse Excel File
ipcMain.handle('excel:parseRawFile', async (event, filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error('File tidak ditemukan: ' + filePath);
    }
    const parsed = excelService.parseRawExcelFile(filePath);
    return { success: true, data: parsed };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Import Transactions into SQLite
ipcMain.handle('excel:importTransactions', async (event, unit, items, fileName, mode = 'replace_period', sourceFilePath = null) => {
  try {
    const res = await dbService.saveTransactionsBulk(unit, items, fileName, mode, sourceFilePath);
    return { success: true, ...res };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Clean Duplicate Transactions
ipcMain.handle('db:cleanDuplicates', async (event, unit) => {
  try {
    const res = await dbService.cleanDuplicateTransactions(unit);
    return res;
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Export Tax Excel Report
ipcMain.handle('excel:exportReport', async (event, year, month) => {
  try {
    const settings = await dbService.getAllSettings();
    const bungalowsData = await dbService.getMonthlyReportData('Bungalows', year, month);
    const restaurantData = await dbService.getMonthlyReportData('Restaurant', year, month);

    const monthNamesIndo = [
      '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthName = monthNamesIndo[month] || `Bulan_${month}`;
    const defaultFilename = `Laporan_Pajak_Anda_${monthName}_${year}.xlsx`;

    const saveResult = await dialog.showSaveDialog(mainWindow, {
      title: 'Simpan Laporan Excel Pajak',
      defaultPath: defaultFilename,
      filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }]
    });

    if (saveResult.canceled || !saveResult.filePath) {
      return { canceled: true };
    }

    await excelService.generateTaxExcelReport(bungalowsData, restaurantData, saveResult.filePath, settings);
    return { success: true, filePath: saveResult.filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Download Import Template Excel
ipcMain.handle('excel:downloadTemplate', async (event, unit = 'Bungalows') => {
  try {
    const defaultFilename = `Template_Import_Pendapatan_${unit}.xlsx`;

    const saveResult = await dialog.showSaveDialog(mainWindow, {
      title: `Download Template Import Excel (${unit})`,
      defaultPath: defaultFilename,
      filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }]
    });

    if (saveResult.canceled || !saveResult.filePath) {
      return { canceled: true };
    }

    const res = await excelService.generateImportTemplate(unit, saveResult.filePath);
    return res;
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Get Report Data
ipcMain.handle('db:getReport', async (event, unit, year, month) => {
  try {
    const data = await dbService.getMonthlyReportData(unit, year, month);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Get Available Periods
ipcMain.handle('db:getAvailablePeriods', async () => {
  try {
    const periods = await dbService.getAvailablePeriods();
    return { success: true, data: periods };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Get Settings
ipcMain.handle('db:getSettings', async () => {
  try {
    const settings = await dbService.getAllSettings();
    return { success: true, data: settings };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Update Settings
ipcMain.handle('db:updateSettings', async (event, settings) => {
  try {
    await dbService.updateSettings(settings);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Delete Transactions (by month or unit)
ipcMain.handle('db:deleteTransactions', async (event, unit, year, month) => {
  try {
    await dbService.deleteTransactions(unit, year, month);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Reset Unit Data
ipcMain.handle('db:resetUnitData', async (event, unit) => {
  try {
    const res = await dbService.resetUnitData(unit);
    return res;
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Reset Entire Database
ipcMain.handle('db:resetAllDatabase', async () => {
  try {
    const res = await dbService.resetAllDatabase();
    return res;
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Get Raw Transactions with Pagination
ipcMain.handle('db:getRawTransactions', async (event, unit, year, month, search, page = 1, pageSize = 50) => {
  try {
    const data = await dbService.getRawTransactions(unit, year, month, search, page, pageSize);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Add Single Transaction
ipcMain.handle('db:addTransaction', async (event, unit, date, amount, notes) => {
  try {
    const res = await dbService.addSingleTransaction(unit, date, amount, notes);
    return res;
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Update Single Transaction
ipcMain.handle('db:updateTransaction', async (event, id, date, amount, notes) => {
  try {
    const res = await dbService.updateSingleTransaction(id, date, amount, notes);
    return res;
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Delete Single Transaction
ipcMain.handle('db:deleteSingleTransaction', async (event, id) => {
  try {
    const res = await dbService.deleteSingleTransaction(id);
    return res;
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Import History
ipcMain.handle('db:getImportHistory', async () => {
  try {
    const history = await dbService.getImportHistory();
    return { success: true, data: history };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: System & Storage Paths Info (Cross-Platform Windows & macOS)
ipcMain.handle('app:getSystemInfo', async () => {
  try {
    const dbPath = await dbService.getDbPath();
    const archiveDir = await dbService.getArchiveDir();
    const userDataDir = app.getPath('userData');
    const appPath = app.getAppPath();
    const totalTransactions = await dbService.getTotalTransactionsCount();
    let dbSizeBytes = 0;
    if (fs.existsSync(dbPath)) {
      dbSizeBytes = fs.statSync(dbPath).size;
    }
    return {
      success: true,
      data: {
        dbPath,
        archiveDir,
        userDataDir,
        appPath,
        dbSizeBytes,
        totalTransactions,
        platform: process.platform
      }
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Open Path (Opens folder/file in Windows Explorer or macOS Finder)
ipcMain.handle('app:openPath', async (event, targetPath) => {
  try {
    if (!targetPath || !fs.existsSync(targetPath)) {
      return { success: false, error: 'Path tidak ditemukan: ' + targetPath };
    }
    await shell.openPath(targetPath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Show item in folder
ipcMain.handle('app:showItemInFolder', async (event, filePath) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      return { success: false, error: 'File tidak ditemukan: ' + filePath };
    }
    shell.showItemInFolder(filePath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Native Print (Isolated Clean Document)
ipcMain.handle('app:triggerPrint', async (event, unit, year, month, options = {}) => {
  try {
    const settings = await dbService.getAllSettings();
    const reportData = await dbService.getMonthlyReportData(unit, year, month);
    const html = pdfService.generateHtmlContent(reportData, settings, unit, year, month, options);

    const printWindow = new BrowserWindow({
      show: false,
      width: 1200,
      height: 850,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    await new Promise(resolve => setTimeout(resolve, 400));

    printWindow.webContents.print({
      silent: false,
      printBackground: true,
      pageSize: 'A4',
      landscape: true,
      margins: { marginType: 'none' }
    }, () => {
      printWindow.close();
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('app:printPDF', async (event, unit, year, month, options = {}) => {
  try {
    const settings = await dbService.getAllSettings();
    const reportData = await dbService.getMonthlyReportData(unit, year, month);

    const monthNamesIndo = [
      '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthName = monthNamesIndo[month] || `Bulan_${month}`;
    const defaultFilename = `Laporan_Pajak_${unit}_${monthName}_${year}.pdf`;

    const saveResult = await dialog.showSaveDialog(mainWindow, {
      title: 'Simpan Laporan PDF',
      defaultPath: defaultFilename,
      filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
    });

    if (saveResult.canceled || !saveResult.filePath) {
      return { canceled: true };
    }

    const res = await pdfService.renderReportToPdf(reportData, settings, unit, year, month, saveResult.filePath, options);
    return res;
  } catch (err) {
    return { success: false, error: err.message };
  }
});
