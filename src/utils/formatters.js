export function formatRupiah(val) {
  if (val === null || val === undefined || isNaN(val)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
}

export function formatNumber(val) {
  if (val === null || val === undefined || isNaN(val)) return '0';
  return new Intl.NumberFormat('id-ID').format(val);
}

export const MONTH_NAMES_INDO = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export function getMonthName(monthNum) {
  const idx = parseInt(monthNum, 10) - 1;
  return MONTH_NAMES_INDO[idx] || `Bulan ${monthNum}`;
}

export function formatDateIndo(dateStr) {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const day = parts[2];
  const month = MONTH_NAMES_INDO[parseInt(parts[1], 10) - 1] || parts[1];
  const year = parts[0];
  return `${day} ${month} ${year}`;
}

export function generateUniqueReportNumber(unit, year, month, revenue = 0) {
  const unitCode = unit === 'Restaurant' ? 'RST' : 'BGW';
  const mStr = String(month).padStart(2, '0');
  let hash = 0;
  const seed = `${unit}-${year}-${month}-${revenue}`;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(4, '0').slice(-4);
  return `No: ANDA-${unitCode}/${year}-${mStr}/${hex}`;
}

