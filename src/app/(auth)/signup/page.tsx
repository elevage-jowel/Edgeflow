import { Metadata } from 'next'
import SignupClient from './SignupClient'

export const metadata: Metadata = { title: 'Create Account — EdgeFlow' }

export default function SignupPage() {
  return <SignupClient />
}
