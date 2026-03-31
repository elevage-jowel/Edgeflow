import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { prisma } from '@/lib/db/prisma'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const backtest = await prisma.backtest.findFirst({ where: { id: params.id, userId } })
  if (!backtest) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(backtest)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const existing = await prisma.backtest.findFirst({ where: { id: params.id, userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.backtest.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
