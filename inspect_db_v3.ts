import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspect() {
  const { count: usersCount } = await supabase.from('fitmind_users_view').select('*', { count: 'exact', head: true });
  const { count: logsCount } = await supabase.from('daily_goals_met').select('*', { count: 'exact', head: true });
  const { count: profilesCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  
  console.log('Users count:', usersCount);
  console.log('Logs count:', logsCount);
  console.log('Profiles count:', profilesCount);
  
  // Check if any user in logs exists in users view
  const { data: logs } = await supabase.from('daily_goals_met').select('user_id').limit(100);
  const logUserIds = [...new Set(logs?.map(l => l.user_id))];
  
  const { data: users } = await supabase.from('fitmind_users_view').select('id').in('id', logUserIds);
  console.log('Matching users found:', users?.length);
}

inspect();
