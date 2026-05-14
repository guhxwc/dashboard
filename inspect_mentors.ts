import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jkjkbawikpqgxvmstzsb.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpramtiYXdpa3BxZ3h2bXN0enNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNDcyMDksImV4cCI6MjA3ODYyMzIwOX0.xJdeEePMhcbp6WstT_GDz3VwiiGoAYuHE9A5Wlz5RUY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  console.log('Inspecting profiles to find nutritionists...');
  const { data, error } = await supabase.from('profiles').select('id, name, email').limit(10);
  console.log('Profiles sample:', data);
  
  // Try to find if there is a nutritionist or mentors table
  const { data: tables } = await supabase.rpc('get_table_names'); // Just guessing if this exists, might not.
  // Instead let's just try some common names
  const potentialTables = ['nutritionists', 'mentors', 'admins', 'staff'];
  for (const table of potentialTables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (!error) {
      console.log(`Table ${table} exists and has ${count} records.`);
    }
  }
}

inspect();
