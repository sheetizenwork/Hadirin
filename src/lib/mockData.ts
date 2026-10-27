import { Guest, EventDetails, UserProfile } from '../types';

export const INITIAL_EVENT: EventDetails = {
  id: 'evt-main',
  title: 'Acara Presensi Undangan',
  organizer: 'Panitia Acara',
  date: new Date().toISOString().split('T')[0],
  time_start: '09:00',
  time_end: '17:00',
  location: 'Gedung Pertemuan / Ballroom Utama',
  description: 'Sistem presensi tamu dan undangan terintegrasi database Supabase.',
  banner_color: 'from-slate-900 to-indigo-950',
};

export const INITIAL_USER: UserProfile = {
  id: 'usr-panitia',
  name: 'Panitia Acara',
  email: 'panitia@acara.id',
  avatar: 'PA',
};

// No dummy guests - All guest data is fetched directly from live Supabase database!
export const INITIAL_GUESTS: Guest[] = [];
