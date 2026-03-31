import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, image: true, currency: true, timezone: true, riskUnit: true, accountSize: true, seeded: true },
  })
  return NextResponse.json(user)
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  try {
    const body = await request.json()
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name: body.name ?? undefined,
        currency: body.currency ?? undefined,
        timezone: body.timezone ?? undefined,
        riskUnit: body.riskUnit ?? undefined,
        accountSize: body.accountSize ?? undefined,
      },
      select: { id: true, email: true, name: true, image: true, currency: true, timezone: true, riskUnit: true, accountSize: true, seeded: true },
    })
    return NextResponse.json(user)
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
