import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { prisma } from '@/lib/db/prisma'

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const existing = await prisma.goal.findFirst({ where: { id: params.id, userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const body = await request.json()
    const goal = await prisma.goal.update({
      where: { id: params.id },
      data: {
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
    return NextResponse.json(goal)
  } catch (error) {
    console.error('Update goal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const existing = await prisma.goal.findFirst({ where: { id: params.id, userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.goal.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
