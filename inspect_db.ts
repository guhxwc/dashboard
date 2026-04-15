import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspect() {
  const { data: profiles } = await supabase.from('profiles').select('*').limit(5);
  console.log('Profiles columns:', profiles && profiles.length > 0 ? Object.keys(profiles[0]) : 'No profiles');
  
  const { data: subs } = await supabase.from('subscriptions').select('*').limit(5);
  console.log('Subscriptions columns:', subs && subs.length > 0 ? Object.keys(subs[0]) : 'No subscriptions');
  
  const { data: refs } = await supabase.from('referrals').select('*').limit(5);
  console.log('Referrals columns:', refs && refs.length > 0 ? Object.keys(refs[0]) : 'No referrals');
  console.log('Referrals data:', refs);
}

inspect();
