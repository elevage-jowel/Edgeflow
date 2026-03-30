import { Metadata } from 'next'
import ForgotClient from './ForgotClient'

export const metadata: Metadata = { title: 'Reset Password — EdgeFlow' }

export default function ForgotPasswordPage() {
  return <ForgotClient />
}
