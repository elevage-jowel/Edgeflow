import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const ImportBodySchema = z.object({
  trades: z.array(
    z.object({
      symbol: z.string(),
      direction: z.enum(['LONG', 'SHORT']),
      entryPrice: z.number(),
      exitPrice: z.number(),
      quantity: z.number(),
      entryDate: z.string(),
      exitDate: z.string(),
      profit: z.number(),
      commission: z.number().default(0),
      swap: z.number().default(0),
      externalId: z.string().optional(),
    })
  ),
  source: z.enum(['mt4', 'mt5']),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = ImportBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { trades, source } = parsed.data
  let imported = 0
  let skipped = 0
  const errors: string[] = []

  for (const row of trades) {
    try {
      const pnl = row.profit + row.commission + row.swap
      const data = {
        symbol: row.symbol,
        direction: row.direction,
        entryPrice: row.entryPrice,
        exitPrice: row.exitPrice,
        quantity: row.quantity,
        entryDate: new Date(row.entryDate),
        exitDate: new Date(row.exitDate),
        pnl,
        commission: row.commission,
        swap: row.swap,
        fees: 0,
        importSource: source,
        externalId: row.externalId ?? null,
      }

      if (row.externalId) {
        const result = await prisma.trade.upsert({
          where: { externalId_importSource: { externalId: row.externalId, importSource: source } },
          create: data,
          update: data,
        })
        // Check if it was a create (new) or update (existing)
        const age = Date.now() - result.createdAt.getTime()
        if (age < 5000) imported++
        else skipped++
      } else {
        await prisma.trade.create({ data })
        imported++
      }
    } catch (err) {
      errors.push(`Row ${row.externalId ?? '?'}: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  return NextResponse.json({ imported, skipped, errors })
}
