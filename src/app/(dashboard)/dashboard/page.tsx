import { Metadata } from 'next'
import DashboardClient from './DashboardClient'

export const metadata: Metadata = { title: 'Dashboard — EdgeFlow' }

export default function DashboardPage() {
  return <DashboardClient />
}
