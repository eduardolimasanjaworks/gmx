// MOCK Supabase Client for Migration
// We are migrating to Directus. This mock exists only to avoid runtime crashes in legacy code paths.
// Keep it silent to avoid confusing console output.

// A proxy that allows any method call without crashing, returning a promise that resolves to basic empty data
const createMockChain = () => {
  return new Proxy(() => { }, {
    get: (target, prop) => {
      if (prop === 'then') {
        return (resolve, reject) => resolve({ data: [], error: null, count: 0 });
      }
      return createMockChain();
    },
    apply: (target, thisArg, argumentsList) => {
      return createMockChain();
    }
  });
};

export const supabase = {
  from: (table: string) => {
    return createMockChain();
  },
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
    signInWithPassword: async () => ({ data: null, error: { message: "Auth disabled" } }),
    signOut: async () => ({ error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
  },
  channel: (name: string) => ({
    on: () => ({ subscribe: () => { } }),
    subscribe: (cb: any) => { if (cb) cb('SUBSCRIBED'); },
    unsubscribe: () => { },
    send: () => { },
  }),
  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: "" } }),
      download: async () => ({ data: null, error: null }),
    })
  }
} as any;