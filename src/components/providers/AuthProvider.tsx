'use client'
import { SessionProvider } from 'next-auth/react'
import { useAuthListener } from '@/lib/hooks/useAuth'

function AuthListener({ children }: { children: React.ReactNode }) {
  useAuthListener()
  return <>{children}</>
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthListener>{children}</AuthListener>
    </SessionProvider>
  )
}
