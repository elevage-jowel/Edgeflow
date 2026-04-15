'use client'
import { useState } from 'react'
import { Trade } from '@/lib/types'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatPnl, formatR, formatDate, getPnlColor } from '@/lib/utils/formatters'
import { cn } from '@/lib/utils/cn'
import {
  Pencil, Star, ExternalLink, Send, ChevronLeft, ChevronRight,
  Clock, TrendingUp, TrendingDown, AlertTriangle, ZoomIn,
  Calendar, BarChart2, Target, Shield,
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

const GRADE_CLS: Record<string, string> = {
  'A+': 'bg-emerald-500/20 border-emerald-400 text-emerald-300',
  'A':  'bg-green-500/20 border-green-400 text-green-300',
  'B':  'bg-brand-500/20 border-brand-400 text-brand-300',
  'C':  'bg-amber-500/20 border-amber-400 text-amber-300',
  'D':  'bg-red-500/20 border-red-400 text-red-300',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{title}</div>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-surface-700/70 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs font-medium text-slate-200 text-right">{value}</span>
    </div>
  )
}

function Stars({ value }: { value?: number }) {
  if (!value) return <span className="text-xs text-slate-600">—</span>
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <Star key={n} className={cn('w-3 h-3', n <= value ? 'text-amber-400 fill-amber-400' : 'text-slate-700')} />
      ))}
    </div>
  )
}

export function TradeDetailPanel({ trade, onEdit }: TradeDetailPanelProps) {
  const { userProfile } = useAuthStore()
  const [syncing, setSyncing] = useState(false)
  const [imgIdx, setImgIdx] = useState(0)
  const [lightbox, setLightbox] = useState<string | null>(null)

  const shots = trade.screenshotUrls ?? []
  const isWin  = (trade.netPnl ?? 0) > 0
  const isLoss = (trade.netPnl ?? 0) < 0

  const duration = trade.entryDate && trade.exitDate
    ? Math.round((new Date(trade.exitDate).getTime() - new Date(trade.entryDate).getTime()) / 60000)
    : null

  const syncToNotion = async () => {
    const cfg = userProfile?.notionConfig
    if (!cfg?.integrationToken || !cfg?.databaseId) {
      toast.error('Configure Notion dans les Paramètres d\'abord'); return
    }
    setSyncing(true)
    try {
      const res = await fetch('/api/notion/sync', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: cfg.integrationToken, databaseId: cfg.databaseId, trade }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Erreur')
      toast.success('Trade exporté vers Notion ✓')
    } catch (e: any) {
      toast.error(e.message ?? 'Échec de l\'export Notion')
    } finally { setSyncing(false) }
  }

  // ── outcome color ───────────────────────────────────────────────────────────
  const heroBg = isWin ? 'from-emerald-950/80 to-surface-900' : isLoss ? 'from-red-950/80 to-surface-900' : 'from-surface-800 to-surface-900'

  return (
    <div className="flex h-[90vh] overflow-hidden rounded-2xl">

      {/* ════════════════════════════════ LEFT — Visual ════════════════════════ */}
      <div className="w-[45%] min-w-[45%] flex flex-col bg-surface-900 border-r border-surface-600">

        {/* Hero banner */}
        <div className={cn('bg-gradient-to-b px-5 py-4', heroBg)}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center',
                trade.direction === 'long' ? 'bg-emerald-500/20' : 'bg-red-500/20')}>
                {trade.direction === 'long'
                  ? <TrendingUp className="w-4.5 h-4.5 text-emerald-400" />
                  : <TrendingDown className="w-4.5 h-4.5 text-red-400" />}
              </div>
              <div>
                <div className="text-2xl font-black text-white tracking-tight leading-none">{trade.symbol}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant={trade.direction === 'long' ? 'long' : 'short'} className="text-[9px] px-1.5 py-0.5">
                    {trade.direction.toUpperCase()}
                  </Badge>
                  <span className="text-[10px] text-slate-500 capitalize">{trade.assetClass}</span>
                  {trade.status === 'open' && <Badge variant="open" className="text-[9px]">OPEN</Badge>}
                </div>
              </div>
            </div>
            {/* Grade */}
            {trade.setupGrade && (
              <span className={cn('text-xl font-black px-3 py-1 rounded-xl border-2', GRADE_CLS[trade.setupGrade] ?? '')}>
                {trade.setupGrade}
              </span>
            )}
          </div>

          {/* P&L row */}
          <div className="flex items-end gap-5">
            <div>
              <div className={cn('text-3xl font-black font-mono leading-none', getPnlColor(trade.netPnl ?? 0))}>
                {trade.netPnl !== undefined ? formatPnl(trade.netPnl) : '—'}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Net P&L</div>
            </div>
            {trade.rMultiple !== undefined && (
              <div>
                <div className={cn('text-xl font-bold font-mono', getPnlColor(trade.rMultiple))}>
                  {formatR(trade.rMultiple)}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">R Multiple</div>
              </div>
            )}
            <div className="ml-auto">
              {trade.outcome === 'win'       && <span className="px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/60 text-emerald-300 text-sm font-bold">WIN</span>}
              {trade.outcome === 'loss'      && <span className="px-3 py-1 rounded-xl bg-red-500/20 border border-red-500/60 text-red-300 text-sm font-bold">LOSS</span>}
              {trade.outcome === 'breakeven' && <span className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/60 text-amber-300 text-sm font-bold">B/E</span>}
            </div>
          </div>
        </div>

        {/* Screenshot gallery */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {shots.length > 0 ? (
            <div className="flex-1 relative bg-black/50 overflow-hidden group">
              {/* Main image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={shots[imgIdx]}
                alt="Screenshot"
                className="w-full h-full object-contain cursor-zoom-in"
                onClick={() => setLightbox(shots[imgIdx])}
              />
              {/* Zoom btn */}
              <button onClick={() => setLightbox(shots[imgIdx])}
                className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              {/* Nav arrows */}
              {shots.length > 1 && (
                <>
                  <button onClick={() => setImgIdx(i => (i - 1 + shots.length) % shots.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => setImgIdx(i => (i + 1) % shots.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
              {/* Dots */}
              {shots.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {shots.map((_, i) => (
                    <button key={i} onClick={() => setImgIdx(i)}
                      className={cn('rounded-full transition-all', i === imgIdx ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70')} />
                  ))}
                </div>
              )}
            </div>
          ) : trade.tradingViewUrl ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-surface-900/50 p-6">
              <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center">
                <ExternalLink className="w-7 h-7 text-brand-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-300 mb-1">Graphique TradingView</p>
                <p className="text-xs text-slate-500">Clique pour ouvrir le graphique</p>
              </div>
              <a href={trade.tradingViewUrl} target="_blank" rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-brand-600/20 border border-brand-500/40 text-brand-300 text-sm font-medium hover:bg-brand-600/30 transition-all flex items-center gap-2">
                <ExternalLink className="w-4 h-4" /> Voir sur TradingView
              </a>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-600">
              <BarChart2 className="w-12 h-12 opacity-20" />
              <p className="text-xs">Aucun screenshot</p>
            </div>
          )}

          {/* Thumbnail strip */}
          {shots.length > 1 && (
            <div className="flex gap-1.5 p-2 bg-surface-900/80 overflow-x-auto shrink-0">
              {shots.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={url} alt="" onClick={() => setImgIdx(i)}
                  className={cn('h-12 w-20 object-cover rounded-lg border-2 cursor-pointer shrink-0 transition-all',
                    i === imgIdx ? 'border-brand-400 opacity-100' : 'border-transparent opacity-50 hover:opacity-80')} />
              ))}
            </div>
          )}
        </div>

        {/* Action buttons row */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-surface-600 bg-surface-900/60 shrink-0">
          <button onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-brand-600/20 border border-brand-500/40 text-brand-300 text-xs font-medium hover:bg-brand-600/30 transition-all">
            <Pencil className="w-3.5 h-3.5" /> Modifier
          </button>
          <button onClick={syncToNotion} disabled={syncing}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-medium hover:bg-violet-500/20 transition-all disabled:opacity-40">
            <Send className="w-3.5 h-3.5" /> {syncing ? 'Sync…' : 'Notion'}
          </button>
          {trade.tradingViewUrl && (
            <a href={trade.tradingViewUrl} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-surface-700 border border-surface-500 text-slate-300 text-xs font-medium hover:bg-surface-600 transition-all">
              <ExternalLink className="w-3.5 h-3.5" /> Chart
            </a>
          )}
        </div>
      </div>

      {/* ════════════════════════════════ RIGHT — Info ═════════════════════════ */}
      <div className="flex-1 overflow-y-auto bg-surface-800">

        {/* Date / meta bar */}
        <div className="sticky top-0 z-10 flex items-center gap-3 px-5 py-3 bg-surface-800/95 backdrop-blur border-b border-surface-600 text-xs text-slate-400">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>{formatDate(trade.entryDate, 'MMM d, yyyy — HH:mm')}</span>
          {trade.exitDate && <><span className="text-slate-600">→</span><span>{formatDate(trade.exitDate, 'HH:mm')}</span></>}
          {duration && <><span className="text-slate-600">·</span><Clock className="w-3 h-3" /><span>{duration < 60 ? `${duration}min` : `${(duration/60).toFixed(1)}h`}</span></>}
          {trade.session && <><span className="text-slate-600">·</span><span>{trade.session}</span></>}
        </div>

        <div className="p-5 space-y-6">

          {/* ── Price grid ──────────────────────────────────────────────────── */}
          <Section title="Prix & Niveaux">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Entrée',  value: trade.entryPrice,   color: 'text-white' },
                { label: 'Sortie',  value: trade.exitPrice,    color: 'text-white' },
                { label: 'Stop',    value: trade.stopLoss,     color: 'text-red-400' },
                { label: 'Target',  value: trade.takeProfit,   color: 'text-emerald-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-surface-700/50 rounded-xl p-3">
                  <div className="text-[10px] text-slate-500 mb-1">{label}</div>
                  <div className={cn('text-sm font-bold font-mono', color)}>
                    {value !== undefined ? value : <span className="text-slate-600">—</span>}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Risk / metrics ──────────────────────────────────────────────── */}
          <Section title="Métriques">
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Quantité',   value: trade.quantity, color: 'text-white' },
                { label: 'R:R',        value: trade.riskRewardRatio ? `1:${trade.riskRewardRatio.toFixed(2)}` : undefined, color: 'text-brand-300' },
                { label: 'Frais',      value: (trade.commission ?? 0) > 0 ? formatCurrency(trade.commission) : '—', color: 'text-red-400' },
                { label: 'Risque $',   value: trade.riskAmount ? formatCurrency(trade.riskAmount) : undefined, color: 'text-amber-300' },
                { label: 'Risque %',   value: trade.riskPercent ? `${trade.riskPercent.toFixed(2)}%` : undefined, color: 'text-amber-300' },
                { label: 'Retour %',   value: trade.returnPct ? `${trade.returnPct >= 0 ? '+' : ''}${trade.returnPct.toFixed(2)}%` : undefined, color: getPnlColor(trade.returnPct ?? 0) },
              ].filter(m => m.value !== undefined).map(({ label, value, color }) => (
                <div key={label} className="bg-surface-700/50 rounded-xl p-2.5">
                  <div className="text-[10px] text-slate-500 mb-1">{label}</div>
                  <div className={cn('text-sm font-bold font-mono', color)}>{value}</div>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Setup ───────────────────────────────────────────────────────── */}
          <Section title="Setup">
            <div className="bg-surface-700/40 rounded-xl overflow-hidden">
              {trade.strategy && <Row label="Stratégie" value={<span className="text-brand-300">{trade.strategy}</span>} />}
              {trade.marketCondition && <Row label="Marché" value={trade.marketCondition} />}
              {trade.propFirm && <Row label="Prop Firm" value={trade.propFirm} />}
              {trade.accountType && <Row label="Compte" value={<span className="capitalize">{trade.accountType}</span>} />}
              {trade.accountName && <Row label="Nom compte" value={trade.accountName} />}
              {trade.tradeSource && <Row label="Source" value={<span className="capitalize">{trade.tradeSource}</span>} />}
            </div>
          </Section>

          {/* ── Notation ────────────────────────────────────────────────────── */}
          {(trade.setupGrade || trade.setupRating || trade.executionRating) && (
            <Section title="Notation">
              <div className="bg-surface-700/40 rounded-xl overflow-hidden">
                {trade.setupGrade && (
                  <Row label="Grade" value={
                    <span className={cn('px-2 py-0.5 rounded-lg text-xs font-bold border', GRADE_CLS[trade.setupGrade] ?? '')}>
                      {trade.setupGrade}
                    </span>
                  } />
                )}
                {trade.setupRating && <Row label="Qualité setup" value={<Stars value={trade.setupRating} />} />}
                {trade.executionRating && <Row label="Exécution" value={<Stars value={trade.executionRating} />} />}
              </div>
            </Section>
          )}

          {/* ── Psychology ──────────────────────────────────────────────────── */}
          {(trade.emotionBefore || trade.emotionAfter || trade.confidenceScore || trade.ruleViolated || (trade.mistakeTags?.length)) && (
            <Section title="Psychologie">
              <div className="space-y-2">
                {/* Emotions */}
                {(trade.emotionBefore || trade.emotionAfter) && (
                  <div className="bg-surface-700/40 rounded-xl p-3 flex items-center gap-4">
                    {trade.emotionBefore && (
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-3xl">{EMOTION_MAP[trade.emotionBefore] ?? '😐'}</span>
                        <div>
                          <div className="text-[10px] text-slate-500">Avant</div>
                          <div className="text-xs text-slate-300 capitalize">{trade.emotionBefore}</div>
                        </div>
                      </div>
                    )}
                    {trade.emotionBefore && trade.emotionAfter && (
                      <div className="text-slate-600 text-lg">→</div>
                    )}
                    {trade.emotionAfter && (
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-3xl">{EMOTION_MAP[trade.emotionAfter] ?? '😐'}</span>
                        <div>
                          <div className="text-[10px] text-slate-500">Après</div>
                          <div className="text-xs text-slate-300 capitalize">{trade.emotionAfter}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* Confidence */}
                {trade.confidenceScore && (
                  <div className="bg-surface-700/40 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-slate-500">Confiance</span>
                      <span className="text-xs font-bold text-slate-300">{trade.confidenceScore}/10</span>
                    </div>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5,6,7,8,9,10].map(n => (
                        <div key={n} className={cn('flex-1 h-2 rounded-full',
                          n <= trade.confidenceScore!
                            ? n <= 3 ? 'bg-red-500' : n <= 6 ? 'bg-amber-500' : 'bg-emerald-500'
                            : 'bg-surface-600'
                        )} />
                      ))}
                    </div>
                  </div>
                )}
                {/* Rule violated */}
                {trade.ruleViolated && (
                  <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-xs text-amber-300 font-medium">Règle violée — impact sur le score de discipline</span>
                  </div>
                )}
                {/* Mistake tags */}
                {(trade.mistakeTags ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {(trade.mistakeTags ?? []).map(t => (
                      <span key={t} className="px-2 py-0.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* ── Trade management ────────────────────────────────────────────── */}
          {(trade.breakEvenMoved || trade.partialsTaken || trade.lots || trade.spread || trade.slippage) && (
            <Section title="Gestion">
              <div className="bg-surface-700/40 rounded-xl overflow-hidden">
                {trade.breakEvenMoved && <Row label="Stop au BE" value={<span className="text-emerald-400">✓ Oui</span>} />}
                {trade.partialsTaken  && <Row label="Partiels pris" value={<span className="text-brand-300">✓ Oui</span>} />}
                {trade.lots    && <Row label="Lots" value={<span className="font-mono">{trade.lots}</span>} />}
                {trade.spread  && <Row label="Spread" value={<span className="font-mono">{trade.spread} pips</span>} />}
                {trade.slippage && <Row label="Slippage" value={<span className="font-mono">{trade.slippage} pips</span>} />}
              </div>
            </Section>
          )}

          {/* ── Tags ────────────────────────────────────────────────────────── */}
          {(trade.tags ?? []).length > 0 && (
            <Section title="Tags">
              <div className="flex flex-wrap gap-1.5">
                {(trade.tags ?? []).map(t => (
                  <span key={t} className="px-2.5 py-1 rounded-lg bg-brand-500/10 border border-brand-500/20 text-xs text-brand-300">{t}</span>
                ))}
              </div>
            </Section>
          )}

          {/* ── Notes ───────────────────────────────────────────────────────── */}
          {trade.preTradeNote && (
            <Section title="Biais pré-trade">
              <div className="bg-surface-900/60 border border-surface-600/50 rounded-xl p-4">
                <p className="text-sm text-slate-400 leading-relaxed italic whitespace-pre-wrap">{trade.preTradeNote}</p>
              </div>
            </Section>
          )}
          {trade.notes && (
            <Section title="Notes & Analyse">
              <div className="bg-surface-700/30 border border-surface-600/50 rounded-xl p-4">
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{trade.notes}</p>
              </div>
            </Section>
          )}

        </div>
      </div>

      {/* ── Lightbox ─────────────────────────────────────────────────────────── */}
      {lightbox && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-6 cursor-zoom-out"
          onClick={() => setLightbox(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="Screenshot" className="max-w-full max-h-full object-contain rounded-xl" />
        </div>
      )}
    </div>
  )
}
