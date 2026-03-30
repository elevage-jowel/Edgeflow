import { Metadata } from 'next'
import SettingsClient from './SettingsClient'

export const metadata: Metadata = { title: 'Settings — EdgeFlow' }

export default function SettingsPage() {
  return <SettingsClient />
}
