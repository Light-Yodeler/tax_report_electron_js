import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import PeriodSelector from './components/PeriodSelector';
import MetricCards from './components/MetricCards';
import RevenueChart from './components/RevenueChart';
import ReportTable from './components/ReportTable';
import RawDataView from './components/RawDataView';
import ExcelImportModal from './components/ExcelImportModal';
import PrintReportView from './components/PrintReportView';
import SettingsModal from './components/SettingsModal';
import { RefreshCw, FileUp, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatRupiah, getMonthName } from './utils/formatters';

export default function App() {
  const currentDate = new Date();
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('app_theme') || 'light';
  });
  const [activeUnit, setActiveUnit] = useState('Bungalows');
  const [activeTab, setActiveTab] = useState('report'); // 'report' | 'source'
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);

  // Sync theme to root html element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };
  
  const [reportData, setReportData] = useState(null);
  const [availablePeriods, setAvailablePeriods] = useState([]);
  const [settings, setSettings] = useState(null);
  const [importHistory, setImportHistory] = useState([]);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [notification, setNotification] = useState(null); // { type: 'success'|'error', text: '' }

  const showToast = (text, type = 'success') => {
    setNotification({ text, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Load report data from SQLite
  const loadReport = useCallback(async () => {
    if (!window.electronAPI) {
      console.warn('Electron API not available (running in browser mode).');
      return;
    }
    setIsLoading(true);
    try {
      const res = await window.electronAPI.getReportData(activeUnit, selectedYear, selectedMonth);
      if (res.success && res.data) {
        setReportData(res.data);
      }

      // Also refresh available periods and history
      const periodsRes = await window.electronAPI.getAvailablePeriods();
      if (periodsRes.success) setAvailablePeriods(periodsRes.data || []);

      const histRes = await window.electronAPI.getImportHistory();
      if (histRes.success) setImportHistory(histRes.data || []);
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeUnit, selectedYear, selectedMonth]);

  // Load initial settings
  const loadSettings = async () => {
    if (!window.electronAPI) return;
    try {
      const res = await window.electronAPI.getSettings();
      if (res.success && res.data) {
        setSettings(res.data);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  // Initial load
  useEffect(() => {
    loadSettings();
    loadReport();
  }, [loadReport]);

  // If there's data in periods and current month is empty on first boot, auto switch to latest active period
  useEffect(() => {
    if (availablePeriods.length > 0 && reportData && reportData.totalRevenue === 0) {
      const matching = availablePeriods.find(p => p.unit === activeUnit);
      if (matching && (matching.year !== selectedYear || matching.month !== selectedMonth)) {
        setSelectedYear(matching.year);
        setSelectedMonth(matching.month);
      }
    }
  }, [availablePeriods, activeUnit]);

  // Handle Export Official Excel
  const handleExportExcel = async () => {
    if (!window.electronAPI) return;
    setIsExporting(true);
    try {
      const res = await window.electronAPI.exportExcelReport(selectedYear, selectedMonth);
      if (res.success) {
        showToast(`Laporan Bapenda berhasil diekspor ke: ${res.filePath}`, 'success');
      } else if (!res.canceled) {
        showToast(res.error || 'Gagal mengekspor file Excel.', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Terjadi kesalahan saat ekspor.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Reset / Clear Month Data
  const handleClearMonthData = async () => {
    const monthName = getMonthName(selectedMonth);
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus seluruh data transaksi ${activeUnit} untuk periode ${monthName} ${selectedYear}? Data yang dihapus tidak dapat dikembalikan.`
    );
    if (!confirmed) return;

    try {
      const res = await window.electronAPI.deleteTransactions(activeUnit, selectedYear, selectedMonth);
      if (res.success) {
        showToast(`Data ${activeUnit} bulan ${monthName} ${selectedYear} berhasil direset.`, 'success');
        loadReport();
      }
    } catch (err) {
      showToast(err.message || 'Gagal mereset data.', 'error');
    }
  };

  // Handle Save Settings
  const handleSaveSettings = async (newSettings) => {
    try {
      const res = await window.electronAPI.updateSettings(newSettings);
      if (res.success) {
        setSettings(newSettings);
        showToast('Pengaturan profil dan tarif pajak berhasil disimpan.', 'success');
        loadReport();
      }
    } catch (err) {
      showToast(err.message || 'Gagal menyimpan pengaturan.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white transition-colors duration-150">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium ${
            notification.type === 'error'
              ? 'bg-rose-950 border-rose-800 text-rose-200'
              : 'bg-emerald-950 border-emerald-800 text-emerald-200'
          }`}>
            {notification.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
        </div>
      )}

      {/* Main Header */}
      <div className="no-print">
        <Header
          activeUnit={activeUnit}
          setActiveUnit={setActiveUnit}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenImport={() => setIsImportModalOpen(true)}
          onExportExcel={handleExportExcel}
          onOpenPrint={() => setIsPrintModalOpen(true)}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onRefresh={loadReport}
          isExporting={isExporting}
          settings={settings}
        />
      </div>

      {/* Main Container */}
      <main className="no-print flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* VIEW 1: LAPORAN BAPENDA */}
        {activeTab === 'report' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Period Selector Bar */}
            <PeriodSelector
              selectedYear={selectedYear}
              setSelectedYear={setSelectedYear}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              availablePeriods={availablePeriods}
              activeUnit={activeUnit}
              onClearData={handleClearMonthData}
            />

            {/* Empty State Banner if 0 revenue (Clean Antislop-UI Style) */}
            {reportData && reportData.totalRevenue === 0 && (
              <div className="no-print bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-900/50 flex items-center justify-center flex-shrink-0">
                    <FileUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      Belum ada data untuk {activeUnit} ({getMonthName(selectedMonth)} {selectedYear})
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Import file Excel pendapatan harian raw atau input manual pada tab Data Sumber.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                  <button
                    onClick={() => setActiveTab('source')}
                    className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition"
                  >
                    <span>Input Manual</span>
                  </button>
                  <button
                    onClick={() => setIsImportModalOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition"
                  >
                    <FileUp className="w-3.5 h-3.5" />
                    <span>Import Excel</span>
                  </button>
                </div>
              </div>
            )}

            {/* Summary Metric Cards */}
            <MetricCards data={reportData} />

            {/* Revenue Trend Visual Chart */}
            {reportData && reportData.rows && reportData.rows.length > 0 && (
              <RevenueChart rows={reportData.rows} unit={activeUnit} />
            )}

            {/* Calendar Breakdown Table */}
            <ReportTable
              rows={reportData?.rows || []}
              totalRevenue={reportData?.totalRevenue || 0}
              taxDue={reportData?.taxDue || 0}
              unit={activeUnit}
            />
          </div>
        )}

        {/* VIEW 2: DATA SUMBER (INPUT TRANSAKSI MENTAH & EDIT) */}
        {activeTab === 'source' && (
          <RawDataView
            unit={activeUnit}
            year={selectedYear}
            month={selectedMonth}
            onDataChanged={loadReport}
            onOpenImport={() => setIsImportModalOpen(true)}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="no-print border-t border-slate-200 dark:border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500 dark:text-slate-400">
        <p>
          &copy; {new Date().getFullYear()} {settings?.businessName || 'ANDA BUNGALOWS & RESTAURANT'} &bull; Sistem Pelaporan Pajak Daerah (Bapenda)
        </p>
      </footer>

      {/* Import Modal */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        activeUnit={activeUnit}
        onImportSuccess={() => {
          loadReport();
          showToast('Data transaksi berhasil diimpor ke database SQLite!', 'success');
        }}
        importHistory={importHistory}
      />

      {/* Print / PDF Document Modal */}
      <PrintReportView
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        reportData={reportData}
        settings={settings}
        unit={activeUnit}
        year={selectedYear}
        month={selectedMonth}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />

    </div>
  );
}
