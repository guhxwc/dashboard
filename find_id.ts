import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jkjkbawikpqgxvmstzsb.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpramtiYXdpa3BxZ3h2bXN0enNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNDcyMDksImV4cCI6MjA3ODYyMzIwOX0.xJdeEePMhcbp6WstT_GDz3VwiiGoAYuHE9A5Wlz5RUY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  const nutriId = '6178130c-e47a-4534-a794-9b80b823766b';
  
  // Check common tables
  const tables = ['profiles', 'nutritionists', 'mentors', 'admins', 'users', 'auth_users_temp'];
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').eq('id', nutriId);
      if (data && data.length > 0) {
        console.log(`Found in table ${table}:`, data);
      }
    } catch (e) {}
  }
}

inspect();
