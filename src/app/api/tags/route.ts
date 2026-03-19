import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TagSchema } from '@/lib/validations'

export async function GET() {
  const tags = await prisma.tag.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json({ tags })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = TagSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const tag = await prisma.tag.create({ data: parsed.data })
  return NextResponse.json({ tag }, { status: 201 })
}
