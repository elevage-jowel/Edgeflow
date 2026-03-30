import { create } from 'zustand'
import { User } from 'firebase/auth'
import { UserProfile } from '@/lib/types'

interface AuthState {
  user: User | null
  userProfile: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  setUser: (user: User | null) => void
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
