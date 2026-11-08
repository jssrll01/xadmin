import { xmSupabase } from '../supabase.js';
import { createLiveBus } from './liveBus.js';

export const liveBus = createLiveBus(xmSupabase);
