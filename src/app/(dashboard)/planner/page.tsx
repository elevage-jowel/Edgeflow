import { Suspense } from 'react'
import PlannerClient from './PlannerClient'

export default function PlannerPage() {
  return (
    <Suspense>
      <PlannerClient />
    </Suspense>
  )
}
