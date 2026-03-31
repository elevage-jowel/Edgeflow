import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const goals = await prisma.goal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json(goals)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  try {
    const body = await request.json()
    const goal = await prisma.goal.create({
      data: {
        userId,
        title: body.title,
        description: body.description ?? null,
        type: body.type,
        period: body.period,
        targetValue: body.targetValue,
        currentValue: body.currentValue ?? 0,
        unit: body.unit,
        startDate: body.startDate,
        endDate: body.endDate,
        isActive: body.isActive ?? true,
        isCompleted: body.isCompleted ?? false,
        notes: body.notes ?? '',
      },
    })
    return NextResponse.json(goal, { status: 201 })
  } catch (error) {
    console.error('Create goal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
