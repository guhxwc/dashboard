import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.locale') });
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

async function inspect() {
  const { data: cols } = await supabase.from('consultations').select('*').limit(1);
  console.log('consultations columns:', cols && cols.length > 0 ? Object.keys(cols[0]) : 'No data, fallback to error');
  if(!cols || cols.length === 0) {
      const { error } = await supabase.from('consultations').insert([{foo: 'bar'}]).select();
      console.log('Insert error structure:', error);
  }
}

inspect();
