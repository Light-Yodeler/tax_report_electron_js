const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Dialogs
  openExcelFile: () => ipcRenderer.invoke('dialog:openExcelFile'),
  
  // Excel Processing
  parseExcelFile: (filePath) => ipcRenderer.invoke('excel:parseRawFile', filePath),
  importTransactions: (unit, items, fileName, mode, sourceFilePath) => ipcRenderer.invoke('excel:importTransactions', unit, items, fileName, mode, sourceFilePath),
  exportExcelReport: (year, month) => ipcRenderer.invoke('excel:exportReport', year, month),
  downloadImportTemplate: (unit) => ipcRenderer.invoke('excel:downloadTemplate', unit),
  
  // Database Queries
  getReportData: (unit, year, month) => ipcRenderer.invoke('db:getReport', unit, year, month),
  getAvailablePeriods: () => ipcRenderer.invoke('db:getAvailablePeriods'),
  getSettings: () => ipcRenderer.invoke('db:getSettings'),
  updateSettings: (settings) => ipcRenderer.invoke('db:updateSettings', settings),
  deleteTransactions: (unit, year, month) => ipcRenderer.invoke('db:deleteTransactions', unit, year, month),
  resetUnitData: (unit) => ipcRenderer.invoke('db:resetUnitData', unit),
  resetAllDatabase: () => ipcRenderer.invoke('db:resetAllDatabase'),
  cleanDuplicates: (unit) => ipcRenderer.invoke('db:cleanDuplicates', unit),
  getImportHistory: () => ipcRenderer.invoke('db:getImportHistory'),
  
  // Raw Source Transactions CRUD with Pagination
  getRawTransactions: (unit, year, month, search, page, pageSize) => ipcRenderer.invoke('db:getRawTransactions', unit, year, month, search, page, pageSize),
  addTransaction: (unit, date, amount, notes) => ipcRenderer.invoke('db:addTransaction', unit, date, amount, notes),
  updateTransaction: (id, date, amount, notes) => ipcRenderer.invoke('db:updateTransaction', id, date, amount, notes),
  deleteTransaction: (id) => ipcRenderer.invoke('db:deleteSingleTransaction', id),
  
  // PDF & Printing
  printReportPDF: (unit, year, month, options) => ipcRenderer.invoke('app:printPDF', unit, year, month, options),
  triggerNativePrint: (unit, year, month, options) => ipcRenderer.invoke('app:triggerPrint', unit, year, month, options),

  // Cross-Platform System & Storage Info
  getSystemInfo: () => ipcRenderer.invoke('app:getSystemInfo'),
  openPath: (targetPath) => ipcRenderer.invoke('app:openPath', targetPath),
  showItemInFolder: (filePath) => ipcRenderer.invoke('app:showItemInFolder', filePath),

  // Authentication & Users
  getPublicUsers: () => ipcRenderer.invoke('auth:getPublicUsers'),
  verifyPin: (userId, pin) => ipcRenderer.invoke('auth:verifyPin', userId, pin),
  getAllUsers: () => ipcRenderer.invoke('auth:getAllUsers'),
  createUser: (userData) => ipcRenderer.invoke('auth:createUser', userData),
  updateUser: (id, userData) => ipcRenderer.invoke('auth:updateUser', id, userData),
  deleteUser: (id, currentUserId) => ipcRenderer.invoke('auth:deleteUser', id, currentUserId),
  changeOwnPin: (userId, oldPin, newPin) => ipcRenderer.invoke('auth:changeOwnPin', userId, oldPin, newPin),
});
