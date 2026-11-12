import * as S from '../supabase';
import { getAdminPin } from '../lib/pin';
const client = S.supabase || S.default;
export async function opsRpc(name, args) {
  const { data, error } = await client.rpc(name, { code: getAdminPin(), ...(args || {}) });
  if (error) throw new Error(error.message);
  return data;
}
export const peso = (n) => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const when = (d) => (d ? new Date(d).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) : '');
