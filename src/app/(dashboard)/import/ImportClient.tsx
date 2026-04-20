'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import { useTradeActions } from '@/lib/hooks/useTrades'
import { useAuthStore } from '@/lib/stores/authStore'
import { Trade } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils/cn'
import toast from 'react-hot-toast'
import { Upload, FileText, ArrowRight, CheckCircle2, AlertTriangle, X, ChevronDown } from 'lucide-react'

type Step = 'upload' | 'mapping' | 'preview' | 'done'

const EDGEFLOW_FIELDS = [
  { key: 'symbol',    label: 'Symbole',              required: true  },
  { key: 'entryDate', label: 'Date d\'entrée',        required: true  },
  { key: 'entryPrice',label: 'Prix d\'entrée',        required: true  },
  { key: 'exitDate',  label: 'Date de sortie',        required: false },
  { key: 'exitPrice', label: 'Prix de sortie',        required: false },
  { key: 'quantity',  label: 'Quantité',              required: true  },
  { key: 'direction', label: 'Direction (long/short)',required: false },
  { key: 'assetClass',label: 'Classe d\'actif',       required: false },
  { key: 'netPnl',    label: 'Net P&L',               required: false },
  { key: 'commission',label: 'Commission',            required: false },
  { key: 'notes',     label: 'Notes',                 required: false },
]

// ── Broker presets ────────────────────────────────────────────────────────────
interface BrokerPreset {
  id: string
  name: string
  mapping: Record<string, string>
}

const BROKER_PRESETS: BrokerPreset[] = [
  {
    id: 'tradovate',
    name: 'Tradovate',
    mapping: {
      symbol:     'Symbol',
      entryDate:  'Buy Fill Time',
      entryPrice: 'Avg Buy Price',
      exitDate:   'Sell Fill Time',
      exitPrice:  'Avg Sell Price',
      quantity:   'Qty',
      netPnl:     'P&L',
      commission: 'Comm',
    },
  },
  {
    id: 'mt4',
    name: 'MetaTrader 4/5',
    mapping: {
      symbol:     'Symbol',
      entryDate:  'Open Time',
      entryPrice: 'Open Price',
      exitDate:   'Close Time',
      exitPrice:  'Close Price',
      quantity:   'Volume',
      direction:  'Type',
      netPnl:     'Profit',
      commission: 'Commission',
    },
  },
  {
    id: 'ibkr',
    name: 'Interactive Brokers',
    mapping: {
      symbol:     'Symbol',
      entryDate:  'Date/Time',
      entryPrice: 'T. Price',
      quantity:   'Quantity',
      netPnl:     'Realized P/L',
      commission: 'Comm/Fee',
    },
  },
  {
    id: 'thinkorswim',
    name: 'ThinkorSwim / Schwab',
    mapping: {
      symbol:     'Symbol',
      entryDate:  'Date',
      entryPrice: 'Price',
      quantity:   'Qty',
      direction:  'Side',
      netPnl:     'P/L Open',
      commission: 'Commissions',
    },
  },
  {
    id: 'ninjatrader',
    name: 'NinjaTrader',
    mapping: {
      symbol:     'Instrument',
      entryDate:  'Entry time',
      entryPrice: 'Entry price',
      exitDate:   'Exit time',
      exitPrice:  'Exit price',
      quantity:   'Qty',
      direction:  'Market pos.',
      netPnl:     'Profit',
      commission: 'Commission',
    },
  },
  {
    id: 'rithmic',
    name: 'Rithmic / R Trader',
    mapping: {
      symbol:     'Symbol',
      entryDate:  'Entry Time',
      entryPrice: 'Entry Price',
      exitDate:   'Close Time',
      exitPrice:  'Close Price',
      quantity:   'Qty',
      direction:  'Side',
      netPnl:     'PnL',
      commission: 'Commission',
    },
  },
  {
    id: 'tradezero',
    name: 'TradeZero',
    mapping: {
      symbol:     'Symbol',
      entryDate:  'Trade Date',
      entryPrice: 'Price',
      quantity:   'Quantity',
      direction:  'Side',
      netPnl:     'Net Amount',
      commission: 'Commission',
    },
  },
  {
    id: 'custom',
    name: 'CSV personnalisé',
    mapping: {},
  },
]

const SYNONYMS: Record<string, string[]> = {
  symbol:     ['symbol', 'ticker', 'instrument', 'contract'],
  entryDate:  ['entrydate', 'open date', 'opendate', 'entry date', 'buy fill time', 'open time', 'date/time', 'date', 'entry time'],
  entryPrice: ['entryprice', 'entry price', 'open price', 'openprice', 'avg price', 'avg buy price', 't. price', 'price', 'entry price'],
  exitDate:   ['exitdate', 'close date', 'closedate', 'exit date', 'sell fill time', 'close time', 'exit time'],
  exitPrice:  ['exitprice', 'exit price', 'close price', 'closeprice', 'avg sell price', 'exit price'],
  quantity:   ['quantity', 'qty', 'size', 'shares', 'contracts', 'lots', 'volume'],
  direction:  ['direction', 'side', 'type', 'action', 'market pos.'],
  netPnl:     ['netpnl', 'net p&l', 'pnl', 'profit/loss', 'profit', 'p/l', 'realized p/l', 'p&l', 'p/l open'],
  commission: ['commission', 'fee', 'fees', 'cost', 'comm', 'comm/fee', 'commissions'],
  notes:      ['notes', 'comment', 'description'],
}

function autoMap(fields: string[]): Record<string, string> {
  const auto: Record<string, string> = {}
  const lf = fields.map(f => f.toLowerCase())
  EDGEFLOW_FIELDS.forEach(ef => {
    const syns = SYNONYMS[ef.key] ?? []
    const idx = lf.findIndex(l => syns.map(s => s.replace(/\s+/g, '')).includes(l.replace(/\s+/g, '')))
    if (idx >= 0) auto[ef.key] = fields[idx]
  })
  return auto
}

function parseRow(row: Record<string, string>, mapping: Record<string, string>, userId: string): Partial<Trade> | null {
  const get = (field: string) => {
    const col = mapping[field]
    return col ? row[col] : undefined
  }
  const symbol = get('symbol')
  const entryPrice = parseFloat(get('entryPrice') ?? '')
  const quantity = parseFloat(get('quantity') ?? '')
  const entryDateStr = get('entryDate')

  if (!symbol || isNaN(entryPrice) || isNaN(quantity) || !entryDateStr) return null

  const entryDateParsed = new Date(entryDateStr)
  if (isNaN(entryDateParsed.getTime())) return null

  const exitPriceRaw = get('exitPrice')
  const exitPrice = exitPriceRaw ? parseFloat(exitPriceRaw) : undefined
  const netPnlRaw = get('netPnl')
  const netPnl = netPnlRaw ? parseFloat(netPnlRaw) : undefined
  const dirRaw = (get('direction') ?? 'long').toLowerCase()
  const direction: 'long' | 'short' = dirRaw.includes('short') || dirRaw === 's' || dirRaw === 'sell' ? 'short' : 'long'
  const assetClassRaw = (get('assetClass') ?? 'stocks').toLowerCase()
  const assetClass = ['stocks', 'options', 'futures', 'forex', 'crypto'].includes(assetClassRaw) ? assetClassRaw as any : 'stocks'
  const commission = parseFloat(get('commission') ?? '0') || 0
  const gross = exitPrice ? ((exitPrice - entryPrice) * quantity * (direction === 'long' ? 1 : -1)) : undefined
  const computedNet = gross !== undefined ? gross - commission : netPnl

  return {
    userId,
    symbol: symbol.toUpperCase(),
    assetClass,
    direction,
    status: exitPrice ? 'closed' : 'open',
    outcome: computedNet !== undefined ? (computedNet > 0 ? 'win' : computedNet < 0 ? 'loss' : 'breakeven') : undefined,
    entryDate: entryDateParsed.toISOString(),
    exitDate: (() => {
      const d = get('exitDate')
      if (!d) return undefined
      const p = new Date(d)
      return isNaN(p.getTime()) ? undefined : p.toISOString()
    })(),
    entryPrice,
    exitPrice,
    quantity,
    commission,
    grossPnl: gross ? parseFloat(gross.toFixed(2)) : undefined,
    netPnl: computedNet !== undefined ? parseFloat(computedNet.toFixed(2)) : undefined,
    tags: [],
    notes: get('notes') ?? '',
    screenshotUrls: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export default function ImportClient() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { createTrade } = useTradeActions()
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [parsed, setParsed] = useState<(Partial<Trade> | null)[]>([])
  const [importing, setImporting] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const [selectedPreset, setSelectedPreset] = useState<string>('custom')

  const applyPreset = (presetId: string, fields: string[]) => {
    setSelectedPreset(presetId)
    const preset = BROKER_PRESETS.find(p => p.id === presetId)
    if (!preset) return
    if (presetId === 'custom') {
      setMapping(autoMap(fields))
      return
    }
    // Match preset columns against actual CSV headers (case-insensitive)
    const lf = fields.map(f => f.toLowerCase())
    const newMapping: Record<string, string> = {}
    EDGEFLOW_FIELDS.forEach(ef => {
      const presetCol = preset.mapping[ef.key]
      if (!presetCol) return
      const idx = lf.indexOf(presetCol.toLowerCase())
      if (idx >= 0) newMapping[ef.key] = fields[idx]
    })
    setMapping(newMapping)
  }

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0]
    if (!f) return
    setFile(f)
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, meta }) => {
        const fields = meta.fields ?? []
        setHeaders(fields)
        setRows(data as Record<string, string>[])
        setMapping(autoMap(fields))
        setStep('mapping')
      },
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'application/vnd.ms-excel': ['.csv'] },
    maxFiles: 1,
  })

  const handlePreview = () => {
    if (!user) return
    const p = rows.map(r => parseRow(r, mapping, user.uid))
    setParsed(p)
    setStep('preview')
  }

  const handleImport = async () => {
    setImporting(true)
    let count = 0
    let errors = 0
    for (const t of parsed) {
      if (!t) continue
      try {
        await createTrade(t as any)
        count++
      } catch {
        errors++
      }
    }
    setImportedCount(count)
    setStep('done')
    setImporting(false)
    if (errors > 0) toast.error(`${errors} trade(s) n'ont pas pu être importés`)
    else toast.success(`${count} trade(s) importés avec succès !`)
  }

  const reset = () => {
    setStep('upload')
    setFile(null)
    setHeaders([])
    setRows([])
    setMapping({})
    setParsed([])
    setImportedCount(0)
    setSelectedPreset('custom')
  }

  const validCount = parsed.filter(Boolean).length
  const errorCount = parsed.filter(p => p === null).length

  const STEPS = ['Fichier', 'Colonnes', 'Aperçu', 'Terminé']
  const stepIndex = { upload: 0, mapping: 1, preview: 2, done: 3 }[step]

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">Importer des trades</h2>
        <p className="text-sm text-slate-500">Importe un CSV depuis n'importe quel courtier ou prop firm</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
              i < stepIndex ? 'bg-brand-600 border-brand-600 text-white' :
              i === stepIndex ? 'border-brand-500 text-brand-400' :
              'border-surface-500 text-slate-600'
            )}>
              {i < stepIndex ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            <span className={cn('text-xs font-medium', i === stepIndex ? 'text-white' : 'text-slate-500')}>{s}</span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-surface-500" />}
          </div>
        ))}
      </div>

      {/* Step 1 — Upload */}
      {step === 'upload' && (
        <>
          <div {...getRootProps()} className={cn(
            'border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all',
            isDragActive ? 'border-brand-500 bg-brand-500/10' : 'border-surface-400 hover:border-brand-500/50 hover:bg-surface-800'
          )}>
            <input {...getInputProps()} />
            <div className="w-16 h-16 rounded-2xl bg-surface-700 flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-brand-400" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">
              {isDragActive ? 'Dépose ici !' : 'Dépose ton fichier CSV'}
            </h3>
            <p className="text-sm text-slate-500 mb-4">Tradovate, MT4/MT5, IBKR, ThinkorSwim, NinjaTrader et tout CSV personnalisé</p>
            <Button variant="outline" size="sm">Parcourir les fichiers</Button>
          </div>

          {/* Broker chips */}
          <div className="bg-surface-800 border border-surface-500 rounded-xl p-4">
            <div className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wide">Courtiers supportés</div>
            <div className="flex flex-wrap gap-2">
              {BROKER_PRESETS.map(p => (
                <Badge key={p.id} variant="default">{p.name}</Badge>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Step 2 — Mapping */}
      {step === 'mapping' && (
        <div className="bg-surface-800 border border-surface-500 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-brand-400" />
              <div>
                <div className="text-sm font-semibold text-white">{file?.name}</div>
                <div className="text-xs text-slate-500">{rows.length} lignes détectées</div>
              </div>
            </div>

            {/* Preset selector */}
            <div className="relative">
              <label className="text-xs text-slate-500 block mb-1">Preset courtier</label>
              <div className="relative">
                <select
                  value={selectedPreset}
                  onChange={e => applyPreset(e.target.value, headers)}
                  className="appearance-none pl-3 pr-8 py-2 bg-surface-700 border border-surface-500 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500 cursor-pointer"
                >
                  {BROKER_PRESETS.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-400">Associe les colonnes de ton CSV aux champs Edgeflow :</p>

          <div className="space-y-3">
            {EDGEFLOW_FIELDS.map(field => (
              <div key={field.key} className="flex items-center gap-4">
                <div className="w-52 shrink-0">
                  <span className="text-sm text-slate-300">{field.label}</span>
                  {field.required && <span className="text-red-400 ml-1">*</span>}
                </div>
                <select
                  value={mapping[field.key] ?? ''}
                  onChange={e => setMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                  className="flex-1 px-3 py-2 bg-surface-700 border border-surface-500 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="">— Ignorer —</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                {mapping[field.key] && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={reset}>Retour</Button>
            <Button variant="primary" iconRight={ArrowRight} onClick={handlePreview}>Aperçu de l'import</Button>
          </div>
        </div>
      )}

      {/* Step 3 — Preview */}
      {step === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400">{validCount} trade{validCount > 1 ? 's' : ''} valide{validCount > 1 ? 's' : ''}</span>
            </div>
            {errorCount > 0 && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-400">{errorCount} ligne{errorCount > 1 ? 's' : ''} invalide{errorCount > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          <div className="bg-surface-800 border border-surface-500 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto max-h-96">
              <table className="w-full min-w-max">
                <thead className="sticky top-0 bg-surface-800">
                  <tr className="border-b border-surface-500">
                    {['#', 'Symbole', 'Date entrée', 'Entrée', 'Sortie', 'Qté', 'P&L', 'Statut'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-600">
                  {parsed.map((t, i) => (
                    <tr key={i} className={cn('transition-colors', t === null ? 'bg-red-500/5' : 'hover:bg-surface-700/40')}>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{i + 1}</td>
                      {t === null ? (
                        <td colSpan={7} className="px-4 py-2.5">
                          <div className="flex items-center gap-2 text-xs text-red-400">
                            <X className="w-3.5 h-3.5" /> Ligne invalide — champs requis manquants
                          </div>
                        </td>
                      ) : (
                        <>
                          <td className="px-4 py-2.5 text-sm font-bold text-white">{t.symbol}</td>
                          <td className="px-4 py-2.5 text-xs text-slate-400">{t.entryDate?.slice(0, 10)}</td>
                          <td className="px-4 py-2.5 text-sm font-mono text-slate-300">${t.entryPrice}</td>
                          <td className="px-4 py-2.5 text-sm font-mono text-slate-300">{t.exitPrice ? `$${t.exitPrice}` : '—'}</td>
                          <td className="px-4 py-2.5 text-sm font-mono text-slate-300">{t.quantity}</td>
                          <td className="px-4 py-2.5 text-sm font-bold font-mono">
                            {t.netPnl !== undefined ? (
                              <span className={t.netPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                {t.netPnl >= 0 ? '+' : ''}${t.netPnl?.toFixed(2)}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge variant={t.status === 'open' ? 'open' : (t.netPnl ?? 0) >= 0 ? 'win' : 'loss'}>
                              {t.status}
                            </Badge>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setStep('mapping')}>Retour</Button>
            <Button variant="primary" loading={importing} onClick={handleImport} disabled={validCount === 0}>
              Importer {validCount} trade{validCount > 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4 — Done */}
      {step === 'done' && (
        <div className="bg-surface-800 border border-surface-500 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Import terminé !</h3>
          <p className="text-slate-400 mb-6">{importedCount} trade{importedCount > 1 ? 's ont été ajoutés' : ' a été ajouté'} à ton journal.</p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="ghost" onClick={reset}>Importer un autre fichier</Button>
            <Button variant="primary" onClick={() => router.push('/journal')}>Voir le journal</Button>
          </div>
        </div>
      )}
    </div>
  )
}
