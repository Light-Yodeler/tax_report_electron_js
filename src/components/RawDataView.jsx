import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, Database, FileSpreadsheet, RefreshCw, Check, X, Calendar, Filter, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatRupiah, getMonthName } from '../utils/formatters';

export default function RawDataView({
  unit,
  year,
  month,
  onDataChanged,
  onOpenImport
}) {
  const [transactions, setTransactions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalGross, setTotalGross] = useState(0);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState('month'); // 'month' | 'all'
  const [isLoading, setIsLoading] = useState(false);

  // Pagination states (Optimized for hundreds of thousands of rows)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(1);

  // Edit / Add Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [formData, setFormData] = useState({
    id: null,
    date: '',
    amount: '',
    notes: ''
  });
  const [formError, setFormError] = useState('');

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [unit, year, month, search, filterMode, pageSize]);

  // Fetch transactions from SQLite with pagination
  const fetchTransactions = useCallback(async () => {
    if (!window.electronAPI) return;
    setIsLoading(true);
    try {
      const qYear = filterMode === 'month' ? year : null;
      const qMonth = filterMode === 'month' ? month : null;
      const res = await window.electronAPI.getRawTransactions(unit, qYear, qMonth, search, currentPage, pageSize);
      if (res.success && res.data) {
        setTransactions(res.data.list || []);
        setTotalCount(res.data.totalCount || 0);
        setTotalGross(res.data.totalGross || 0);
        setTotalPages(res.data.totalPages || 1);
        if (res.data.page && res.data.page !== currentPage) {
          setCurrentPage(res.data.page);
        }
      }
    } catch (err) {
      console.error('Failed to load raw transactions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [unit, year, month, search, filterMode, currentPage, pageSize]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Open Add Modal
  const handleOpenAdd = () => {
    const monthStr = month < 10 ? `0${month}` : `${month}`;
    const defaultDate = `${year}-${monthStr}-01`;
    setFormData({
      id: null,
      date: defaultDate,
      amount: '',
      notes: ''
    });
    setFormError('');
    setModalMode('add');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item) => {
    setFormData({
      id: item.id,
      date: item.date,
      amount: item.amount,
      notes: item.notes || ''
    });
    setFormError('');
    setModalMode('edit');
    setIsModalOpen(true);
  };

  // Handle Delete
  const handleDelete = async (id, date, amount) => {
    const confirmed = window.confirm(`Hapus transaksi tanggal ${date} sebesar ${formatRupiah(amount)}?`);
    if (!confirmed) return;

    try {
      const res = await window.electronAPI.deleteTransaction(id);
      if (res.success) {
        fetchTransactions();
        if (onDataChanged) onDataChanged();
      }
    } catch (err) {
      alert('Gagal menghapus transaksi: ' + err.message);
    }
  };

  // Submit Form
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError('');

    const numAmount = parseFloat(formData.amount);
    if (!formData.date) {
      setFormError('Tanggal harus diisi.');
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Nominal pendapatan harus lebih besar dari 0.');
      return;
    }

    try {
      if (modalMode === 'add') {
        const res = await window.electronAPI.addTransaction(unit, formData.date, numAmount, formData.notes);
        if (res.success) {
          setIsModalOpen(false);
          fetchTransactions();
          if (onDataChanged) onDataChanged();
        }
      } else {
        const res = await window.electronAPI.updateTransaction(formData.id, formData.date, numAmount, formData.notes);
        if (res.success) {
          setIsModalOpen(false);
          fetchTransactions();
          if (onDataChanged) onDataChanged();
        }
      }
    } catch (err) {
      setFormError(err.message || 'Gagal menyimpan transaksi.');
    }
  };

  // Handle Clean Duplicates
  const handleCleanDuplicates = async () => {
    const confirmed = window.confirm(
      `Apakah Anda ingin membersihkan seluruh baris transaksi yang terduplikasi persis pada Unit ${unit}?`
    );
    if (!confirmed) return;

    try {
      const res = await window.electronAPI.cleanDuplicates(unit);
      if (res.success) {
        if (res.removedCount > 0) {
          alert(`Berhasil menghapus ${res.removedCount} baris transaksi duplikat! Tersisa ${res.remainingCount} transaksi.`);
        } else {
          alert('Tidak ditemukan data transaksi duplikat. Database sudah bersih!');
        }
        fetchTransactions();
        if (onDataChanged) onDataChanged();
      }
    } catch (err) {
      alert('Gagal membersihkan duplikat: ' + err.message);
    }
  };

  // Handle Reset Unit Data
  const handleResetUnit = async () => {
    const confirmed = window.confirm(
      `PERINGATAN: Apakah Anda yakin ingin MENGHAPUS SEMUA DATA transaksi Unit ${unit}?\n\nSeluruh baris transaksi untuk Unit ${unit} akan dikosongkan. Tindakan ini tidak dapat dibatalkan.`
    );
    if (!confirmed) return;

    try {
      const res = await window.electronAPI.resetUnitData(unit);
      if (res.success) {
        alert(`Seluruh data transaksi Unit ${unit} telah berhasil direset.`);
        fetchTransactions();
        if (onDataChanged) onDataChanged();
      }
    } catch (err) {
      alert('Gagal mereset data unit: ' + err.message);
    }
  };

  // Handle Reset All Database
  const handleResetAll = async () => {
    const confirmed = window.confirm(
      `PERINGATAN KRUSIAL: Apakah Anda yakin ingin MERESET TOTAL SELURUH DATABASE?\n\nSemua data transaksi Bungalows, Restaurant, dan riwayat impor akan DIHAPUS BERSIH. Tindakan ini tidak dapat dibatalkan.`
    );
    if (!confirmed) return;

    try {
      const res = await window.electronAPI.resetAllDatabase();
      if (res.success) {
        alert('Seluruh database aplikasi berhasil dikosongkan.');
        fetchTransactions();
        if (onDataChanged) onDataChanged();
      }
    } catch (err) {
      alert('Gagal mereset database: ' + err.message);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in">
      
      {/* Header Info & Actions Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors duration-150">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400 border border-slate-200 dark:border-slate-700">
              <Database className="w-4 h-4" />
            </div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
              Data Transaksi Harian ({unit})
            </h2>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Data transaksi mentah input harian. Tambah, edit, periksa, atau hapus entri transaksi di sini.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Baris</span>
          </button>

          <button
            onClick={onOpenImport}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition active:scale-95"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Import Excel</span>
          </button>

          <button
            onClick={async () => {
              if (!window.electronAPI?.downloadImportTemplate) return;
              const res = await window.electronAPI.downloadImportTemplate(unit);
              if (res && res.success) {
                alert(`Template Excel (${unit}) berhasil diunduh ke:\n${res.filePath}`);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold transition active:scale-95 shadow-sm"
            title="Unduh file format template Excel untuk diisi"
          >
            <Download className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>Unduh Template</span>
          </button>

          {/* Reset Unit Button */}
          <button
            onClick={handleResetUnit}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs font-semibold transition active:scale-95"
            title="Kosongkan seluruh data transaksi unit ini"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset Data</span>
          </button>

          <button
            onClick={fetchTransactions}
            className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-300 dark:border-slate-700 transition"
            title="Segarkan Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-sm transition-colors duration-150">
        
        {/* Search box */}
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari tanggal, keterangan, atau file..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Period Mode Toggle & Counter */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-300 dark:border-slate-800">
            <button
              onClick={() => setFilterMode('month')}
              className={`px-3 py-1 rounded-md font-semibold transition ${
                filterMode === 'month'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {getMonthName(month)} {year}
            </button>
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-md font-semibold transition ${
                filterMode === 'all'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Semua Periode
            </button>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-800 flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400">Total:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{totalCount} Baris</span>
            <span className="text-slate-400">&bull;</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(totalGross)}</span>
          </div>
        </div>

      </div>

      {/* Raw Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-colors duration-150">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 text-center w-14">No.</th>
                <th className="px-4 py-3 w-32">Tanggal</th>
                <th className="px-4 py-3 text-right w-44">Pendapatan</th>
                <th className="px-4 py-3">Keterangan / Rincian</th>
                <th className="px-4 py-3 w-40">Sumber File</th>
                <th className="px-4 py-3 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/70">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-500">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-sky-600 dark:text-sky-400" />
                    <span>Memuat data transaksi...</span>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-500 dark:text-slate-400">
                    Tidak ada transaksi ditemukan. Klik <strong>+ Tambah Baris</strong> atau <strong>Import Excel</strong> untuk memasukkan data.
                  </td>
                </tr>
              ) : (
                transactions.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 bg-white dark:bg-slate-900 transition"
                  >
                    <td className="px-4 py-2.5 text-center text-slate-400 font-mono">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                      {item.date}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-slate-900 dark:text-emerald-400 whitespace-nowrap">
                      {formatRupiah(item.amount)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">
                      {item.notes || <span className="text-slate-400 dark:text-slate-600 italic">-</span>}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-xs">
                      {item.sourceFile || 'Input Manual'}
                    </td>
                    <td className="px-4 py-2.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1 rounded bg-slate-100 hover:bg-sky-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 hover:text-sky-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition"
                          title="Edit Transaksi"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.date, item.amount)}
                          className="p-1 rounded bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 hover:text-rose-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 transition"
                          title="Hapus Transaksi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 flex-wrap">
            <span>
              Menampilkan {totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalCount)} dari {totalCount} baris
            </span>
            <span>&bull;</span>
            <div className="flex items-center gap-1.5">
              <span>Baris per hal:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-0.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                Pertama
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-medium text-slate-700 dark:text-slate-300">
                Hal {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
                className="p-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                title="Halaman Selanjutnya"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage >= totalPages}
                className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                Terakhir
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL TAMBAH / EDIT TRANSAKSI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-900/50">
                  {modalMode === 'add' ? <Plus className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {modalMode === 'add' ? `Tambah Transaksi (${unit})` : `Edit Transaksi (${unit})`}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitForm} className="p-5 space-y-4">
              
              {/* Tanggal */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Tanggal Transaksi
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  required
                />
              </div>

              {/* Nominal Pendapatan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Total Pendapatan (Rp)
                </label>
                <input
                  type="number"
                  placeholder="Contoh: 2500000"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  required
                />
                {formData.amount && !isNaN(formData.amount) && (
                  <p className="text-[11px] text-emerald-400 mt-1 font-semibold">
                    Format: {formatRupiah(parseFloat(formData.amount))}
                  </p>
                )}
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Keterangan / Rincian (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Kamar 101, Kamar 102 / Dinner Shift"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              {/* Error Alert */}
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs">
                  {formError}
                </div>
              )}

              {/* Modal Actions */}
              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{modalMode === 'add' ? 'Simpan Transaksi' : 'Perbarui Transaksi'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
