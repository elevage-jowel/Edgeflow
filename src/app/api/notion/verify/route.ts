import { NextRequest, NextResponse } from 'next/server'
import { verifyNotionConnection } from '@/lib/services/notionService'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Token manquant' }, { status: 400 })
  }

  const result = await verifyNotionConnection(token)
  return NextResponse.json(result, { status: result.ok ? 200 : 401 })
}
