import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, UserCheck, KeyRound, ArrowLeft, Delete, Check, Lock, Sun, Moon, Sparkles } from 'lucide-react';

export default function LoginScreen({ onLoginSuccess, theme, onToggleTheme }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);
  const pinInputRef = useRef(null);

  // Load public list of users
  useEffect(() => {
    async function fetchUsers() {
      if (window.electronAPI?.getPublicUsers) {
        try {
          const list = await window.electronAPI.getPublicUsers();
          setUsers(list || []);
          // Auto select first user if only 1 user exists
          if (list && list.length === 1) {
            setSelectedUser(list[0]);
          }
        } catch (err) {
          console.error('Failed to load users:', err);
        }
      }
    }
    fetchUsers();
  }, []);

  // Focus input when user is selected
  useEffect(() => {
    if (selectedUser && pinInputRef.current) {
      pinInputRef.current.focus();
    }
  }, [selectedUser]);

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setPin('');
    setErrorMsg('');
  };

  const handleBackToUserList = () => {
    setSelectedUser(null);
    setPin('');
    setErrorMsg('');
  };

  const handleNumpadPress = (val) => {
    setErrorMsg('');
    if (val === 'clear') {
      setPin('');
    } else if (val === 'backspace') {
      setPin(prev => prev.slice(0, -1));
    } else {
      if (pin.length < 8) {
        setPin(prev => prev + val);
      }
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!selectedUser) return;
    if (!pin || pin.length < 4) {
      setErrorMsg('Masukkan minimal 4 digit PIN.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      if (window.electronAPI?.verifyPin) {
        const res = await window.electronAPI.verifyPin(selectedUser.id, pin);
        if (res.success && res.user) {
          if (rememberSession) {
            localStorage.setItem('app_user_session', JSON.stringify(res.user));
          } else {
            sessionStorage.setItem('app_user_session', JSON.stringify(res.user));
          }
          onLoginSuccess(res.user);
        } else {
          setErrorMsg(res.error || 'PIN yang Anda masukkan salah.');
          setPin('');
          if (pinInputRef.current) pinInputRef.current.focus();
        }
      } else {
        // Fallback for standalone browser testing
        const dummyUser = { ...selectedUser, last_login: new Date().toISOString() };
        onLoginSuccess(dummyUser);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat memverifikasi PIN.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4 transition-colors duration-200 select-none">
      
      {/* Theme Toggle Top Right */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <button
          type="button"
          onClick={onToggleTheme}
          className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition shadow-sm"
          title="Ubah Tema"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden p-6 sm:p-8">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-white dark:bg-sky-600 dark:text-white shadow-md mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Masuk ke Sistem
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {selectedUser
              ? `Masukkan PIN untuk ${selectedUser.full_name}`
              : 'Pilih nama pengguna Anda untuk melanjutkan'}
          </p>
        </div>

        {/* STEP 1: USER SELECTION */}
        {!selectedUser && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Daftar Pengguna Aktif
            </label>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {users.map((user) => {
                const isAdmin = user.role === 'admin';
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleSelectUser(user)}
                    className="w-full text-left flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-sky-500 dark:hover:border-sky-500 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition group bg-white dark:bg-slate-900 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                        isAdmin
                          ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {user.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition">
                          {user.full_name}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          @{user.username}
                        </div>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                      isAdmin
                        ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                    }`}>
                      {user.role}
                    </span>
                  </button>
                );
              })}

              {users.length === 0 && (
                <div className="text-center py-6 text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl">
                  Memuat daftar pengguna...
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: PIN ENTRY */}
        {selectedUser && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Active User Card & Switch Button */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                  selectedUser.role === 'admin'
                    ? 'bg-sky-200 text-sky-800 dark:bg-sky-900 dark:text-sky-200'
                    : 'bg-emerald-200 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                }`}>
                  {selectedUser.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {selectedUser.full_name}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">
                    Role: {selectedUser.role}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleBackToUserList}
                className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Ganti Akun</span>
              </button>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-medium text-center">
                {errorMsg}
              </div>
            )}

            {/* Hidden Input for Keyboard Typing */}
            <form onSubmit={handleSubmit}>
              <div className="relative mb-3">
                <input
                  ref={pinInputRef}
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  value={pin}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, '');
                    setPin(clean);
                    setErrorMsg('');
                  }}
                  placeholder="Ketik PIN Anda"
                  className="w-full text-center tracking-[0.6em] text-2xl font-mono py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                  disabled={isLoading}
                />
              </div>

              {/* On-Screen Numeric Keypad (for convenience / POS style) */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleNumpadPress(String(num))}
                    className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-lg hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleNumpadPress('clear')}
                  className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-rose-600 dark:text-rose-400 font-bold text-xs uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition"
                >
                  C
                </button>
                <button
                  type="button"
                  onClick={() => handleNumpadPress('0')}
                  className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-lg hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => handleNumpadPress('backspace')}
                  className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition"
                  title="Hapus"
                >
                  <Delete className="w-5 h-5" />
                </button>
              </div>

              {/* Remember Session Toggle */}
              <div className="flex items-center justify-between mb-4 px-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={rememberSession}
                    onChange={(e) => setRememberSession(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                  <span>Ingat sesi di perangkat ini</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || pin.length < 4}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 text-white dark:bg-sky-600 dark:text-white font-bold text-sm hover:bg-slate-800 dark:hover:bg-sky-500 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span>Memverifikasi...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Masuk ke Aplikasi</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Footer Hint for Initial Setup */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-center text-[10.5px] text-slate-500 dark:text-slate-400">
          PIN Awal: <strong className="text-slate-700 dark:text-slate-300">Admin: 123456</strong> &bull; <strong className="text-slate-700 dark:text-slate-300">Staff: 1234</strong>
        </div>

      </div>
    </div>
  );
}
