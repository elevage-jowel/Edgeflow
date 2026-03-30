import { Metadata } from 'next'
import ImportClient from './ImportClient'

export const metadata: Metadata = { title: 'Import Trades — EdgeFlow' }

export default function ImportPage() {
  return <ImportClient />
}
