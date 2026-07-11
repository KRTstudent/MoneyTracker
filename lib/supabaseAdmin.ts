import { createClient } from "@supabase/supabase-js";

// This file must never be imported from a "use client" component.
// It uses the service role key, which bypasses Row Level Security.
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
