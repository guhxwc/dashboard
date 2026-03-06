import { createClient } from '@supabase/supabase-js';

// Credentials provided by user
const supabaseUrl = 'https://jkjkbawikpqgxvmstzsb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpramtiYXdpa3BxZ3h2bXN0enNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNDcyMDksImV4cCI6MjA3ODYyMzIwOX0.xJdeEePMhcbp6WstT_GDz3VwiiGoAYuHE9A5Wlz5RUY';

// Custom storage that handles 'The operation is insecure' error in iframes
const customStorage = {
  getItem: (key: string) => {
    try {
      return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    } catch (e) {
      console.warn('Supabase storage getItem failed:', e);
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      if (typeof window !== 'undefined') localStorage.setItem(key, value);
    } catch (e) {
      console.warn('Supabase storage setItem failed:', e);
    }
  },
  removeItem: (key: string) => {
    try {
      if (typeof window !== 'undefined') localStorage.removeItem(key);
    } catch (e) {
      console.warn('Supabase storage removeItem failed:', e);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
