/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  Printer, 
  FileSpreadsheet, 
  FileCode, 
  Check, 
  QrCode, 
  Sparkles,
  Layers,
  GraduationCap
} from 'lucide-react';
import { Guest, EventDetails } from '../types';
import { generateQRCodeDataURL } from '../lib/qrUtils';

interface DownloadGuestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  guests: Guest[];
  event: EventDetails;
}

export const DownloadGuestsModal: React.FC<DownloadGuestsModalProps> = ({
  isOpen,
  onClose,
  guests,
  event,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'checked_in'>('all');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  const filteredGuests = guests.filter((g) => {
    if (filter === 'checked_in') return g.status === 'checked_in';
    if (filter === 'pending') return g.status === 'pending';
    return true;
  });

  // Generate QR Code data URLs when modal opens or guest filter changes
  useEffect(() => {
    if (!isOpen || filteredGuests.length === 0) return;

    let isMounted = true;
    const generateQRs = async () => {
      setIsGenerating(true);
      setGenerationProgress(0);
      const newMap: Record<string, string> = {};

      for (let i = 0; i < filteredGuests.length; i++) {
        if (!isMounted) return;
        const guest = filteredGuests[i];
        if (!qrMap[guest.id]) {
          const url = await generateQRCodeDataURL(guest.name, 250);
          newMap[guest.id] = url;
        } else {
          newMap[guest.id] = qrMap[guest.id];
        }
        setGenerationProgress(Math.round(((i + 1) / filteredGuests.length) * 100));
      }

      if (isMounted) {
        setQrMap((prev) => ({ ...prev, ...newMap }));
        setIsGenerating(false);
      }
    };

    generateQRs();

    return () => {
      isMounted = false;
    };
  }, [isOpen, filter, filteredGuests.length]);

  if (!isOpen) return null;

  // 1. Export Excel / CSV Two-Row Format (Row 1: Nama & Gelar, Row 2: QR Code)
  const handleExportTwoRowCSV = () => {
    const BOM = '\uFEFF';
    const lines: string[] = [
      `"DAFTAR UNDANGAN & QR CODE - ${event.title.toUpperCase()}"`,
      `"Tanggal: ${event.date} | Lokasi: ${event.location}"`,
      `"Format: Baris 1 = Nama Beserta Gelar, Baris 2 = Data QR Code"`,
      '',
    ];

    filteredGuests.forEach((g, idx) => {
      const escape = (str: string) => `"${str.replace(/"/g, '""')}"`;
      lines.push(`${idx + 1}. NAMA LENGKAP & GELAR:`);
      lines.push(escape(g.name));
      lines.push('QR CODE DATA:');
      lines.push(escape(g.name));
      if (g.organization) {
        lines.push(`INSTANSI: ${escape(g.organization)}`);
      }
      lines.push(`PAX: ${g.pax} Orang`);
      lines.push('----------------------------------------');
    });

    const csvContent = BOM + lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `Undangan_2Baris_${event.title.replace(/[^a-zA-Z0-9]/g, '_')}_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 2. Export Standard Table CSV
  const handleExportTableCSV = () => {
    const BOM = '\uFEFF';
    const headers = ['No', 'Nama Lengkap Beserta Gelar', 'Data QR Code', 'Instansi / Perusahaan', 'Undangan (Pax)', 'Status'];
    const escape = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`;

    const rows = filteredGuests.map((g, idx) => [
      escape(idx + 1),
      escape(g.name),
      escape(g.name),
      escape(g.organization || '-'),
      escape(g.pax),
      escape(g.status === 'checked_in' ? 'Hadir' : 'Belum Hadir'),
    ].join(','));

    const csvContent = BOM + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `Daftar_Tamu_QR_${event.title.replace(/[^a-zA-Z0-9]/g, '_')}_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 3. Trigger Print / Save as PDF Dialog
  const handlePrintTickets = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const cardsHtml = filteredGuests.map((g, idx) => `
      <div class="ticket-card">
        <div class="row-num">#${idx + 1}</div>
        <div class="row-1-name">${escapeHtml(g.name)}</div>
        <div class="row-2-qr">
          <img src="${qrMap[g.id] || ''}" alt="QR Code" width="160" height="160" />
        </div>
        <div class="row-meta">
          ${g.organization ? `<span class="instansi">${escapeHtml(g.organization)}</span> • ` : ''}
          <span class="pax">${g.pax} Pax</span>
        </div>
        <div class="event-footer">${escapeHtml(event.title)}</div>
      </div>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tiket Undangan & QR Code - ${escapeHtml(event.title)}</title>
        <meta charset="utf-8" />
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            margin: 0;
            padding: 0;
            color: #0f172a;
          }
          .header-print {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 2px solid #e2e8f0;
          }
          .header-print h1 { margin: 0; font-size: 20px; font-weight: 800; color: #1e1b4b; }
          .header-print p { margin: 4px 0 0; font-size: 12px; color: #64748b; }
          .ticket-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }
          .ticket-card {
            border: 2px dashed #cbd5e1;
            border-radius: 14px;
            padding: 16px;
            text-align: center;
            background: #ffffff;
            page-break-inside: avoid;
            position: relative;
          }
          .row-num {
            position: absolute;
            top: 8px;
            left: 10px;
            font-size: 10px;
            font-weight: bold;
            color: #94a3b8;
          }
          .row-1-name {
            font-size: 15px;
            font-weight: 800;
            color: #0f172a;
            margin-top: 6px;
            margin-bottom: 10px;
            line-height: 1.3;
          }
          .row-2-qr {
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 8px 0;
          }
          .row-2-qr img {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 4px;
            background: #fff;
          }
          .row-meta {
            font-size: 11px;
            color: #475569;
            font-weight: 600;
            margin-top: 6px;
          }
          .event-footer {
            font-size: 9px;
            color: #94a3b8;
            margin-top: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          @media print {
            .no-print { display: none !important; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header-print">
          <h1>${escapeHtml(event.title)}</h1>
          <p>📍 ${escapeHtml(event.location)} &bull; 📅 ${event.date} &bull; Total ${filteredGuests.length} Undangan</p>
        </div>
        <div class="ticket-grid">
          ${cardsHtml}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // 4. Download Standalone Offline HTML File
  const handleDownloadStandaloneHTML = () => {
    const cardsHtml = filteredGuests.map((g, idx) => `
      <div class="ticket-card">
        <div class="row-num">#${idx + 1}</div>
        <div class="row-1-name">${escapeHtml(g.name)}</div>
        <div class="row-2-qr">
          <img src="${qrMap[g.id] || ''}" alt="QR Code" width="160" height="160" />
        </div>
        <div class="row-meta">
          ${g.organization ? `<span class="instansi">${escapeHtml(g.organization)}</span> • ` : ''}
          <span class="pax">${g.pax} Pax</span>
        </div>
        <div class="event-footer">${escapeHtml(event.title)}</div>
      </div>
    `).join('');

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Tiket Undangan & QR Code - ${escapeHtml(event.title)}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0; padding: 24px; color: #0f172a; background: #f8fafc;
    }
    .container { max-width: 900px; margin: 0 auto; }
    .header-bar {
      background: #1e1b4b; color: white; padding: 20px 24px; border-radius: 16px;
      margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;
    }
    .header-bar h1 { margin: 0; font-size: 18px; }
    .header-bar p { margin: 4px 0 0; font-size: 12px; color: #cbd5e1; }
    .btn-print {
      background: #4f46e5; color: white; border: none; padding: 10px 18px;
      border-radius: 10px; font-weight: bold; cursor: pointer; font-size: 13px;
    }
    .btn-print:hover { background: #4338ca; }
    .ticket-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px;
    }
    .ticket-card {
      border: 2px dashed #cbd5e1; border-radius: 16px; padding: 18px;
      text-align: center; background: #ffffff; position: relative; box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .row-num { position: absolute; top: 10px; left: 12px; font-size: 11px; font-weight: bold; color: #94a3b8; }
    .row-1-name { font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 10px; margin-bottom: 12px; line-height: 1.3; }
    .row-2-qr { display: flex; justify-content: center; align-items: center; margin: 10px 0; }
    .row-2-qr img { border: 1px solid #e2e8f0; border-radius: 10px; padding: 6px; background: #fff; }
    .row-meta { font-size: 12px; color: #475569; font-weight: 600; margin-top: 8px; }
    .event-footer { font-size: 10px; color: #94a3b8; margin-top: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    @media print {
      body { padding: 0; background: #fff; }
      .header-bar { display: none; }
      .ticket-grid { grid-template-columns: repeat(2, 1fr); gap: 14px; }
      .ticket-card { box-shadow: none; page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-bar">
      <div>
        <h1>${escapeHtml(event.title)}</h1>
        <p>📍 ${escapeHtml(event.location)} &bull; 📅 ${event.date} &bull; Total ${filteredGuests.length} Undangan</p>
      </div>
      <button class="btn-print" onclick="window.print()">Cetak / Simpan PDF</button>
    </div>
    <div class="ticket-grid">
      ${cardsHtml}
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `Tiket_Undangan_${event.title.replace(/[^a-zA-Z0-9]/g, '_')}_${dateStr}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-7 shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Download Undangan & QR Code
              </h3>
              <p className="text-xs text-slate-500">
                Format: <strong>Row 1</strong> (Nama Lengkap & Gelar), <strong>Row 2</strong> (QR Code Presensi)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter and layout controls */}
        <div className="py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">Filter Tamu:</span>
            <div className="flex rounded-xl bg-slate-100 p-0.5 text-xs font-medium">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filter === 'all' ? 'bg-white shadow-sm text-indigo-600 font-bold' : 'text-slate-600'
                }`}
              >
                Semua ({guests.length})
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filter === 'pending' ? 'bg-white shadow-sm text-indigo-600 font-bold' : 'text-slate-600'
                }`}
              >
                Belum Hadir ({guests.filter((g) => g.status === 'pending').length})
              </button>
              <button
                onClick={() => setFilter('checked_in')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filter === 'checked_in' ? 'bg-white shadow-sm text-indigo-600 font-bold' : 'text-slate-600'
                }`}
              >
                Sudah Hadir ({guests.filter((g) => g.status === 'checked_in').length})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">Tampilan Pratinjau:</span>
            <div className="flex rounded-xl bg-slate-100 p-0.5 text-xs font-medium">
              <button
                onClick={() => setLayoutMode('grid')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  layoutMode === 'grid' ? 'bg-white shadow-sm text-indigo-600 font-bold' : 'text-slate-600'
                }`}
              >
                Kartu Grid
              </button>
              <button
                onClick={() => setLayoutMode('list')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  layoutMode === 'list' ? 'bg-white shadow-sm text-indigo-600 font-bold' : 'text-slate-600'
                }`}
              >
                Daftar Baris
              </button>
            </div>
          </div>
        </div>

        {/* Generation progress if loading */}
        {isGenerating && (
          <div className="py-2 px-3 bg-indigo-50 border border-indigo-100 rounded-xl my-2 text-xs text-indigo-700 flex items-center justify-between shrink-0">
            <span className="flex items-center gap-2 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
              Menyiapkan gambar QR Code beresolusi tinggi...
            </span>
            <span className="font-bold">{generationProgress}%</span>
          </div>
        )}

        {/* Scrollable Live Preview */}
        <div className="flex-1 overflow-y-auto py-4 min-h-[220px]">
          {filteredGuests.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Tidak ada tamu yang sesuai dengan filter.
            </div>
          ) : layoutMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredGuests.map((guest, idx) => (
                <div
                  key={guest.id}
                  className="bg-slate-50/80 hover:bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center relative transition-all shadow-sm"
                >
                  <span className="absolute top-2.5 left-3 text-[10px] font-bold text-slate-400">
                    #{idx + 1}
                  </span>

                  {/* Row 1: Nama Beserta Gelar */}
                  <div className="pt-2 pb-1 border-b border-slate-200/60 mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-500 block mb-0.5">
                      Row 1: Nama Undangan
                    </span>
                    <p className="text-sm font-extrabold text-slate-900 break-words leading-tight">
                      {guest.name}
                    </p>
                  </div>

                  {/* Row 2: QR Code */}
                  <div className="py-2 flex flex-col items-center justify-center">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 block mb-1">
                      Row 2: QR Code
                    </span>
                    {qrMap[guest.id] ? (
                      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                        <img
                          src={qrMap[guest.id]}
                          alt={`QR ${guest.name}`}
                          className="w-28 h-28 object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-28 h-28 rounded-xl bg-slate-200 animate-pulse flex items-center justify-center text-slate-400 text-xs">
                        Memuat QR...
                      </div>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="text-[11px] text-slate-500 mt-1">
                    {guest.organization && (
                      <span className="font-medium text-slate-700 block truncate">
                        {guest.organization}
                      </span>
                    )}
                    <span>Kapasitas: {guest.pax} Orang</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredGuests.map((guest, idx) => (
                <div
                  key={guest.id}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400 w-6">#{idx + 1}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                          Row 1
                        </span>
                        <h4 className="text-sm font-extrabold text-slate-900">{guest.name}</h4>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {guest.organization ? `${guest.organization} • ` : ''}{guest.pax} Pax
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded block mb-1">
                        Row 2: QR
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">Siap Scan</span>
                    </div>
                    {qrMap[guest.id] ? (
                      <img
                        src={qrMap[guest.id]}
                        alt={`QR ${guest.name}`}
                        className="w-14 h-14 bg-white p-1 rounded-lg border border-slate-200"
                      />
                    ) : (
                      <div className="w-14 h-14 bg-slate-200 rounded-lg animate-pulse" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Action Buttons */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            Total <strong>{filteredGuests.length}</strong> tiket undangan siap didownload
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 1. PDF / Print */}
            <button
              onClick={handlePrintTickets}
              disabled={filteredGuests.length === 0}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>

            {/* 2. Standalone HTML */}
            <button
              onClick={handleDownloadStandaloneHTML}
              disabled={filteredGuests.length === 0}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="Download file HTML offline yang bisa dibuka dan dicetak di laptop/HP kapan saja"
            >
              <FileCode className="w-4 h-4 text-indigo-600" />
              <span>File HTML (Offline)</span>
            </button>

            {/* 3. Excel 2-Row Format */}
            <button
              onClick={handleExportTwoRowCSV}
              disabled={filteredGuests.length === 0}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="Download Excel / CSV format 2 baris (Row 1 Nama, Row 2 QR Code)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Excel (Row 1 Nama, Row 2 QR)</span>
            </button>

            {/* 4. Excel Table */}
            <button
              onClick={handleExportTableCSV}
              disabled={filteredGuests.length === 0}
              className="px-3 py-2 text-slate-500 hover:text-slate-700 text-xs font-medium"
              title="Download Excel format tabel kolom standar"
            >
              Excel Tabel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
