'use client'
import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useAuthStore } from '@/lib/stores/authStore'
import { UserProfile } from '@/lib/types'

export function useAuthListener() {
  const { data: session, status } = useSession()
  const { setUser, setProfile, setLoading } = useAuthStore()

  useEffect(() => {
    if (status === 'loading') return
    setLoading(false)

    if (status === 'authenticated' && session?.user) {
      const user = session.user as { id: string; email?: string | null; name?: string | null; image?: string | null }
      setUser({ id: user.id, email: user.email, name: user.name, image: user.image })

      // Fetch full user profile and seed if needed
      fetch('/api/user')
        .then(r => r.json())
        .then(async (data: UserProfile & { seeded?: boolean }) => {
          setProfile(data)
          if (!data.seeded) {
            await fetch('/api/seed', { method: 'POST' })
            const updated = await fetch('/api/user').then(r => r.json())
            setProfile(updated)
          }
        })
        .catch(console.error)
    } else {
      setUser(null)
      setProfile(null)
    }
  }, [session, status, setUser, setProfile, setLoading])
}

export function useAuth() {
  return useAuthStore()
}
