import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Cliente de servidor con service_role. NUNCA importar esto desde un
// componente cliente: la key ignora RLS y no debe llegar al navegador.
let cached: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno."
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export type Entry = {
  id: string;
  person_id: string;
  person_name: string;
  week_id: string;
  week_label: string;
  q1: string;
  q2: string;
  q3: string;
  q4: string;
  q5: string;
  submitted: boolean;
  created_at: string;
  updated_at: string;
};
