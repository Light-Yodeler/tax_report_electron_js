import React from 'react';
import { Calendar, Trash2 } from 'lucide-react';
import { MONTH_NAMES_INDO } from '../utils/formatters';

export default function PeriodSelector({
  selectedYear,
  setSelectedYear,
  selectedMonth,
  setSelectedMonth,
  availablePeriods = [],
  activeUnit,
  onClearData
}) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  // Filter available periods for this unit
  const unitPeriods = availablePeriods.filter(p => p.unit === activeUnit);

  return (
    <div className="no-print bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-sm transition-colors duration-150">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
        
        {/* Selectors */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-semibold">
            <Calendar className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>Periode:</span>
          </div>

          {/* Month Dropdown */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
            className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none cursor-pointer"
          >
            {MONTH_NAMES_INDO.map((name, index) => (
              <option key={index + 1} value={index + 1}>
                {name}
              </option>
            ))}
          </select>

          {/* Year Dropdown */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none cursor-pointer"
          >
            {years.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>

          {/* Quick jump pills if data exists */}
          {unitPeriods.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-md">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Ada data:</span>
              {unitPeriods.slice(0, 4).map((p) => {
                const isActive = p.year === selectedYear && p.month === selectedMonth;
                return (
                  <button
                    key={`${p.year}-${p.month}`}
                    onClick={() => {
                      setSelectedYear(p.year);
                      setSelectedMonth(p.month);
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition ${
                      isActive
                        ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-300 dark:border-sky-800'
                        : 'bg-slate-100 text-slate-600 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {MONTH_NAMES_INDO[p.month - 1]?.slice(0, 3)} {p.year}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Clear Data for this month */}
        <button
          onClick={onClearData}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 transition self-start md:self-auto"
          title={`Hapus seluruh transaksi ${activeUnit} untuk bulan ${MONTH_NAMES_INDO[selectedMonth - 1]} ${selectedYear}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Reset Bulan Ini</span>
        </button>

      </div>
    </div>
  );
}
