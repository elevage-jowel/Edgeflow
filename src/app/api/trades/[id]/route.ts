import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TradeSchema } from '@/lib/validations'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const trade = await prisma.trade.findUnique({
    where: { id },
    include: { tags: { include: { tag: true } } },
  })
  if (!trade) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ trade: { ...trade, tags: trade.tags.map((tt) => tt.tag) } })
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await req.json()
  const parsed = TradeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { tagIds, ...data } = parsed.data

  await prisma.tradeTag.deleteMany({ where: { tradeId: id } })

  const trade = await prisma.trade.update({
    where: { id },
    data: {
      ...data,
      entryDate: new Date(data.entryDate),
      exitDate: new Date(data.exitDate),
      tags: tagIds?.length
        ? { create: tagIds.map((tagId) => ({ tagId })) }
        : undefined,
    },
    include: { tags: { include: { tag: true } } },
  })

  return NextResponse.json({ trade: { ...trade, tags: trade.tags.map((tt) => tt.tag) } })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  await prisma.trade.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
