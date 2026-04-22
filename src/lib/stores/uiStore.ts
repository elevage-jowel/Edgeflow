import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  isSidebarCollapsed: boolean
  isMobileSidebarOpen: boolean
  activeModal: string | null
  theme: 'dark' | 'light'
  isCmdPaletteOpen: boolean
  toggleSidebar: () => void
  setMobileSidebar: (open: boolean) => void
  openModal: (id: string) => void
  closeModal: () => void
  setTheme: (theme: 'dark' | 'light') => void
  setCmdPalette: (open: boolean) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isSidebarCollapsed: false,
      isMobileSidebarOpen: false,
      activeModal: null,
      theme: 'dark',
      isCmdPaletteOpen: false,
      toggleSidebar: () => set(state => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      setMobileSidebar: (isMobileSidebarOpen) => set({ isMobileSidebarOpen }),
      openModal: (activeModal) => set({ activeModal }),
      closeModal: () => set({ activeModal: null }),
      setTheme: (theme) => set({ theme }),
      setCmdPalette: (isCmdPaletteOpen) => set({ isCmdPaletteOpen }),
    }),
    { name: 'edgeflow-ui', partialize: (s) => ({ isSidebarCollapsed: s.isSidebarCollapsed, theme: s.theme }) }
  )
)
