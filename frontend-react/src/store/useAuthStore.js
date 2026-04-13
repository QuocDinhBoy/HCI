import { create } from 'zustand';

const readJson = (key, fallback = null) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const persistAuth = (token, user) => {
  if (token) localStorage.setItem('token', token);
  if (user) localStorage.setItem('user', JSON.stringify(user));
};

const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const useAuthStore = create((set, get) => ({
  token: localStorage.getItem('token') || null,
  user: readJson('user'),

  get isAuthenticated() {
    return Boolean(get().token);
  },

  setAuth: ({ token, user }) => {
    persistAuth(token, user);
    set({ token, user });
  },

  setUser: (user) => {
    const current = get().user;
    const currentJson = JSON.stringify(current ?? null);
    const nextJson = JSON.stringify(user ?? null);

    if (currentJson === nextJson) return;

    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }

    set({ user });
  },

  restoreAuth: () => {
    set({
      token: localStorage.getItem('token') || null,
      user: readJson('user'),
    });
  },

  logout: () => {
    clearAuth();
    set({ token: null, user: null });
  },
}));
