import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspect() {
  const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  console.log('Profiles count:', count);
  if (error) console.error('Profiles error:', error.message);
  
  const { data: logs } = await supabase.from('daily_goals_met').select('user_id, date').limit(10);
  console.log('Daily logs sample:', logs);
}

inspect();
