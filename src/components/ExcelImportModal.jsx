import React, { useState } from 'react';
import { X, UploadCloud, FileSpreadsheet, Check, AlertCircle, RefreshCw, Home, Utensils, History, ArrowRight, ShieldCheck, Layers, Download, AlertTriangle, ExternalLink, Folder } from 'lucide-react';
import { formatRupiah, formatDateIndo } from '../utils/formatters';

export default function ExcelImportModal({
  isOpen,
  onClose,
  activeUnit,
  onImportSuccess,
  importHistory = []
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [targetUnit, setTargetUnit] = useState(activeUnit || 'Bungalows');
  const [parsedData, setParsedData] = useState(null);
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(0);
  const [importMode, setImportMode] = useState('replace_all_unit'); // 'replace_all_unit' | 'replace_period' | 'skip_duplicates' | 'append'
  const [loading, setLoading] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeTab, setActiveTab] = useState('import'); // 'import' | 'history'

  const currentSheet = parsedData?.sheets?.[selectedSheetIndex];

  // Calculate unique periods present in current sheet
  const periodsInFile = React.useMemo(() => {
    if (!currentSheet || !currentSheet.rows) return [];
    const setP = new Set();
    currentSheet.rows.forEach(r => {
      if (r.date && r.date.length >= 7) setP.add(r.date.substring(0, 7));
    });
    return Array.from(setP).sort();
  }, [currentSheet]);

  if (!isOpen) return null;

  // Handle download Excel import template
  const handleDownloadTemplate = async () => {
    if (!window.electronAPI?.downloadImportTemplate) return;
    setDownloadingTemplate(true);
    setErrorMsg('');
    try {
      const res = await window.electronAPI.downloadImportTemplate(targetUnit);
      if (res && res.success) {
        setSuccessMsg(`Template Excel (${targetUnit}) berhasil disimpan ke: ${res.filePath}`);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Gagal mengunduh template Excel.');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  // Handle open file dialog via Electron
  const handleSelectFile = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const filePath = await window.electronAPI.openExcelFile();
      if (!filePath) return;

      setSelectedFile(filePath);
      setLoading(true);

      const res = await window.electronAPI.parseExcelFile(filePath);
      setLoading(false);

      if (res.success && res.data) {
        setParsedData(res.data);
        setSelectedSheetIndex(0);

        // Auto-set suggested unit if detected
        if (res.data.sheets && res.data.sheets.length > 0) {
          const firstSheet = res.data.sheets[0];
          if (firstSheet.suggestedUnit) {
            setTargetUnit(firstSheet.suggestedUnit);
          }
        }
      } else {
        setErrorMsg(res.error || 'Gagal membaca file Excel.');
      }
    } catch (err) {
      setLoading(false);
      setErrorMsg(err.message || 'Terjadi kesalahan saat memilih file.');
    }
  };

  // Submit and commit parsed transactions to SQLite
  const handleConfirmImport = async () => {
    if (!parsedData || !parsedData.sheets || parsedData.sheets.length === 0) return;

    const currentSheet = parsedData.sheets[selectedSheetIndex];
    if (!currentSheet || !currentSheet.rows || currentSheet.rows.length === 0) {
      setErrorMsg('Tidak ada baris transaksi valid pada sheet yang dipilih.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await window.electronAPI.importTransactions(
        targetUnit,
        currentSheet.rows,
        parsedData.fileName,
        importMode,
        selectedFile
      );

      setLoading(false);
      if (res.success) {
        let msg = `Berhasil mengimpor ${res.count} data transaksi untuk Unit ${targetUnit} (Total: ${formatRupiah(res.totalAmount)})!`;
        if (importMode === 'replace_all_unit' || importMode === 'replace_period') {
          msg += ' Data periode terkait telah diperbarui bersih tanpa duplikat.';
        } else if (res.skippedCount > 0) {
          msg += ` (${res.skippedCount} baris duplikat dilewati).`;
        }
        setSuccessMsg(msg);
        if (onImportSuccess) onImportSuccess();
        setTimeout(() => {
          onClose();
        }, 2200);
      } else {
        setErrorMsg(res.error || 'Gagal menyimpan ke database.');
      }
    } catch (err) {
      setLoading(false);
      setErrorMsg(err.message || 'Terjadi kesalahan saat impor data.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors duration-150">
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                Import File Pendapatan Excel
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Upload file pendapatan mentah unit Bungalows atau Restaurant
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation (Import vs Riwayat) */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 bg-slate-50/50 dark:bg-slate-950/50">
          <button
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 py-2.5 px-3.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'import'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload File Baru</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 py-2.5 px-3.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'history'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Riwayat Import ({importHistory.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          
          {activeTab === 'import' && (
            <>
              {/* Step 1: File Picker */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    1. Pilih File Excel (.xlsx / .xls / .csv)
                  </label>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    disabled={downloadingTemplate}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 border border-slate-300 dark:border-slate-700 text-xs font-semibold transition"
                    title="Unduh format template Excel resmi untuk diisi"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{downloadingTemplate ? 'Mengunduh...' : `Download Template (${targetUnit})`}</span>
                  </button>
                </div>

                <div
                  onClick={handleSelectFile}
                  className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition ${
                    selectedFile
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                      : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 bg-slate-50 dark:bg-slate-950/40'
                  }`}
                >
                  <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
                  {selectedFile ? (
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{parsedData?.fileName || 'File Terpilih'}</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                        Klik untuk mengganti file Excel lain
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Klik untuk memilih file Excel dari komputer Anda
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                        Format kolom Tanggal, Nominal Omset, dan Keterangan
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 2: Target Unit */}
              {parsedData && (
                <div className="animate-in fade-in space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      2. Masukkan ke Unit Usaha
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setTargetUnit('Bungalows')}
                        className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition ${
                          targetUnit === 'Bungalows'
                            ? 'bg-sky-50 dark:bg-sky-950/50 border-sky-500 text-sky-700 dark:text-sky-300 shadow-sm'
                            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <Home className="w-4 h-4" />
                        <span>Unit Bungalows</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTargetUnit('Restaurant')}
                        className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition ${
                          targetUnit === 'Restaurant'
                            ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-700 dark:text-amber-300 shadow-sm'
                            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <Utensils className="w-4 h-4" />
                        <span>Unit Restaurant</span>
                      </button>
                    </div>

                    {/* Mismatch Warning Guardrail */}
                    {currentSheet?.suggestedUnit && currentSheet.suggestedUnit !== targetUnit && (
                      <div className="mt-2.5 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 text-xs text-amber-800 dark:text-amber-300">
                          <p className="font-bold">Perhatian: Potensi Ketidaksesuaian Unit Data</p>
                          <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                            File/sheet ini terindikasi kuat sebagai data <strong>{currentSheet.suggestedUnit}</strong>, namun saat ini Anda memilih target <strong>{targetUnit}</strong>.
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setTargetUnit(currentSheet.suggestedUnit)}
                              className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold text-[11px] transition shadow-sm"
                            >
                              Pindahkan Target ke {currentSheet.suggestedUnit}
                            </button>
                            <span className="text-[10px] text-amber-600 dark:text-amber-400">atau tetap pilih {targetUnit} jika yakin</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Step 3: Anti-Duplication Strategy */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>3. Kebijakan Anti-Duplikasi Data</span>
                    </label>
                    
                    <div className="space-y-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer transition">
                        <input
                          type="radio"
                          name="importMode"
                          value="replace_all_unit"
                          checked={importMode === 'replace_all_unit'}
                          onChange={() => setImportMode('replace_all_unit')}
                          className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-200 flex items-center gap-2">
                            <span>Reset & Ganti Seluruh Data Unit Ini (Direkomendasikan)</span>
                            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded font-semibold border border-emerald-300 dark:border-emerald-800">100% Sinkron</span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Mengosongkan data lama unit {targetUnit} dan menggantinya persis dengan seluruh baris di file Excel ini.
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer transition">
                        <input
                          type="radio"
                          name="importMode"
                          value="replace_period"
                          checked={importMode === 'replace_period'}
                          onChange={() => setImportMode('replace_period')}
                          className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-200">
                            Ganti Data Periode Bulan Terkait Saja
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Hanya menimpa data pada bulan-bulan yang ada di file ini, data bulan lain tetap dipertahankan.
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer transition">
                        <input
                          type="radio"
                          name="importMode"
                          value="skip_duplicates"
                          checked={importMode === 'skip_duplicates'}
                          onChange={() => setImportMode('skip_duplicates')}
                          className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-200">
                            Lewati Baris yang Persis Sama (Skip Exact Duplicates)
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Hanya mengimpor baris baru yang belum ada di database berdasarkan tanggal, nominal, dan keterangan.
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer transition">
                        <input
                          type="radio"
                          name="importMode"
                          value="append"
                          checked={importMode === 'append'}
                          onChange={() => setImportMode('append')}
                          className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-200">
                            Tambahkan Semua Baris (Append All)
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Menambahkan seluruh baris tanpa memeriksa data yang sudah ada sebelumnya.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Summary & Sheet Selector */}
                  {currentSheet && (
                    <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">Total Transaksi Ditemukan:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">{currentSheet.totalRows} Baris Transaksi</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">Total Pendapatan Kotor:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(currentSheet.totalGross)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">Periode Bulan di File:</span>
                        <span className="font-bold text-sky-700 dark:text-sky-300">{periodsInFile.join(', ') || '-'}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Alert Messages */}
              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}
            </>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-2.5">
              {importHistory.length === 0 ? (
                <p className="text-center py-8 text-xs text-slate-400 dark:text-slate-500">
                  Belum ada riwayat impor data.
                </p>
              ) : (
                importHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs gap-3 flex-wrap sm:flex-nowrap"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-1.5 py-0.5 rounded font-bold uppercase text-[10px] ${
                          item.unit === 'Bungalows' ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                        }`}>
                          {item.unit}
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{item.fileName}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                        {item.importedAt} &bull; {item.recordsCount} baris
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {formatRupiah(item.totalAmount)}
                      </div>

                      {item.storedPath && window.electronAPI?.openPath && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => window.electronAPI.openPath(item.storedPath)}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-[10px] font-semibold transition"
                            title="Buka file Excel asli ini"
                          >
                            <ExternalLink className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                            <span>Buka Excel</span>
                          </button>
                          <button
                            onClick={() => window.electronAPI.showItemInFolder(item.storedPath)}
                            className="p-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 transition"
                            title="Tampilkan lokasi berkas di folder"
                          >
                            <Folder className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>

        {/* Footer Actions */}
        {activeTab === 'import' && (
          <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end gap-2.5">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition"
            >
              Batal
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={loading || !parsedData}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Simpan & Import Data</span>
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
