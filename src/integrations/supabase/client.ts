/**
 * Supabase client
 *
 * - Se `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estiverem configurados, usamos o Supabase real.
 * - Caso contrário, usamos um mock silencioso para não quebrar o app (e evitar logs confusos).
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// A proxy that allows any method call without crashing, returning a promise that resolves to basic empty data
const createMockChain = () =>
  new Proxy(() => { }, {
    get: (_target, prop) => {
      if (prop === 'then') {
        return (resolve: any) => resolve({ data: [], error: null, count: 0 });
      }
      return createMockChain();
    },
    apply: () => createMockChain(),
  });

const createMockSupabase = () =>
  ({
    from: (_table: string) => createMockChain(),
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
      signInWithPassword: async () => ({ data: null, error: { message: 'Auth disabled' } }),
      signOut: async () => ({ error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
    },
    channel: (_name: string) => ({
      on: () => ({ subscribe: () => { } }),
      subscribe: (cb: any) => {
        if (cb) cb('SUBSCRIBED');
      },
      unsubscribe: () => { },
      send: () => { },
    }),
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
        download: async () => ({ data: null, error: null }),
        remove: async () => ({ data: null, error: null }),
      }),
    },
  }) as any;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient<Database>(supabaseUrl, supabaseAnonKey)
    : createMockSupabase();