import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspect() {
  const knownTables = ['profiles', 'users', 'user_streaks', 'streaks', 'daily_goals_met', 'subscriptions', 'referrals'];
  for (const table of knownTables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (!error) {
      console.log(`Table ${table} exists. Columns:`, data && data.length > 0 ? Object.keys(data[0]) : 'Empty');
    } else {
      console.log(`Table ${table} error:`, error.message);
    }
  }
}

inspect();
