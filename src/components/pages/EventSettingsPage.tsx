import React, { useState } from 'react';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Building, 
  Save, 
  CheckCircle2, 
  Sparkles, 
  Cloud, 
  Database, 
  GitBranch,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { useAttendance } from '../../context/AttendanceContext';

export const EventSettingsPage: React.FC = () => {
  const { event, updateEvent, refreshFromSupabase, resetAllAttendance } = useAttendance();

  const [form, setForm] = useState({
    title: event.title,
    organizer: event.organizer,
    date: event.date,
    time_start: event.time_start,
    time_end: event.time_end,
    location: event.location,
    description: event.description,
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateEvent(form);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24 lg:pb-12">
      {/* Settings Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Pengaturan & Informasi Acara
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ubah judul acara, tanggal pelaksanaan, serta lokasi venue resepsi
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">ID: {event.id}</span>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nama Acara / Judul Kegiatan *
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Penyelenggara (Organizer)
              </label>
              <input
                type="text"
                value={form.organizer}
                onChange={(e) => setForm({ ...form, organizer: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tanggal Pelaksanaan
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Jam Mulai (WIB)
              </label>
              <input
                type="time"
                value={form.time_start}
                onChange={(e) => setForm({ ...form, time_start: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Jam Selesai (WIB)
              </label>
              <input
                type="time"
                value={form.time_end}
                onChange={(e) => setForm({ ...form, time_end: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Lokasi / Venue Acara
            </label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Contoh: Grand Ballroom Hotel Mulia Senayan, Jakarta"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Deskripsi Singkat Acara
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {savedSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Perubahan data acara berhasil disimpan!</span>
            </div>
          )}

          <div className="pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={refreshFromSupabase}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Sinkronkan dari Supabase</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Apakah Anda yakin ingin me-reset status kehadiran semua tamu menjadi Belum Hadir?')) {
                    resetAllAttendance();
                  }
                }}
                className="px-3.5 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 rounded-xl transition-colors"
              >
                Reset Status Kehadiran
              </button>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2 active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>
      </div>

      {/* Cloudflare Pages & Supabase Status Card */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-indigo-400">
            <Sparkles className="w-4 h-4" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Status Integrasi & Panduan Cloudflare Pages
            </h3>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Supabase Terkoneksi</span>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Aplikasi Hadirin saat ini sudah terhubung langsung ke project Supabase Anda (<span className="text-emerald-400 font-mono">jbyfsdysbdcgcmmnvmxa.supabase.co</span>) dengan autentikasi akun pengelola, penyimpanan real-time, dan pembaruan riwayat kehadiran.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 mb-1">
              <GitBranch className="w-4 h-4" />
              <span>1. GitHub Push</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Download kode ini, lalu push ke repository GitHub Anda (<code className="text-white font-mono">git push origin main</code>).
            </p>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-1">
              <Cloud className="w-4 h-4" />
              <span>2. Cloudflare Pages</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Connect repo di Cloudflare Pages. Build command: <code className="text-white font-mono">npm run build</code>, output directory: <code className="text-white font-mono">dist</code>.
            </p>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 mb-1">
              <Database className="w-4 h-4" />
              <span>3. Environment Vars</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Tambahkan <code className="text-white font-mono">VITE_SUPABASE_URL</code> dan <code className="text-white font-mono">VITE_SUPABASE_ANON_KEY</code> di Settings Cloudflare Pages.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
