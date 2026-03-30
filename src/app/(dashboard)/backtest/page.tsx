import { Metadata } from 'next'
import BacktestClient from './BacktestClient'

export const metadata: Metadata = { title: 'Backtest — EdgeFlow' }

export default function BacktestPage() {
  return <BacktestClient />
}
