import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const backtests = await prisma.backtest.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, strategy: true, description: true,
      startDate: true, endDate: true, initialCapital: true,
      totalPnl: true, winRate: true, profitFactor: true,
      maxDrawdown: true, sharpeRatio: true, notes: true,
      createdAt: true, updatedAt: true,
    },
  })
  return NextResponse.json(backtests)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  try {
    const body = await request.json()
    const backtest = await prisma.backtest.create({
      data: {
        userId,
        name: body.name,
        strategy: body.strategy,
        description: body.description ?? null,
        startDate: body.startDate,
        endDate: body.endDate,
        initialCapital: body.initialCapital,
        trades: body.trades ?? [],
        totalPnl: body.totalPnl ?? null,
        winRate: body.winRate ?? null,
        profitFactor: body.profitFactor ?? null,
        maxDrawdown: body.maxDrawdown ?? null,
        sharpeRatio: body.sharpeRatio ?? null,
        notes: body.notes ?? null,
      },
    })
    return NextResponse.json(backtest, { status: 201 })
  } catch (error) {
    console.error('Create backtest error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
