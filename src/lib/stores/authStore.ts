import { create } from 'zustand'
import { UserProfile } from '@/lib/types'

interface SessionUser {
  id: string
  email?: string | null
  name?: string | null
  image?: string | null
}

interface AuthState {
  user: SessionUser | null
  userProfile: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  setUser: (user: SessionUser | null) => void
  setProfile: (profile: UserProfile | null) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  userProfile: null,
  isLoading: true,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setProfile: (userProfile) => set({ userProfile }),
  setLoading: (isLoading) => set({ isLoading }),
}))
