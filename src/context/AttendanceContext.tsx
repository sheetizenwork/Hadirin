import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Guest, EventDetails, UserProfile, ScanLog, ActiveTab } from '../types';
import { INITIAL_EVENT } from '../lib/mockData';
import { playSuccessChime, playErrorBuzz } from '../lib/audioFeedback';
import { supabase } from '../lib/supabase';

interface CheckInResult {
  success: boolean;
  guest?: Guest;
  message: string;
  isAlreadyChecked?: boolean;
}

interface AttendanceContextType {
  user: UserProfile | null;
  event: EventDetails;
  guests: Guest[];
  scanLogs: ScanLog[];
  activeTab: ActiveTab;
  isLoading: boolean;
  authError: string | null;
  isSupabaseConnected: boolean;
  setActiveTab: (tab: ActiveTab) => void;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password?: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshFromSupabase: () => Promise<void>;
  updateEvent: (updates: Partial<EventDetails>) => Promise<void>;
  addGuest: (guestData: {
    name: string;
    organization?: string;
    pax?: number;
  }) => Promise<Guest | null>;
  updateGuest: (id: string, updates: Partial<Guest>) => Promise<void>;
  updateActualPax: (id: string, actualPax: number) => Promise<void>;
  deleteGuest: (id: string) => Promise<void>;
  bulkAddGuests: (newGuests: Array<{
    name: string;
    organization?: string;
    pax?: number;
  }>) => Promise<number>;
  checkInGuest: (queryOrId: string, actualPax?: number) => CheckInResult;
  cancelCheckIn: (id: string) => Promise<void>;
  resetToDemoData: () => void;
  resetAllAttendance: () => Promise<void>;
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

export const AttendanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(true);

  // REAL DATA: starts clean and loads directly from Supabase
  const [event, setEvent] = useState<EventDetails>(INITIAL_EVENT);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([]);

  // Map Supabase DB row to Guest type
  const mapRowToGuest = (row: Record<string, unknown>): Guest => ({
    id: String(row.id),
    qr_code: String(row.id),
    name: String(row.name || ''),
    organization: String(row.organization || ''),
    pax: Number(row.pax) || 1,
    status: (row.status as 'checked_in' | 'pending') || 'pending',
    checked_in_at: row.checked_in_at ? String(row.checked_in_at) : null,
    actual_pax: Number(row.actual_pax) || 0,
    check_in_history: Array.isArray(row.check_in_history)
      ? (row.check_in_history as string[])
      : row.checked_in_at ? [String(row.checked_in_at)] : [],
  });

  // Fetch Event & Guests directly from Supabase table
  const refreshFromSupabase = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setIsLoading(true);

      // 1. Fetch Event from Supabase
      const { data: eventData, error: eventErr } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (eventErr) {
        console.warn('Events table notice:', eventErr.message);
      } else if (eventData) {
        setEvent({
          id: String(eventData.id),
          title: eventData.title || INITIAL_EVENT.title,
          organizer: eventData.organizer || INITIAL_EVENT.organizer,
          date: eventData.date || INITIAL_EVENT.date,
          time_start: eventData.time_start || INITIAL_EVENT.time_start,
          time_end: eventData.time_end || INITIAL_EVENT.time_end,
          location: eventData.location || INITIAL_EVENT.location,
          description: eventData.description || '',
          banner_color: eventData.banner_color || 'from-slate-900 to-indigo-950',
        });
      }

      // 2. Fetch Guests from Supabase (all real guests from table)
      const { data: guestRows, error: guestErr } = await supabase
        .from('guests')
        .select('*')
        .order('created_at', { ascending: false });

      if (guestErr) {
        console.warn('Guests table query notice:', guestErr.message);
      } else if (guestRows) {
        // Zero dummy data! If 0 rows in Supabase, guests is []
        setGuests(guestRows.map(mapRowToGuest));
        setIsSupabaseConnected(true);
      }
    } catch (err) {
      console.error('Error fetching Supabase data:', err);
    } finally {
      if (isInitial) setIsLoading(false);
    }
  }, []);

  // When switching tabs to Dashboard, Guests, or Reports, fetch fresh data immediately
  const handleSetActiveTab = useCallback((tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab === 'dashboard' || tab === 'guests' || tab === 'reports' || tab === 'scanner') {
      refreshFromSupabase();
    }
  }, [refreshFromSupabase]);

  // Window Focus & Cross-Device Heartbeat (Laptop & HP sync seamlessly without reload)
  useEffect(() => {
    const handleFocus = () => {
      refreshFromSupabase();
    };
    window.addEventListener('focus', handleFocus);

    // Heartbeat every 4 seconds to guarantee multi-device sync
    const interval = setInterval(() => {
      refreshFromSupabase();
    }, 4000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [refreshFromSupabase]);

  // Initialize Supabase Auth & load data immediately on mount
  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const u: UserProfile = {
            id: session.user.id,
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Pengelola',
            email: session.user.email || '',
            avatar: (session.user.user_metadata?.name || session.user.email || 'PA').slice(0, 2).toUpperCase(),
          };
          setUser(u);
        } else {
          setUser(null);
        }

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
          if (session?.user) {
            const u: UserProfile = {
              id: session.user.id,
              name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Pengelola',
              email: session.user.email || '',
              avatar: (session.user.user_metadata?.name || session.user.email || 'PA').slice(0, 2).toUpperCase(),
            };
            setUser(u);
          } else {
            setUser(null);
          }
        });

        subscription = authListener.subscription;
      } catch (err) {
        console.error('Auth getSession err:', err);
        setUser(null);
      } finally {
        refreshFromSupabase();
      }
    };

    init();

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [refreshFromSupabase]);

  // Real-time Supabase Subscription for Guests table
  useEffect(() => {
    const channel = supabase
      .channel('public:guests_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'guests' },
        () => {
          // Whenever any phone or dashboard updates guests in Supabase, re-sync live!
          supabase
            .from('guests')
            .select('*')
            .order('created_at', { ascending: false })
            .then(({ data }) => {
              if (data) setGuests(data.map(mapRowToGuest));
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auth Operations
  const login = async (email: string, password = ''): Promise<{ success: boolean; error?: string }> => {
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setAuthError(error.message);
        return { success: false, error: error.message };
      }

      if (data.user) {
        const u: UserProfile = {
          id: data.user.id,
          name: data.user.user_metadata?.name || email.split('@')[0],
          email: data.user.email || email,
          avatar: (data.user.user_metadata?.name || email).slice(0, 2).toUpperCase(),
        };
        setUser(u);
        await refreshFromSupabase();
        return { success: true };
      }
      return { success: false, error: 'Login gagal' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem';
      setAuthError(msg);
      return { success: false, error: msg };
    }
  };

  const signUp = async (email: string, password = '', name = ''): Promise<{ success: boolean; error?: string }> => {
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { name: name.trim() || email.split('@')[0] },
        },
      });

      if (error) {
        setAuthError(error.message);
        return { success: false, error: error.message };
      }

      if (data.user) {
        const u: UserProfile = {
          id: data.user.id,
          name: name.trim() || email.split('@')[0],
          email: data.user.email || email,
          avatar: (name || email).slice(0, 2).toUpperCase(),
        };
        setUser(u);
        await refreshFromSupabase();
        return { success: true };
      }
      return { success: false, error: 'Registrasi gagal' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem';
      setAuthError(msg);
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Sign out error:', e);
    }
    setUser(null);
  };

  // Event Details update in Supabase
  const updateEvent = async (updates: Partial<EventDetails>) => {
    setEvent((prev) => ({ ...prev, ...updates }));

    try {
      const { data: existing } = await supabase
        .from('events')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('events')
          .update({
            title: updates.title,
            organizer: updates.organizer,
            date: updates.date,
            time_start: updates.time_start,
            time_end: updates.time_end,
            location: updates.location,
            description: updates.description,
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('events').insert({
          title: updates.title || INITIAL_EVENT.title,
          organizer: updates.organizer || INITIAL_EVENT.organizer,
          date: updates.date || INITIAL_EVENT.date,
          time_start: updates.time_start || INITIAL_EVENT.time_start,
          time_end: updates.time_end || INITIAL_EVENT.time_end,
          location: updates.location || INITIAL_EVENT.location,
          description: updates.description || INITIAL_EVENT.description,
          user_id: user?.id && !user.id.startsWith('usr-') ? user.id : null,
        });
      }
    } catch (e) {
      console.warn('Update event error in Supabase:', e);
    }
  };

  // Add single guest to Supabase
  const addGuest = async (guestData: {
    name: string;
    organization?: string;
    pax?: number;
  }): Promise<Guest | null> => {
    const trimmedName = guestData.name.trim();
    if (!trimmedName) return null;

    // PREVENT DUPLICATES: Check if name already exists in guests (case-insensitive & trimmed)
    const existing = guests.find((g) => g.name.trim().toLowerCase() === trimmedName.toLowerCase());
    if (existing) {
      console.warn(`Tamu dengan nama "${trimmedName}" sudah terdaftar dalam daftar.`);
      return null;
    }

    const finalPax = guestData.pax && guestData.pax > 0 ? Number(guestData.pax) : 1;
    const tempId = `g-${Date.now()}`;

    // Optimistic UI update
    const newGuest: Guest = {
      id: tempId,
      qr_code: tempId,
      name: trimmedName,
      organization: guestData.organization?.trim() || '',
      pax: finalPax,
      status: 'pending',
      checked_in_at: null,
      actual_pax: 0,
      check_in_history: [],
    };

    setGuests((prev) => [newGuest, ...prev]);

    try {
      const insertPayload: Record<string, unknown> = {
        name: guestData.name.trim(),
        organization: guestData.organization?.trim() || '',
        pax: finalPax,
        status: 'pending',
        actual_pax: 0,
        check_in_history: [],
      };

      if (user?.id && !user.id.startsWith('usr-')) {
        insertPayload.user_id = user.id;
      }
      if (event.id && !event.id.startsWith('evt-')) {
        insertPayload.event_id = event.id;
      }

      const { data, error } = await supabase
        .from('guests')
        .insert(insertPayload)
        .select()
        .maybeSingle();

      if (error) {
        console.warn('Supabase insert guest notice:', error.message);
      } else if (data) {
        const savedGuest = mapRowToGuest(data);
        setGuests((prev) => prev.map((g) => (g.id === tempId ? savedGuest : g)));
        return savedGuest;
      }
    } catch (err) {
      console.error('Supabase guest insert exception:', err);
    }

    return newGuest;
  };

  // Update guest data in Supabase
  const updateGuest = async (id: string, updates: Partial<Guest>) => {
    setGuests((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...updates } : g))
    );

    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name.trim();
      if (updates.organization !== undefined) dbUpdates.organization = updates.organization?.trim() || '';
      if (updates.pax !== undefined) dbUpdates.pax = updates.pax;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.checked_in_at !== undefined) dbUpdates.checked_in_at = updates.checked_in_at;
      if (updates.actual_pax !== undefined) dbUpdates.actual_pax = updates.actual_pax;
      if (updates.check_in_history !== undefined) dbUpdates.check_in_history = updates.check_in_history;

      await supabase.from('guests').update(dbUpdates).eq('id', id);
    } catch (err) {
      console.warn('Supabase updateGuest error:', err);
    }
  };

  const updateActualPax = async (id: string, actualPax: number) => {
    setGuests((prev) =>
      prev.map((g) => (g.id === id ? { ...g, actual_pax: actualPax } : g))
    );
    try {
      await supabase.from('guests').update({ actual_pax: actualPax }).eq('id', id);
    } catch (err) {
      console.warn('Supabase updateActualPax error:', err);
    }
  };

  // Delete guest from Supabase
  const deleteGuest = async (id: string) => {
    setGuests((prev) => prev.filter((g) => g.id !== id));
    try {
      await supabase.from('guests').delete().eq('id', id);
    } catch (err) {
      console.warn('Supabase deleteGuest error:', err);
    }
  };

  // Bulk add guests directly to Supabase with duplicate filtering
  const bulkAddGuests = async (
    newGuests: Array<{
      name: string;
      organization?: string;
      pax?: number;
    }>
  ): Promise<number> => {
    if (!newGuests.length) return 0;
    const now = Date.now();

    // Deduplicate against existing guests in database AND within the batch
    const existingSet = new Set(guests.map((g) => g.name.trim().toLowerCase()));
    const seenBatch = new Set<string>();

    const validItems: Array<{ name: string; organization: string; pax: number }> = [];
    for (const item of newGuests) {
      const trimmed = item.name ? item.name.trim() : '';
      if (!trimmed) continue;
      const lower = trimmed.toLowerCase();
      if (!existingSet.has(lower) && !seenBatch.has(lower)) {
        seenBatch.add(lower);
        validItems.push({
          name: trimmed,
          organization: item.organization?.trim() || '',
          pax: item.pax && item.pax > 0 ? Number(item.pax) : 1,
        });
      }
    }

    if (validItems.length === 0) return 0;

    const localList: Guest[] = validItems.map((item, index) => {
      const id = `g-${now}-${index}`;
      return {
        id,
        qr_code: id,
        name: item.name,
        organization: item.organization,
        pax: item.pax,
        status: 'pending',
        checked_in_at: null,
        actual_pax: 0,
        check_in_history: [],
      };
    });

    setGuests((prev) => [...localList, ...prev]);

    try {
      const dbInserts = validItems.map((item) => {
        const row: Record<string, unknown> = {
          name: item.name.trim(),
          organization: item.organization?.trim() || '',
          pax: item.pax && item.pax > 0 ? Number(item.pax) : 1,
          status: 'pending',
          actual_pax: 0,
          check_in_history: [],
        };
        if (user?.id && !user.id.startsWith('usr-')) {
          row.user_id = user.id;
        }
        if (event.id && !event.id.startsWith('evt-')) {
          row.event_id = event.id;
        }
        return row;
      });

      const { data } = await supabase.from('guests').insert(dbInserts).select();
      if (data) {
        const mapped = data.map(mapRowToGuest);
        // Replace temp optimistic items with real Supabase rows
        setGuests((prev) => {
          const existing = prev.filter((g) => !g.id.startsWith(`g-${now}-`));
          return [...mapped, ...existing];
        });
      }
    } catch (e) {
      console.warn('Bulk add Supabase error:', e);
    }

    return validItems.length;
  };

  // Real-time check-in logic
  const checkInGuest = (
    queryOrId: string,
    actualPax?: number
  ): CheckInResult => {
    const cleanQuery = queryOrId.trim().toLowerCase();

    const target = guests.find(
      (g) =>
        g.id.toLowerCase() === cleanQuery ||
        g.qr_code.toLowerCase() === cleanQuery ||
        g.name.toLowerCase() === cleanQuery
    );

    if (!target) {
      playErrorBuzz();
      return {
        success: false,
        message: `Tamu "${queryOrId}" tidak ditemukan dalam daftar undangan.`,
      };
    }

    const nowTime = new Date().toISOString();
    const prevHistory = target.check_in_history && target.check_in_history.length > 0
      ? target.check_in_history
      : (target.checked_in_at ? [target.checked_in_at] : []);
    const updatedHistory = target.status === 'checked_in'
      ? [...prevHistory, nowTime]
      : [nowTime];

    const finalActualPax = actualPax !== undefined
      ? actualPax
      : (target.actual_pax || target.pax || 1);

    const isReScan = target.status === 'checked_in';

    playSuccessChime();

    const updatedGuest: Guest = {
      ...target,
      status: 'checked_in',
      checked_in_at: nowTime,
      check_in_history: updatedHistory,
      actual_pax: finalActualPax,
    };

    // Optimistic local state update
    setGuests((prev) =>
      prev.map((g) => (g.id === target.id ? updatedGuest : g))
    );

    const timeStr = new Date(nowTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const newLog: ScanLog = {
      id: `log-${Date.now()}`,
      guest_id: target.id,
      guest_name: target.name,
      timestamp: nowTime,
      type: isReScan ? 'already_checked' : 'success',
      message: isReScan
        ? `${target.name} presensi ulang ke-${updatedHistory.length} pada ${timeStr} WIB`
        : `${target.name} berhasil presensi (${finalActualPax} orang)`,
    };
    setScanLogs((prev) => [newLog, ...prev.slice(0, 49)]);

    // Sync to Supabase in background
    supabase
      .from('guests')
      .update({
        status: 'checked_in',
        checked_in_at: nowTime,
        check_in_history: updatedHistory,
        actual_pax: finalActualPax,
      })
      .eq('id', target.id)
      .then(({ error }) => {
        if (error) console.warn('Check-in Supabase sync warning:', error.message);
      });

    return {
      success: true,
      isAlreadyChecked: isReScan,
      guest: updatedGuest,
      message: isReScan
        ? `Presensi ${target.name} diperbarui ke waktu ${timeStr} WIB.`
        : `Selamat datang Ibu/Bapak ${target.name}!`,
    };
  };

  const cancelCheckIn = async (id: string) => {
    setGuests((prev) =>
      prev.map((g) =>
        g.id === id
          ? {
              ...g,
              status: 'pending',
              checked_in_at: null,
              actual_pax: 0,
              check_in_history: [],
            }
          : g
      )
    );

    try {
      await supabase
        .from('guests')
        .update({
          status: 'pending',
          checked_in_at: null,
          actual_pax: 0,
          check_in_history: [],
        })
        .eq('id', id);
    } catch (err) {
      console.warn('Supabase cancelCheckIn error:', err);
    }
  };

  // Reset all attendance statuses back to pending (without deleting real guests)
  const resetAllAttendance = async () => {
    setGuests((prev) =>
      prev.map((g) => ({
        ...g,
        status: 'pending',
        checked_in_at: null,
        actual_pax: 0,
        check_in_history: [],
      }))
    );
    setScanLogs([]);

    try {
      await supabase
        .from('guests')
        .update({
          status: 'pending',
          checked_in_at: null,
          actual_pax: 0,
          check_in_history: [],
        })
        .neq('id', 'placeholder');
    } catch (err) {
      console.warn('Supabase resetAllAttendance error:', err);
    }
  };

  // Reset to demo alias (refreshes real data from Supabase, NO dummy seeding!)
  const resetToDemoData = () => {
    refreshFromSupabase();
  };

  return (
    <AttendanceContext.Provider
      value={{
        user,
        event,
        guests,
        scanLogs,
        activeTab,
        isLoading,
        authError,
        isSupabaseConnected,
        setActiveTab: handleSetActiveTab,
        login,
        signUp,
        logout,
        refreshFromSupabase,
        updateEvent,
        addGuest,
        updateGuest,
        updateActualPax,
        deleteGuest,
        bulkAddGuests,
        checkInGuest,
        cancelCheckIn,
        resetToDemoData,
        resetAllAttendance,
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
};

export const useAttendance = () => {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  return context;
};
