import { Metadata } from 'next'
import PlaybooksClient from './PlaybooksClient'

export const metadata: Metadata = { title: 'Playbooks — EdgeFlow' }

export default function PlaybooksPage() {
  return <PlaybooksClient />
}
