import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot, Plus, Trash2, Play, Square, RefreshCw, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle, Clock, Target, TrendingUp, Eye, EyeOff,
  Zap, Activity, Settings2,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { Header } from '../components/Layout/Header'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { analyzeSetupWithClaude } from '../lib/claude'
import { fetchCandles, isCryptoSymbol } from '../lib/marketData'
import type { TradingSetup, ScanResult, TimeframeKey } from '../types/monitor'

const TIMEFRAMES: { value: TimeframeKey; label: string }[] = [
  { value: '1m',  label: '1 min' },
  { value: '5m',  label: '5 min' },
  { value: '15m', label: '15 min' },
  { value: '30m', label: '30 min' },
  { value: '1h',  label: '1 Heure' },
  { value: '4h',  label: '4 Heures' },
  { value: '1d',  label: '1 Jour' },
]

const SCAN_INTERVAL_MS = 10 * 60 * 1000  // 10 minutes

// ─── Setup Form ───────────────────────────────────────────────────────────────

interface SetupFormProps {
  initial?: TradingSetup | null
  onSave: (s: Omit<TradingSetup, 'id' | 'created_at'>) => void
  onCancel: () => void
}

function SetupForm({ initial, onSave, onCancel }: SetupFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [rules, setRules] = useState(initial?.rules ?? '')
  const [symbolsRaw, setSymbolsRaw] = useState((initial?.symbols ?? []).join(', '))
  const [timeframe, setTimeframe] = useState<TimeframeKey>(initial?.timeframe ?? '1h')
  const [active, setActive] = useState(initial?.active ?? true)

  const handleSubmit = () => {
    const symbols = symbolsRaw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
    if (!name.trim() || !description.trim() || symbols.length === 0) return
    onSave({ name: name.trim(), description: description.trim(), rules: rules.trim() || undefined, symbols, timeframe, active })
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="bg-surface-850 border border-surface-700 rounded-xl p-5 space-y-4"
    >
      <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
        {initial ? 'Modifier le Setup' : 'Nouveau Setup'}
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Nom du Setup"
          placeholder="Ex: Double Bottom, Bull Flag..."
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <div>
          <label className="block text-xs font-medium text-surface-400 uppercase tracking-wider mb-1.5">
            Timeframe
          </label>
          <select
            value={timeframe}
            onChange={e => setTimeframe(e.target.value as TimeframeKey)}
            className="w-full bg-surface-800 border border-surface-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
          >
            {TIMEFRAMES.map(tf => (
              <option key={tf.value} value={tf.value}>{tf.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-surface-400 uppercase tracking-wider mb-1.5">
          Symboles à surveiller
        </label>
        <input
          value={symbolsRaw}
          onChange={e => setSymbolsRaw(e.target.value)}
          placeholder="BTCUSDT, ETHUSDT, AAPL, EURUSD..."
          className="w-full bg-surface-800 border border-surface-600 rounded-lg px-3 py-2 text-sm text-white placeholder-surface-500 focus:outline-none focus:border-brand-500"
        />
        <p className="text-xs text-surface-500 mt-1">
          Crypto (Binance) = gratuit. Actions/Forex = clé Alpha Vantage requise dans Paramètres.
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-surface-400 uppercase tracking-wider mb-1.5">
          Description du Setup <span className="text-brand-400">*</span>
        </label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Décris le setup: ex. Double creux avec rebond sur support, bougies de confirmation haussières, RSI divergence..."
          rows={3}
          className="w-full bg-surface-800 border border-surface-600 rounded-lg px-3 py-2 text-sm text-white placeholder-surface-500 focus:outline-none focus:border-brand-500 resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-surface-400 uppercase tracking-wider mb-1.5">
          Règles d'entrée (optionnel)
        </label>
        <textarea
          value={rules}
          onChange={e => setRules(e.target.value)}
          placeholder="Ex: Entrée sur cassure du neck-line avec volume > moyenne 20, SL sous le creux, TP 2R..."
          rows={2}
          className="w-full bg-surface-800 border border-surface-600 rounded-lg px-3 py-2 text-sm text-white placeholder-surface-500 focus:outline-none focus:border-brand-500 resize-none"
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <div
            onClick={() => setActive(!active)}
            className={`w-10 h-5 rounded-full transition-colors ${active ? 'bg-brand-500' : 'bg-surface-600'} relative`}
          >
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${active ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-sm text-surface-300">Setup actif</span>
        </label>

        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel}>Annuler</Button>
          <Button size="sm" onClick={handleSubmit} disabled={!name || !description || !symbolsRaw}>
            Enregistrer
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Confidence Bar ───────────────────────────────────────────────────────────

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 70 ? 'bg-brand-500' : value >= 40 ? 'bg-amber-500' : 'bg-surface-600'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-surface-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className={`text-xs font-mono font-bold ${value >= 70 ? 'text-brand-400' : value >= 40 ? 'text-amber-400' : 'text-surface-500'}`}>
        {value}%
      </span>
    </div>
  )
}

// ─── Scan Result Card ─────────────────────────────────────────────────────────

function ScanResultCard({ result }: { result: ScanResult }) {
  const [expanded, setExpanded] = useState(false)
  const isAlert = result.detected && result.confidence >= 70

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`border rounded-xl overflow-hidden ${
        isAlert
          ? 'border-brand-500/40 bg-brand-500/5'
          : result.detected
          ? 'border-amber-500/30 bg-amber-500/5'
          : 'border-surface-700 bg-surface-850'
      }`}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {isAlert ? (
          <Zap size={16} className="text-brand-400 flex-shrink-0" />
        ) : result.detected ? (
          <CheckCircle size={16} className="text-amber-400 flex-shrink-0" />
        ) : (
          <div className="w-4 h-4 rounded-full border border-surface-600 flex-shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-white text-sm">{result.symbol}</span>
            <span className="text-xs text-surface-500 bg-surface-800 px-1.5 py-0.5 rounded">{result.timeframe}</span>
            <span className="text-xs text-surface-400 truncate">{result.setup_name}</span>
          </div>
          <div className="mt-1">
            <ConfidenceBar value={result.confidence} />
          </div>
        </div>

        <div className="text-right flex-shrink-0 ml-2">
          <p className="font-mono text-xs text-white">${result.current_price.toFixed(result.current_price > 100 ? 2 : 4)}</p>
          <p className="text-xs text-surface-500">{new Date(result.scanned_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>

        {expanded ? <ChevronUp size={14} className="text-surface-500" /> : <ChevronDown size={14} className="text-surface-500" />}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-surface-700 px-4 py-3 space-y-2"
          >
            <p className="text-sm text-surface-300 leading-relaxed">{result.analysis}</p>
            {result.key_levels && (
              <div className="flex items-center gap-2 text-xs text-surface-400">
                <Target size={12} />
                <span className="font-mono">{result.key_levels}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Countdown Timer ──────────────────────────────────────────────────────────

function Countdown({ targetMs }: { targetMs: number }) {
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    const update = () => setRemaining(Math.max(0, targetMs - Date.now()))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [targetMs])

  const mins = Math.floor(remaining / 60000)
  const secs = Math.floor((remaining % 60000) / 1000)
  return (
    <span className="font-mono text-brand-400">
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </span>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function AIMonitor() {
  const {
    monitorSetups, scanResults, monitorActive, addSetup, updateSetup, deleteSetup,
    addScanResult, setMonitorActive, settings,
  } = useStore()

  const [tab, setTab] = useState<'library' | 'monitor'>('library')
  const [showForm, setShowForm] = useState(false)
  const [editingSetup, setEditingSetup] = useState<TradingSetup | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanLog, setScanLog] = useState<string[]>([])
  const [nextScanAt, setNextScanAt] = useState<number>(0)
  const [filterDetected, setFilterDetected] = useState(false)
  const [expandedSetup, setExpandedSetup] = useState<string | null>(null)

  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isScanningRef = useRef(false)

  const anthropicKey: string = (settings as Record<string, unknown>).anthropic_api_key as string ?? ''
  const alphaVantageKey: string = (settings as Record<string, unknown>).alphavantage_api_key as string ?? ''

  const log = (msg: string) =>
    setScanLog(prev => [`[${new Date().toLocaleTimeString('fr-FR')}] ${msg}`, ...prev].slice(0, 100))

  // ─── Run one full scan cycle ───────────────────────────────────────────────

  const runScan = useCallback(async () => {
    if (isScanningRef.current) return
    if (!anthropicKey) {
      log('Erreur: clé API Anthropic manquante. Ajoutez-la dans Paramètres.')
      return
    }

    const activeSetups = monitorSetups.filter(s => s.active)
    if (activeSetups.length === 0) {
      log('Aucun setup actif. Activez un setup dans la bibliothèque.')
      return
    }

    isScanningRef.current = true
    setScanning(true)
    log(`Début du scan — ${activeSetups.length} setup(s), ${activeSetups.reduce((n, s) => n + s.symbols.length, 0)} paire(s)...`)

    for (const setup of activeSetups) {
      for (const symbol of setup.symbols) {
        try {
          log(`Analyse ${symbol} (${setup.timeframe}) — ${setup.name}...`)
          const candles = await fetchCandles(symbol, setup.timeframe, alphaVantageKey || undefined)
          const result = await analyzeSetupWithClaude(setup, symbol, candles, anthropicKey)
          addScanResult(result)

          if (result.detected && result.confidence >= 70) {
            log(`SETUP DÉTECTÉ: ${symbol} — ${setup.name} (${result.confidence}% confiance)`)
          } else if (result.detected) {
            log(`Setup possible sur ${symbol} — ${result.confidence}% confiance`)
          } else {
            log(`${symbol}: setup non détecté (${result.confidence}%)`)
          }

          // Small delay between requests to avoid rate limiting
          await new Promise(r => setTimeout(r, 1200))
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Erreur inconnue'
          log(`Erreur ${symbol}: ${msg}`)
        }
      }
    }

    log('Scan terminé.')
    isScanningRef.current = false
    setScanning(false)
  }, [monitorSetups, anthropicKey, alphaVantageKey, addScanResult])

  // ─── Scheduling ───────────────────────────────────────────────────────────

  const scheduleNext = useCallback(() => {
    const next = Date.now() + SCAN_INTERVAL_MS
    setNextScanAt(next)
    scanTimerRef.current = setTimeout(async () => {
      await runScan()
      scheduleNext()
    }, SCAN_INTERVAL_MS)
  }, [runScan])

  const startMonitor = useCallback(async () => {
    setMonitorActive(true)
    setTab('monitor')
    log('Moniteur démarré. Premier scan immédiat...')
    await runScan()
    scheduleNext()
  }, [runScan, scheduleNext, setMonitorActive])

  const stopMonitor = useCallback(() => {
    setMonitorActive(false)
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current)
    log('Moniteur arrêté.')
  }, [setMonitorActive])

  // Stop on unmount
  useEffect(() => {
    return () => {
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current)
    }
  }, [])

  const handleSaveSetup = (data: Omit<TradingSetup, 'id' | 'created_at'>) => {
    if (editingSetup) {
      updateSetup(editingSetup.id, data)
    } else {
      addSetup(data)
    }
    setShowForm(false)
    setEditingSetup(null)
  }

  const visibleResults = filterDetected
    ? scanResults.filter(r => r.detected && r.confidence >= 70)
    : scanResults

  const alertCount = scanResults.filter(r => r.detected && r.confidence >= 70).length

  return (
    <div className="space-y-0">
      <Header
        title="AI Setup Monitor"
        subtitle="Détection automatique de vos setups de trading"
        actions={
          <div className="flex items-center gap-2">
            {monitorActive ? (
              <Button variant="danger" icon={<Square size={15} />} onClick={stopMonitor} loading={scanning}>
                {scanning ? 'Scan en cours...' : 'Arrêter'}
              </Button>
            ) : (
              <Button
                icon={<Play size={15} />}
                onClick={startMonitor}
                disabled={monitorSetups.filter(s => s.active).length === 0 || !anthropicKey}
                title={!anthropicKey ? 'Clé API Anthropic requise dans Paramètres' : undefined}
              >
                Démarrer
              </Button>
            )}
          </div>
        }
      />

      {/* API key warning */}
      {!anthropicKey && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-6 text-sm text-amber-300"
        >
          <AlertTriangle size={16} className="flex-shrink-0" />
          <span>
            Clé API Anthropic manquante. Allez dans <strong>Paramètres → AI Monitor</strong> pour l'ajouter.
          </span>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-surface-850 border border-surface-700 rounded-xl p-1 w-fit">
        {([['library', 'Bibliothèque de Setups'], ['monitor', 'Moniteur Live']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key
                ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                : 'text-surface-400 hover:text-white'
            }`}
          >
            {label}
            {key === 'monitor' && alertCount > 0 && (
              <span className="ml-2 bg-brand-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {alertCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── SETUP LIBRARY TAB ─────────────────────────────────────────── */}
        {tab === 'library' && (
          <motion.div
            key="library"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-surface-400">
                {monitorSetups.length} setup(s) enregistré(s)
                {' · '}{monitorSetups.filter(s => s.active).length} actif(s)
              </p>
              <Button
                size="sm"
                icon={<Plus size={14} />}
                onClick={() => { setEditingSetup(null); setShowForm(true) }}
                disabled={showForm}
              >
                Nouveau Setup
              </Button>
            </div>

            <AnimatePresence>
              {(showForm || editingSetup) && (
                <SetupForm
                  key={editingSetup?.id ?? 'new'}
                  initial={editingSetup}
                  onSave={handleSaveSetup}
                  onCancel={() => { setShowForm(false); setEditingSetup(null) }}
                />
              )}
            </AnimatePresence>

            {monitorSetups.length === 0 && !showForm ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Bot size={40} className="text-surface-600 mb-4" />
                <p className="text-surface-400 text-sm">Aucun setup enregistré.</p>
                <p className="text-surface-500 text-xs mt-1">
                  Crée ton premier setup et l'agent le cherchera automatiquement.
                </p>
                <Button
                  size="sm"
                  icon={<Plus size={14} />}
                  className="mt-4"
                  onClick={() => setShowForm(true)}
                >
                  Créer un Setup
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {monitorSetups.map(setup => (
                  <motion.div
                    key={setup.id}
                    layout
                    className="bg-surface-850 border border-surface-700 rounded-xl overflow-hidden"
                  >
                    <div
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
                      onClick={() => setExpandedSetup(expandedSetup === setup.id ? null : setup.id)}
                    >
                      {/* Active toggle */}
                      <button
                        onClick={e => { e.stopPropagation(); updateSetup(setup.id, { active: !setup.active }) }}
                        className={`w-8 h-4 rounded-full transition-colors flex-shrink-0 relative ${setup.active ? 'bg-brand-500' : 'bg-surface-600'}`}
                      >
                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${setup.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white text-sm">{setup.name}</span>
                          <span className="text-xs text-surface-500 bg-surface-800 px-1.5 py-0.5 rounded">{setup.timeframe}</span>
                          {!setup.active && <span className="text-xs text-surface-600">inactif</span>}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {setup.symbols.map(sym => (
                            <span key={sym} className={`text-xs px-1.5 py-0.5 rounded font-mono ${isCryptoSymbol(sym) ? 'bg-brand-500/10 text-brand-400' : 'bg-surface-700 text-surface-300'}`}>
                              {sym}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={e => { e.stopPropagation(); setEditingSetup(setup); setShowForm(false) }}
                          className="text-surface-500 hover:text-white p-1.5 rounded transition-colors"
                        >
                          <Settings2 size={14} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); deleteSetup(setup.id) }}
                          className="text-surface-500 hover:text-red-400 p-1.5 rounded transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                        {expandedSetup === setup.id ? <ChevronUp size={14} className="text-surface-500" /> : <ChevronDown size={14} className="text-surface-500" />}
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedSetup === setup.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-surface-700 px-4 py-3 space-y-2"
                        >
                          <p className="text-xs text-surface-400 leading-relaxed">{setup.description}</p>
                          {setup.rules && (
                            <p className="text-xs text-surface-500 italic border-l-2 border-brand-500/30 pl-3">{setup.rules}</p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── MONITOR TAB ───────────────────────────────────────────────── */}
        {tab === 'monitor' && (
          <motion.div
            key="monitor"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            {/* Status bar */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-surface-850 border border-surface-700 rounded-xl px-4 py-3">
                <p className="text-xs text-surface-500 uppercase tracking-wider mb-1">Statut</p>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${monitorActive ? 'bg-brand-400 animate-pulse' : 'bg-surface-600'}`} />
                  <span className={`font-mono text-sm font-bold ${monitorActive ? 'text-brand-400' : 'text-surface-400'}`}>
                    {scanning ? 'Scan...' : monitorActive ? 'Actif' : 'Arrêté'}
                  </span>
                </div>
              </div>

              <div className="bg-surface-850 border border-surface-700 rounded-xl px-4 py-3">
                <p className="text-xs text-surface-500 uppercase tracking-wider mb-1">Prochain Scan</p>
                {monitorActive && nextScanAt > 0 && !scanning ? (
                  <Countdown targetMs={nextScanAt} />
                ) : (
                  <span className="font-mono text-sm text-surface-400">—</span>
                )}
              </div>

              <div className="bg-surface-850 border border-surface-700 rounded-xl px-4 py-3">
                <p className="text-xs text-surface-500 uppercase tracking-wider mb-1">Scans Total</p>
                <span className="font-mono text-sm font-bold text-white">{scanResults.length}</span>
              </div>

              <div className="bg-surface-850 border border-surface-700 rounded-xl px-4 py-3">
                <p className="text-xs text-surface-500 uppercase tracking-wider mb-1">Setups Détectés</p>
                <span className="font-mono text-sm font-bold text-brand-400">
                  {scanResults.filter(r => r.detected && r.confidence >= 70).length}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* ── Results Feed ─────────────────────────────────────── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                    <Activity size={14} className="text-brand-400" />
                    Résultats du Scan
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setFilterDetected(!filterDetected)}
                      className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-all ${filterDetected ? 'bg-brand-500/10 border-brand-500/30 text-brand-400' : 'border-surface-700 text-surface-400 hover:text-white'}`}
                    >
                      {filterDetected ? <Eye size={12} /> : <EyeOff size={12} />}
                      Alertes seulement
                    </button>
                    {scanResults.length > 0 && (
                      <button onClick={() => {}} className="text-surface-500 hover:text-red-400 transition-colors" title="Effacer les résultats">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {visibleResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center bg-surface-850 border border-surface-700 rounded-xl">
                    <TrendingUp size={32} className="text-surface-600 mb-3" />
                    <p className="text-surface-400 text-sm">
                      {monitorActive ? 'Scan en cours...' : 'Démarre le moniteur pour voir les résultats.'}
                    </p>
                    {!monitorActive && (
                      <Button
                        size="sm"
                        icon={<Play size={13} />}
                        className="mt-4"
                        onClick={startMonitor}
                        disabled={!anthropicKey || monitorSetups.filter(s => s.active).length === 0}
                      >
                        Démarrer le Scan
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                    {visibleResults.map(r => (
                      <ScanResultCard key={r.id} result={r} />
                    ))}
                  </div>
                )}
              </div>

              {/* ── Activity Log ──────────────────────────────────────── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                    <Clock size={14} className="text-surface-500" />
                    Journal d'Activité
                  </h3>
                  <button
                    onClick={async () => { if (!scanning && monitorActive) { await runScan(); scheduleNext() } else if (!monitorActive) { await runScan() } }}
                    disabled={scanning || !anthropicKey}
                    className="flex items-center gap-1.5 text-xs text-surface-400 hover:text-white transition-colors disabled:opacity-40"
                  >
                    <RefreshCw size={12} className={scanning ? 'animate-spin' : ''} />
                    Scan manuel
                  </button>
                </div>

                <div className="bg-surface-900 border border-surface-700 rounded-xl p-3 font-mono text-xs space-y-1.5 max-h-[520px] overflow-y-auto">
                  {scanLog.length === 0 ? (
                    <p className="text-surface-600">En attente de démarrage...</p>
                  ) : (
                    scanLog.map((line, i) => (
                      <p
                        key={i}
                        className={`leading-relaxed ${
                          line.includes('DÉTECTÉ') ? 'text-brand-400 font-bold' :
                          line.includes('Erreur') ? 'text-red-400' :
                          line.includes('possible') ? 'text-amber-400' :
                          'text-surface-400'
                        }`}
                      >
                        {line}
                      </p>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
