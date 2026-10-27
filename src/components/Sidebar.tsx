import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  QrCode, 
  FileSpreadsheet, 
  Settings2, 
  LogOut, 
  Sparkles,
  ChevronRight,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { useAttendance } from '../context/AttendanceContext';
import { ActiveTab } from '../types';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, user, logout, event, guests, resetToDemoData } = useAttendance();

  const totalGuests = guests.length;
  const attendedGuests = guests.filter((g) => g.status === 'checked_in').length;
  const percentAttended = totalGuests > 0 ? Math.round((attendedGuests / totalGuests) * 100) : 0;

  const navItems: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }>; badge?: string | number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'scanner', label: 'Scan QR Presensi', icon: QrCode },
    { id: 'guests', label: 'Pengelolaan Tamu', icon: Users, badge: totalGuests },
    { id: 'reports', label: 'Laporan Kehadiran', icon: FileSpreadsheet },
    { id: 'event_settings', label: 'Pengaturan Acara', icon: Settings2 },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-72 bg-slate-900 text-slate-200 border-r border-slate-800 shrink-0 h-screen sticky top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight leading-none">Hadirin</h1>
            <p className="text-xs text-slate-400 mt-1">Presensi QR & Tamu Acara</p>
          </div>
        </div>

        {/* Current Active Event Chip */}
        <div className="mt-4 p-3 bg-slate-800/80 rounded-xl border border-slate-700/60">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-medium text-indigo-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Acara Aktif
            </span>
            <span className="tabular-nums text-slate-300 font-mono text-[10px]">
              {new Date(event.date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
            </span>
          </div>
          <p className="text-xs font-semibold text-white mt-1 truncate" title={event.title}>
            {event.title}
          </p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
        <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Menu Utama
        </p>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined ? (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-mono tabular-nums ${
                    isActive ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.badge}
                </span>
              ) : (
                isActive && <ChevronRight className="w-4 h-4 text-indigo-200" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Attendance Progress Card */}
      <div className="px-5 py-4 mx-4 mb-3 bg-slate-800/50 rounded-2xl border border-slate-700/60">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-slate-400 font-medium">Progress Kehadiran</span>
          <span className="text-indigo-400 font-bold font-mono tabular-nums">{percentAttended}%</span>
        </div>
        <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
          <div
            className="bg-indigo-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${percentAttended}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
          <span className="tabular-nums font-mono">{attendedGuests} hadir</span>
          <span className="tabular-nums font-mono">{totalGuests - attendedGuests} belum</span>
        </div>
      </div>

      {/* User Session & Actions */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex flex-col gap-2">
        {user && (
          <div className="flex items-center justify-between px-2 py-1">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                {user.avatar || 'OP'}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Keluar dari akun"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}

        <button
          onClick={resetToDemoData}
          className="w-full mt-1 flex items-center justify-center gap-2 text-[11px] text-slate-400 hover:text-slate-200 py-1.5 rounded-lg hover:bg-slate-800/60 transition-colors"
          title="Reset ke data awal"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Demo Data</span>
        </button>
      </div>
    </aside>
  );
};
