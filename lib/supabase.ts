import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

function supabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
}

function supabaseAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl() && supabaseAnonKey());
}

function requireServiceKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!key) throw new Error('Supabase not configured');
  return key;
}

let adminClient: SupabaseClient | null = null;

/** Server-only privileged client (bypasses RLS). Never import from client components. */
export function supabaseAdmin(): SupabaseClient {
  if (!supabaseUrl()) throw new Error('Supabase not configured');
  if (!adminClient) {
    adminClient = createClient(supabaseUrl(), requireServiceKey(), {
      auth: { persistSession: false },
    });
  }
  return adminClient;
}

/** Browser client (anon key, RLS applies). */
export function supabaseBrowser(): SupabaseClient {
  return createBrowserClient(supabaseUrl(), supabaseAnonKey());
}

/** Server Component / Route Handler client bound to request cookies (for Supabase Auth). */
export async function supabaseServer(): Promise<SupabaseClient> {
  const store = await cookies();
  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value, options }) => {
          try {
            store.set(name, value, options);
          } catch {
            // Route Handlers / Server Components may be read-only; middleware refresh handles it.
          }
        });
      },
    },
  });
}

/** Drop-in fallback helper (same semantics as the old d1Or). */
export async function dbOr<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  if (!isSupabaseConfigured()) return fallback;
  try {
    return await run();
  } catch (e) {
    console.warn('Failed to read Supabase, using fallback:', e);
    return fallback;
  }
}
