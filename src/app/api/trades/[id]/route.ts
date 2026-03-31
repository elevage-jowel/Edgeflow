import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { prisma } from '@/lib/db/prisma'

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const existing = await prisma.trade.findFirst({ where: { id: params.id, userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const body = await request.json()
    const trade = await prisma.trade.update({
      where: { id: params.id },
      data: {
        symbol: body.symbol,
        assetClass: body.assetClass,
        direction: body.direction,
        status: body.status,
        outcome: body.outcome ?? null,
        entryDate: new Date(body.entryDate),
        exitDate: body.exitDate ? new Date(body.exitDate) : null,
        entryPrice: body.entryPrice,
        exitPrice: body.exitPrice ?? null,
        quantity: body.quantity,
        commission: body.commission ?? 0,
        grossPnl: body.grossPnl ?? null,
        netPnl: body.netPnl ?? null,
        rMultiple: body.rMultiple ?? null,
        returnPct: body.returnPct ?? null,
        stopLoss: body.stopLoss ?? null,
        takeProfit: body.takeProfit ?? null,
        initialRisk: body.initialRisk ?? null,
        playbookId: body.playbookId ?? null,
        strategy: body.strategy ?? null,
        session: body.session ?? null,
        tags: body.tags ?? [],
        notes: body.notes ?? '',
        screenshotUrls: body.screenshotUrls ?? [],
        setupRating: body.setupRating ?? null,
        executionRating: body.executionRating ?? null,
        emotionRating: body.emotionRating ?? null,
      },
    })
    return NextResponse.json({
      ...trade,
      entryDate: trade.entryDate.toISOString(),
      exitDate: trade.exitDate?.toISOString() ?? null,
      createdAt: trade.createdAt.toISOString(),
      updatedAt: trade.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Update trade error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const existing = await prisma.trade.findFirst({ where: { id: params.id, userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.trade.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
