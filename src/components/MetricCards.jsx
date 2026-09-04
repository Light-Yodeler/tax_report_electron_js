import React from 'react';
import { DollarSign, Receipt, TrendingUp, CalendarCheck, Award, Wallet } from 'lucide-react';
import { formatRupiah, formatNumber } from '../utils/formatters';

export default function MetricCards({ data }) {
  if (!data) return null;

  const {
    totalRevenue = 0,
    taxRate = 0.10,
    taxDue = 0,
    netRevenue = 0,
    activeDaysCount = 0,
    daysInMonth = 30,
    avgPerDay = 0,
    maxRevenue = 0
  } = data;

  const taxPercentFormatted = `${(taxRate * 100).toFixed(0)}%`;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
      
      {/* 1. Total Pendapatan Kotor */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition duration-150">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Kotor</span>
          <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-900/50">
            <DollarSign className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            {formatRupiah(totalRevenue)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Pendapatan kotor tercatat</p>
        </div>
      </div>

      {/* 2. Pajak Terutang (10%) - Status Card (Rose/Crimson Focus) */}
      <div className="bg-white dark:bg-slate-900 border-l-4 border-l-rose-500 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition duration-150">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Pajak ({taxPercentFormatted})</span>
          <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
            <Receipt className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-lg font-bold text-rose-600 dark:text-rose-300 tracking-tight">
            {formatRupiah(taxDue)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Pajak Bapenda terutang</p>
        </div>
      </div>

      {/* 3. Pendapatan Bersih - Status Card (Emerald Focus) */}
      <div className="bg-white dark:bg-slate-900 border-l-4 border-l-emerald-500 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition duration-150">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Pendapatan Bersih</span>
          <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
            <Wallet className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-300 tracking-tight">
            {formatRupiah(netRevenue)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Setelah dikurangi pajak 10%</p>
        </div>
      </div>

      {/* 4. Rata-rata per Hari */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition duration-150">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Rata-Rata / Hari</span>
          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {formatRupiah(avgPerDay)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Berdasarkan {daysInMonth} hari</p>
        </div>
      </div>

      {/* 5. Hari Berpendapatan */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition duration-150">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Hari Aktif</span>
          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <CalendarCheck className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {activeDaysCount} <span className="text-xs text-slate-400 font-normal">/ {daysInMonth} Hari</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{daysInMonth - activeDaysCount} hari nihil transaksi</p>
        </div>
      </div>

      {/* 6. Pendapatan Tertinggi */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition duration-150">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Omset Puncak</span>
          <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
            <Award className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {formatRupiah(maxRevenue)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Penjualan harian tertinggi</p>
        </div>
      </div>

    </div>
  );
}
