import { Suspense } from 'react'
import PropFirmClient from './PropFirmClient'

export default function PropFirmPage() {
  return (
    <Suspense>
      <PropFirmClient />
    </Suspense>
  )
}
