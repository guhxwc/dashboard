import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspect() {
  const { data: dailyLogs } = await supabase.from('daily_goals_met').select('*').order('date', { ascending: false }).limit(10);
  console.log('daily_goals_met data:', dailyLogs);
}

inspect();
