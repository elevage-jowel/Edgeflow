import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TradeSchema } from '@/lib/validations'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'))
  const symbol = searchParams.get('symbol') || undefined
  const direction = searchParams.get('direction') || undefined
  const dateFrom = searchParams.get('dateFrom') || undefined
  const dateTo = searchParams.get('dateTo') || undefined
  const tagId = searchParams.get('tagId') || undefined

  const where = {
    ...(symbol && { symbol: { contains: symbol.toUpperCase() } }),
    ...(direction && { direction }),
    ...(dateFrom || dateTo
      ? {
          exitDate: {
            ...(dateFrom && { gte: new Date(dateFrom) }),
            ...(dateTo && { lte: new Date(dateTo + 'T23:59:59') }),
          },
        }
      : {}),
    ...(tagId && { tags: { some: { tagId } } }),
  }

  const [trades, total] = await Promise.all([
    prisma.trade.findMany({
      where,
      include: { tags: { include: { tag: true } } },
      orderBy: { exitDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.trade.count({ where }),
  ])

  const formatted = trades.map((t) => ({
    ...t,
    tags: t.tags.map((tt) => tt.tag),
  }))

  return NextResponse.json({ trades: formatted, total, page })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = TradeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { tagIds, ...data } = parsed.data
  const trade = await prisma.trade.create({
    data: {
      ...data,
      importSource: 'manual',
      entryDate: new Date(data.entryDate),
      exitDate: new Date(data.exitDate),
      tags: tagIds?.length
        ? { create: tagIds.map((tagId) => ({ tagId })) }
        : undefined,
    },
    include: { tags: { include: { tag: true } } },
  })

  return NextResponse.json(
    { trade: { ...trade, tags: trade.tags.map((tt) => tt.tag) } },
    { status: 201 }
  )
}
