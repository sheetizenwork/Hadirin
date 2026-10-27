import React, { useState } from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  QrCode, 
  TrendingUp, 
  Clock, 
  Building2, 
  CheckCircle2, 
  Plus, 
  Sparkles,
  Search,
  X
} from 'lucide-react';
import { useAttendance } from '../../context/AttendanceContext';
import { formatTime } from '../../lib/dateUtils';

interface DashboardPageProps {
  onOpenAddGuest: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onOpenAddGuest }) => {
  const { guests, event, setActiveTab } = useAttendance();
  const [guestSearch, setGuestSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'attended' | 'all'>('attended');

  const totalGuests = guests.length;
  const attendedGuests = guests.filter((g) => g.status === 'checked_in');
  const pendingGuests = guests.filter((g) => g.status === 'pending');

  const totalPaxInvited = guests.reduce((acc, g) => acc + (g.pax || 1), 0);
  const totalActualPaxPresent = attendedGuests.reduce(
    (acc, g) => acc + (g.actual_pax || g.pax || 1),
    0
  );

  const percentage = totalGuests > 0 ? Math.round((attendedGuests.length / totalGuests) * 100) : 0;

  // Search in Dashboard activity
  const searchClean = guestSearch.trim().toLowerCase();
  const baseList = filterMode === 'attended' ? attendedGuests : guests;
  const displayedGuests = baseList.filter((g) => {
    if (!searchClean) return true;
    return (
      g.name.toLowerCase().includes(searchClean) ||
      (g.organization && g.organization.toLowerCase().includes(searchClean))
    );
  }).sort((a, b) => {
    if (a.status === 'checked_in' && b.status === 'checked_in') {
      return new Date(b.checked_in_at || '').getTime() - new Date(a.checked_in_at || '').getTime();
    }
    if (a.status === 'checked_in') return -1;
    if (b.status === 'checked_in') return 1;
    return 0;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 lg:pb-10">
      {/* Event Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Monitoring Presensi Real-Time</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-white break-words">
              {event.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>📍 {event.location}</span>
              <span className="hidden sm:inline">·</span>
              <span>📅 {new Date(event.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
              <span className="hidden sm:inline">·</span>
              <span>⏰ {formatTime(event.time_start)} - {formatTime(event.time_end)} WIB</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab('scanner')}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
            >
              <QrCode className="w-5 h-5" />
              <span>Mulai Scan Tamu</span>
            </button>
            <button
              onClick={onOpenAddGuest}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-medium text-sm border border-white/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Tamu</span>
            </button>
          </div>
        </div>

        <div className="absolute right-0 top-0 -mt-12 -mr-12 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Tamu */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500">Total Tamu Undangan</span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
              {totalGuests}
            </div>
          </div>
        </div>

        {/* Card 2: Sudah Hadir */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-emerald-700">Sudah Hadir</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 font-mono tabular-nums">
              {attendedGuests.length}
            </div>
            <p className="text-xs text-emerald-600 mt-1">
              Aktual masuk: <span className="font-semibold tabular-nums">{totalActualPaxPresent} orang</span>
            </p>
          </div>
        </div>

        {/* Card 3: Belum Hadir */}
        <div className="bg-white rounded-2xl p-5 border border-amber-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-amber-700">Belum Hadir</span>
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
              <UserX className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-700 font-mono tabular-nums">
              {pendingGuests.length}
            </div>
          </div>
        </div>

        {/* Card 4: Tingkat Kehadiran */}
        <div className="bg-white rounded-2xl p-5 border border-indigo-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-indigo-700">Tingkat Kehadiran</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-indigo-700 font-mono tabular-nums">
              {percentage}%
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1.5">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-700"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2 font-medium">
              Jumlah undangan {totalGuests} · Sudah hadir {attendedGuests.length} · Belum hadir {pendingGuests.length}
            </p>
          </div>
        </div>
      </div>

      {/* Real-time Attendance Activity Section with Guest Search & Non-Truncated Names */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Aktivitas Presensi Terkini
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cek status kedatangan tamu undangan secara cepat
            </p>
          </div>

          {/* Toggle View: Yang Sudah Hadir vs Semua Tamu */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-center">
            <button
              onClick={() => setFilterMode('attended')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filterMode === 'attended'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sudah Hadir ({attendedGuests.length})
            </button>
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filterMode === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Semua Tamu ({totalGuests})
            </button>
          </div>
        </div>

        {/* Search Bar for Dashboard */}
        <div className="my-4 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={guestSearch}
            onChange={(e) => setGuestSearch(e.target.value)}
            placeholder="Cari nama tamu untuk cek sudah datang atau belum..."
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          {guestSearch && (
            <button
              onClick={() => setGuestSearch('')}
              className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* List of Guests - NAMES ARE NEVER TRUNCATED (break-words, whitespace-normal) */}
        {displayedGuests.length === 0 ? (
          <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-2xl">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              {guestSearch
                ? `Tidak ada tamu cocok dengan "${guestSearch}"`
                : totalGuests === 0
                ? 'Database Tamu Supabase Masih Kosong'
                : 'Belum ada tamu yang hadir'}
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {guestSearch
                ? 'Coba gunakan kata kunci nama tamu atau instansi yang lain.'
                : totalGuests === 0
                ? 'Semua data dummy telah dihapus. Tambahkan tamu langsung ke Supabase melalui tombol di bawah atau tab Tamu.'
                : 'Gunakan fitur Scan QR untuk mencatat kehadiran tamu yang datang.'}
            </p>
            {guestSearch ? (
              <button
                onClick={() => setGuestSearch('')}
                className="mt-3 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                Hapus pencarian
              </button>
            ) : totalGuests === 0 ? (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={onOpenAddGuest}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
                >
                  + Tambah Tamu Sekarang
                </button>
                <button
                  onClick={() => setActiveTab('guests')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                >
                  Import / Kelola Tamu
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-1">
            {displayedGuests.map((guest) => {
              const isChecked = guest.status === 'checked_in';
              return (
                <div
                  key={guest.id}
                  className="py-3.5 px-2 hover:bg-slate-50/80 rounded-xl transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  {/* Left: Avatar & Full Name (Never Truncated!) */}
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 sm:mt-0 ${
                      isChecked
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {guest.name.charAt(0)}
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Name wraps naturally without clipping or ellipses */}
                      <p className="text-sm font-bold text-slate-900 break-words whitespace-normal leading-snug">
                        {guest.name}
                      </p>
                      {guest.organization && (
                        <p className="text-xs text-slate-500 break-words mt-0.5 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{guest.organization}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Status & Arrival Details */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-13 sm:pl-0">
                    <div>
                      {isChecked ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Hadir ({guest.actual_pax || guest.pax} orang)</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                          Belum Hadir ({guest.pax} Pax)
                        </span>
                      )}
                    </div>

                    {isChecked && guest.checked_in_at && (
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-xs font-mono text-slate-700 font-semibold tabular-nums justify-end">
                          <Clock className="w-3 h-3 text-indigo-600" />
                          <span>
                            {new Date(guest.checked_in_at).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            WIB
                          </span>
                        </div>
                        {guest.check_in_history && guest.check_in_history.length > 1 && (
                          <span className="text-[10px] text-indigo-600 block">
                            Update ke-{guest.check_in_history.length} (awal: {new Date(guest.check_in_history[0]).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
