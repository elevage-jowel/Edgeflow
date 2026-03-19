'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'

export function TradeFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const apply = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  const clear = () => router.push(pathname)

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-36">
        <Input
          label="Symbol"
          placeholder="EURUSD"
          defaultValue={searchParams.get('symbol') ?? ''}
          onChange={(e) => apply('symbol', e.target.value)}
        />
      </div>
      <div className="w-32">
        <Select
          label="Direction"
          defaultValue={searchParams.get('direction') ?? ''}
          onChange={(e) => apply('direction', e.target.value)}
        >
          <option value="">All</option>
          <option value="LONG">LONG</option>
          <option value="SHORT">SHORT</option>
        </Select>
      </div>
      <div className="w-44">
        <Input
          label="From"
          type="date"
          defaultValue={searchParams.get('dateFrom') ?? ''}
          onChange={(e) => apply('dateFrom', e.target.value)}
        />
      </div>
      <div className="w-44">
        <Input
          label="To"
          type="date"
          defaultValue={searchParams.get('dateTo') ?? ''}
          onChange={(e) => apply('dateTo', e.target.value)}
        />
      </div>
      <Button variant="ghost" size="sm" onClick={clear}>
        Clear
      </Button>
    </div>
  )
}
