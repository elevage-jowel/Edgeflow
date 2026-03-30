'use client'
import { useAuthListener } from '@/lib/hooks/useAuth'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useAuthListener()
  return <>{children}</>
}
