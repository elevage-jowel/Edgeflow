import { Metadata } from 'next'
import LoginClient from './LoginClient'

export const metadata: Metadata = { title: 'Sign In — EdgeFlow' }

export default function LoginPage() {
  return <LoginClient />
}
