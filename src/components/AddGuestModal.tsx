import React, { useState } from 'react';
import { X, UserPlus, AlertCircle } from 'lucide-react';
import { useAttendance } from '../context/AttendanceContext';

interface AddGuestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddGuestModal: React.FC<AddGuestModalProps> = ({ isOpen, onClose }) => {
  const { addGuest, guests } = useAttendance();

  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [paxInput, setPaxInput] = useState('1');

  if (!isOpen) return null;

  const trimmedName = name.trim();
  const duplicateGuest = trimmedName.length > 0
    ? guests.find((g) => g.name.trim().toLowerCase() === trimmedName.toLowerCase())
    : null;
  const isDuplicate = !!duplicateGuest;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmedName || isDuplicate) return;

    const parsedPax = parseInt(paxInput, 10);
    const finalPax = isNaN(parsedPax) || parsedPax < 1 ? 1 : parsedPax;

    addGuest({
      name: trimmedName,
      organization: organization.trim(),
      pax: finalPax,
    });

    // Reset and close
    setName('');
    setOrganization('');
    setPaxInput('1');
    onClose();
  };

  const handlePaxChange = (val: string) => {
    // Allow empty string so user can freely delete and retype
    setPaxInput(val);
  };

  const handlePaxBlur = () => {
    const parsed = parseInt(paxInput, 10);
    if (isNaN(parsed) || parsed < 1) {
      setPaxInput('1');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Tambah Tamu Undangan
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            aria-label="Tutup form"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Nama Lengkap Tamu * <span className="text-rose-500 font-semibold">(Wajib, boleh sertakan gelar)</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Tukiman, S.Pd., M.T."
              className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-xl focus:ring-2 focus:outline-none transition-all ${
                isDuplicate 
                  ? 'border-amber-400 focus:ring-amber-400 bg-amber-50/30' 
                  : 'border-slate-300 focus:ring-indigo-500'
              }`}
            />
          </div>

          {/* DUPLICATE WARNING BANNER */}
          {isDuplicate && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Nama Tamu Sudah Terdaftar!</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Tamu <strong>"{duplicateGuest?.name}"</strong> sudah ada di database ({duplicateGuest?.organization || 'tanpa instansi'}).
                  Harap ubah nama atau tambahkan pembeda agar data tidak terduplikasi.
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Instansi / Perusahaan <span className="text-slate-400 font-normal">(Opsional)</span>
            </label>
            <input
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
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
              value={paxInput}
              onChange={(e) => handlePaxChange(e.target.value)}
              onBlur={handlePaxBlur}
              placeholder="1"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isDuplicate || !trimmedName}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm transition-all"
            >
              Tambahkan Tamu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
