import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  QrCode, 
  Download, 
  Share2, 
  Upload, 
  Check, 
  X, 
  Building2, 
  Calendar, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Users
} from 'lucide-react';
import { useAttendance } from '../../context/AttendanceContext';
import { Guest } from '../../types';
import { generateQRCodeDataURL } from '../../lib/qrUtils';
import { CheckInSuccessModal } from '../CheckInSuccessModal';

interface EventAndGuestsPageProps {
  onOpenAddGuest?: () => void;
}

export const EventAndGuestsPage: React.FC<EventAndGuestsPageProps> = ({
  onOpenAddGuest,
}) => {
  const { 
    event, 
    updateEvent, 
    guests, 
    updateGuest, 
    updateActualPax,
    deleteGuest, 
    bulkAddGuests,
    checkInGuest,
    cancelCheckIn
  } = useAttendance();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'checked_in' | 'pending'>('all');

  // Event editing state
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: event.title,
    organizer: event.organizer,
    date: event.date,
    time_start: event.time_start,
    time_end: event.time_end,
    location: event.location,
    description: event.description,
  });

  // Modal states
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [selectedQR, setSelectedQR] = useState<Guest | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string>('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Check In confirmation modal state
  const [checkInModalGuest, setCheckInModalGuest] = useState<Guest | null>(null);

  // Bulk paste state
  const [bulkInputText, setBulkInputText] = useState('');
  const [bulkFeedback, setBulkFeedback] = useState<string | null>(null);

  // Edit form state with string pax so backspace works easily
  const [editForm, setEditForm] = useState({
    name: '',
    organization: '',
    paxInput: '1',
  });

  useEffect(() => {
    if (selectedQR) {
      generateQRCodeDataURL(selectedQR.name, 320).then(setQrImageUrl);
    } else {
      setQrImageUrl('');
    }
  }, [selectedQR]);

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    updateEvent(eventForm);
    setIsEditingEvent(false);
  };

  const handleSaveEditedGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGuest || !editForm.name.trim()) return;

    const parsedPax = parseInt(editForm.paxInput, 10);
    const finalPax = isNaN(parsedPax) || parsedPax < 1 ? 1 : parsedPax;

    updateGuest(editingGuest.id, {
      name: editForm.name.trim(),
      organization: editForm.organization.trim(),
      pax: finalPax,
    });

    setEditingGuest(null);
  };

  const openEditGuest = (g: Guest) => {
    setEditingGuest(g);
    setEditForm({
      name: g.name,
      organization: g.organization,
      paxInput: String(g.pax || 1),
    });
  };

  const handleCheckInGuest = (guest: Guest) => {
    const res = checkInGuest(guest.name, guest.pax);
    if (res.guest) {
      setCheckInModalGuest(res.guest);
    }
  };

  // Bulk Import Parser
  const handleProcessBulk = () => {
    if (!bulkInputText.trim()) return;

    const lines = bulkInputText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const parsed: Array<{
      name: string;
      organization?: string;
      pax?: number;
    }> = [];

    lines.forEach((line) => {
      if (line.toLowerCase().startsWith('nama') && (line.includes('instansi') || line.includes('perusahaan'))) {
        return;
      }

      let parts: string[] = [];
      if (line.includes('\t')) {
        parts = line.split('\t');
      } else if (line.includes(';') || line.includes(',')) {
        parts = line.includes(';') ? line.split(';') : line.split(',');
      } else if (line.includes(' - ')) {
        parts = line.split(' - ');
      } else {
        parts = [line];
      }

      const cleanParts = parts.map((p) => p.trim().replace(/^["']|["']$/g, ''));
      const name = cleanParts[0];
      if (!name) return;

      const org = cleanParts[1] || '';
      const pax = parseInt(cleanParts[2] || '1', 10) || 1;

      parsed.push({
        name,
        organization: org,
        pax,
      });
    });

    if (parsed.length > 0) {
      const addedCount = bulkAddGuests(parsed);
      setBulkFeedback(`Berhasil menambahkan ${addedCount} nama tamu sekaligus!`);
      setTimeout(() => {
        setIsBulkModalOpen(false);
        setBulkInputText('');
        setBulkFeedback(null);
      }, 1400);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        setBulkInputText(content);
      }
    };
    reader.readAsText(file);
  };

  const buildWhatsAppUrl = (guest: Guest) => {
    const text = `Halo Bapak/Ibu *${guest.name}*,\n\n` +
      `Anda diundang untuk menghadiri:\n` +
      `*${event.title}*\n` +
      `📅 Tanggal: ${event.date}\n` +
      `📍 Lokasi: ${event.location}\n` +
      `👥 Kapasitas Undangan: ${guest.pax} Orang\n\n` +
      `Harap sebutkan nama Anda kepada petugas resepsionis di lokasi acara untuk presensi kilat.\n\n` +
      `Terima kasih!`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  const filteredGuests = guests.filter((g) => {
    const query = searchQuery.toLowerCase();
    const matchQuery =
      g.name.toLowerCase().includes(query) ||
      g.organization.toLowerCase().includes(query);

    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'checked_in' && g.status === 'checked_in') ||
      (statusFilter === 'pending' && g.status === 'pending');

    return matchQuery && matchStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 lg:pb-12">
      {/* 1. Event Details Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
              Info Acara
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2 break-words">
              {event.title}
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl break-words">
              {event.description}
            </p>
          </div>

          <button
            onClick={() => {
              setEventForm({
                title: event.title,
                organizer: event.organizer,
                date: event.date,
                time_start: event.time_start,
                time_end: event.time_end,
                location: event.location,
                description: event.description,
              });
              setIsEditingEvent(!isEditingEvent);
            }}
            className="self-start sm:self-center px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          >
            <Edit3 className="w-4 h-4 text-slate-500" />
            <span>{isEditingEvent ? 'Tutup Edit Acara' : 'Edit Info Acara'}</span>
          </button>
        </div>

        {/* Inline Event Form */}
        {isEditingEvent ? (
          <form onSubmit={handleSaveEvent} className="mt-5 space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Nama Acara
                </label>
                <input
                  type="text"
                  required
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Penyelenggara
                </label>
                <input
                  type="text"
                  value={eventForm.organizer}
                  onChange={(e) => setEventForm({ ...eventForm, organizer: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Tanggal Acara
                </label>
                <input
                  type="date"
                  value={eventForm.date}
                  onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Jam Mulai
                  </label>
                  <input
                    type="time"
                    value={eventForm.time_start}
                    onChange={(e) => setEventForm({ ...eventForm, time_start: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Jam Selesai
                  </label>
                  <input
                    type="time"
                    value={eventForm.time_end}
                    onChange={(e) => setEventForm({ ...eventForm, time_end: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Lokasi / Venue
                </label>
                <input
                  type="text"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditingEvent(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-xl"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-1">
            <div className="flex items-center gap-2.5 text-xs text-slate-600">
              <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>{new Date(event.date).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-600">
              <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>{event.time_start} - {event.time_end} WIB</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-600">
              <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Guests Management */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Daftar Tamu ({filteredGuests.length} dari {guests.length})
            </h3>
            <p className="text-xs text-slate-500">
              Tambah, edit, atau hapus nama tamu undangan
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Upload className="w-4 h-4 text-indigo-600" />
              <span>Copas / Bulk Nama</span>
            </button>
            <button
              onClick={onOpenAddGuest}
              className="px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Tamu</span>
            </button>
          </div>
        </div>

        {/* Search & Status Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
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

        {/* Guest Cards / List Container */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          {filteredGuests.length === 0 ? (
            <div className="py-16 text-center px-4">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-700">
                {guests.length === 0
                  ? 'Database Tamu Supabase Masih Kosong'
                  : 'Tidak ada tamu yang cocok'}
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {guests.length === 0
                  ? 'Data dummy telah dihapus. Tambahkan tamu langsung ke Supabase melalui form manual atau copas banyak nama sekaligus.'
                  : 'Coba sesuaikan kata kunci pencarian nama atau filter status.'}
              </p>
              {guests.length === 0 && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={onOpenAddGuest}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
                  >
                    + Tambah Tamu Pertama
                  </button>
                  <button
                    onClick={() => setIsBulkModalOpen(true)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                  >
                    Copas / Bulk Nama
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredGuests.map((guest) => {
                const isChecked = guest.status === 'checked_in';
                return (
                  <div key={guest.id} className="p-4 sm:p-5 space-y-3 hover:bg-slate-50/60 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-slate-900 text-sm sm:text-base break-words whitespace-normal leading-snug">
                          {guest.name}
                        </h4>
                        {guest.organization && (
                          <p className="text-xs text-slate-500 break-words mt-0.5 flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{guest.organization}</span>
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
                        <span className="text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg font-medium tabular-nums">
                          {isChecked ? (
                            <span>Hadir: <strong>{guest.actual_pax || guest.pax}</strong> / {guest.pax} orang</span>
                          ) : (
                            <span>Kapasitas: <strong>{guest.pax}</strong> orang</span>
                          )}
                        </span>

                        {isChecked ? (
                          <div className="text-right">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Hadir</span>
                            </span>
                            {guest.checked_in_at && (
                              <span className="text-[10px] text-slate-500 font-mono block mt-1">
                                {new Date(guest.checked_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                                {guest.check_in_history && guest.check_in_history.length > 1 && (
                                  <span className="text-indigo-600 font-semibold block text-[9px]">
                                    (Update ke-{guest.check_in_history.length})
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                            Belum Hadir
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                      <button
                        onClick={() => setSelectedQR(guest)}
                        className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>QR Code</span>
                      </button>

                      {/* Check In / Batalkan Check In with Confirmation Popup */}
                      {isChecked ? (
                        <button
                          onClick={() => cancelCheckIn(guest.id)}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-medium transition-colors"
                        >
                          Batalkan Hadir
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCheckInGuest(guest)}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Check In</span>
                        </button>
                      )}

                      <div className="flex-1" />

                      <button
                        onClick={() => openEditGuest(guest)}
                        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                        title="Edit Tamu"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setDeleteConfirmId(guest.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-slate-200 transition-colors"
                        title="Hapus Tamu"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: EDIT GUEST (Pax input can be freely cleared and edited!) */}
      {editingGuest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Edit Tamu Undangan
              </h3>
              <button
                onClick={() => setEditingGuest(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedGuest} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Nama Lengkap Tamu * <span className="text-rose-500">(Wajib)</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Contoh: Agustinus Lanang"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Instansi / Perusahaan <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <input
                  type="text"
                  value={editForm.organization}
                  onChange={(e) => setEditForm({ ...editForm, organization: e.target.value })}
                  placeholder="Contoh: PT Bank Central Asia"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Berapa Orang yang Diundang / Pax <span className="text-slate-400 font-normal">(Opsional, default 1)</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={editForm.paxInput}
                  onChange={(e) => setEditForm({ ...editForm, paxInput: e.target.value })}
                  onBlur={() => {
                    const p = parseInt(editForm.paxInput, 10);
                    if (isNaN(p) || p < 1) {
                      setEditForm({ ...editForm, paxInput: '1' });
                    }
                  }}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingGuest(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BULK IMPORT / COPAS NAMA */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Copas / Bulk Daftar Tamu
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tempel daftar nama tamu dari WhatsApp, catatan, atau file CSV
                </p>
              </div>
              <button
                onClick={() => {
                  setIsBulkModalOpen(false);
                  setBulkFeedback(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-100 rounded-2xl">
                <div>
                  <p className="text-xs font-semibold text-indigo-950">Upload File CSV</p>
                  <p className="text-[11px] text-indigo-700">Pilih file untuk mengisi otomatis</p>
                </div>
                <label className="cursor-pointer px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors">
                  <span>Pilih CSV</span>
                  <input
                    type="file"
                    accept=".csv,text/csv,text/plain"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                <p className="font-semibold text-slate-800 mb-1">Format (Cukup Nama atau Nama, Instansi, Pax):</p>
                <code className="text-[11px] font-mono text-indigo-600 block bg-white p-2 rounded-lg border border-slate-200">
                  Agustinus Lanang, PT BCA, 2<br />
                  Andreas Pok, Kominfo<br />
                  Ir. Budi Santoso
                </code>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Tempel (Paste) Daftar Tamu:
                </label>
                <textarea
                  rows={7}
                  value={bulkInputText}
                  onChange={(e) => setBulkInputText(e.target.value)}
                  placeholder={`Agustinus Lanang, PT BCA, 2\nAndreas Pok, Kominfo\nIr. Budi Santoso`}
                  className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {bulkFeedback && (
                <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{bulkFeedback}</span>
                </div>
              )}

              <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                <span className="text-xs text-slate-400">
                  {bulkInputText.split(/\r?\n/).filter((l) => l.trim()).length} baris
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsBulkModalOpen(false);
                      setBulkFeedback(null);
                    }}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleProcessBulk}
                    disabled={!bulkInputText.trim()}
                    className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm"
                  >
                    Masukkan ke Database
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VIEW QR CODE */}
      {selectedQR && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                QR Presensi
              </span>
              <button
                onClick={() => setSelectedQR(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h4 className="text-lg font-extrabold text-slate-900 mt-1 break-words">
              {selectedQR.name}
            </h4>
            {selectedQR.organization && (
              <p className="text-xs text-slate-500 break-words">{selectedQR.organization}</p>
            )}

            <div className="my-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block shadow-inner">
              {qrImageUrl ? (
                <img
                  src={qrImageUrl}
                  alt={`QR Code ${selectedQR.name}`}
                  className="w-44 h-44 mx-auto rounded-lg shadow-sm"
                />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center text-slate-400">
                  Memuat QR...
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs mb-4">
              <span className="text-[10px] text-slate-400 block">Kapasitas Undangan</span>
              <span className="font-bold text-slate-800">{selectedQR.pax} Orang</span>
            </div>

            <div className="space-y-2">
              <a
                href={buildWhatsAppUrl(selectedQR)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>Bagikan via WhatsApp</span>
              </a>

              {qrImageUrl && (
                <a
                  href={qrImageUrl}
                  download={`QR_${selectedQR.name.replace(/\s+/g, '_')}.png`}
                  className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Gambar QR</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* POPUP: PRESENSI "Selamat datang Ibu/Bapak [Nama]" KETIKA CHECK IN DARI TAB TAMU */}
      {checkInModalGuest && (
        <CheckInSuccessModal
          guest={checkInModalGuest}
          onClose={() => setCheckInModalGuest(null)}
          onUpdatePax={(guestId, actualPax) => {
            updateActualPax(guestId, actualPax);
            setCheckInModalGuest((prev) => (prev ? { ...prev, actual_pax: actualPax } : null));
          }}
        />
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900">Hapus Tamu Ini?</h4>
            <p className="text-xs text-slate-500 mt-1">
              Data tamu akan dihapus dari daftar presensi.
            </p>
            <div className="grid grid-cols-2 gap-2 mt-5">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="py-2.5 px-4 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  deleteGuest(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="py-2.5 px-4 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
