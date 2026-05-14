import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jkjkbawikpqgxvmstzsb.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpramtiYXdpa3BxZ3h2bXN0enNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNDcyMDksImV4cCI6MjA3ODYyMzIwOX0.xJdeEePMhcbp6WstT_GDz3VwiiGoAYuHE9A5Wlz5RUY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  const nutriIds = ['6178130c-e47a-4534-a794-9b80b823766b', 'f7eb138b-4abd-4935-baaf-259603bf951d'];
  console.log('Searching for nutritionsist names in fitmind_users_view...');
  const { data, error } = await supabase.from('fitmind_users_view').select('id, name, email').in('id', nutriIds);
  console.log('Nutris found:', data, error);
}

inspect();
