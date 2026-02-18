// src/lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Nunca “throw” aquí, porque Next puede evaluar el módulo durante build/prerender.
export const supabase =
  url && anon
    ? createClient(url, anon, {
        auth: { persistSession: false },
      })
    : null;

if (!supabase) {
  // Solo log para debugging (no rompe build)
  console.warn("⚠️ Supabase no configurado (faltan env vars):", {
    hasUrl: Boolean(url),
    hasAnon: Boolean(anon),
  });
}