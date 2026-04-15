'use client'
import { useState } from 'react'
import { Trade } from '@/lib/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatPnl, formatR, formatDate, getPnlColor } from '@/lib/utils/formatters'
import { cn } from '@/lib/utils/cn'
import {
  Pencil, Star, ExternalLink, Send, ChevronLeft, ChevronRight,
  Clock, TrendingUp, TrendingDown, AlertTriangle, Shield, Target,
  ZoomIn,
} from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'
import toast from 'react-hot-toast'

interface TradeDetailPanelProps {
  trade: Trade
  onEdit: () => void
}

const EMOTION_MAP: Record<string, string> = {
  calm: '😌', focused: '🎯', confident: '💪', hesitant: '🤔',
  fearful: '😰', greedy: '🤑', frustrated: '😤', tired: '😴',
  fomo: '😱', revenge: '😡', overconfident: '🦁', distracted: '💭',
}

function Stars({ value }: { value?: number }) {
  if (!value) return <span className="text-xs text-slate-600">—</span>
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <Star key={n} className={cn('w-3.5 h-3.5', n <= value ? 'text-amber-400 fill-amber-400' : 'text-slate-700')} />
      ))}
    </div>
  )
}

function GradeBadge({ grade }: { grade: Trade['setupGrade'] }) {
  if (!grade) return null
  const cls = grade === 'A+' ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
    : grade === 'A'  ? 'bg-green-500/20 border-green-500/60 text-green-300'
    : grade === 'B'  ? 'bg-brand-500/20 border-brand-500/60 text-brand-300'
    : grade === 'C'  ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
    : 'bg-red-500/20 border-red-500/60 text-red-300'
  return (
    <span className={cn('px-2.5 py-0.5 rounded-lg text-sm font-bold border', cls)}>{grade}</span>
  )
}

function ConfidenceDisplay({ value }: { value?: number }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5 flex-1">
        {[1,2,3,4,5,6,7,8,9,10].map(n => (
          <div key={n} className={cn('flex-1 h-1.5 rounded-full',
            n <= value
              ? n <= 3 ? 'bg-red-500' : n <= 6 ? 'bg-amber-500' : 'bg-emerald-500'
              : 'bg-surface-600'
          )} />
        ))}
      </div>
      <span className="text-xs font-bold text-slate-300 tabular-nums w-6 text-right">{value}/10</span>
    </div>
  )
}

export function TradeDetailPanel({ trade, onEdit }: TradeDetailPanelProps) {
  const { userProfile } = useAuthStore()
  const [syncing, setSyncing] = useState(false)
  const [imgIdx, setImgIdx] = useState(0)
  const [lightbox, setLightbox] = useState<string | null>(null)

  const screenshots = trade.screenshotUrls ?? []
  const hasScreenshots = screenshots.length > 0

  const isWin = (trade.netPnl ?? 0) > 0
  const isLoss = (trade.netPnl ?? 0) < 0

  const duration = trade.entryDate && trade.exitDate
    ? Math.round((new Date(trade.exitDate).getTime() - new Date(trade.entryDate).getTime()) / 60000)
    : null

  const syncToNotion = async () => {
    const cfg = userProfile?.notionConfig
    if (!cfg?.integrationToken || !cfg?.databaseId) {
      toast.error('Configure Notion dans les Paramètres d\'abord')
      return
    }
    setSyncing(true)
    try {
      const res = await fetch('/api/notion/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: cfg.integrationToken, databaseId: cfg.databaseId, trade }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Erreur')
      toast.success('Trade exporté vers Notion ✓')
    } catch (e: any) {
      toast.error(e.message ?? 'Échec de l\'export Notion')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">

      {/* ── Screenshot gallery ──────────────────────────────────────────────── */}
      {hasScreenshots ? (
        <div className="relative bg-surface-900 overflow-hidden" style={{ minHeight: 220 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={screenshots[imgIdx]}
            alt="Screenshot"
            className="w-full object-contain cursor-zoom-in"
            style={{ maxHeight: 280 }}
            onClick={() => setLightbox(screenshots[imgIdx])}
          />
          {/* Navigation arrows */}
          {screenshots.length > 1 && (
            <>
              <button onClick={() => setImgIdx(i => (i - 1 + screenshots.length) % screenshots.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-all">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setImgIdx(i => (i + 1) % screenshots.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-all">
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {screenshots.map((_, i) => (
                  <button key={i} onClick={() => setImgIdx(i)}
                    className={cn('w-1.5 h-1.5 rounded-full transition-all', i === imgIdx ? 'bg-white' : 'bg-white/30')} />
                ))}
              </div>
            </>
          )}
          {/* Zoom hint */}
          <button onClick={() => setLightbox(screenshots[imgIdx])}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-all">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          {/* Thumbnail strip */}
          {screenshots.length > 1 && (
            <div className="absolute bottom-0 left-0 right-0 flex gap-1 px-2 pb-2">
              {screenshots.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={url} alt="" onClick={() => setImgIdx(i)}
                  className={cn('h-10 w-14 object-cover rounded border-2 cursor-pointer transition-all',
                    i === imgIdx ? 'border-brand-400' : 'border-transparent opacity-60 hover:opacity-100')} />
              ))}
            </div>
          )}
        </div>
      ) : trade.tradingViewUrl ? (
        <a href={trade.tradingViewUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 py-8 bg-surface-900 text-slate-400 hover:text-brand-300 hover:bg-surface-800 transition-all border-b border-surface-600 group">
          <ExternalLink className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium">Voir le graphique sur TradingView</span>
        </a>
      ) : null}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className={cn(
        'px-5 py-4 border-b border-surface-600',
        isWin  ? 'bg-emerald-500/5' : isLoss ? 'bg-red-500/5' : 'bg-surface-800/50'
      )}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold',
              trade.direction === 'long' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
            )}>
              {trade.direction === 'long' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-white tracking-tight">{trade.symbol}</span>
                {trade.setupGrade && <GradeBadge grade={trade.setupGrade} />}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <Badge variant={trade.direction === 'long' ? 'long' : 'short'} className="text-[10px]">
                  {trade.direction.toUpperCase()}
                </Badge>
                <span className="text-xs text-slate-500 capitalize">{trade.assetClass}</span>
                {trade.session && <><span className="text-slate-700">·</span><span className="text-xs text-slate-500">{trade.session}</span></>}
                {duration && <><span className="text-slate-700">·</span><span className="text-xs text-slate-500 flex items-center gap-0.5"><Clock className="w-3 h-3" />{duration < 60 ? `${duration}min` : `${(duration/60).toFixed(1)}h`}</span></>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {trade.tradingViewUrl && (
              <a href={trade.tradingViewUrl} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-surface-700 hover:bg-surface-600 text-slate-400 hover:text-brand-300 flex items-center justify-center transition-all" title="TradingView">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button onClick={syncToNotion} disabled={syncing}
              className="w-8 h-8 rounded-lg bg-surface-700 hover:bg-violet-500/20 text-slate-400 hover:text-violet-300 flex items-center justify-center transition-all disabled:opacity-40" title="Exporter vers Notion">
              <Send className="w-3.5 h-3.5" />
            </button>
            <button onClick={onEdit}
              className="w-8 h-8 rounded-lg bg-surface-700 hover:bg-brand-500/20 text-slate-400 hover:text-brand-300 flex items-center justify-center transition-all" title="Modifier">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* P&L hero */}
        <div className="flex items-end gap-4">
          <div>
            <div className={cn('text-3xl font-black font-mono leading-none', getPnlColor(trade.netPnl ?? 0))}>
              {trade.netPnl !== undefined ? formatPnl(trade.netPnl) : trade.status === 'open' ? '—' : '—'}
            </div>
            <div className="text-xs text-slate-500 mt-1">Net P&L</div>
          </div>
          {trade.rMultiple !== undefined && (
            <div className="pb-[3px]">
              <div className={cn('text-xl font-bold font-mono', getPnlColor(trade.rMultiple))}>
                {formatR(trade.rMultiple)}
              </div>
              <div className="text-xs text-slate-500 mt-1">R Multiple</div>
            </div>
          )}
          {trade.returnPct !== undefined && (
            <div className="pb-[3px]">
              <div className={cn('text-xl font-bold font-mono', getPnlColor(trade.returnPct))}>
                {trade.returnPct >= 0 ? '+' : ''}{trade.returnPct.toFixed(2)}%
              </div>
              <div className="text-xs text-slate-500 mt-1">Retour</div>
            </div>
          )}
          <div className="ml-auto">
            {trade.status === 'open' ? (
              <Badge variant="open">OPEN</Badge>
            ) : trade.outcome ? (
              <Badge variant={trade.outcome === 'win' ? 'win' : trade.outcome === 'loss' ? 'loss' : 'breakeven'}>
                {trade.outcome === 'win' ? 'WIN' : trade.outcome === 'loss' ? 'LOSS' : 'B/E'}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">

        {/* ── Price grid ────────────────────────────────────────────────────── */}
        <div>
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Prix</div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Entrée',   value: `${trade.entryPrice.toFixed(trade.entryPrice < 10 ? 5 : 2)}`, color: 'text-white' },
              { label: 'Sortie',   value: trade.exitPrice ? `${trade.exitPrice.toFixed(trade.exitPrice < 10 ? 5 : 2)}` : '—', color: 'text-white' },
              { label: 'Stop',     value: trade.stopLoss ? `${trade.stopLoss}` : '—', color: 'text-red-400' },
              { label: 'Target',   value: trade.takeProfit ? `${trade.takeProfit}` : '—', color: 'text-emerald-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-surface-700/50 rounded-xl p-2.5 text-center">
                <div className={cn('text-sm font-bold font-mono', color)}>{value}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Risk metrics ───────────────────────────────────────────────────── */}
        {(trade.riskRewardRatio || trade.riskAmount || trade.commission || trade.quantity) && (
          <div>
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Métriques</div>
            <div className="grid grid-cols-3 gap-2">
              {trade.riskRewardRatio && (
                <div className="bg-surface-700/50 rounded-xl p-2.5 text-center">
                  <div className="text-sm font-bold text-white font-mono">1:{trade.riskRewardRatio.toFixed(2)}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">R:R</div>
                </div>
              )}
              <div className="bg-surface-700/50 rounded-xl p-2.5 text-center">
                <div className="text-sm font-bold text-white font-mono">{trade.quantity}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Quantité</div>
              </div>
              {(trade.commission ?? 0) > 0 && (
                <div className="bg-surface-700/50 rounded-xl p-2.5 text-center">
                  <div className="text-sm font-bold text-red-400 font-mono">-{formatCurrency(trade.commission)}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Frais</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Setup / Strategy ───────────────────────────────────────────────── */}
        {(trade.strategy || trade.marketCondition) && (
          <div>
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Setup</div>
            <div className="flex flex-wrap gap-2">
              {trade.strategy && (
                <span className="px-3 py-1.5 rounded-lg bg-brand-500/10 border border-brand-500/30 text-xs text-brand-300 font-medium">
                  {trade.strategy}
                </span>
              )}
              {trade.marketCondition && (
                <span className="px-3 py-1.5 rounded-lg bg-surface-700/60 border border-surface-500 text-xs text-slate-300">
                  {trade.marketCondition}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Ratings ────────────────────────────────────────────────────────── */}
        {(trade.setupRating || trade.executionRating || trade.setupGrade) && (
          <div>
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Notation</div>
            <div className="bg-surface-700/40 rounded-xl p-3 space-y-2.5">
              {trade.setupGrade && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Grade</span>
                  <GradeBadge grade={trade.setupGrade} />
                </div>
              )}
              {trade.setupRating && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Qualité setup</span>
                  <Stars value={trade.setupRating} />
                </div>
              )}
              {trade.executionRating && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Exécution</span>
                  <Stars value={trade.executionRating} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Psychology ─────────────────────────────────────────────────────── */}
        {(trade.emotionBefore || trade.emotionAfter || trade.confidenceScore) && (
          <div>
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Psychologie</div>
            <div className="bg-surface-700/40 rounded-xl p-3 space-y-3">
              {(trade.emotionBefore || trade.emotionAfter) && (
                <div className="flex items-center gap-3">
                  {trade.emotionBefore && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-2xl">{EMOTION_MAP[trade.emotionBefore] ?? '😐'}</span>
                      <div>
                        <div className="text-[10px] text-slate-500">Avant</div>
                        <div className="text-xs text-slate-300 capitalize">{trade.emotionBefore}</div>
                      </div>
                    </div>
                  )}
                  {trade.emotionBefore && trade.emotionAfter && (
                    <div className="text-slate-600 text-sm">→</div>
                  )}
                  {trade.emotionAfter && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-2xl">{EMOTION_MAP[trade.emotionAfter] ?? '😐'}</span>
                      <div>
                        <div className="text-[10px] text-slate-500">Après</div>
                        <div className="text-xs text-slate-300 capitalize">{trade.emotionAfter}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {trade.confidenceScore && (
                <div>
                  <div className="text-[10px] text-slate-500 mb-1.5">Confiance</div>
                  <ConfidenceDisplay value={trade.confidenceScore} />
                </div>
              )}
              {trade.ruleViolated && (
                <div className="flex items-center gap-2 py-1.5 px-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-xs text-amber-300">Règle violée</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Mistake tags ───────────────────────────────────────────────────── */}
        {(trade.mistakeTags ?? []).length > 0 && (
          <div>
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Tags d&apos;erreurs</div>
            <div className="flex flex-wrap gap-1.5">
              {(trade.mistakeTags ?? []).map(tag => (
                <span key={tag} className="px-2 py-0.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400">{tag}</span>
              ))}
            </div>
          </div>
        )}

        {/* ── Tags ───────────────────────────────────────────────────────────── */}
        {(trade.tags ?? []).length > 0 && (
          <div>
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Tags</div>
            <div className="flex flex-wrap gap-1.5">
              {(trade.tags ?? []).map(tag => (
                <span key={tag} className="px-2.5 py-1 rounded-lg bg-brand-500/10 border border-brand-500/20 text-xs text-brand-300">{tag}</span>
              ))}
            </div>
          </div>
        )}

        {/* ── Notes ─────────────────────────────────────────────────────────── */}
        {trade.notes && (
          <div>
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Notes</div>
            <p className="text-sm text-slate-300 bg-surface-700/40 rounded-xl p-4 leading-relaxed border border-surface-600/50 whitespace-pre-wrap">{trade.notes}</p>
          </div>
        )}

        {/* ── Pre-trade note ─────────────────────────────────────────────────── */}
        {trade.preTradeNote && (
          <div>
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Biais pré-trade</div>
            <p className="text-sm text-slate-400 bg-surface-900/60 rounded-xl p-3 leading-relaxed border border-surface-600/30 italic whitespace-pre-wrap">{trade.preTradeNote}</p>
          </div>
        )}

        {/* ── Date footer ────────────────────────────────────────────────────── */}
        <div className="pt-1 border-t border-surface-600/50 flex items-center justify-between text-xs text-slate-600">
          <span>{formatDate(trade.entryDate, 'MMM d, yyyy — HH:mm')}</span>
          {trade.exitDate && <span>→ {formatDate(trade.exitDate, 'HH:mm')}</span>}
        </div>
      </div>

      {/* ── Lightbox ──────────────────────────────────────────────────────────── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="Screenshot" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
        </div>
      )}
    </div>
  )
}
