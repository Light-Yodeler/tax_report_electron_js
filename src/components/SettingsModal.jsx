import React, { useState, useEffect } from 'react';
import { X, Settings as SettingsIcon, Check, Save, HardDrive, Database, Folder, ExternalLink, Cpu } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, settings, onSaveSettings }) {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'storage'
  const [formData, setFormData] = useState({
    businessName: '',
    businessAddress: '',
    contactNumber: '',
    npwpd: '',
    taxRate: '0.10',
    signName: ''
  });
  const [saved, setSaved] = useState(false);
  const [systemInfo, setSystemInfo] = useState(null);

  useEffect(() => {
    if (settings) {
      setFormData({
        businessName: settings.businessName || 'ANDA BUNGALOWS & RESTAURANT',
        businessAddress: settings.businessAddress || 'Jalan Pariwisata Pantai Kuta, Kecamatan Pujut, Lombok Tengah, NTB',
        contactNumber: settings.contactNumber || 'HP/WhatsApp: 087750665000',
        npwpd: settings.npwpd || 'P.2.0001234.01.23',
        taxRate: settings.taxRate || '0.10',
        signName: settings.signName || 'Pimpinan / Pengelola'
      });
    }
  }, [settings, isOpen]);

  useEffect(() => {
    if (isOpen && window.electronAPI?.getSystemInfo) {
      window.electronAPI.getSystemInfo().then((res) => {
        if (res && res.success) {
          setSystemInfo(res.data);
        }
      }).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (onSaveSettings) {
      await onSaveSettings(formData);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1200);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-xl rounded-xl shadow-2xl overflow-hidden flex flex-col transition-colors duration-150 max-h-[90vh]">
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400 border border-slate-200 dark:border-slate-700">
              <SettingsIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                Pengaturan Aplikasi
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Profil usaha, parameter pajak, dan informasi lokasi penyimpanan data
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

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 bg-slate-50/50 dark:bg-slate-950/50">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 py-2.5 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'profile'
                ? 'border-sky-600 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <SettingsIcon className="w-3.5 h-3.5" />
            <span>Profil Usaha & Pajak</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('storage')}
            className={`flex items-center gap-2 py-2.5 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'storage'
                ? 'border-sky-600 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Penyimpanan & Database</span>
          </button>
        </div>

        {/* Tab 1: Profil Usaha */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSubmit} className="p-5 space-y-3.5 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Nama Usaha / Hotel & Resto
            </label>
            <input
              type="text"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Alamat Lengkap Usaha
            </label>
            <textarea
              rows={2}
              value={formData.businessAddress}
              onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                No. HP / WhatsApp
              </label>
              <input
                type="text"
                value={formData.contactNumber}
                onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Tarif Pajak Daerah
              </label>
              <select
                value={formData.taxRate}
                onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none cursor-pointer"
              >
                <option value="0.10">10% (Standar Pajak Hotel & Resto)</option>
                <option value="0.05">5%</option>
                <option value="0.11">11%</option>
                <option value="0.12">12%</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Nama Penandatangan (Wajib Pajak / Pengelola)
            </label>
            <input
              type="text"
              value={formData.signName}
              onChange={(e) => setFormData({ ...formData, signName: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              placeholder="Contoh: H. M. Syahid Ramadhon"
            />
          </div>

          {/* Danger Zone: Reset All Database */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400">Reset Seluruh Data</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Kosongkan seluruh transaksi dan mulai pembukuan baru.</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                const confirmed = window.confirm('PERINGATAN KRUSIAL: Kosongkan seluruh transaksi dan riwayat impor di database?');
                if (confirmed) {
                  const res = await window.electronAPI.resetAllDatabase();
                  if (res && res.success) {
                    alert('Seluruh database berhasil dikosongkan.');
                    if (onSaveSettings) onSaveSettings(formData);
                    onClose();
                  }
                }
              }}
              className="px-2.5 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs font-semibold transition"
            >
              Reset Total
            </button>
          </div>

          {/* Footer actions */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition"
            >
              {saved ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Tersimpan!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan</span>
                </>
              )}
            </button>
          </div>
        </form>
        )}

        {/* Tab 2: Penyimpanan & Database */}
        {activeTab === 'storage' && (
          <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
            {/* System / OS Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-900/50">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    Sistem Operasi: {systemInfo?.platform === 'win32' ? 'Windows' : systemInfo?.platform === 'darwin' ? 'macOS' : systemInfo?.platform || 'Desktop'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Aplikasi berjalan dengan engine SQLite lokal aman tanpa internet
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Lokal & Privat
                </span>
              </div>
            </div>

            {/* SQLite Database Path Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">File Database SQLite</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {formatBytes(systemInfo?.dbSizeBytes)} &bull; {systemInfo?.totalTransactions || 0} Baris
                  </span>
                  {systemInfo?.userDataDir && window.electronAPI?.openPath && (
                    <button
                      type="button"
                      onClick={() => window.electronAPI.openPath(systemInfo.userDataDir)}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 border border-slate-300 dark:border-slate-700 text-[10px] font-semibold transition shadow-sm"
                      title="Buka folder database di File Explorer / Finder"
                    >
                      <Folder className="w-3 h-3" />
                      <span>Buka Folder</span>
                    </button>
                  )}
                </div>
              </div>
              <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 break-all font-mono text-[11px] text-slate-600 dark:text-slate-300 select-all">
                {systemInfo?.dbPath || 'Memuat path database...'}
              </div>
              <p className="text-[10.5px] text-slate-400 dark:text-slate-500 leading-tight">
                File ini berisi seluruh data transaksi dan profil. Anda dapat menyalin file ini ke flashdisk/cloud drive sebagai cadangan (backup) kapan saja.
              </p>
            </div>

            {/* Excel Archive Folder Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">Folder Arsip Berkas Excel</span>
                </div>
                {systemInfo?.archiveDir && window.electronAPI?.openPath && (
                  <button
                    type="button"
                    onClick={() => window.electronAPI.openPath(systemInfo.archiveDir)}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-emerald-700 dark:text-emerald-300 border border-slate-300 dark:border-slate-700 text-[10px] font-semibold transition shadow-sm"
                    title="Buka folder arsip di File Explorer / Finder"
                  >
                    <Folder className="w-3 h-3" />
                    <span>Buka Folder Arsip</span>
                  </button>
                )}
              </div>
              <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 break-all font-mono text-[11px] text-slate-600 dark:text-slate-300 select-all">
                {systemInfo?.archiveDir || 'Memuat path arsip...'}
              </div>
              <p className="text-[10.5px] text-slate-400 dark:text-slate-500 leading-tight">
                Setiap kali Anda mengimpor berkas Excel pendapatan, salinan berkas aslinya secara otomatis disimpan di folder ini dengan penamaan terstruktur.
              </p>
            </div>

            {/* Close footer */}
            <div className="pt-3 flex items-center justify-end border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
