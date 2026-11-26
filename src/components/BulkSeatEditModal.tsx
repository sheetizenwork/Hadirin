import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Armchair,
  FileSpreadsheet,
  Table2,
  Download,
  Upload,
  Search,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Copy,
  Check,
  Wand2,
} from 'lucide-react';
import { useAttendance } from '../context/AttendanceContext';
import { parseBulkSeatUpdates } from '../lib/bulkGuestParser';

interface BulkSeatEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SQL_ADD_SEAT_COLUMN = `ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS seat TEXT DEFAULT '';`;

export const BulkSeatEditModal: React.FC<BulkSeatEditModalProps> = ({ isOpen, onClose }) => {
  const { guests, bulkUpdateSeats } = useAttendance();

  const [activeMode, setActiveMode] = useState<'paste' | 'table'>('paste');

  // --- TAB 1: PASTE / CSV STATE ---
  const [pasteText, setPasteText] = useState('');

  // --- TAB 2: INLINE TABLE STATE ---
  const [tableSearch, setTableSearch] = useState('');
  const [seatFilter, setSeatFilter] = useState<'all' | 'empty' | 'filled'>('all');
  const [draftSeats, setDraftSeats] = useState<Record<string, string>>({});
  const [batchFillValue, setBatchFillValue] = useState('');

  // --- SHARED SUBMIT / FEEDBACK STATE ---
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  // Reset draft overrides ONLY when modal opens (never wipe when guests refreshes in background!)
  useEffect(() => {
    if (isOpen) {
      setDraftSeats({});
      setSuccessMsg(null);
      setErrorMsg(null);
    }
  }, [isOpen]);

  // Parsed paste preview
  const parsedPaste = useMemo(() => {
    return parseBulkSeatUpdates(pasteText, guests);
  }, [pasteText, guests]);

  const pasteMatchedToUpdate = useMemo(
    () => parsedPaste.filter((item) => item.status === 'matched' && item.matchedGuestId),
    [parsedPaste]
  );
  const pasteUnchangedCount = useMemo(
    () => parsedPaste.filter((item) => item.status === 'unchanged').length,
    [parsedPaste]
  );
  const pasteNotFoundCount = useMemo(
    () => parsedPaste.filter((item) => item.status === 'not_found').length,
    [parsedPaste]
  );

  // Filtered guests for inline table (filter by saved DB seat so rows don't vanish mid-typing!)
  const filteredTableGuests = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    return guests.filter((g) => {
      const savedSeat = (g.seat || '').trim();
      const currentDraft = (
        Object.prototype.hasOwnProperty.call(draftSeats, g.id) ? draftSeats[g.id] : savedSeat
      ).trim();

      const matchesFilter =
        seatFilter === 'all' ||
        (seatFilter === 'empty' && savedSeat === '') ||
        (seatFilter === 'filled' && savedSeat !== '');

      if (!matchesFilter) return false;
      if (!q) return true;

      return (
        g.name.toLowerCase().includes(q) ||
        (g.organization && g.organization.toLowerCase().includes(q)) ||
        savedSeat.toLowerCase().includes(q) ||
        currentDraft.toLowerCase().includes(q)
      );
    });
  }, [guests, tableSearch, seatFilter, draftSeats]);

  // Changed rows in inline table
  const tablePendingUpdates = useMemo(() => {
    const list: Array<{ id: string; seat: string }> = [];
    for (const g of guests) {
      if (!Object.prototype.hasOwnProperty.call(draftSeats, g.id)) continue;
      const original = (g.seat || '').trim();
      const next = draftSeats[g.id].trim();
      if (next !== original) {
        list.push({ id: g.id, seat: next });
      }
    }
    return list;
  }, [guests, draftSeats]);

  // Overall stats
  const filledCount = useMemo(
    () => guests.filter((g) => (g.seat || '').trim().length > 0).length,
    [guests]
  );

  if (!isOpen) return null;

  // Download pre-filled CSV template with all current guest names
  const handleDownloadTemplate = () => {
    const escapeCsv = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const headers = ['Nama Tamu', 'Instansi', 'Tempat Duduk'];
    const rows = guests.map((g) => [
      escapeCsv(g.name),
      escapeCsv(g.organization || ''),
      escapeCsv(g.seat || ''),
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Template_Tempat_Duduk_${guests.length}_Tamu.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleUploadCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        setPasteText(text);
        setErrorMsg(null);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleApplyBatchToFiltered = () => {
    const val = batchFillValue.trim();
    if (!val || filteredTableGuests.length === 0) return;

    setDraftSeats((prev) => {
      const next = { ...prev };
      filteredTableGuests.forEach((g) => {
        next[g.id] = val;
      });
      return next;
    });
  };

  const handleSavePaste = async () => {
    if (pasteMatchedToUpdate.length === 0) return;
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Deduplicate by guestId (last row wins)
    const uniqueMap = new Map<string, string>();
    pasteMatchedToUpdate.forEach((item) => {
      if (item.matchedGuestId) {
        uniqueMap.set(item.matchedGuestId, item.newSeat);
      }
    });

    const updates = Array.from(uniqueMap.entries()).map(([id, seat]) => ({ id, seat }));
    const res = await bulkUpdateSeats(updates);
    setIsSaving(false);

    if (res.error) {
      setErrorMsg(res.error);
      return;
    }

    setSuccessMsg(`Berhasil memperbarui tempat duduk untuk ${res.updated} tamu ke database!`);
    setTimeout(() => {
      setPasteText('');
      setSuccessMsg(null);
      onClose();
    }, 1500);
  };

  const handleSaveTable = async () => {
    if (tablePendingUpdates.length === 0) return;
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await bulkUpdateSeats(tablePendingUpdates);
    setIsSaving(false);

    if (res.error) {
      setErrorMsg(res.error);
      return;
    }

    setSuccessMsg(`Berhasil menyimpan perubahan tempat duduk untuk ${res.updated} tamu!`);
    setTimeout(() => {
      setSuccessMsg(null);
      onClose();
    }, 1400);
  };

  const handleCopySql = () => {
    navigator.clipboard?.writeText(SQL_ADD_SEAT_COLUMN).then(() => {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    });
  };

  const isMissingColumnError =
    errorMsg &&
    (errorMsg.toLowerCase().includes('seat') ||
      errorMsg.toLowerCase().includes('column') ||
      errorMsg.toLowerCase().includes('schema cache'));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/70 flex items-center justify-center shrink-0">
              <Armchair className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                Bulk Edit Tempat Duduk
              </h3>
              <p className="text-xs text-slate-500">
                Terisi <strong className="text-slate-700">{filledCount}</strong> dari{' '}
                <strong className="text-slate-700">{guests.length}</strong> tamu · Cocok untuk update cepat ratusan tamu sekaligus
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl mt-4 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveMode('paste');
              setErrorMsg(null);
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              activeMode === 'paste'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Copas Excel / CSV (Tercepat)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('table');
              setErrorMsg(null);
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              activeMode === 'table'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Table2 className="w-4 h-4" />
            <span>Edit Cepat Tabel ({guests.length})</span>
            {tablePendingUpdates.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-indigo-600 text-white">
                {tablePendingUpdates.length}
              </span>
            )}
          </button>
        </div>

        {/* Body Content */}
        <div className="mt-4 flex-1 overflow-y-auto pr-1 space-y-4">
          {activeMode === 'paste' ? (
            <>
              {/* Helper / Template Banner */}
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-indigo-950 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Cara Tercepat Update 140+ Tamu dari Excel / Google Sheets:</span>
                  </p>
                  <p className="text-[11px] text-indigo-900/80 leading-relaxed">
                    Blok &amp; copy langsung 2 kolom (<strong>Nama Tamu</strong> &amp; <strong>Tempat Duduk</strong>) dari Excel/Sheets lalu paste di bawah. Sistem otomatis mencocokkan nama dengan database Anda!
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="px-3 py-2 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Template CSV</span>
                  </button>
                  <label className="cursor-pointer px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload CSV</span>
                    <input
                      type="file"
                      accept=".csv,text/csv,text/plain"
                      onChange={handleUploadCsv}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Paste Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Tempel Data (Nama Tamu [Tab] Tempat Duduk):
                  </label>
                  {pasteText && (
                    <button
                      type="button"
                      onClick={() => setPasteText('')}
                      className="text-[11px] font-semibold text-rose-600 hover:underline"
                    >
                      Bersihkan
                    </button>
                  )}
                </div>
                <textarea
                  rows={6}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={`Contoh (Copas langsung 2 kolom dari Excel / Sheets):\nDrs. Al. Haryono Yusup\tVIP Baris 1 - A1\nDr. Rahmawati Hanny Yustrianthe, S.E., M.Si., Ak., CA.\tVIP Baris 1 - A2\n\nAtau pakai pemisah | atau ; :\nNama Tamu | Meja 5`}
                  className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Live Match Preview */}
              {parsedPaste.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-900">
                      Pratinjau Pencocokan ({parsedPaste.length} baris terbaca)
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                        {pasteMatchedToUpdate.length} Siap Update
                      </span>
                      {pasteUnchangedCount > 0 && (
                        <span className="text-[11px] font-semibold text-slate-600 bg-slate-200 px-2.5 py-0.5 rounded-full">
                          {pasteUnchangedCount} Sudah Sama
                        </span>
                      )}
                      {pasteNotFoundCount > 0 && (
                        <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full">
                          {pasteNotFoundCount} Tidak Ditemukan
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0">
                        <tr>
                          <th className="py-2 px-3 w-8">#</th>
                          <th className="py-2 px-3">Nama Tamu</th>
                          <th className="py-2 px-3">Tempat Duduk Baru</th>
                          <th className="py-2 px-3 text-center w-32">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedPaste.map((item, idx) => (
                          <tr
                            key={idx}
                            className={
                              item.status === 'not_found'
                                ? 'bg-rose-50/50'
                                : item.status === 'unchanged'
                                ? 'bg-slate-50/60 opacity-75'
                                : 'bg-white'
                            }
                          >
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-900 break-words">
                              {item.matchedGuestName || item.inputName}
                            </td>
                            <td className="py-2 px-3">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 font-bold text-[11px]">
                                <Armchair className="w-3 h-3" />
                                <span>{item.newSeat || '(Kosongkan)'}</span>
                              </span>
                              {item.currentSeat && item.status === 'matched' && (
                                <span className="text-[10px] text-slate-400 ml-1.5 line-through">
                                  {item.currentSeat}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {item.status === 'matched' && (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                  Cocok &amp; Update
                                </span>
                              )}
                              {item.status === 'unchanged' && (
                                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                  Sama
                                </span>
                              )}
                              {item.status === 'not_found' && (
                                <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                                  Nama Tak Cocok
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
            </>
          ) : (
            /* TAB 2: INLINE SPREADSHEET-STYLE EDITOR */
            <>
              {/* Search + Filter */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-7 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    placeholder="Filter nama tamu, instansi, atau kursi..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-5">
                  <select
                    value={seatFilter}
                    onChange={(e) => setSeatFilter(e.target.value as 'all' | 'empty' | 'filled')}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium text-slate-700"
                  >
                    <option value="all">Semua Tamu ({guests.length})</option>
                    <option value="empty">Belum Ada Tempat Duduk ({guests.length - filledCount})</option>
                    <option value="filled">Sudah Ada Tempat Duduk ({filledCount})</option>
                  </select>
                </div>
              </div>

              {/* Batch Fill Bar for Filtered Rows */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 shrink-0">
                  <Wand2 className="w-4 h-4 text-amber-600" />
                  <span>Isi Massal:</span>
                </div>
                <input
                  type="text"
                  value={batchFillValue}
                  onChange={(e) => setBatchFillValue(e.target.value)}
                  placeholder="Contoh: VIP Baris 1 / Zona A / Meja Tamu"
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleApplyBatchToFiltered}
                  disabled={!batchFillValue.trim() || filteredTableGuests.length === 0}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-colors shrink-0"
                >
                  Terapkan ke {filteredTableGuests.length} Tamu Terfilter
                </button>
              </div>

              {/* Compact Editable Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0 z-10">
                      <tr>
                        <th className="py-2 px-3 w-10 text-center">#</th>
                        <th className="py-2 px-3">Nama Tamu &amp; Instansi</th>
                        <th className="py-2 px-3 w-48 sm:w-56">Tempat Duduk (Tekan Tab)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTableGuests.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-slate-400">
                            Tidak ada tamu yang cocok dengan filter.
                          </td>
                        </tr>
                      ) : (
                        filteredTableGuests.map((g, idx) => {
                          const original = (g.seat || '').trim();
                          const val = draftSeats[g.id] ?? original;
                          const isModified = val.trim() !== original;

                          return (
                            <tr
                              key={g.id}
                              className={isModified ? 'bg-indigo-50/50' : 'hover:bg-slate-50/70'}
                            >
                              <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-400">
                                {idx + 1}
                              </td>
                              <td className="py-2 px-3">
                                <p className="font-bold text-slate-900 leading-snug">{g.name}</p>
                                {g.organization && (
                                  <p className="text-[11px] text-slate-500">{g.organization}</p>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={val}
                                  onChange={(e) =>
                                    setDraftSeats((prev) => ({
                                      ...prev,
                                      [g.id]: e.target.value,
                                    }))
                                  }
                                  placeholder="Contoh: VIP A-01"
                                  className={`w-full px-2.5 py-1.5 text-xs rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors ${
                                    isModified
                                      ? 'bg-white border-indigo-400 font-bold text-indigo-950'
                                      : 'bg-slate-50 border-slate-200 text-slate-800'
                                  }`}
                                />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Error Banner (with Copyable SQL Helper if column missing in Supabase) */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Gagal menyimpan ke Supabase</p>
                  <p className="text-[11px] text-rose-700 mt-0.5">{errorMsg}</p>
                </div>
              </div>
              {isMissingColumnError && (
                <div className="bg-slate-900 text-slate-100 rounded-xl p-3 space-y-2">
                  <p className="text-[11px] text-amber-300 font-semibold">
                    Kolom &quot;seat&quot; belum ada di tabel Supabase Anda. Jalankan 1 baris SQL ini di Supabase SQL Editor lalu coba simpan lagi:
                  </p>
                  <div className="flex items-center justify-between gap-2 bg-slate-950 px-3 py-2 rounded-lg font-mono text-[11px] text-emerald-300 overflow-x-auto">
                    <code className="whitespace-nowrap">{SQL_ADD_SEAT_COLUMN}</code>
                    <button
                      type="button"
                      onClick={handleCopySql}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-sans font-semibold flex items-center gap-1 shrink-0"
                    >
                      {copiedSql ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSql ? 'Disalin' : 'Salin SQL'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Success Banner */}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            {activeMode === 'paste'
              ? `${pasteMatchedToUpdate.length} tamu siap diperbarui tempat duduknya`
              : `${tablePendingUpdates.length} perubahan belum disimpan`}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Batal
            </button>
            {activeMode === 'paste' ? (
              <button
                type="button"
                onClick={handleSavePaste}
                disabled={pasteMatchedToUpdate.length === 0 || isSaving}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm transition-all"
              >
                {isSaving
                  ? 'Menyimpan...'
                  : `Simpan ${pasteMatchedToUpdate.length} Tempat Duduk`}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSaveTable}
                disabled={tablePendingUpdates.length === 0 || isSaving}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm transition-all"
              >
                {isSaving
                  ? 'Menyimpan...'
                  : `Simpan ${tablePendingUpdates.length} Perubahan`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
