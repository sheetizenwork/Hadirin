import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  Minus, 
  Plus, 
  Clock,
  History
} from 'lucide-react';
import { Guest } from '../types';

interface CheckInSuccessModalProps {
  guest: Guest;
  isAlreadyChecked?: boolean;
  onClose: () => void;
  onUpdatePax: (guestId: string, actualPax: number) => void;
}

export const CheckInSuccessModal: React.FC<CheckInSuccessModalProps> = ({
  guest,
  isAlreadyChecked = false,
  onClose,
  onUpdatePax,
}) => {
  const initialVal = guest.actual_pax || guest.pax || 1;
  const [paxInput, setPaxInput] = useState<string>(String(initialVal));

  useEffect(() => {
    const currentVal = guest.actual_pax || guest.pax || 1;
    setPaxInput(String(currentVal));
  }, [guest]);

  const handlePaxChange = (valStr: string) => {
    setPaxInput(valStr);
    const parsed = parseInt(valStr, 10);
    if (!isNaN(parsed) && parsed > 0) {
      onUpdatePax(guest.id, parsed);
    }
  };

  const handleBlur = () => {
    const parsed = parseInt(paxInput, 10);
    if (isNaN(parsed) || parsed < 1) {
      const fallback = guest.pax || 1;
      setPaxInput(String(fallback));
      onUpdatePax(guest.id, fallback);
    }
  };

  const incrementPax = () => {
    const current = parseInt(paxInput, 10) || 1;
    const next = current + 1;
    setPaxInput(String(next));
    onUpdatePax(guest.id, next);
  };

  const decrementPax = () => {
    const current = parseInt(paxInput, 10) || 1;
    if (current > 1) {
      const next = current - 1;
      setPaxInput(String(next));
      onUpdatePax(guest.id, next);
    }
  };

  // Check if there is check-in history
  const historyList = guest.check_in_history && guest.check_in_history.length > 0
    ? guest.check_in_history
    : (guest.checked_in_at ? [guest.checked_in_at] : []);
  
  const isReScan = isAlreadyChecked || historyList.length > 1;
  const latestTimeStr = guest.checked_in_at
    ? new Date(guest.checked_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl animate-in slide-in-from-bottom duration-200 text-center relative border border-slate-100 max-h-[95vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900"
          aria-label="Tutup popup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon Header (Formal, No Confetti) */}
        <div className={`w-16 h-16 rounded-3xl mx-auto flex items-center justify-center shadow-lg mb-3 ${
          isReScan
            ? 'bg-indigo-600 text-white shadow-indigo-600/20 ring-8 ring-indigo-50'
            : 'bg-emerald-600 text-white shadow-emerald-600/20 ring-8 ring-emerald-50'
        }`}>
          {isReScan ? (
            <CheckCircle2 className="w-9 h-9" />
          ) : (
            <CheckCircle2 className="w-9 h-9" />
          )}
        </div>

        {/* Status Badge */}
        <span className={`inline-block text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full mb-2 ${
          isReScan
            ? 'bg-indigo-100 text-indigo-900'
            : 'bg-emerald-100 text-emerald-800'
        }`}>
          {isReScan ? `Presensi Terupdate (Scan ke-${historyList.length})` : 'Selamat datang'}
        </span>

        {/* Guest Name formatted with "Ibu/Bapak [Nama]" */}
        <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight break-words px-2 leading-tight">
          Ibu/Bapak {guest.name}
        </h3>

        {/* Organization / Company */}
        {guest.organization && (
          <p className="text-sm font-medium text-slate-600 mt-1 flex items-center justify-center gap-1.5 break-words">
            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{guest.organization}</span>
          </p>
        )}

        {/* Editable Arrived Pax Section */}
        <div className="bg-slate-50 rounded-2xl p-4 my-5 border border-slate-200 text-left space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <p className="text-xs font-bold text-slate-800">Jumlah Orang yang Hadir</p>
              <p className="text-[11px] text-slate-500">
                Kapasitas undangan: <strong className="text-slate-700">{guest.pax} orang</strong>
              </p>
            </div>

            {/* Counter & Direct Input */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={decrementPax}
                disabled={(parseInt(paxInput, 10) || 1) <= 1}
                className="w-9 h-9 rounded-xl bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-40 shadow-sm transition-colors active:scale-95"
              >
                <Minus className="w-4 h-4" />
              </button>

              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={paxInput}
                onChange={(e) => handlePaxChange(e.target.value)}
                onBlur={handleBlur}
                className="w-14 h-9 text-center font-bold text-base bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />

              <button
                type="button"
                onClick={incrementPax}
                className="w-9 h-9 rounded-xl bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 shadow-sm transition-colors active:scale-95"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Waktu Presensi Terbaru */}
          <div className="flex items-center justify-between text-xs text-slate-700">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Waktu Presensi Terbaru:</span>
            </span>
            <span className="font-mono font-bold text-indigo-900 tabular-nums bg-indigo-50 px-2 py-0.5 rounded-md">
              {latestTimeStr} WIB
            </span>
          </div>

          {/* Riwayat Presensi Lama (Jika sudah pernah presensi sebelumnya) */}
          {historyList.length > 1 && (
            <div className="pt-2.5 border-t border-slate-200 text-[11px] text-slate-500 space-y-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-slate-600">
                  <History className="w-3 h-3 text-slate-400" />
                  <span>Presensi Pertama Kali:</span>
                </span>
                <span className="font-mono font-medium text-slate-700 tabular-nums">
                  {new Date(historyList[0]).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                </span>
              </div>
              <p className="text-[10px] text-slate-400 italic text-right">
                Riwayat awal tetap tersimpan ({historyList.length} kali scan tercatat)
              </p>
            </div>
          )}
        </div>

        {/* Continue Button */}
        <button
          onClick={onClose}
          className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-indigo-600/25 transition-all active:scale-98"
        >
          Lanjutkan Scan Tamu Berikutnya
        </button>
      </div>
    </div>
  );
};
