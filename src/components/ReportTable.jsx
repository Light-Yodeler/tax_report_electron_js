import React from 'react';
import { formatRupiah } from '../utils/formatters';
import { CheckCircle2, XCircle, Table } from 'lucide-react';

export default function ReportTable({ rows = [], totalRevenue = 0, taxDue = 0, unit }) {
  return (
    <div className="no-print bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-colors duration-150">
      
      {/* Table Header Info */}
      <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400 border border-slate-200 dark:border-slate-700">
            <Table className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
              Rekapitulasi Kalender Pendapatan ({unit})
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Rincian omset harian resmi untuk verifikasi laporan Bapenda</p>
          </div>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400">
          Total: <span className="font-semibold text-slate-900 dark:text-slate-200">{rows.length} Hari</span>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm border-collapse">
          <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-4 py-3 text-center w-14">No.</th>
              <th className="px-4 py-3">Tanggal</th>
              <th className="px-4 py-3">Hari</th>
              <th className="px-4 py-3 text-right">Pendapatan</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Akumulasi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/70">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-slate-500 dark:text-slate-400 text-xs">
                  Belum ada data untuk periode ini. Silakan klik tombol <strong>Import</strong> untuk mengunggah file.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const hasIncome = row.amount > 0;
                return (
                  <tr
                    key={row.no}
                    className={`transition-colors ${
                      hasIncome
                        ? 'hover:bg-slate-50 dark:hover:bg-slate-800/40 bg-white dark:bg-slate-900'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/20 bg-slate-50/50 dark:bg-slate-950/40 text-slate-400'
                    }`}
                  >
                    <td className="px-4 py-2.5 text-center font-medium text-slate-400 dark:text-slate-500">
                      {row.no}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-700 dark:text-slate-300">
                      {row.date}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-300">
                      {row.dayName}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-medium ${hasIncome ? 'text-slate-900 dark:text-slate-100 font-semibold' : 'text-slate-400'}`}>
                      {formatRupiah(row.amount)}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {hasIncome ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50">
                          <CheckCircle2 className="w-3 h-3" />
                          Ada Omset
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500">
                          <XCircle className="w-3 h-3" />
                          Nihil
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-800 dark:text-slate-200">
                      {formatRupiah(row.cumulative)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {/* Total Footer Row */}
          {rows.length > 0 && (
            <tfoot className="bg-slate-100 dark:bg-slate-950 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-center tracking-wider uppercase text-xs text-slate-600 dark:text-slate-400">
                  TOTAL BULANAN
                </td>
                <td className="px-4 py-3 text-right text-sm text-sky-700 dark:text-sky-400 font-bold">
                  {formatRupiah(totalRevenue)}
                </td>
                <td className="px-4 py-3 text-center text-xs text-rose-600 dark:text-rose-400 font-bold">
                  Pajak: {formatRupiah(taxDue)}
                </td>
                <td className="px-4 py-3 text-right text-sm text-emerald-700 dark:text-emerald-400 font-bold">
                  {formatRupiah(totalRevenue)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

    </div>
  );
}
