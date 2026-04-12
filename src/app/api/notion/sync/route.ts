import { NextRequest, NextResponse } from 'next/server'
import { syncAllTrades } from '@/lib/services/notionService'
import { Trade } from '@/lib/types'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const { token, databaseId, trades } = body ?? {}

  if (!token || !databaseId || !Array.isArray(trades)) {
    return NextResponse.json({ error: 'token, databaseId et trades requis' }, { status: 400 })
  }

  try {
    const result = await syncAllTrades(token, databaseId, trades as Trade[])
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
