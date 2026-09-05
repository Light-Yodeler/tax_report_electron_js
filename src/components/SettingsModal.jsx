import React, { useState, useEffect } from 'react';
import {
  X,
  Settings as SettingsIcon,
  Check,
  Save,
  HardDrive,
  Database,
  Folder,
  ExternalLink,
  Cpu,
  Users,
  KeyRound,
  Plus,
  Trash2,
  Edit3,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, settings, onSaveSettings, currentUser }) {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'storage' | 'users' | 'security'
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

  // User Management State (Admin)
  const [userList, setUserList] = useState([]);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    full_name: '',
    role: 'staff',
    pin: ''
  });
  const [editingUser, setEditingUser] = useState(null);
  const [userActionMsg, setUserActionMsg] = useState(null);

  // PIN Change State (Staff / Self)
  const [pinForm, setPinForm] = useState({
    oldPin: '',
    newPin: '',
    confirmPin: ''
  });
  const [pinMsg, setPinMsg] = useState(null);

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

  // Load system info
  useEffect(() => {
    if (isOpen && window.electronAPI?.getSystemInfo) {
      window.electronAPI.getSystemInfo().then((res) => {
        if (res && res.success) {
          setSystemInfo(res.data);
        }
      }).catch(console.error);
    }
  }, [isOpen]);

  // Load user list for Admin
  const loadUsers = async () => {
    if (window.electronAPI?.getAllUsers) {
      try {
        const list = await window.electronAPI.getAllUsers();
        setUserList(list || []);
      } catch (err) {
        console.error('Failed to load user list:', err);
      }
    }
  };

  useEffect(() => {
    if (isOpen && currentUser?.role === 'admin') {
      loadUsers();
    }
  }, [isOpen, currentUser]);

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

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setUserActionMsg(null);
    if (!newUserForm.username || !newUserForm.full_name || !newUserForm.pin) {
      setUserActionMsg({ text: 'Mohon lengkapi seluruh kolom isian.', type: 'error' });
      return;
    }
    if (newUserForm.pin.length < 4) {
      setUserActionMsg({ text: 'PIN minimal 4 digit angka.', type: 'error' });
      return;
    }

    try {
      if (window.electronAPI?.createUser) {
        const res = await window.electronAPI.createUser(newUserForm);
        if (res.success) {
          setUserActionMsg({ text: 'Pengguna baru berhasil ditambahkan.', type: 'success' });
          setNewUserForm({ username: '', full_name: '', role: 'staff', pin: '' });
          setIsAddingUser(false);
          await loadUsers();
        } else {
          setUserActionMsg({ text: res.error || 'Gagal menambahkan pengguna.', type: 'error' });
        }
      }
    } catch (err) {
      setUserActionMsg({ text: err.message || 'Terjadi kesalahan.', type: 'error' });
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setUserActionMsg(null);

    try {
      if (window.electronAPI?.updateUser) {
        const res = await window.electronAPI.updateUser(editingUser.id, {
          full_name: editingUser.full_name,
          role: editingUser.role,
          pin: editingUser.pin
        });
        if (res.success) {
          setUserActionMsg({ text: 'Data pengguna berhasil diperbarui.', type: 'success' });
          setEditingUser(null);
          await loadUsers();
        } else {
          setUserActionMsg({ text: res.error || 'Gagal memperbarui pengguna.', type: 'error' });
        }
      }
    } catch (err) {
      setUserActionMsg({ text: err.message || 'Terjadi kesalahan.', type: 'error' });
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Yakin ingin menghapus pengguna @${username}? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }
    setUserActionMsg(null);
    try {
      if (window.electronAPI?.deleteUser) {
        const res = await window.electronAPI.deleteUser(userId, currentUser?.id);
        if (res.success) {
          setUserActionMsg({ text: `Pengguna @${username} berhasil dihapus.`, type: 'success' });
          await loadUsers();
        } else {
          setUserActionMsg({ text: res.error || 'Gagal menghapus pengguna.', type: 'error' });
        }
      }
    } catch (err) {
      setUserActionMsg({ text: err.message || 'Terjadi kesalahan.', type: 'error' });
    }
  };

  const handleChangeOwnPin = async (e) => {
    e.preventDefault();
    setPinMsg(null);
    if (!pinForm.oldPin || !pinForm.newPin || !pinForm.confirmPin) {
      setPinMsg({ text: 'Semua kolom wajib diisi.', type: 'error' });
      return;
    }
    if (pinForm.newPin.length < 4) {
      setPinMsg({ text: 'PIN baru minimal 4 digit angka.', type: 'error' });
      return;
    }
    if (pinForm.newPin !== pinForm.confirmPin) {
      setPinMsg({ text: 'Konfirmasi PIN baru tidak cocok.', type: 'error' });
      return;
    }

    try {
      if (window.electronAPI?.changeOwnPin) {
        const res = await window.electronAPI.changeOwnPin(currentUser.id, pinForm.oldPin, pinForm.newPin);
        if (res.success) {
          setPinMsg({ text: 'PIN Anda berhasil diperbarui!', type: 'success' });
          setPinForm({ oldPin: '', newPin: '', confirmPin: '' });
        } else {
          setPinMsg({ text: res.error || 'Gagal mengubah PIN.', type: 'error' });
        }
      }
    } catch (err) {
      setPinMsg({ text: err.message || 'Terjadi kesalahan.', type: 'error' });
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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col transition-colors duration-150 max-h-[90vh]">
        
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
                Profil usaha, parameter pajak, akun pengguna, dan informasi sistem
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
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 bg-slate-50/50 dark:bg-slate-950/50 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 py-2.5 px-3 text-xs font-semibold border-b-2 transition shrink-0 ${
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
            className={`flex items-center gap-2 py-2.5 px-3 text-xs font-semibold border-b-2 transition shrink-0 ${
              activeTab === 'storage'
                ? 'border-sky-600 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Penyimpanan & Database</span>
          </button>

          {/* Admin Tab: Kelola Pengguna */}
          {currentUser?.role === 'admin' ? (
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 py-2.5 px-3 text-xs font-semibold border-b-2 transition shrink-0 ${
                activeTab === 'users'
                  ? 'border-sky-600 text-sky-600 dark:text-sky-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Kelola Pengguna ({userList.length})</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-2 py-2.5 px-3 text-xs font-semibold border-b-2 transition shrink-0 ${
                activeTab === 'security'
                  ? 'border-sky-600 text-sky-600 dark:text-sky-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Ubah PIN Saya</span>
            </button>
          )}
        </div>

        {/* Tab 1: Profil Usaha */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSubmit} className="p-5 space-y-3.5 overflow-y-auto flex-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nama Wajib Pajak / Badan Usaha
              </label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 uppercase font-semibold"
                placeholder="CONTOH: ANDA BUNGALOWS & RESTAURANT"
                required
                disabled={currentUser?.role !== 'admin'}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nomor Pokok Wajib Pajak Daerah (NPWPD)
              </label>
              <input
                type="text"
                value={formData.npwpd}
                onChange={(e) => setFormData({ ...formData, npwpd: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono font-medium"
                placeholder="Contoh: P.2.0001234.01.23"
                required
                disabled={currentUser?.role !== 'admin'}
              />
              <p className="text-[10.5px] text-slate-400 dark:text-slate-500 mt-0.5">
                Nomor ini akan tercetak secara otomatis pada kop surat dan bilah meta laporan.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Alamat Usaha
              </label>
              <input
                type="text"
                value={formData.businessAddress}
                onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="Alamat lokasi usaha"
                disabled={currentUser?.role !== 'admin'}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kontak / WhatsApp
                </label>
                <input
                  type="text"
                  value={formData.contactNumber}
                  onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  placeholder="HP / WA"
                  disabled={currentUser?.role !== 'admin'}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tarif Pajak Usaha
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="0.50"
                    value={formData.taxRate}
                    onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 pr-12 font-mono font-medium"
                    required
                    disabled={currentUser?.role !== 'admin'}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-xs text-slate-400 font-bold">
                    {(parseFloat(formData.taxRate || 0.1) * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nama Penanggung Jawab / Penandatangan
              </label>
              <input
                type="text"
                value={formData.signName}
                onChange={(e) => setFormData({ ...formData, signName: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="Nama Pengelola"
                disabled={currentUser?.role !== 'admin'}
              />
            </div>

            {currentUser?.role === 'admin' ? (
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saved}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {saved ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Tersimpan!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Simpan Pengaturan</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 italic">
                * Profil usaha hanya dapat diubah oleh Administrator.
              </p>
            )}
          </form>
        )}

        {/* Tab 2: Penyimpanan & Database */}
        {activeTab === 'storage' && (
          <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                <div className="p-2 rounded bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-900/50">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Platform / OS</div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 capitalize">
                    {systemInfo?.platform === 'darwin' ? 'macOS' : systemInfo?.platform === 'win32' ? 'Windows' : systemInfo?.platform || 'Desktop'}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                <div className="p-2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Ukuran Database</div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {formatBytes(systemInfo?.dbSizeBytes)} ({systemInfo?.totalTransactions || 0} Baris)
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">Lokasi Database SQLite</span>
                </div>
                {systemInfo?.userDataDir && window.electronAPI?.openPath && (
                  <button
                    type="button"
                    onClick={() => window.electronAPI.openPath(systemInfo.userDataDir)}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 border border-slate-300 dark:border-slate-700 text-[10px] font-semibold transition shadow-sm"
                  >
                    <Folder className="w-3 h-3" />
                    <span>Buka Folder</span>
                  </button>
                )}
              </div>
              <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 break-all font-mono text-[11px] text-slate-600 dark:text-slate-300 select-all">
                {systemInfo?.dbPath || 'Memuat path database...'}
              </div>
            </div>

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
                  >
                    <Folder className="w-3 h-3" />
                    <span>Buka Folder Arsip</span>
                  </button>
                )}
              </div>
              <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 break-all font-mono text-[11px] text-slate-600 dark:text-slate-300 select-all">
                {systemInfo?.archiveDir || 'Memuat path arsip...'}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Kelola Pengguna (Admin Only) */}
        {activeTab === 'users' && currentUser?.role === 'admin' && (
          <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
            
            {userActionMsg && (
              <div className={`p-2.5 rounded-lg border text-xs font-semibold ${
                userActionMsg.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950 dark:border-rose-900 dark:text-rose-200'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950 dark:border-emerald-900 dark:text-emerald-200'
              }`}>
                {userActionMsg.text}
              </div>
            )}

            {/* Header & Add User Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Daftar Pengguna Terdaftar
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Kelola akun, peran otorisasi, dan PIN akses pengguna aplikasi
                </p>
              </div>

              {!isAddingUser && !editingUser && (
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingUser(true);
                    setUserActionMsg(null);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold transition shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah User</span>
                </button>
              )}
            </div>

            {/* FORM: Tambah User Baru */}
            {isAddingUser && (
              <form onSubmit={handleCreateUser} className="p-4 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/50 dark:bg-sky-950/20 space-y-3">
                <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                  <span>Form Tambah Pengguna Baru</span>
                  <button
                    type="button"
                    onClick={() => setIsAddingUser(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Username (Login)
                    </label>
                    <input
                      type="text"
                      value={newUserForm.username}
                      onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                      placeholder="contoh: kasir_bungalow"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nama Lengkap
                    </label>
                    <input
                      type="text"
                      value={newUserForm.full_name}
                      onChange={(e) => setNewUserForm({ ...newUserForm, full_name: e.target.value })}
                      placeholder="contoh: Budi Santoso"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Peran / Otorisasi
                    </label>
                    <select
                      value={newUserForm.role}
                      onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-semibold"
                    >
                      <option value="staff">Staff (Operasional & Laporan)</option>
                      <option value="admin">Admin (Akses Penuh & Pengaturan)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      PIN Akses (4-8 digit)
                    </label>
                    <input
                      type="password"
                      maxLength={8}
                      value={newUserForm.pin}
                      onChange={(e) => setNewUserForm({ ...newUserForm, pin: e.target.value.replace(/\D/g, '') })}
                      placeholder="contoh: 1234"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono tracking-widest"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingUser(false)}
                    className="px-3 py-1 rounded-lg text-slate-600 dark:text-slate-400 font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow-sm"
                  >
                    Simpan User Baru
                  </button>
                </div>
              </form>
            )}

            {/* FORM: Edit User */}
            {editingUser && (
              <form onSubmit={handleUpdateUser} className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 space-y-3">
                <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                  <span>Edit Akun @{editingUser.username}</span>
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nama Lengkap
                    </label>
                    <input
                      type="text"
                      value={editingUser.full_name}
                      onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Peran
                    </label>
                    <select
                      value={editingUser.role}
                      onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-semibold"
                    >
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ganti PIN (Kosongkan jika tidak ingin mengubah PIN)
                  </label>
                  <input
                    type="password"
                    maxLength={8}
                    value={editingUser.pin || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, pin: e.target.value.replace(/\D/g, '') })}
                    placeholder="Ketik PIN baru jika ingin diganti"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono tracking-widest"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-3 py-1 rounded-lg text-slate-600 dark:text-slate-400 font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold shadow-sm"
                  >
                    Perbarui Akun
                  </button>
                </div>
              </form>
            )}

            {/* Table Users */}
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider font-bold">
                    <th className="py-2.5 px-3">Pengguna</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Terakhir Masuk</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {userList.map((u) => {
                    const isSelf = Number(u.id) === Number(currentUser?.id);
                    const isAdmin = u.role === 'admin';
                    return (
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{u.full_name}</span>
                            {isSelf && (
                              <span className="text-[10px] font-normal text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-1.5 py-0.2 rounded border border-sky-200 dark:border-sky-800">
                                Akun Anda
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500">@{u.username}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                            isAdmin
                              ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-500 font-mono">
                          {u.last_login ? u.last_login.slice(0, 16).replace('T', ' ') : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right space-x-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingUser({ ...u, pin: '' });
                              setIsAddingUser(false);
                            }}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                            title="Edit User"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => handleDeleteUser(u.id, u.username)}
                            className="p-1.5 rounded hover:bg-rose-100 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition disabled:opacity-30 disabled:cursor-not-allowed"
                            title={isSelf ? 'Tidak dapat menghapus akun sendiri' : 'Hapus User'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* Tab 4: Ubah PIN Saya (Staff) */}
        {activeTab === 'security' && currentUser?.role !== 'admin' && (
          <form onSubmit={handleChangeOwnPin} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Ubah PIN Keamanan Saya
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Ganti kode PIN yang Anda gunakan untuk masuk ke aplikasi
              </p>
            </div>

            {pinMsg && (
              <div className={`p-2.5 rounded-lg border text-xs font-semibold ${
                pinMsg.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950 dark:border-rose-900 dark:text-rose-200'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950 dark:border-emerald-900 dark:text-emerald-200'
              }`}>
                {pinMsg.text}
              </div>
            )}

            <div className="space-y-3 max-w-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  PIN Lama
                </label>
                <input
                  type="password"
                  maxLength={8}
                  value={pinForm.oldPin}
                  onChange={(e) => setPinForm({ ...pinForm, oldPin: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono tracking-widest text-center"
                  placeholder="Ketik PIN saat ini"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  PIN Baru (Minimal 4 Digit)
                </label>
                <input
                  type="password"
                  maxLength={8}
                  value={pinForm.newPin}
                  onChange={(e) => setPinForm({ ...pinForm, newPin: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono tracking-widest text-center"
                  placeholder="Ketik PIN baru"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Konfirmasi PIN Baru
                </label>
                <input
                  type="password"
                  maxLength={8}
                  value={pinForm.confirmPin}
                  onChange={(e) => setPinForm({ ...pinForm, confirmPin: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono tracking-widest text-center"
                  placeholder="Ketik ulang PIN baru"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2 px-4 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-sm transition"
                >
                  Simpan Perubahan PIN
                </button>
              </div>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
