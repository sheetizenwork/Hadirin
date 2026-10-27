import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  Sparkles, 
  Clock, 
  MapPin, 
  LogOut, 
  Plus, 
  CheckCircle2, 
  Menu
} from 'lucide-react';
import { useAttendance } from '../context/AttendanceContext';
import { ActiveTab } from '../types';

interface HeaderBarProps {
  onOpenAddGuest?: () => void;
  onOpenMobileMenu?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ onOpenAddGuest }) => {
  const { activeTab, setActiveTab, event, guests, user, logout } = useAttendance();
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB'
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const totalGuests = guests.length;
  const attendedGuests = guests.filter((g) => g.status === 'checked_in').length;

  const getPageTitle = (tab: ActiveTab) => {
    switch (tab) {
      case 'dashboard':
        return 'Dashboard Kehadiran';
      case 'guests':
        return 'Daftar & Kelola Tamu';
      case 'scanner':
        return 'Scan QR Presensi';
      case 'reports':
        return 'Laporan & Ekspor Data';
      case 'event_settings':
        return 'Informasi & Pengaturan Acara';
      default:
        return 'Presensi Tamu';
    }
  };

  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 no-print">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Brand mark on mobile / Page Title on desktop */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="lg:hidden w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm shadow-indigo-600/30">
            <QrCode className="w-5 h-5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-xl font-bold text-slate-900 truncate tracking-tight">
                {getPageTitle(activeTab)}
              </h2>
            </div>
            {/* Sub-kicker */}
            <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
              <span className="truncate max-w-[200px] sm:max-w-md font-medium text-slate-700">
                {event.title}
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="hidden sm:inline-flex items-center gap-1 text-slate-500">
                <MapPin className="w-3 h-3 text-slate-400" />
                {event.location}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Live Clock & Quick Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Live Clock Indicator */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100/80 border border-slate-200/60 text-xs font-mono font-medium text-slate-700 tabular-nums">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            <span>{currentTime || '19:00 WIB'}</span>
          </div>

          {/* Quick Stats Pill */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/60 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-mono tabular-nums">{attendedGuests}/{totalGuests}</span>
            <span className="text-[11px] font-normal text-emerald-700">Tamu Hadir</span>
          </div>

          {/* Primary Quick Button: Scan QR (if not on scanner tab) */}
          {activeTab !== 'scanner' && (
            <button
              onClick={() => setActiveTab('scanner')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm active:scale-95"
            >
              <QrCode className="w-4 h-4" />
              <span className="hidden xs:inline">Buka Scanner</span>
            </button>
          )}

          {/* Quick Add Guest Button */}
          {activeTab === 'guests' && onOpenAddGuest && (
            <button
              onClick={onOpenAddGuest}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors active:scale-95 border border-slate-200"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Tambah Tamu</span>
            </button>
          )}

          {/* Mobile User Avatar / Logout */}
          {user && (
            <div className="lg:hidden flex items-center">
              <button
                onClick={logout}
                title="Keluar"
                className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700"
              >
                {user.avatar || 'U'}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
