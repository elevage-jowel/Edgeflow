import { Metadata } from 'next'
import GoalsClient from './GoalsClient'

export const metadata: Metadata = { title: 'Goals — EdgeFlow' }

export default function GoalsPage() {
  return <GoalsClient />
}
