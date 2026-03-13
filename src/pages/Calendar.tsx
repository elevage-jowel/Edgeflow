import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format,
  isSameMonth, isToday, getDay, addMonths, subMonths,
} from 'date-fns'
import { useStore } from '../store/useStore'
import { useI18n } from '../i18n'
import { getDailyPnL, formatCurrency } from '../lib/stats'
import { Header } from '../components/Layout/Header'
import { Button } from '../components/ui/Button'

const DAY_NAMES_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_NAMES_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

export function Calendar() {
  const { t } = useI18n()
  const { trades, settings } = useStore()
  const currency = settings.currency ?? 'USD'
  const lang = settings.language ?? 'en'

  const [currentDate, setCurrentDate] = useState(new Date())

  const realTrades = useMemo(() => trades.filter(t => !t.backtest_session_id), [trades])
  const dailyPnL = useMemo(() => getDailyPnL(realTrades), [realTrades])

  const dailyMap = useMemo(() => {
    const m = new Map<string, { pnl: number; trades: number }>()
    dailyPnL.forEach(d => m.set(d.date, { pnl: d.pnl, trades: d.trades }))
    return m
  }, [dailyPnL])

  const days = useMemo(() => {
    const start = startOfMonth(currentDate)
    const end = endOfMonth(currentDate)
    return eachDayOfInterval({ start, end })
  }, [currentDate])

  const startPadding = getDay(startOfMonth(currentDate)) // 0 = Sunday

  const monthPnL = useMemo(() => {
    return days.reduce((sum, day) => {
      const key = format(day, 'yyyy-MM-dd')
      return sum + (dailyMap.get(key)?.pnl ?? 0)
    }, 0)
  }, [days, dailyMap])

  const winDays = useMemo(() =>
    days.filter(d => (dailyMap.get(format(d, 'yyyy-MM-dd'))?.pnl ?? 0) > 0).length,
    [days, dailyMap]
  )
  const lossDays = useMemo(() =>
    days.filter(d => (dailyMap.get(format(d, 'yyyy-MM-dd'))?.pnl ?? 0) < 0).length,
    [days, dailyMap]
  )

  const dayNames = lang === 'fr' ? DAY_NAMES_FR : DAY_NAMES_EN

  return (
    <div>
      <Header
        title={t('calendar.title')}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<ChevronLeft size={14} />}
              onClick={() => setCurrentDate(d => subMonths(d, 1))}
            >
              {t('calendar.prev')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
            >
              {t('calendar.today')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentDate(d => addMonths(d, 1))}
            >
              {t('calendar.next')}
              <ChevronRight size={14} />
            </Button>
          </div>
        }
      />

      {/* Month Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white font-mono">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-400" />
            <span className="text-surface-400">{winDays} winning</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <span className="text-surface-400">{lossDays} losing</span>
          </div>
          <div className={`font-mono font-bold ${monthPnL >= 0 ? 'text-brand-400' : 'text-red-400'}`}>
            {monthPnL >= 0 ? '+' : ''}{formatCurrency(monthPnL, currency)}
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface-850 border border-surface-700 rounded-2xl overflow-hidden"
      >
        {/* Day names header */}
        <div className="grid grid-cols-7 border-b border-surface-700">
          {dayNames.map(day => (
            <div key={day} className="py-3 text-center text-xs font-medium text-surface-500 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {/* Padding cells */}
          {Array.from({ length: startPadding }).map((_, i) => (
            <div key={`pad-${i}`} className="h-24 border-b border-r border-surface-800/50" />
          ))}

          {days.map((day, i) => {
            const key = format(day, 'yyyy-MM-dd')
            const data = dailyMap.get(key)
            const pnl = data?.pnl ?? 0
            const tradeCount = data?.trades ?? 0
            const isCurrentMonth = isSameMonth(day, currentDate)
            const today = isToday(day)
            const hasData = tradeCount > 0

            const dayOfWeek = getDay(day)
            const isLastCol = dayOfWeek === 6 // Saturday

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.005 }}
                className={`
                  h-24 p-2 border-b border-surface-800/50 relative
                  ${!isLastCol ? 'border-r' : ''}
                  ${hasData ? 'cursor-pointer hover:brightness-110 transition-all' : ''}
                  ${pnl > 0 ? 'bg-brand-500/5' : pnl < 0 ? 'bg-red-500/5' : ''}
                  ${today ? 'ring-1 ring-inset ring-brand-500/40' : ''}
                `}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-mono font-medium ${
                    today
                      ? 'w-5 h-5 bg-brand-500 text-white rounded-full flex items-center justify-center'
                      : isCurrentMonth ? 'text-surface-300' : 'text-surface-600'
                  }`}>
                    {format(day, 'd')}
                  </span>
                  {hasData && (
                    <span className="text-xs text-surface-600">{tradeCount}t</span>
                  )}
                </div>

                {hasData && (
                  <div>
                    <p className={`font-mono font-bold text-sm leading-tight ${
                      pnl > 0 ? 'text-brand-400' : 'text-red-400'
                    }`}>
                      {pnl > 0 ? '+' : ''}{formatCurrency(pnl, currency)}
                    </p>
                    <div className={`mt-1 h-1 rounded-full ${pnl > 0 ? 'bg-brand-500/40' : 'bg-red-500/40'}`} />
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      </motion.div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-xs text-surface-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-brand-500/20 border border-brand-500/30" />
          <span>Profitable day</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/30" />
          <span>Loss day</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-surface-800 border border-brand-500/40" />
          <span>Today</span>
        </div>
      </div>
    </div>
  )
}
