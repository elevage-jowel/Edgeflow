import { Metadata } from 'next'
import CalendarClient from './CalendarClient'

export const metadata: Metadata = { title: 'Calendar — EdgeFlow' }

export default function CalendarPage() {
  return <CalendarClient />
}
