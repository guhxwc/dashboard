import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jkjkbawikpqgxvmstzsb.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpramtiYXdpa3BxZ3h2bXN0enNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNDcyMDksImV4cCI6MjA3ODYyMzIwOX0.xJdeEePMhcbp6WstT_GDz3VwiiGoAYuHE9A5Wlz5RUY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  console.log('Inspecting consultations table...');
  const { data, error } = await supabase.from('consultations').select('*').limit(5);
  if (error) {
    console.error('Error fetching consultations:', error);
  } else {
    console.log('Consultations sample:', JSON.stringify(data, null, 2));
    if (data && data.length > 0) {
      console.log('Columns:', Object.keys(data[0]));
    }
  }
}

inspect();
