import { getDaysInMonth, getFirstDayOfWeek } from '@/lib/dateUtils'
import { CalendarDay } from './CalendarDay'
import { format } from 'date-fns'

interface Props {
  year: number
  month: number
  dailyPnl: Map<string, number>
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function CalendarHeatmap({ year, month, dailyPnl }: Props) {
  const days = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfWeek(year, month)
  const pnlValues = Array.from(dailyPnl.values()).filter((v) => v !== 0)
  const maxAbsPnl = pnlValues.length > 0 ? Math.max(...pnlValues.map(Math.abs)) : 1

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...days.map((d) => d.getDate()),
  ]

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-slate-500">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="aspect-square" />
          }
          const dateStr = format(new Date(year, month - 1, day), 'yyyy-MM-dd')
          const pnl = dailyPnl.get(dateStr) ?? null
          return (
            <CalendarDay key={day} day={day} pnl={pnl} maxAbsPnl={maxAbsPnl} />
          )
        })}
      </div>
    </div>
  )
}
