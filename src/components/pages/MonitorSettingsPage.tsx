import React, { useState } from 'react';
import { 
  Tv, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  Sparkles, 
  ExternalLink, 
  RotateCcw,
  Clock,
  Building2,
  Users,
  MessageSquare,
  Layout
} from 'lucide-react';
import { useAttendance } from '../../context/AttendanceContext';
import { MonitorSettings } from '../../types';

export const MonitorSettingsPage: React.FC = () => {
  const { monitorSettings, updateMonitorSettings, setActiveTab } = useAttendance();
  const [saveToast, setSaveToast] = useState(false);

  const toggleSetting = (key: keyof MonitorSettings) => {
    if (typeof monitorSettings[key] === 'boolean') {
      updateMonitorSettings({ [key]: !monitorSettings[key] });
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2000);
    }
  };

  const handleResetDefault = () => {
    updateMonitorSettings({
      showEventName: true,
      showOrganizer: true,
      showDate: true,
      showWelcomeCard: true,
      showGuestOrganization: true,
      showGuestPax: true,
      showLiveTicker: true,
      liveTickerCount: 5,
      showMiniCounter: true,
      showFooter: true,
    });
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24 lg:pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/60 text-indigo-700 text-xs font-semibold mb-2">
            <Tv className="w-3.5 h-3.5 text-indigo-600" />
            <span>Kustomisasi Tampilan Proyektor / TV</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Pengaturan Layar Monitor
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Atur elemen apa saja yang ingin Anda tampilkan atau sembunyikan di halaman layar monitor / TV panggung.
          </p>
        </div>

        {/* Quick Launch Monitor button */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              window.history.pushState({}, '', '/monitor');
              setActiveTab('monitor');
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all active:scale-95"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Buka Layar Monitor</span>
          </button>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Section 1: Informasi Header Acara */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Informasi Acara</h3>
          </div>

          {/* Toggle: Nama Acara */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">Nama Acara / Judul Kegiatan</p>
                <p className="text-[11px] text-slate-500">Tampilkan judul acara di bagian atas layar</p>
              </div>
              <button
                onClick={() => toggleSetting('showEventName')}
                className={`p-2 rounded-lg transition-colors ${
                  monitorSettings.showEventName
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {monitorSettings.showEventName ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            {/* Custom Multi-line Event Title (Only affects Monitor) */}
            {monitorSettings.showEventName && (
              <div className="pt-2 border-t border-slate-200/60">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-indigo-950 uppercase tracking-wider">
                    Custom Teks Judul di Layar Monitor (Bisa Tekan Enter)
                  </label>
                  {monitorSettings.customEventTitle && (
                    <button
                      type="button"
                      onClick={() => {
                        updateMonitorSettings({ customEventTitle: '' });
                        setSaveToast(true);
                        setTimeout(() => setSaveToast(false), 2000);
                      }}
                      className="text-[10px] text-rose-600 hover:underline"
                    >
                      Reset ke nama bawaan
                    </button>
                  )}
                </div>
                <textarea
                  rows={2}
                  placeholder={`Contoh susunan baris:\nPemberkatan dan Peresmian Gedung Baru\nSMA Stella Duce 1`}
                  value={monitorSettings.customEventTitle !== undefined ? monitorSettings.customEventTitle : ''}
                  onChange={(e) => {
                    updateMonitorSettings({ customEventTitle: e.target.value });
                    setSaveToast(true);
                    setTimeout(() => setSaveToast(false), 1500);
                  }}
                  className="w-full px-3 py-2 text-xs font-medium bg-white rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 placeholder:text-slate-400"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  💡 *Tips*: Tekan <strong>Enter</strong> untuk memotong baris agar tampilan di layar monitor/TV pas dan tidak terpotong sembarangan.
                </p>
              </div>
            )}
          </div>

          {/* Toggle: Penyelenggara */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60">
            <div>
              <p className="text-xs font-bold text-slate-800">Penyelenggara / Sekolah / Panitia</p>
              <p className="text-[11px] text-slate-500">Tampilkan badge nama institusi penyelenggara</p>
            </div>
            <button
              onClick={() => toggleSetting('showOrganizer')}
              className={`p-2 rounded-lg transition-colors ${
                monitorSettings.showOrganizer
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {monitorSettings.showOrganizer ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>

          {/* Toggle: Tanggal Acara */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60">
            <div>
              <p className="text-xs font-bold text-slate-800">Tanggal Pelaksanaan</p>
              <p className="text-[11px] text-slate-500">Format tanggal elegan tanpa menyertakan jam</p>
            </div>
            <button
              onClick={() => toggleSetting('showDate')}
              className={`p-2 rounded-lg transition-colors ${
                monitorSettings.showDate
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {monitorSettings.showDate ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Section 2: Kartu Sambutan Terintegrasi */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <MessageSquare className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Kartu Sambutan Utama</h3>
          </div>

          {/* Toggle: Kartu Sambutan (Selamat Datang ...) */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60">
            <div>
              <p className="text-xs font-bold text-slate-800">Kartu Sambutan Tamu</p>
              <p className="text-[11px] text-slate-500">Menyambut "Selamat Datang Bapak/Ibu [Nama Tamu]" secara langsung</p>
            </div>
            <button
              onClick={() => toggleSetting('showWelcomeCard')}
              className={`p-2 rounded-lg transition-colors ${
                monitorSettings.showWelcomeCard
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {monitorSettings.showWelcomeCard ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>

          {/* Toggle: Tampilkan Instansi Tamu */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60">
            <div>
              <p className="text-xs font-bold text-slate-800">Tampilkan Asal Lembaga / Instansi Tamu</p>
              <p className="text-[11px] text-slate-500">Sertakan badge nama instansi pada kartu sambutan</p>
            </div>
            <button
              onClick={() => toggleSetting('showGuestOrganization')}
              className={`p-2 rounded-lg transition-colors ${
                monitorSettings.showGuestOrganization
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {monitorSettings.showGuestOrganization ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>

          {/* Toggle: Tampilkan Berapa Orang (Pax) */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60">
            <div>
              <p className="text-xs font-bold text-slate-800">Tampilkan Jumlah Orang (Pax)</p>
              <p className="text-[11px] text-slate-500">Sertakan info jumlah orang yang hadir pada kartu</p>
            </div>
            <button
              onClick={() => toggleSetting('showGuestPax')}
              className={`p-2 rounded-lg transition-colors ${
                monitorSettings.showGuestPax
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {monitorSettings.showGuestPax ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Section 3: Live Ticker Feed */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Clock className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Live Ticker (Feed Tamu Masuk)</h3>
          </div>

          {/* Toggle: Live Ticker */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60">
            <div>
              <p className="text-xs font-bold text-slate-800">Tampilkan Live Ticker Tamu</p>
              <p className="text-[11px] text-slate-500">Daftar tamu yang baru saja masuk secara urut waktu</p>
            </div>
            <button
              onClick={() => toggleSetting('showLiveTicker')}
              className={`p-2 rounded-lg transition-colors ${
                monitorSettings.showLiveTicker
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {monitorSettings.showLiveTicker ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>

          {/* Jumlah Baris Ticker */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800">Jumlah Tamu Ditampilkan</label>
              <span className="text-xs font-mono font-bold text-indigo-600">
                {monitorSettings.liveTickerCount || 5} Tamu Terakhir
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[3, 5, 8, 10].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => {
                    updateMonitorSettings({ liveTickerCount: count });
                    setSaveToast(true);
                    setTimeout(() => setSaveToast(false), 2000);
                  }}
                  className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    (monitorSettings.liveTickerCount || 5) === count
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {count} Tamu
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 4: Mini Counter Ringkas & Footer */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Users className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Statistik Ringkas & Footer</h3>
          </div>

          {/* Toggle: Mini Counter Ringkas */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60">
            <div>
              <p className="text-xs font-bold text-slate-800">Tampilkan 4 Kotak Mini Counter</p>
              <p className="text-[11px] text-slate-500">Total Undangan, Hadir, Belum Hadir, dan Tingkat Kehadiran</p>
            </div>
            <button
              onClick={() => toggleSetting('showMiniCounter')}
              className={`p-2 rounded-lg transition-colors ${
                monitorSettings.showMiniCounter
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {monitorSettings.showMiniCounter ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>

          {/* Toggle: Footer Bawah */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60">
            <div>
              <p className="text-xs font-bold text-slate-800">Tampilkan Teks Footer Bawah</p>
              <p className="text-[11px] text-slate-500">Teks keterangan 'Sistem Presensi Hadirin' di bagian paling bawah layar</p>
            </div>
            <button
              onClick={() => toggleSetting('showFooter')}
              className={`p-2 rounded-lg transition-colors ${
                monitorSettings.showFooter
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {monitorSettings.showFooter ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>

          {/* Reset to Default */}
          <div className="pt-2">
            <button
              onClick={handleResetDefault}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Kembalikan Pengaturan ke Default (Tampilkan Semua)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Save Toast */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Pengaturan monitor tersimpan otomatis!</span>
        </div>
      )}
    </div>
  );
};
