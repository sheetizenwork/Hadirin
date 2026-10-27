import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://jbyfsdysbdcgcmmnvmxa.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpieWZzZHlzYmRjZ2NtbW52bXhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwNjQ3NTcsImV4cCI6MjEwODY0MDc1N30.e3hZJ8jMyFdNDgeepuw7KDmvdkc-RvqiVgHhA4UHktQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
