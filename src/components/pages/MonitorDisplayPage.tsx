import React, { useState, useEffect } from 'react';
import { 
  Tv, 
  Maximize2, 
  Minimize2, 
  Sparkles, 
  Building2, 
  Clock, 
  Calendar, 
  ArrowLeft,
  Sliders,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useAttendance } from '../../context/AttendanceContext';
import { Guest } from '../../types';

interface MonitorDisplayPageProps {
  onBackToApp?: () => void;
  onOpenSettings?: () => void;
  isStandalone?: boolean;
}

export const MonitorDisplayPage: React.FC<MonitorDisplayPageProps> = ({
  onBackToApp,
  onOpenSettings,
}) => {
  const { 
    event, 
    guests, 
    monitorSettings, 
    latestCheckedInGuest, 
    setActiveTab 
  } = useAttendance();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [welcomeAnimationKey, setWelcomeAnimationKey] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Calculate live counters
  const totalGuests = guests.length;
  const attendedGuests = guests.filter((g) => g.status === 'checked_in');
  const totalInvitedPax = guests.reduce((acc, g) => acc + (g.pax || 1), 0);
  const totalActualPaxPresent = attendedGuests.reduce(
    (acc, g) => acc + (g.actual_pax || g.pax || 1),
    0
  );
  const percentAttended = totalGuests > 0 ? Math.round((attendedGuests.length / totalGuests) * 100) : 0;

  // Sorted attended guests for live ticker (newest checked in first)
  const sortedAttended = [...attendedGuests].sort((a, b) => {
    const timeA = new Date(a.checked_in_at || 0).getTime();
    const timeB = new Date(b.checked_in_at || 0).getTime();
    return timeB - timeA;
  });

  const tickerList = sortedAttended.slice(0, monitorSettings.liveTickerCount || 5);

  // Derive the active welcomed guest: prefer latestCheckedInGuest, fallback to the most recent in sortedAttended
  const currentWelcomedGuest = latestCheckedInGuest || (sortedAttended.length > 0 ? sortedAttended[0] : null);

  // Play audio chime and trigger re-render bounce whenever the welcomed guest changes
  useEffect(() => {
    if (currentWelcomedGuest) {
      setWelcomeAnimationKey((prev) => prev + 1);

      if (soundEnabled) {
        try {
          const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
          osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.15); // G5
          osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.3); // C6
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
          osc.start();
          osc.stop(ctx.currentTime + 0.6);
        } catch (e) {
          console.warn('Audio feedback error', e);
        }
      }
    }
  }, [currentWelcomedGuest?.id, currentWelcomedGuest?.checked_in_at, soundEnabled]);

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Format date elegantly (without time)
  const formattedEventDate = event.date
    ? new Date(event.date).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  return (
    <div className="relative min-h-screen bg-slate-950 text-white font-sans flex flex-col justify-between overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      {/* Background Ambience / Glow Lights */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[400px] bg-emerald-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-violet-600/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Top Floating Control Bar (Minimal & Clean) */}
      <header className="relative z-20 px-6 sm:px-10 py-5 flex items-center justify-between border-b border-slate-800/60 bg-slate-950/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-widest uppercase text-indigo-400">
                Layar Monitor Presensi
              </span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls: Kembali, Pengaturan, Suara, Fullscreen */}
        <div className="flex items-center gap-2">
          {/* Mute/Unmute Chime */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Matikan Suara Sambutan' : 'Nyalakan Suara Sambutan'}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/60"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Settings Shortcut */}
          <button
            onClick={() => {
              if (onOpenSettings) onOpenSettings();
              else setActiveTab('monitor_settings');
            }}
            title="Pengaturan Tampilan Monitor"
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700/60"
          >
            <Sliders className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">Pengaturan Monitor</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh (F11)'}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors border border-slate-700/60"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Back to App Dashboard */}
          <button
            onClick={() => {
              if (onBackToApp) onBackToApp();
              else {
                window.history.pushState({}, '', '/');
                setActiveTab('dashboard');
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Kembali ke Dashboard</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col justify-center items-center px-4 sm:px-8 lg:px-12 py-6 max-w-7xl mx-auto w-full">
        {/* Event Header Banner (Elegan & Bersih: Tanpa Jam, Mendukung Multi-Baris Custom) */}
        {(monitorSettings.showEventName || monitorSettings.showOrganizer || monitorSettings.showDate) && (
          <div className="text-center mb-6 sm:mb-8 max-w-6xl px-2 sm:px-4">
            {monitorSettings.showOrganizer && event.organizer && (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-indigo-300 text-xs sm:text-sm font-semibold tracking-wide uppercase mb-3 shadow-inner">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>{event.organizer}</span>
              </div>
            )}

            {monitorSettings.showEventName && (
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-snug drop-shadow-md whitespace-pre-line">
                {monitorSettings.customEventTitle?.trim() || event.title}
              </h1>
            )}

            {monitorSettings.showDate && formattedEventDate && (
              <p className="text-slate-400 text-xs sm:text-sm font-medium mt-3 flex items-center justify-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>{formattedEventDate}</span>
                {event.location && (
                  <>
                    <span className="text-slate-600">·</span>
                    <span>📍 {event.location}</span>
                  </>
                )}
              </p>
            )}
          </div>
        )}

        {/* Centerpiece: Kartu Sambutan Persegi Panjang Mewah (Lebar Landscape, Pas Layar) */}
        {monitorSettings.showWelcomeCard && (
          <div className="w-full max-w-6xl min-h-[220px] flex items-center justify-center mb-8">
            <div 
              key={welcomeAnimationKey}
              className={`w-full rounded-3xl border px-6 sm:px-12 lg:px-16 py-8 sm:py-10 text-center backdrop-blur-sm transition-all duration-700 ${
                currentWelcomedGuest
                  ? 'bg-gradient-to-b from-slate-900/90 via-indigo-950/40 to-slate-900/90 border-indigo-500/50 shadow-2xl shadow-indigo-600/20'
                  : 'bg-slate-900/60 border-slate-800/80'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-indigo-950/90 border border-indigo-700/60 flex items-center justify-center text-indigo-400 mx-auto mb-4 shadow-lg shadow-indigo-900/30">
                <Sparkles className="w-7 h-7 animate-pulse text-indigo-300" />
              </div>

              {currentWelcomedGuest ? (
                /* Ketika ada data tamu yang baru masuk / discan */
                <div className="space-y-3.5 animate-in fade-in zoom-in-95 duration-500">
                  <div>
                    <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-indigo-300/90 mb-2">
                      Selamat Datang Bapak / Ibu
                    </p>
                    {/* Nama Tamu: Ukuran adaptif responsif, lebar landscape maksimal agar muat 1 baris */}
                    <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight px-2">
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-indigo-300">
                        {currentWelcomedGuest.name}
                      </span>
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                    {/* Instansi Tag */}
                    {monitorSettings.showGuestOrganization && currentWelcomedGuest.organization && (
                      <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-slate-800/90 border border-slate-700 text-slate-300 text-xs sm:text-sm font-medium">
                        <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{currentWelcomedGuest.organization}</span>
                      </div>
                    )}

                    {/* Pax / Kapasitas Tag */}
                    {monitorSettings.showGuestPax && (
                      <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm font-semibold font-mono">
                        <span>Hadir: {currentWelcomedGuest.actual_pax || currentWelcomedGuest.pax || 1} Orang</span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 pt-1">
                    Terima kasih atas kehadiran Bapak / Ibu dalam acara ini.
                  </p>
                </div>
              ) : (
                /* Standby ketika belum ada data scan */
                <div>
                  <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-indigo-300/90 mb-2">
                    Selamat Datang Bapak / Ibu
                  </p>
                  <h3 className="text-2xl sm:text-4xl font-extrabold text-slate-200">
                    Tamu Undangan
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 mt-3 max-w-md mx-auto">
                    Silakan tunjukkan QR Code undangan Anda kepada panitia di meja registrasi.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mini Counter Ringkas (Bisa di-hide / show dari pengaturan) */}
        {monitorSettings.showMiniCounter && (
          <div className="w-full max-w-6xl grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
            {/* Total Undangan */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-center">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Total Undangan
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono mt-1">
                {totalGuests}
              </div>
              <span className="text-[10px] text-slate-500">
                {totalInvitedPax} Kapasitas
              </span>
            </div>

            {/* Sudah Hadir */}
            <div className="bg-slate-900/80 border border-emerald-900/60 rounded-2xl p-4 text-center">
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">
                Tamu Hadir
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono mt-1">
                {attendedGuests.length}
              </div>
              <span className="text-[10px] text-emerald-500">
                {totalActualPaxPresent} Aktual Masuk
              </span>
            </div>

            {/* Belum Hadir */}
            <div className="bg-slate-900/80 border border-amber-900/60 rounded-2xl p-4 text-center">
              <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">
                Belum Hadir
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono mt-1">
                {totalGuests - attendedGuests.length}
              </div>
              <span className="text-[10px] text-amber-500">Menunggu</span>
            </div>

            {/* Persentase */}
            <div className="bg-slate-900/80 border border-indigo-900/60 rounded-2xl p-4 text-center">
              <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider block">
                Kehadiran
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-indigo-400 font-mono mt-1">
                {percentAttended}%
              </div>
              <span className="text-[10px] text-indigo-400">Tingkat Hadir</span>
            </div>
          </div>
        )}

        {/* Live Ticker: Tamu Terakhir Masuk (Bisa di-hide / show dari pengaturan) */}
        {monitorSettings.showLiveTicker && tickerList.length > 0 && (
          <div className="w-full max-w-6xl bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Live Feed: {tickerList.length} Tamu Baru Masuk
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">Real-Time</span>
            </div>

            <div className="space-y-2">
              {tickerList.map((g, idx) => {
                const checkTime = g.checked_in_at
                  ? new Date(g.checked_in_at).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '';

                return (
                  <div
                    key={g.id}
                    className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                      idx === 0
                        ? 'bg-indigo-950/60 border border-indigo-600/50 text-white'
                        : 'bg-slate-950/40 border border-slate-800/60 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-mono text-slate-400 shrink-0">
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <p className="text-xs sm:text-sm font-bold truncate">{g.name}</p>
                        {monitorSettings.showGuestOrganization && g.organization && (
                          <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                            {g.organization}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {monitorSettings.showGuestPax && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-950 border border-emerald-800/80 text-emerald-300 font-mono">
                          {g.actual_pax || g.pax || 1} Org
                        </span>
                      )}
                      {checkTime && (
                        <span className="text-[11px] font-mono text-slate-400">
                          {checkTime} WIB
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Footer Branding (Bisa di-hide / show dari pengaturan) */}
      {monitorSettings.showFooter && (
        <footer className="relative z-10 px-6 py-4 text-center border-t border-slate-900 bg-slate-950/80">
          <p className="text-xs text-slate-400 font-medium tracking-wide">
            Sheetizen ⚡ 2026
          </p>
        </footer>
      )}
    </div>
  );
};
