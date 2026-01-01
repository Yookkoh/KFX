import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Workspace, WorkspaceMember, AuthState, LoginCredentials, RegisterCredentials, OnboardingData } from '@/types';
import { authApi, workspaceApi, setAccessToken } from '@/api/client';

interface AuthStore extends AuthState {
  setUser: (user: User | null) => void;
  setWorkspace: (workspace: Workspace | null, member: WorkspaceMember | null) => void;
  setLoading: (loading: boolean) => void;
  setNeedsOnboarding: (needs: boolean) => void;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  completeOnboarding: (data: OnboardingData) => Promise<void>;
  reset: () => void;
}

const initialState: AuthState = {
  user: null,
  workspace: null,
  workspaceMember: null,
  isAuthenticated: false,
  isLoading: true,
  needsOnboarding: false,
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setWorkspace: (workspace, workspaceMember) => set({ workspace, workspaceMember }),

      setLoading: (isLoading) => set({ isLoading }),

      setNeedsOnboarding: (needsOnboarding) => set({ needsOnboarding }),

      login: async (credentials) => {
        set({ isLoading: true });
        try {
          const response = await authApi.login(credentials);
          if (response.data) {
            set({
              user: response.data.user,
              workspace: response.data.workspace || null,
              workspaceMember: response.data.workspaceMember || null,
              isAuthenticated: true,
              needsOnboarding: !response.data.workspace,
            });
          }
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (credentials) => {
        set({ isLoading: true });
        try {
          const response = await authApi.register(credentials);
          if (response.data) {
            set({
              user: response.data.user,
              isAuthenticated: true,
              needsOnboarding: true,
            });
          }
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          setAccessToken(null);
          set(initialState);
          set({ isLoading: false });
        }
      },

      checkAuth: async () => {
        set({ isLoading: true });
        try {
          // First try to refresh the token
          await authApi.refresh();
          
          // Then get current user data
          const response = await authApi.getCurrentUser();
          if (response.data) {
            set({
              user: response.data.user,
              workspace: response.data.workspace || null,
              workspaceMember: response.data.workspaceMember || null,
              isAuthenticated: true,
              needsOnboarding: !response.data.workspace,
            });
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          setAccessToken(null);
          set({
            user: null,
            workspace: null,
            workspaceMember: null,
            isAuthenticated: false,
            needsOnboarding: false,
          });
        } finally {
          set({ isLoading: false });
        }
      },

      completeOnboarding: async (data) => {
        set({ isLoading: true });
        try {
          const response = await workspaceApi.onboarding(data);
          if (response.data) {
            set({
              workspace: response.data.workspace,
              workspaceMember: response.data.workspaceMember,
              needsOnboarding: false,
            });
          }
        } finally {
          set({ isLoading: false });
        }
      },

      reset: () => {
        setAccessToken(null);
        set(initialState);
        set({ isLoading: false });
      },
    }),
    {
      name: 'kinkyforex-auth',
      partialize: (state) => ({
        user: state.user,
        workspace: state.workspace,
        workspaceMember: state.workspaceMember,
        isAuthenticated: state.isAuthenticated,
        needsOnboarding: state.needsOnboarding,
      }),
    }
  )
);

// Theme store
interface ThemeStore {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  initTheme: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'system',

      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },

      initTheme: () => {
        const theme = get().theme;
        applyTheme(theme);
      },
    }),
    {
      name: 'kinkyforex-theme',
    }
  )
);

function applyTheme(theme: 'light' | 'dark' | 'system') {
  const root = document.documentElement;
  
  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    root.classList.toggle('dark', systemTheme === 'dark');
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
}

// Sidebar store
interface SidebarStore {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  toggleCollapse: () => void;
  toggleMobile: () => void;
  setMobileOpen: (open: boolean) => void;
}

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      isCollapsed: false,
      isMobileOpen: false,

      toggleCollapse: () => set((state) => ({ isCollapsed: !state.isCollapsed })),

      toggleMobile: () => set((state) => ({ isMobileOpen: !state.isMobileOpen })),

      setMobileOpen: (open) => set({ isMobileOpen: open }),
    }),
    {
      name: 'kinkyforex-sidebar',
      partialize: (state) => ({ isCollapsed: state.isCollapsed }),
    }
  )
);
