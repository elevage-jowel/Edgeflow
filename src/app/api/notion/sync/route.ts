import { NextRequest, NextResponse } from 'next/server'
import { upsertTrade } from '@/lib/services/notionService'
import { Trade } from '@/lib/types'

// Syncs a single trade — called per-trade from the client to avoid Vercel timeouts
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const { token, databaseId, trade } = body ?? {}

  if (!token || !databaseId || !trade) {
    return NextResponse.json({ error: 'token, databaseId et trade requis' }, { status: 400 })
  }

  try {
    await upsertTrade(token, databaseId, trade as Trade)
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
