export const SUPABASE_CONFIG = {
  url: "https://YOUR_PROJECT.supabase.co",
  anonKey: "YOUR_ANON_KEY",
};

export const isSupabaseConfigured = () =>
  !SUPABASE_CONFIG.url.includes("YOUR_PROJECT") &&
  !SUPABASE_CONFIG.anonKey.includes("YOUR_ANON_KEY");
