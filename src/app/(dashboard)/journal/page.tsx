import { Metadata } from 'next'
import JournalClient from './JournalClient'

export const metadata: Metadata = { title: 'Trade Journal — EdgeFlow' }

export default function JournalPage() {
  return <JournalClient />
}
