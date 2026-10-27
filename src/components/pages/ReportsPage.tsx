import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Printer, 
  Search, 
  CheckCircle2, 
  Building2 
} from 'lucide-react';
import { useAttendance } from '../../context/AttendanceContext';
import { exportToExcel, triggerPrintReport } from '../../lib/exportUtils';

export const ReportsPage: React.FC = () => {
  const { guests, event } = useAttendance();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'checked_in' | 'pending'>('all');

  const totalGuests = guests.length;
  const attendedGuests = guests.filter((g) => g.status === 'checked_in');
  const pendingGuests = guests.filter((g) => g.status === 'pending');
  const totalActualPax = attendedGuests.reduce((acc, g) => acc + (g.actual_pax || g.pax || 1), 0);
  const totalInvitedPax = guests.reduce((acc, g) => acc + (g.pax || 1), 0);
  const percentAttended = totalGuests > 0 ? Math.round((attendedGuests.length / totalGuests) * 100) : 0;

  const filteredGuests = guests.filter((g) => {
    const q = searchQuery.toLowerCase();
    const matchQ =
      g.name.toLowerCase().includes(q) ||
      (g.organization && g.organization.toLowerCase().includes(q));

    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'checked_in' && g.status === 'checked_in') ||
      (statusFilter === 'pending' && g.status === 'pending');

    return matchQ && matchStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 lg:pb-12">
      {/* Printable Header (Visible only when printing to PDF) */}
      <div className="hidden print:block mb-6 pb-4 border-b-2 border-slate-900">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              LAPORAN RESMI DAFTAR KEHADIRAN TAMU
            </h1>
            <h2 className="text-base font-bold text-slate-800 mt-1">{event.title}</h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Penyelenggara: {event.organizer} · Lokasi: {event.location}
            </p>
          </div>
          <div className="text-right text-xs text-slate-600 font-mono">
            <p>Tanggal Acara: {new Date(event.date).toLocaleDateString('id-ID', { dateStyle: 'long' })}</p>
            <p>Dicetak: {new Date().toLocaleString('id-ID')}</p>
          </div>
        </div>

        {/* Print Summary Strip */}
        <div className="grid grid-cols-4 gap-4 mt-4 pt-3 border-t border-slate-300 text-xs">
          <div>
            <span className="text-slate-500">Total Undangan:</span>
            <p className="font-bold text-slate-900">{totalGuests} Tamu ({totalInvitedPax} Orang)</p>
          </div>
          <div>
            <span className="text-slate-500">Tamu Hadir:</span>
            <p className="font-bold text-slate-900">{attendedGuests.length} Tamu ({totalActualPax} Orang)</p>
          </div>
          <div>
            <span className="text-slate-500">Belum Hadir:</span>
            <p className="font-bold text-slate-900">{pendingGuests.length} Tamu</p>
          </div>
          <div>
            <span className="text-slate-500">Persentase Hadir:</span>
            <p className="font-bold text-slate-900">{percentAttended}%</p>
          </div>
        </div>
      </div>

      {/* On-Screen Header Card */}
      <div className="no-print bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
            Laporan Kehadiran
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            Laporan Presensi Tamu
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Unduh rekapitulasi data absensi ke format Excel (.csv) atau cetak langsung ke format PDF.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => exportToExcel(guests, event)}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Unduh Format Excel</span>
          </button>

          <button
            onClick={triggerPrintReport}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Unduh PDF</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip (No-print) */}
      <div className="no-print grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Total Tamu Undangan</span>
          <p className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums mt-1">{totalGuests}</p>
          <span className="text-[11px] text-slate-400">Total kuota: {totalInvitedPax} Orang</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm">
          <span className="text-xs text-emerald-700 font-medium">Tamu Sudah Hadir</span>
          <p className="text-2xl font-extrabold text-emerald-700 font-mono tabular-nums mt-1">{attendedGuests.length}</p>
          <span className="text-[11px] text-emerald-600">Aktual: {totalActualPax} Orang</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm">
          <span className="text-xs text-amber-700 font-medium">Tamu Belum Datang</span>
          <p className="text-2xl font-extrabold text-amber-700 font-mono tabular-nums mt-1">{pendingGuests.length}</p>
          <span className="text-[11px] text-amber-600">Menunggu di pintu</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-indigo-200 shadow-sm">
          <span className="text-xs text-indigo-700 font-medium">Tingkat Kehadiran</span>
          <p className="text-2xl font-extrabold text-indigo-700 font-mono tabular-nums mt-1">{percentAttended}%</p>
          <span className="text-[11px] text-indigo-500">Persentase kehadiran</span>
        </div>
      </div>

      {/* Filter and Search Bar (No-print) */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="sm:col-span-8 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama tamu atau instansi..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div className="sm:col-span-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'checked_in' | 'pending')}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-700 font-medium"
          >
            <option value="all">Semua Status</option>
            <option value="checked_in">Sudah Hadir</option>
            <option value="pending">Belum Hadir</option>
          </select>
        </div>
      </div>

      {/* Table (Formatted for Screen & PDF Print) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 w-12 text-center">No</th>
                <th className="py-3 px-4">Nama Lengkap Tamu</th>
                <th className="py-3 px-4">Instansi / Perusahaan</th>
                <th className="py-3 px-3 text-center">Undangan</th>
                <th className="py-3 px-3 text-center">Hadir Aktual</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Waktu Presensi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredGuests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Tidak ada catatan kehadiran yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredGuests.map((guest, idx) => {
                  const isChecked = guest.status === 'checked_in';
                  return (
                    <tr
                      key={guest.id}
                      className={`hover:bg-slate-50/70 transition-colors print:border-b print:border-slate-200 ${
                        isChecked ? 'bg-white' : 'bg-slate-50/30'
                      }`}
                    >
                      <td className="py-3 px-3 text-center font-mono text-slate-400 tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900 break-words whitespace-normal">{guest.name}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-600 break-words whitespace-normal">
                        {guest.organization || '-'}
                      </td>
                      <td className="py-3 px-3 text-center font-mono tabular-nums text-slate-700">
                        {guest.pax} orang
                      </td>
                      <td className="py-3 px-3 text-center font-mono tabular-nums">
                        {isChecked ? (
                          <span className="font-bold text-emerald-700">
                            {guest.actual_pax || guest.pax} orang
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isChecked ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 print:hidden" />
                            <span>HADIR</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">
                            Belum Hadir
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] tabular-nums text-slate-700">
                        {guest.checked_in_at ? (
                          <div>
                            <span className="font-semibold text-slate-800">
                              {new Date(guest.checked_in_at).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}{' '}
                              WIB
                            </span>
                            {guest.check_in_history && guest.check_in_history.length > 1 && (
                              <span className="text-[10px] text-indigo-600 font-sans block print:text-slate-500">
                                (Presensi ke-{guest.check_in_history.length})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
