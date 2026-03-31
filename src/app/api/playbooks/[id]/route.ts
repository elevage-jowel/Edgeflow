import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { prisma } from '@/lib/db/prisma'

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const existing = await prisma.playbook.findFirst({ where: { id: params.id, userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const body = await request.json()
    const playbook = await prisma.playbook.update({
      where: { id: params.id },
      data: {
        name: body.name,
        description: body.description ?? null,
        marketCondition: body.marketCondition ?? null,
        entryCriteria: body.entryCriteria ?? null,
        invalidationCriteria: body.invalidationCriteria ?? null,
        managementRules: body.managementRules ?? null,
        exitCriteria: body.exitCriteria ?? null,
        screenshotUrl: body.screenshotUrl ?? null,
        checklist: body.checklist ?? [],
        tags: body.tags ?? [],
        isActive: body.isActive ?? true,
        tradeCount: body.tradeCount ?? null,
        winRate: body.winRate ?? null,
        avgRMultiple: body.avgRMultiple ?? null,
      },
    })
    return NextResponse.json(playbook)
  } catch (error) {
    console.error('Update playbook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const existing = await prisma.playbook.findFirst({ where: { id: params.id, userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.playbook.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
