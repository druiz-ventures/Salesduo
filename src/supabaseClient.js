import { createClient } from "@supabase/supabase-js";

// 👇 Reemplaza estos dos valores con los tuyos de supabase.com → Settings → API
const SUPABASE_URL = "https://ekchfmncwmrtdahqdhhw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_7evH8OYknL0fZ-DOp_1TyA_nCRqD-9_";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
