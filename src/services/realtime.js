import { SUPABASE_CONFIG, isSupabaseConfigured } from "./supabase.js";

export const createRealtimeClient = async () => {
  if (!isSupabaseConfigured()) return null;

  const { createClient } = await import(
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/+esm"
  );

  return createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
    realtime: { params: { eventsPerSecond: 5 } },
  });
};
