import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// Auth Store
interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'team_lead' | 'member'
  phone?: string
  team_id?: string
  remember?: boolean
}

interface AuthStore {
  user: User | null
  hasHydrated: boolean
  setUser: (user: User | null) => void
  setHasHydrated: (v: boolean) => void
  logout: () => void
}

// Lưu phiên đăng nhập vào localStorage để giữ trạng thái khi tải lại trang
export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      hasHydrated: false,
      setUser: (user) => set({ user }),
      setHasHydrated: (v) => set({ hasHydrated: v }),
      logout: () => set({ user: null }),
    }),
    {
      name: 'akf-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ user: s.user }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    }
  )
)

// UI Store
interface UIStore {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  selectedZoneId: string | null
  setSelectedZoneId: (id: string | null) => void
  selectedBlockId: string | null
  setSelectedBlockId: (id: string | null) => void
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  selectedZoneId: null,
  setSelectedZoneId: (id) => set({ selectedZoneId: id }),
  selectedBlockId: null,
  setSelectedBlockId: (id) => set({ selectedBlockId: id }),
}))

// Offline Store
interface OfflineItem {
  id: string
  type: 'task_report' | 'daily_report'
  data: any
  createdAt: Date
}

interface OfflineStore {
  items: OfflineItem[]
  addItem: (item: OfflineItem) => void
  removeItem: (id: string) => void
  clearItems: () => void
  isOnline: boolean
  setIsOnline: (online: boolean) => void
}

export const useOfflineStore = create<OfflineStore>((set) => ({
  items: [],
  addItem: (item) =>
    set((state) => ({
      items: [...state.items, item],
    })),
  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),
  clearItems: () => set({ items: [] }),
  isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
  setIsOnline: (online) => set({ isOnline: online }),
}))
