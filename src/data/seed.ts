import { prisma } from '@/lib/db/prisma'
import { getSeedTrades } from './seedTrades'
import { getSeedGoals } from './seedGoals'
import { getSeedPlaybooks } from './seedPlaybooks'

export async function seedDemoData(userId: string): Promise<void> {
  const playbookDefs = getSeedPlaybooks(userId)
  const goals = getSeedGoals(userId)
  const trades = getSeedTrades(userId)

  const playbookIds = ['playbook_momentum', 'playbook_orb', 'playbook_trend', 'playbook_options']

  // Create playbooks first (trades reference their IDs)
  await prisma.$transaction(
    playbookDefs.map((p, i) =>
      prisma.playbook.create({
        data: {
          id: playbookIds[i],
          userId,
          name: p.name,
          description: p.description ?? null,
          marketCondition: p.marketCondition ?? null,
          entryCriteria: p.entryCriteria ?? null,
          invalidationCriteria: p.invalidationCriteria ?? null,
          managementRules: p.managementRules ?? null,
          exitCriteria: p.exitCriteria ?? null,
          screenshotUrl: p.screenshotUrl ?? null,
          checklist: p.checklist as any,
          tags: p.tags ?? [],
          isActive: p.isActive ?? true,
          tradeCount: p.tradeCount ?? null,
          winRate: p.winRate ?? null,
          avgRMultiple: p.avgRMultiple ?? null,
        },
      })
    )
  )

  // Create goals
  await prisma.$transaction(
    goals.map((g, i) =>
      prisma.goal.create({
        data: {
          id: `goal_seed_${i + 1}`,
          userId,
          title: g.title,
          description: g.description ?? null,
          type: g.type,
          period: g.period,
          targetValue: g.targetValue,
          currentValue: g.currentValue ?? 0,
          unit: g.unit,
          startDate: g.startDate,
          endDate: g.endDate,
          isActive: g.isActive ?? true,
          isCompleted: g.isCompleted ?? false,
          notes: g.notes ?? '',
        },
      })
    )
  )

  // Create trades
  await prisma.$transaction(
    trades.map((t, i) =>
      prisma.trade.create({
        data: {
          id: `trade_seed_${String(i + 1).padStart(3, '0')}`,
          userId,
          symbol: t.symbol,
          assetClass: t.assetClass,
          direction: t.direction,
          status: t.status,
          outcome: t.outcome ?? null,
          entryDate: new Date(t.entryDate),
          exitDate: t.exitDate ? new Date(t.exitDate) : null,
          entryPrice: t.entryPrice,
          exitPrice: t.exitPrice ?? null,
          quantity: t.quantity,
          commission: t.commission ?? 0,
          grossPnl: t.grossPnl ?? null,
          netPnl: t.netPnl ?? null,
          rMultiple: t.rMultiple ?? null,
          returnPct: t.returnPct ?? null,
          stopLoss: t.stopLoss ?? null,
          takeProfit: t.takeProfit ?? null,
          initialRisk: t.initialRisk ?? null,
          playbookId: t.playbookId ?? null,
          strategy: t.strategy ?? null,
          session: t.session ?? null,
          tags: t.tags ?? [],
          notes: t.notes ?? '',
          screenshotUrls: t.screenshotUrls ?? [],
          setupRating: t.setupRating ?? null,
          executionRating: t.executionRating ?? null,
          emotionRating: t.emotionRating ?? null,
        },
      })
    )
  )
}
