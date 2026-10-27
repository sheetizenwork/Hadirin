import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  QrCode, 
  FileSpreadsheet, 
  CalendarDays 
} from 'lucide-react';
import { useAttendance } from '../context/AttendanceContext';
import { ActiveTab } from '../types';

export const MobileBottomNav: React.FC = () => {
  const { activeTab, setActiveTab, guests } = useAttendance();

  const totalGuests = guests.length;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 shadow-lg shadow-black/10 no-print">
      <div className="grid grid-cols-5 items-center h-16 max-w-lg mx-auto px-2 pb-safe">
        {/* 1. Dashboard */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
            activeTab === 'dashboard' ? 'text-indigo-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] mt-1 tracking-tight">Beranda</span>
        </button>

        {/* 2. Tamu */}
        <button
          onClick={() => setActiveTab('guests')}
          className={`relative flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
            activeTab === 'guests' ? 'text-indigo-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="relative">
            <Users className="w-5 h-5" />
            {totalGuests > 0 && (
              <span className="absolute -top-1 -right-2 bg-indigo-600 text-white text-[9px] font-mono px-1 rounded-full font-bold">
                {totalGuests > 99 ? '99+' : totalGuests}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Tamu</span>
        </button>

        {/* 3. Scan QR (Elevated Center Action Button) */}
        <div className="flex flex-col items-center justify-center -mt-5">
          <button
            onClick={() => setActiveTab('scanner')}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
              activeTab === 'scanner'
                ? 'bg-indigo-600 text-white shadow-indigo-500/40 ring-4 ring-indigo-100'
                : 'bg-slate-900 text-white shadow-slate-900/30'
            }`}
            aria-label="Buka Scanner QR"
          >
            <QrCode className="w-7 h-7" />
          </button>
          <span className="text-[10px] font-semibold text-slate-800 mt-1">Scan QR</span>
        </div>

        {/* 4. Laporan */}
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
            activeTab === 'reports' ? 'text-indigo-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-5 h-5" />
          <span className="text-[10px] mt-1 tracking-tight">Laporan</span>
        </button>

        {/* 5. Acara */}
        <button
          onClick={() => setActiveTab('event_settings')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
            activeTab === 'event_settings' ? 'text-indigo-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarDays className="w-5 h-5" />
          <span className="text-[10px] mt-1 tracking-tight">Acara</span>
        </button>
      </div>
    </div>
  );
};
