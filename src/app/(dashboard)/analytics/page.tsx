import { Metadata } from 'next'
import AnalyticsClient from './AnalyticsClient'

export const metadata: Metadata = { title: 'Analytics — EdgeFlow' }

export default function AnalyticsPage() {
  return <AnalyticsClient />
}
