import { getAdminPin } from './pin.js';
import { supabase } from '../supabase.js';
const CODE = getAdminPin();
export async function xrpc(fn, args = {}) {
  const { data, error } = await supabase.rpc(fn, { p_code: CODE, ...args });
  if (error) throw error;
  return data;
}
