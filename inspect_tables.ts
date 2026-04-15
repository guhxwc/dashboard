import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspect() {
  const { data: dailyLogs } = await supabase.from('daily_goals_met').select('*').limit(5);
  console.log('daily_goals_met columns:', dailyLogs && dailyLogs.length > 0 ? Object.keys(dailyLogs[0]) : 'No daily_goals_met');
  
  const { data: users } = await supabase.from('fitmind_users_view').select('*').limit(5);
  console.log('users metadata example:', users && users.length > 0 ? users[0].raw_user_meta_data : 'No users');
}

inspect();
