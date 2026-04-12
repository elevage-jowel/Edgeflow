import { NextRequest, NextResponse } from 'next/server'
import { createTradesDatabase } from '@/lib/services/notionService'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const { token, parentPageId } = body ?? {}

  if (!token || !parentPageId) {
    return NextResponse.json({ error: 'token et parentPageId requis' }, { status: 400 })
  }

  try {
    const result = await createTradesDatabase(token, parentPageId)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
