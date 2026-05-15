import { Metadata } from 'next'
import NotesClient from './NotesClient'

export const metadata: Metadata = { title: 'Notes — EdgeFlow' }

export default function NotesPage() {
  return <NotesClient />
}
