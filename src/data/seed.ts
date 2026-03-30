import { writeBatch, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { col } from '@/lib/firebase/collections'
import { getSeedTrades } from './seedTrades'
import { getSeedGoals } from './seedGoals'
import { getSeedPlaybooks } from './seedPlaybooks'

export async function seedDemoData(userId: string): Promise<void> {
  const trades = getSeedTrades(userId)
  const goals = getSeedGoals(userId)
  const playbooks = getSeedPlaybooks(userId)

  const batch = writeBatch(db)

  // Seed playbooks first (so trades can reference playbookIds)
  playbooks.forEach((p, i) => {
    const id = `playbook_${['momentum', 'orb', 'trend', 'options'][i]}`
    const ref = doc(db, col.playbook(userId, id))
    batch.set(ref, { ...p, id })
  })

  // Seed goals
  goals.forEach((g, i) => {
    const id = `goal_seed_${i + 1}`
    const ref = doc(db, col.goal(userId, id))
    batch.set(ref, { ...g, id })
  })

  // Seed trades (batch limit is 500, we have ~25)
  trades.forEach((t, i) => {
    const id = `trade_seed_${String(i + 1).padStart(3, '0')}`
    const ref = doc(db, col.trade(userId, id))
    batch.set(ref, { ...t, id })
  })

  await batch.commit()
}
