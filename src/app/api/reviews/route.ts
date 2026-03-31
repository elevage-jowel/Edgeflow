import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { prisma } from '@/lib/db/prisma'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') // format: YYYY-MM

  const where: any = { userId }
  if (month) {
    where.date = { startsWith: month }
  }

  const reviews = await prisma.review.findMany({ where, orderBy: { date: 'desc' } })
  return NextResponse.json(reviews)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  try {
    const body = await request.json()
    const review = await prisma.review.upsert({
      where: { userId_date_type: { userId, date: body.date, type: body.type } },
      update: {
        emotionalState: body.emotionalState ?? null,
        disciplineScore: body.disciplineScore ?? null,
        notes: body.notes ?? null,
        wins: body.wins ?? null,
        losses: body.losses ?? null,
        improvements: body.improvements ?? null,
        habits: body.habits ?? [],
        tradeCount: body.tradeCount ?? null,
        dayPnl: body.dayPnl ?? null,
      },
      create: {
        userId,
        type: body.type,
        date: body.date,
        emotionalState: body.emotionalState ?? null,
        disciplineScore: body.disciplineScore ?? null,
        notes: body.notes ?? null,
        wins: body.wins ?? null,
        losses: body.losses ?? null,
        improvements: body.improvements ?? null,
        habits: body.habits ?? [],
        tradeCount: body.tradeCount ?? null,
        dayPnl: body.dayPnl ?? null,
      },
    })
    return NextResponse.json(review, { status: 201 })
  } catch (error) {
    console.error('Upsert review error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
