export type AttendanceStatus = 'checked_in' | 'pending';

export interface Guest {
  id: string;
  qr_code: string;
  name: string;
  organization: string; // opsional: instansi/perusahaan
  pax: number;          // berapa orang yang diundang (default 1)
  status: AttendanceStatus;
  checked_in_at: string | null;      // waktu presensi terbaru
  actual_pax: number;                // berapa orang yang datang aktual
  check_in_history?: string[];       // riwayat semua waktu presensi (presensi pertama, kedua, dst)
}

export interface EventDetails {
  id: string;
  title: string;
  organizer: string;
  date: string;
  time_start: string;
  time_end: string;
  location: string;
  description: string;
  banner_color?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface ScanLog {
  id: string;
  guest_id: string;
  guest_name: string;
  timestamp: string;
  type: 'success' | 'already_checked' | 'not_found';
  message: string;
}

export type ActiveTab = 'dashboard' | 'guests' | 'scanner' | 'reports' | 'event_settings';
