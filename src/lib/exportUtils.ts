import { Guest, EventDetails } from '../types';

/**
 * Export guests attendance ledger to Excel-compatible CSV file
 */
export function exportToExcel(guests: Guest[], event: EventDetails) {
  const headers = [
    'No',
    'Nama Lengkap Tamu',
    'Instansi / Perusahaan',
    'Undangan (Pax)',
    'Hadir Aktual (Pax)',
    'Status Kehadiran',
    'Waktu Presensi',
  ];

  const escapeCSV = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = guests.map((g, idx) => {
    const formattedTime = g.checked_in_at
      ? new Date(g.checked_in_at).toLocaleString('id-ID', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      : '-';

    return [
      escapeCSV(idx + 1),
      escapeCSV(g.name),
      escapeCSV(g.organization || '-'),
      escapeCSV(g.pax),
      escapeCSV(g.status === 'checked_in' ? g.actual_pax || g.pax : 0),
      escapeCSV(g.status === 'checked_in' ? 'HADIR' : 'BELUM HADIR'),
      escapeCSV(formattedTime),
    ].join(',');
  });

  // UTF-8 BOM for Microsoft Excel compatibility
  const BOM = '\uFEFF';
  const csvContent = BOM + [headers.join(','), ...rows].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const safeTitle = event.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const dateStr = new Date().toISOString().slice(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `Laporan_Presensi_${safeTitle}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Trigger print dialog with clean layout for PDF saving
 */
export function triggerPrintReport() {
  window.print();
}
