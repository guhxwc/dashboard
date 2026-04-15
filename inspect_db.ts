import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspect() {
  const { data: usersView } = await supabase.from('fitmind_users_view').select('*').limit(5);
  console.log('usersView columns:', usersView && usersView.length > 0 ? Object.keys(usersView[0]) : 'No usersView');
  console.log('usersView data:', usersView);
}

inspect();
