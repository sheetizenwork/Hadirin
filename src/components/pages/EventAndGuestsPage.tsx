import React, { useState, useEffect, useMemo } from 'react';
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
  Users,
  GraduationCap,
  Sparkles,
  FileSpreadsheet,
  HelpCircle
} from 'lucide-react';
import { useAttendance } from '../../context/AttendanceContext';
import { Guest } from '../../types';
import { generateQRCodeDataURL } from '../../lib/qrUtils';
import { CheckInSuccessModal } from '../CheckInSuccessModal';
import { DownloadGuestsModal } from '../DownloadGuestsModal';
import { parseBulkGuestInput, ParseMode, ParsedGuestItem } from '../../lib/bulkGuestParser';

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

  // Download tickets modal state
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  // Bulk paste state & mode
  const [bulkInputText, setBulkInputText] = useState('');
  const [bulkParseMode, setBulkParseMode] = useState<ParseMode>('smart');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [bulkFeedback, setBulkFeedback] = useState<string | null>(null);
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);

  // Existing names in database for duplicate detection
  const existingNames = useMemo(() => guests.map((g) => g.name), [guests]);

  // Live parsed preview of guests with duplicate detection
  const previewGuests = useMemo(() => {
    return parseBulkGuestInput(bulkInputText, bulkParseMode, existingNames);
  }, [bulkInputText, bulkParseMode, existingNames]);

  // Filtered preview based on skipDuplicates setting
  const validPreviewGuests = useMemo(() => {
    return skipDuplicates ? previewGuests.filter((g) => !g.isDuplicate) : previewGuests;
  }, [previewGuests, skipDuplicates]);

  // Count how many guests in preview have detected degrees & duplicates
  const degreeCount = useMemo(() => {
    return previewGuests.filter((g) => g.hasDegree).length;
  }, [previewGuests]);

  const duplicateCount = useMemo(() => {
    return previewGuests.filter((g) => g.isDuplicate).length;
  }, [previewGuests]);

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

  // Bulk Import Executor using parsed preview and duplicate prevention
  const handleProcessBulk = async () => {
    const itemsToInsert = validPreviewGuests;
    if (itemsToInsert.length === 0) return;

    setIsSubmittingBulk(true);
    try {
      const addedCount = await bulkAddGuests(itemsToInsert);
      const skippedMsg = duplicateCount > 0 && skipDuplicates ? ` (${duplicateCount} nama duplikat dilewati).` : '';
      setBulkFeedback(`Berhasil menambahkan ${addedCount} tamu sekaligus ke database!${skippedMsg}`);
      setTimeout(() => {
        setIsBulkModalOpen(false);
        setBulkInputText('');
        setBulkFeedback(null);
        setIsSubmittingBulk(false);
      }, 1500);
    } catch (err) {
      console.error('Error adding bulk guests:', err);
      setIsSubmittingBulk(false);
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

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsDownloadModalOpen(true)}
              className="px-3.5 py-2.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-colors flex items-center gap-1.5 shadow-sm active:scale-95"
              title="Download daftar tamu dan QR code (Row 1: Nama & Gelar, Row 2: QR Code)"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Download Undangan & QR</span>
            </button>
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
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Copas / Bulk Daftar Tamu Undangan
                  </h3>
                  <p className="text-xs text-slate-500">
                    Dukung nama bergelar (S.Pd., M.T., dll), copas dari Excel, WhatsApp, atau CSV
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsBulkModalOpen(false);
                  setBulkFeedback(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Parse Mode Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Pilih Mode Pembacaan Format:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setBulkParseMode('smart')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold text-left border transition-all flex items-center gap-1.5 ${
                      bulkParseMode === 'smart'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>Smart Gelar (Otomatis)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBulkParseMode('name_only')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold text-left border transition-all flex items-center gap-1.5 ${
                      bulkParseMode === 'name_only'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 shrink-0" />
                    <span>Nama Saja Per Baris</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBulkParseMode('tab')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold text-left border transition-all flex items-center gap-1.5 ${
                      bulkParseMode === 'tab'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                    <span>Tab (Copas Excel)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBulkParseMode('semicolon')}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold text-left border transition-all ${
                      bulkParseMode === 'semicolon'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>Pemisah Titik Koma (;)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBulkParseMode('dash')}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold text-left border transition-all ${
                      bulkParseMode === 'dash'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>Pemisah Strip ( - )</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBulkParseMode('pipe')}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold text-left border transition-all ${
                      bulkParseMode === 'pipe'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>Pemisah Garis ( | )</span>
                  </button>
                </div>
              </div>

              {/* Mode Explanation & Upload */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-xs">
                <div className="flex items-center gap-2 text-indigo-950">
                  <GraduationCap className="w-4 h-4 text-indigo-600 shrink-0" />
                  <p>
                    {bulkParseMode === 'smart' && (
                      <span><strong>Fitur Smart Gelar Aktif:</strong> Gelar seperti <code>S.Pd.</code>, <code>M.T.</code>, <code>M.Pd.</code>, <code>Dr.</code>, <code>Ph.D.</code> tidak akan dipotong jadi instansi.</span>
                    )}
                    {bulkParseMode === 'name_only' && (
                      <span><strong>Mode Nama Saja:</strong> 100% setiap baris disimpan sebagai nama utuh tamu (aman untuk nama panjang & gelar).</span>
                    )}
                    {bulkParseMode === 'tab' && (
                      <span><strong>Mode Excel:</strong> Kolom dipisah Tab. Kolom 1: Nama, Kolom 2: Instansi, Kolom 3: Pax.</span>
                    )}
                    {bulkParseMode === 'semicolon' && (
                      <span><strong>Format Titik Koma:</strong> <code>Nama ; Instansi ; Pax</code></span>
                    )}
                    {bulkParseMode === 'dash' && (
                      <span><strong>Format Strip:</strong> <code>Nama - Instansi - Pax</code></span>
                    )}
                    {bulkParseMode === 'pipe' && (
                      <span><strong>Format Garis:</strong> <code>Nama | Instansi | Pax</code></span>
                    )}
                  </p>
                </div>

                <label className="cursor-pointer shrink-0 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors text-center">
                  <span>Upload CSV</span>
                  <input
                    type="file"
                    accept=".csv,text/csv,text/plain"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Textarea Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Tempel (Paste) Daftar Tamu:
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setBulkInputText(
                        `Tukiman, S.Pd., M.T.\nDra. Hj. Nurjanah, M.Pd.\nBudi Santoso, S.Kom., M.Cs. - SMKN 1 Surabaya - 2\nProf. Dr. Ir. Wahyudi, S.T., M.T.\nAgus Hermanto, S.E., M.M.`
                      );
                    }}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    + Isi Contoh Nama Bergelar
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={bulkInputText}
                  onChange={(e) => setBulkInputText(e.target.value)}
                  placeholder={`Contoh:\nTukiman, S.Pd., M.T.\nDra. Hj. Nurjanah, M.Pd.\nBudi Santoso, S.Kom. - SMKN 1 - 2`}
                  className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* LIVE PREVIEW BOX */}
              {previewGuests.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-xs font-bold text-slate-900">
                        Pratinjau Hasil Impor ({validPreviewGuests.length} Tamu Siap Masuk)
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {degreeCount > 0 && (
                        <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <GraduationCap className="w-3 h-3" />
                          <span>{degreeCount} bergelar</span>
                        </span>
                      )}
                      {duplicateCount > 0 && (
                        <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span>⚠️ {duplicateCount} duplikat terdeteksi</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* DUPLICATE PREVENTION TOGGLE */}
                  {duplicateCount > 0 && (
                    <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2 cursor-pointer font-medium select-none">
                        <input
                          type="checkbox"
                          checked={skipDuplicates}
                          onChange={(e) => setSkipDuplicates(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 rounded border-amber-300 focus:ring-indigo-500"
                        />
                        <span>
                          <strong>Otomatis lewati nama yang sudah ada di database</strong> (Mencegah nama dobel)
                        </span>
                      </label>
                      <span className="text-[11px] text-amber-700 font-bold shrink-0">
                        {skipDuplicates ? `${duplicateCount} nama dilewati` : 'Akan dimasukkan semua'}
                      </span>
                    </div>
                  )}

                  <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0">
                        <tr>
                          <th className="py-1.5 px-3 w-8">#</th>
                          <th className="py-1.5 px-3">Nama Lengkap Tamu</th>
                          <th className="py-1.5 px-3">Instansi / Perusahaan</th>
                          <th className="py-1.5 px-3 w-16 text-center">Pax</th>
                          <th className="py-1.5 px-3 w-28 text-center">Status Data</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewGuests.map((item, idx) => (
                          <tr 
                            key={idx} 
                            className={`hover:bg-slate-50 transition-colors ${
                              item.isDuplicate ? (skipDuplicates ? 'bg-amber-50/40 opacity-75' : 'bg-rose-50/40') : ''
                            }`}
                          >
                            <td className="py-1.5 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                            <td className="py-1.5 px-3 font-bold text-slate-900 break-words">
                              {item.name}
                              {item.hasDegree && (
                                <span className="ml-1.5 text-[10px] font-normal text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                  Gelar
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 px-3 text-slate-600">
                              {item.organization ? item.organization : <span className="text-slate-300 italic">—</span>}
                            </td>
                            <td className="py-1.5 px-3 text-center font-semibold text-indigo-600">
                              {item.pax}
                            </td>
                            <td className="py-1.5 px-3 text-center">
                              {item.isDuplicate ? (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full inline-block">
                                  {skipDuplicates ? 'Dilewati (Dobel)' : 'Duplikat'}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-block">
                                  Nama Baru
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {bulkFeedback && (
                <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{bulkFeedback}</span>
                </div>
              )}

              {/* Modal Actions */}
              <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                <span className="text-xs text-slate-500 font-medium">
                  {validPreviewGuests.length} dari {previewGuests.length} nama siap diimpor
                  {duplicateCount > 0 && skipDuplicates && ` (${duplicateCount} duplikat diabaikan)`}
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
                    disabled={validPreviewGuests.length === 0 || isSubmittingBulk}
                    className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                  >
                    {isSubmittingBulk ? (
                      <span>Menyimpan ke Supabase...</span>
                    ) : (
                      <span>Masukkan ke Database ({validPreviewGuests.length})</span>
                    )}
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

      {/* MODAL: DOWNLOAD UNDANGAN & QR CODE (Row 1: Nama, Row 2: QR) */}
      <DownloadGuestsModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        guests={guests}
        event={event}
      />
    </div>
  );
};
