import React, { useState } from 'react';
import { X, Printer, Download, ArrowLeft, ZoomIn, ZoomOut, CheckSquare, Square } from 'lucide-react';
import { formatRupiah, getMonthName, generateUniqueReportNumber } from '../utils/formatters';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function PrintReportView({
  isOpen,
  onClose,
  reportData,
  settings,
  unit,
  year,
  month
}) {
  const [scale, setScale] = useState(1);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showSignatures, setShowSignatures] = useState(true);

  if (!isOpen || !reportData) return null;

  const {
    rows = [],
    totalRevenue = 0,
    taxRate = 0.10,
    taxDue = 0,
    netRevenue = 0,
    daysInMonth = 31,
    activeDaysCount = 0,
    zeroDaysCount = 0,
    avgPerDay = 0,
    maxRevenue = 0,
    minRevenueNonZero = 0
  } = reportData;

  const docNumber = generateUniqueReportNumber(unit, year, month, totalRevenue);
  const monthName = getMonthName(month);
  const businessName = settings?.businessName || 'ANDA BUNGALOWS & RESTAURANT';
  const businessAddress = settings?.businessAddress || 'Jalan Pariwisata Pantai Kuta, Kecamatan Pujut, Lombok Tengah, NTB';
  const contactNumber = settings?.contactNumber || 'HP/WhatsApp: 087750665000';
  const npwpd = settings?.npwpd || 'P.2.0001234.01.23';
  const signName = settings?.signName || 'Pimpinan / Pengelola';

  const chartData = rows.map(r => ({
    name: `${r.dayNumber}`,
    amount: r.amount
  }));

  const handlePrint = async () => {
    if (window.electronAPI?.triggerNativePrint) {
      await window.electronAPI.triggerNativePrint(unit, year, month, {
        showSignatures,
        reportNumber: docNumber
      });
    } else {
      window.print();
    }
  };

  const handleExportPDF = async () => {
    if (window.electronAPI?.printReportPDF) {
      setIsExportingPdf(true);
      try {
        await window.electronAPI.printReportPDF(unit, year, month, {
          landscape: true,
          scale: 0.95,
          showSignatures,
          reportNumber: docNumber
        });
      } finally {
        setIsExportingPdf(false);
      }
    } else {
      window.print();
    }
  };

  return (
    <div className="print-modal-overlay fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex flex-col items-center p-2 sm:p-4">
      
      {/* Top Action Bar (hidden in print) */}
      <div className="no-print w-full max-w-6xl flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 sm:px-5 py-2.5 rounded-xl mb-3 shadow-md sticky top-2 z-20 transition-colors duration-150">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </button>

          <span className="text-xs text-slate-500 dark:text-slate-400 border-l border-slate-300 dark:border-slate-700 pl-3">
            Laporan: <strong className="text-slate-900 dark:text-white">{unit} ({monthName} {year})</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Signature Toggle */}
          <button
            onClick={() => setShowSignatures(!showSignatures)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition select-none ${
              showSignatures
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800'
            }`}
            title="Aktifkan atau nonaktifkan kolom tanda tangan pada dokumen cetak / PDF"
          >
            {showSignatures ? <CheckSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Square className="w-3.5 h-3.5" />}
            <span>Tanda Tangan</span>
          </button>

          {/* Zoom controls */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-300 dark:border-slate-800 px-2 py-1 text-xs text-slate-600 dark:text-slate-400 gap-1.5">
            <button
              onClick={() => setScale(s => Math.max(0.6, s - 0.1))}
              className="p-0.5 hover:text-slate-900 dark:hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="w-10 text-center font-mono">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => setScale(s => Math.min(1.3, s + 0.1))}
              className="p-0.5 hover:text-slate-900 dark:hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleExportPDF}
            disabled={isExportingPdf}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700 shadow-sm transition disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExportingPdf ? 'Menyimpan...' : 'Simpan PDF'}</span>
          </button>
          
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Dokumen</span>
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PURE CLEAN WHITE DOCUMENT SHEET (A4 LANDSCAPE EXACT) */}
      <div className="w-full flex justify-center overflow-x-auto pb-8">
        <div
          id="official-print-document"
          style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
          className="print-exact-canvas bg-white text-slate-900 p-6 rounded-none font-sans"
        >
          
          {/* 1. KOP SURAT BERSIH */}
          <div className="border-b border-slate-300 pb-2 mb-2.5">
            <div className="flex items-center justify-between">
              <div className="text-left text-[10px] font-mono font-bold text-slate-700 border border-slate-300 px-2.5 py-1 rounded bg-slate-50 shadow-sm">
                {docNumber}
              </div>
              <div className="flex-1 text-center px-4">
                <h1 className="text-lg font-bold uppercase tracking-wider text-slate-900 leading-tight">
                  LAPORAN PENDAPATAN {unit.toUpperCase()}
                </h1>
                <h2 className="text-sm font-semibold uppercase text-slate-800 mt-0.5 tracking-wide">
                  {businessName}
                </h2>
                <p className="text-[10.5px] text-slate-500">
                  <span className="font-semibold text-slate-700">NPWPD: {npwpd}</span> &bull; {businessAddress} &bull; {contactNumber}
                </p>
              </div>
              <div className="text-right text-[11px] font-semibold text-slate-700 border border-slate-300 px-2.5 py-1 rounded bg-slate-50">
                Periode: {monthName} {year}
              </div>
            </div>

            {/* Meta bar */}
            <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-200 text-[11px] text-slate-700">
              <div className="flex items-center gap-5">
                <div><span className="text-slate-500">NPWPD:</span> <strong className="text-slate-900 font-mono">{npwpd}</strong></div>
                <div><span className="text-slate-500">Bulan:</span> <strong className="text-slate-900">{monthName}</strong></div>
                <div><span className="text-slate-500">Tahun:</span> <strong className="text-slate-900">{year}</strong></div>
              </div>
              <div>
                <span className="text-slate-500">Tarif Pajak Daerah:</span> <strong className="text-slate-900">{(taxRate * 100).toFixed(0)}%</strong>
              </div>
            </div>
          </div>

          {/* 2. THREE CLEAN SUMMARY BOXES (No Heavy Blue/Black Border) */}
          <div className="grid grid-cols-3 gap-2.5 mb-2.5">
            <div className="border border-slate-300 rounded overflow-hidden">
              <div className="bg-slate-100 text-slate-700 text-center py-0.5 font-bold text-[10px] uppercase tracking-wider border-b border-slate-200">
                TOTAL PENDAPATAN KOTOR
              </div>
              <div className="bg-white text-center py-1.5 text-slate-900 font-bold text-base">
                {formatRupiah(totalRevenue)}
              </div>
            </div>

            <div className="border border-slate-300 rounded overflow-hidden">
              <div className="bg-slate-100 text-slate-700 text-center py-0.5 font-bold text-[10px] uppercase tracking-wider border-b border-slate-200">
                PAJAK TERUTANG (10%)
              </div>
              <div className="bg-white text-center py-1.5 text-rose-700 font-bold text-base">
                {formatRupiah(taxDue)}
              </div>
            </div>

            <div className="border border-slate-300 rounded overflow-hidden">
              <div className="bg-slate-100 text-slate-700 text-center py-0.5 font-bold text-[10px] uppercase tracking-wider border-b border-slate-200">
                PENDAPATAN SETELAH PAJAK
              </div>
              <div className="bg-white text-center py-1.5 text-emerald-800 font-bold text-base">
                {formatRupiah(netRevenue)}
              </div>
            </div>
          </div>

          {/* 3. METRICS STRIP */}
          <div className="grid grid-cols-3 gap-x-4 gap-y-1 bg-slate-50 border border-slate-200 p-1.5 rounded text-[10px] mb-2.5 text-slate-700">
            <div className="flex justify-between border-r border-slate-200 pr-3">
              <span className="text-slate-500">Jumlah Hari:</span>
              <strong className="text-slate-900">{daysInMonth} Hari</strong>
            </div>
            <div className="flex justify-between border-r border-slate-200 pr-3">
              <span className="text-slate-500">Hari Berpendapatan:</span>
              <strong className="text-slate-900">{activeDaysCount} Hari</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Hari Tanpa Pendapatan:</span>
              <strong className="text-slate-900">{zeroDaysCount} Hari</strong>
            </div>

            <div className="flex justify-between border-r border-slate-200 pr-3 pt-0.5 border-t border-slate-200">
              <span className="text-slate-500">Rata-rata per Hari:</span>
              <strong className="text-slate-900">{formatRupiah(avgPerDay)}</strong>
            </div>
            <div className="flex justify-between border-r border-slate-200 pr-3 pt-0.5 border-t border-slate-200">
              <span className="text-slate-500">Pendapatan Tertinggi:</span>
              <strong className="text-slate-900">{formatRupiah(maxRevenue)}</strong>
            </div>
            <div className="flex justify-between pt-0.5 border-t border-slate-200">
              <span className="text-slate-500">Pendapatan Terendah &gt; 0:</span>
              <strong className="text-slate-900">{minRevenueNonZero > 0 ? formatRupiah(minRevenueNonZero) : 'Rp 0'}</strong>
            </div>
          </div>

          {/* 4. MAIN SIDE-BY-SIDE SECTION (TABLE ON LEFT, CHART + SUMMARY ON RIGHT) */}
          <div className="flex gap-4 items-start">
            
            {/* LEFT COLUMN: TABLE 1 - 31 (Width ~480px) */}
            <div className="w-[485px] flex-shrink-0">
              <table className="w-full text-left border-collapse border border-slate-300 text-[9.5px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold text-center border-b border-slate-300">
                    <th className="border border-slate-300 py-1 px-1 w-[26px] text-center">No.</th>
                    <th className="border border-slate-300 py-1 px-1 w-[76px] text-center whitespace-nowrap">Tanggal</th>
                    <th className="border border-slate-300 py-1 px-1 w-[50px] text-center whitespace-nowrap">Hari</th>
                    <th className="border border-slate-300 py-1 px-1.5 w-[100px] text-right whitespace-nowrap">Pendapatan (Rp)</th>
                    <th className="border border-slate-300 py-1 px-1 w-[105px] text-center whitespace-nowrap">Status</th>
                    <th className="border border-slate-300 py-1 px-1.5 w-[100px] text-right whitespace-nowrap">Akumulasi (Rp)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => {
                    const hasIncome = r.amount > 0;
                    return (
                      <tr
                        key={r.no}
                        className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}
                        style={{ height: '16px' }}
                      >
                        <td className="border border-slate-200 py-0.5 px-1 text-center font-medium text-slate-600">
                          {r.no}
                        </td>
                        <td className="border border-slate-200 py-0.5 px-1 text-center font-mono text-[9px] text-slate-800 whitespace-nowrap">
                          {r.date}
                        </td>
                        <td className="border border-slate-200 py-0.5 px-1 text-center text-slate-700 whitespace-nowrap">
                          {r.dayName}
                        </td>
                        <td className={`border border-slate-200 py-0.5 px-1.5 text-right whitespace-nowrap ${hasIncome ? 'font-semibold text-slate-900' : 'text-slate-400'}`}>
                          {formatRupiah(r.amount)}
                        </td>
                        <td className="border border-slate-200 py-0.5 px-1 text-center text-[8.5px] whitespace-nowrap">
                          {hasIncome ? (
                            <span className="font-semibold text-emerald-800">Ada Pendapatan</span>
                          ) : (
                            <span className="text-slate-400">Tidak Ada Pendapatan</span>
                          )}
                        </td>
                        <td className="border border-slate-200 py-0.5 px-1.5 text-right font-medium text-slate-800 whitespace-nowrap">
                          {formatRupiah(r.cumulative)}
                        </td>
                      </tr>
                    );
                  })}
                  
                  {/* TOTAL PERIODE FOOTER ROW */}
                  <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-400">
                    <td colSpan={3} className="border border-slate-300 py-1 px-1.5 text-center uppercase tracking-wider text-[9.5px]">
                      TOTAL PERIODE
                    </td>
                    <td className="border border-slate-300 py-1 px-1.5 text-right text-slate-900 font-bold text-[10px] whitespace-nowrap">
                      {formatRupiah(totalRevenue)}
                    </td>
                    <td className="border border-slate-300 py-1 px-1 text-center text-rose-700 font-bold text-[9.5px] whitespace-nowrap">
                      PAJAK 10%
                    </td>
                    <td className="border border-slate-300 py-1 px-1.5 text-right text-rose-700 font-bold text-[10px] whitespace-nowrap">
                      {formatRupiah(taxDue)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* RIGHT COLUMN: CHART + RINGKASAN PAJAK + SIGNATURES (Width ~490px) */}
            <div className="flex-1 flex flex-col justify-between space-y-2.5 min-w-0">
              
              {/* Graphic Chart */}
              <div className="border border-slate-200 rounded p-2 bg-white">
                <div className="text-[9.5px] font-bold text-slate-800 uppercase mb-1 flex items-center justify-between">
                  <span>Grafik Pendapatan Harian</span>
                  <span className="text-[8.5px] text-slate-500 font-normal">1 - {daysInMonth} {monthName}</span>
                </div>
                <div className="h-36 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="2 2" stroke="#F1F5F9" />
                      <XAxis dataKey="name" tick={{ fontSize: 8 }} interval={2} />
                      <YAxis
                        tick={{ fontSize: 8 }}
                        tickFormatter={v => (v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v))}
                      />
                      <Tooltip
                        formatter={v => [formatRupiah(v), 'Pendapatan']}
                        labelFormatter={l => `Tanggal ${l} ${monthName}`}
                        contentStyle={{ fontSize: '10px', borderRadius: '4px' }}
                      />
                      <Bar dataKey="amount" fill="#334155" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[8.5px] text-slate-400 italic text-center mt-1">
                  Grafik mengambil data langsung dari kolom Tanggal dan Pendapatan pada tabel laporan.
                </p>
              </div>

              {/* Ringkasan Pajak Bulanan Box */}
              <div className="border border-slate-300 rounded overflow-hidden">
                <div className="bg-slate-100 text-slate-800 text-center py-1 font-bold text-[10px] uppercase tracking-wider border-b border-slate-200">
                  RINGKASAN PAJAK BULANAN
                </div>
                <div className="divide-y divide-slate-200 text-[10px]">
                  <div className="flex justify-between py-1 px-3 bg-white">
                    <span className="text-slate-600">Pendapatan Kotor</span>
                    <strong className="text-slate-900">{formatRupiah(totalRevenue)}</strong>
                  </div>
                  <div className="flex justify-between py-1 px-3 bg-slate-50/50">
                    <span className="text-slate-600">Tarif Pajak</span>
                    <strong className="text-slate-900">{(taxRate * 100).toFixed(0)}%</strong>
                  </div>
                  <div className="flex justify-between py-1 px-3 bg-white">
                    <span className="text-rose-700 font-semibold">Pajak yang Harus Dibayarkan</span>
                    <strong className="text-rose-700 font-bold">{formatRupiah(taxDue)}</strong>
                  </div>
                  <div className="flex justify-between py-1 px-3 bg-slate-50/50">
                    <span className="text-emerald-800 font-semibold">Pendapatan Setelah Pajak</span>
                    <strong className="text-emerald-800 font-bold">{formatRupiah(netRevenue)}</strong>
                  </div>
                </div>
              </div>

              {/* Kolom Tanda Tangan (Toggleable) */}
              {showSignatures && (
                <div className="grid grid-cols-2 text-center text-[9.5px] pt-1">
                  <div>
                    <p className="text-slate-600">Mengetahui / Menyetujui,</p>
                    <p className="font-semibold text-slate-800">Petugas Pajak Daerah</p>
                    <div className="h-10"></div>
                    <p className="font-semibold text-slate-900">( ............................................ )</p>
                    <p className="text-[8.5px] text-slate-500">NIP. ........................................</p>
                  </div>

                  <div>
                    <p className="text-slate-600">Lombok Tengah, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <p className="font-semibold text-slate-800">Wajib Pajak / Pengelola</p>
                    <div className="h-10"></div>
                    <p className="font-bold text-slate-900 underline">( {signName} )</p>
                    <p className="text-[8.5px] text-slate-500">Penanggung Jawab Usaha</p>
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>
      </div>

    </div>
  );
}
