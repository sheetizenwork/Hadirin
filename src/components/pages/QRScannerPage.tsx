import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Camera, 
  CameraOff, 
  RefreshCw, 
  Flashlight, 
  X, 
  Volume2, 
  VolumeX, 
  Search, 
  Check, 
  UserCheck, 
  Building2, 
  Clock, 
  Users,
  Sparkles
} from 'lucide-react';
import { useAttendance } from '../../context/AttendanceContext';
import { Guest } from '../../types';
import { CheckInSuccessModal } from '../CheckInSuccessModal';

export const QRScannerPage: React.FC = () => {
  const { guests, checkInGuest, updateActualPax } = useAttendance();

  // Camera stream refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const isScanningLoopActiveRef = useRef<boolean>(false);
  const isModalOpenRef = useRef<boolean>(false);
  const lastScannedRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  // Scanner States
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Suggested Name Search State
  const [nameInput, setNameInput] = useState<string>('');
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Scan Result Modal State (PERSISTENT until operator clicks continue)
  const [scannedResult, setScannedResult] = useState<{
    guest: Guest;
    isAlreadyChecked: boolean;
  } | null>(null);

  // Scanner Feed Search filter
  const [feedSearch, setFeedSearch] = useState<string>('');

  // Continuous Barcode / QR detection loop
  const startContinuousDetection = useCallback(() => {
    const BarcodeDetectorClass = (window as unknown as { 
      BarcodeDetector?: new (options: { formats: string[] }) => { 
        detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>> 
      } 
    }).BarcodeDetector;

    if (!BarcodeDetectorClass) {
      // BarcodeDetector not available in this browser environment
      return;
    }

    try {
      const detector = new BarcodeDetectorClass({ formats: ['qr_code'] });
      isScanningLoopActiveRef.current = true;

      const scanFrame = async () => {
        if (!isScanningLoopActiveRef.current) return;

        // Only detect if video is playing and modal is NOT open
        if (
          !isModalOpenRef.current &&
          videoRef.current &&
          videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA
        ) {
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0 && barcodes[0].rawValue) {
              const raw = barcodes[0].rawValue.trim();
              const now = Date.now();

              // Prevent repeated duplicate firing of the same code within 3 seconds
              if (raw !== lastScannedRef.current.code || (now - lastScannedRef.current.time > 3000)) {
                lastScannedRef.current = { code: raw, time: now };
                isModalOpenRef.current = true; // Pause detections while modal is open
                handleVerifyGuest(raw);
              }
            }
          } catch {
            // Frame dropped or busy, proceed to next frame
          }
        }

        // Keep loop running indefinitely in background
        if (isScanningLoopActiveRef.current) {
          animationFrameId.current = requestAnimationFrame(scanFrame);
        }
      };

      animationFrameId.current = requestAnimationFrame(scanFrame);
    } catch {
      // Detector initialization failed
    }
  }, []);

  // Start Camera
  const startCamera = async (facing: 'environment' | 'user' = facingMode) => {
    try {
      setCameraError(null);
      stopCamera(false); // Stop tracks without unmounting UI

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Kamera tidak didukung pada browser ini.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        startContinuousDetection();
      }

      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities ? (track.getCapabilities() as unknown as { torch?: boolean }) : {};
      if (capabilities.torch) {
        setHasTorch(true);
      }
    } catch {
      setCameraActive(false);
      setCameraError('Izin kamera belum aktif. Anda dapat menggunakan pencarian nama tamu di bawah.');
    }
  };

  // Stop Camera (Manual or Unmount)
  const stopCamera = (resetUI = true) => {
    isScanningLoopActiveRef.current = false;
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (resetUI) {
      setCameraActive(false);
      setIsTorchOn(false);
    }
  };

  const toggleCameraFacing = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      const newTorch = !isTorchOn;
      await (track as unknown as { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
        advanced: [{ torch: newTorch }],
      });
      setIsTorchOn(newTorch);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera(true);
    };
  }, []);

  // Central Verification Handler
  const handleVerifyGuest = (query: string, customPax?: number) => {
    if (!query) return;

    const res = checkInGuest(query, customPax);

    if (res.guest) {
      isModalOpenRef.current = true;
      setScannedResult({
        guest: res.guest,
        isAlreadyChecked: !!res.isAlreadyChecked,
      });
      setNameInput('');
      setIsInputFocused(false);
    } else {
      isModalOpenRef.current = false;
      setSearchError(res.message);
      setTimeout(() => setSearchError(null), 3000);
    }
  };

  // Close modal and AUTOMATICALLY RESUME SCANNING immediately without touching camera!
  const handleCloseModal = () => {
    setScannedResult(null);
    // Unpause scanning loop immediately after 300ms buffer
    setTimeout(() => {
      isModalOpenRef.current = false;
      lastScannedRef.current = { code: '', time: 0 };
    }, 300);
  };

  // Autocomplete / Suggested Names Matching
  const cleanInput = nameInput.trim().toLowerCase();
  const suggestedGuests = cleanInput.length > 0
    ? guests.filter((g) => g.name.toLowerCase().includes(cleanInput))
    : [];

  // Attended guests for the activity feed below
  const attendedGuests = guests
    .filter((g) => g.status === 'checked_in')
    .sort(
      (a, b) =>
        new Date(b.checked_in_at || '').getTime() -
        new Date(a.checked_in_at || '').getTime()
    );

  const cleanFeedSearch = feedSearch.trim().toLowerCase();
  const displayedFeedGuests = attendedGuests.filter((g) => {
    if (!cleanFeedSearch) return true;
    return (
      g.name.toLowerCase().includes(cleanFeedSearch) ||
      (g.organization && g.organization.toLowerCase().includes(cleanFeedSearch))
    );
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24 lg:pb-12">
      {/* 1. Header Bar */}
      <div className="bg-slate-900 rounded-3xl p-5 sm:p-6 text-white border border-slate-800 shadow-xl flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-lg font-bold text-white">Scan & Verifikasi Tamu</h2>
          </div>
          <p className="text-xs text-slate-300 mt-0.5">
            Kamera otomatis siap mendeteksi tamu berikutnya setelah selesai
          </p>
        </div>

        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors"
          title={soundEnabled ? 'Matikan Suara Chime' : 'Aktifkan Suara Chime'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
        </button>
      </div>

      {/* 2. SUGGESTED NAME SEARCH BAR */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm relative">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
          Ketik Nama Tamu Undangan
        </label>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={nameInput}
            onFocus={() => setIsInputFocused(true)}
            onChange={(e) => {
              setNameInput(e.target.value);
              setIsInputFocused(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && suggestedGuests.length > 0) {
                e.preventDefault();
                handleVerifyGuest(suggestedGuests[0].name);
              }
            }}
            placeholder="Contoh: Ketik 'A' untuk Agustinus Lanang, Andreas Pok..."
            className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          {nameInput && (
            <button
              onClick={() => {
                setNameInput('');
                setIsInputFocused(false);
              }}
              className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Live Suggested Dropdown List */}
        {isInputFocused && cleanInput.length > 0 && (
          <div className="mt-2 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto z-30">
            {suggestedGuests.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                Tidak ada nama tamu yang cocok dengan &quot;{nameInput}&quot;
              </div>
            ) : (
              suggestedGuests.map((g) => {
                const isChecked = g.status === 'checked_in';
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => handleVerifyGuest(g.name)}
                    className="w-full p-3.5 text-left hover:bg-indigo-50/80 transition-colors flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 break-words whitespace-normal leading-snug">
                        {g.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 break-words">
                        {g.organization || 'Tamu Undangan'} · {g.pax} Pax
                      </p>
                    </div>

                    <div className="shrink-0">
                      {isChecked ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Sudah Hadir (Scan Ulang)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-white bg-indigo-600 group-hover:bg-indigo-700 px-3 py-1.5 rounded-xl shadow-sm">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Presensi</span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

        {searchError && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <span>{searchError}</span>
          </div>
        )}
      </div>

      {/* 3. Camera Viewfinder with Automatic Continuous Detection */}
      <div className="relative bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-800 aspect-square sm:aspect-video flex items-center justify-center max-h-[400px]">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            cameraActive ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950 text-white z-10">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mb-3">
              <CameraOff className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-white">Kamera Belum Aktif</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              {cameraError || 'Nyalakan kamera untuk memindai QR fisik tamu secara otomatis.'}
            </p>
            <button
              onClick={() => startCamera()}
              className="mt-4 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md transition-all active:scale-95"
            >
              <Camera className="w-4 h-4" />
              <span>Nyalakan Kamera</span>
            </button>
          </div>
        )}

        {cameraActive && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            <div className="relative w-60 h-60 sm:w-68 sm:h-68">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl shadow-sm" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl shadow-sm" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl shadow-sm" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-xl shadow-sm" />
              <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_12px_#6366f1] animate-[pulse_1.5s_ease-in-out_infinite] top-1/2 -translate-y-1/2" />
            </div>
            <p className="mt-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-medium tracking-wide">
              Arahkan kamera ke QR Code tamu
            </p>
          </div>
        )}

        {/* Camera Controls - KEEP BUTTON TO TURN OFF / ON */}
        {cameraActive && (
          <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
            {hasTorch && (
              <button
                onClick={toggleTorch}
                className={`p-2.5 rounded-full backdrop-blur-md transition-colors ${
                  isTorchOn ? 'bg-amber-500 text-white' : 'bg-black/50 text-white hover:bg-black/70'
                }`}
                title="Senter"
              >
                <Flashlight className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={toggleCameraFacing}
              className="p-2.5 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition-colors"
              title="Ganti Kamera"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => stopCamera(true)}
              className="p-2.5 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition-colors"
              title="Matikan Kamera"
            >
              <CameraOff className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 4. AKTIVITAS PRESENSI TERKINI DI BAWAH KAMERA */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Aktivitas Presensi Terkini
            </h3>
            <p className="text-xs text-slate-500">
              Pantau langsung kedatangan tamu yang baru saja presensi
            </p>
          </div>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg self-start sm:self-center">
            {attendedGuests.length} Tamu Sudah Hadir
          </span>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={feedSearch}
            onChange={(e) => setFeedSearch(e.target.value)}
            placeholder="Cari dalam daftar tamu yang sudah hadir..."
            className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          {feedSearch && (
            <button
              onClick={() => setFeedSearch('')}
              className="absolute right-3 top-2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {displayedFeedGuests.length === 0 ? (
          <div className="py-8 text-center px-4 border border-dashed border-slate-200 rounded-2xl">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">
              {feedSearch ? 'Tidak ada nama yang cocok' : 'Belum ada tamu yang check-in.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
            {displayedFeedGuests.map((guest) => (
              <div
                key={guest.id}
                className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 sm:mt-0">
                    {guest.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 break-words whitespace-normal leading-snug">
                      Ibu/Bapak {guest.name}
                    </p>
                    {guest.organization && (
                      <p className="text-[11px] text-slate-500 break-words mt-0.5 flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{guest.organization}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2.5 text-xs shrink-0 pl-10.5 sm:pl-0">
                  <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md text-[11px]">
                    {guest.actual_pax || guest.pax} Orang Hadir
                  </span>

                  {guest.checked_in_at && (
                    <div className="text-right">
                      <span className="font-mono font-medium text-slate-700 text-[11px] flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3 text-indigo-600" />
                        {new Date(guest.checked_in_at).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {guest.check_in_history && guest.check_in_history.length > 1 && (
                        <span className="text-[10px] text-indigo-600 font-medium block">
                          Update ke-{guest.check_in_history.length}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. POPUP: PRESENSI "Selamat datang Ibu/Bapak [Nama]" (Auto-resumes camera upon close) */}
      {scannedResult && (
        <CheckInSuccessModal
          guest={scannedResult.guest}
          isAlreadyChecked={scannedResult.isAlreadyChecked}
          onClose={handleCloseModal}
          onUpdatePax={updateActualPax}
        />
      )}
    </div>
  );
};
