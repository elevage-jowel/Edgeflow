import { Goal } from '@/lib/types'
import { format, subDays, addDays, startOfMonth, endOfMonth } from 'date-fns'

export function getSeedGoals(userId: string): Omit<Goal, 'id'>[] {
  const now = new Date()
  return [
    {
      userId, title: 'Monthly P&L Target', description: 'Hit $5,000 net profit this month',
      type: 'monthly_pnl', period: 'monthly', targetValue: 5000, currentValue: 3842,
      unit: 'USD', startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(now), 'yyyy-MM-dd'), isActive: true, isCompleted: false,
      notes: 'On track. Need 2–3 more A+ setups.',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    },
    {
      userId, title: 'Win Rate Target', description: 'Maintain above 60% win rate',
      type: 'win_rate', period: 'monthly', targetValue: 60, currentValue: 63.6,
      unit: '%', startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(now), 'yyyy-MM-dd'), isActive: true, isCompleted: false,
      notes: 'Ahead of target. Focus on quality over quantity.',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    },
    {
      userId, title: 'Max Daily Drawdown', description: 'Never lose more than $500 in a single day',
      type: 'daily_loss_limit', period: 'monthly', targetValue: 500, currentValue: 280,
      unit: 'USD', startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(now), 'yyyy-MM-dd'), isActive: true, isCompleted: false,
      notes: 'Worst day was -$280. Rule holding well.',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    },
    {
      userId, title: 'Screenshot Every Trade', description: 'Upload chart screenshot for 90%+ of trades',
      type: 'screenshot_rate', period: 'monthly', targetValue: 90, currentValue: 72,
      unit: '%', startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(now), 'yyyy-MM-dd'), isActive: true, isCompleted: false,
      notes: 'Need to be more consistent. Set reminder after each trade.',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    },
  ]
}
