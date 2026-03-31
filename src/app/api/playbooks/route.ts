import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const playbooks = await prisma.playbook.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json(playbooks)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  try {
    const body = await request.json()
    const playbook = await prisma.playbook.create({
      data: {
        userId,
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
    return NextResponse.json(playbook, { status: 201 })
  } catch (error) {
    console.error('Create playbook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
