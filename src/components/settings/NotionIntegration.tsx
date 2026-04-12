'use client'
import { useState } from 'react'
import { useAuthStore } from '@/lib/stores/authStore'
import { useTrades } from '@/lib/hooks/useTrades'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { col } from '@/lib/firebase/collections'
import { NotionConfig } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'
import {
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Link2,
  Link2Off,
  RefreshCw,
  Unlink,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const inputCls =
  'w-full px-3 py-2 bg-surface-700 border border-surface-500 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500'
const labelCls = 'text-xs font-medium text-slate-400 mb-1 block'

export function NotionIntegration() {
  const { user, userProfile, setProfile } = useAuthStore()
  const { allTrades: trades } = useTrades()

  const saved = userProfile?.notionConfig
  const [token, setToken] = useState(saved?.integrationToken ?? '')
  const [pageId, setPageId] = useState(saved?.parentPageId ?? '')
  const [showToken, setShowToken] = useState(false)

  const [verifying, setVerifying] = useState(false)
  const [workspaceName, setWorkspaceName] = useState<string | null>(null)
  const [verified, setVerified] = useState(!!saved?.integrationToken)

  const [creating, setCreating] = useState(false)
  const [dbId, setDbId] = useState(saved?.databaseId ?? '')
  const [dbUrl, setDbUrl] = useState<string | null>(null)

  const [syncing, setSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState<{ done: number; total: number } | null>(null)

  // ── Persist notionConfig to Firestore ──────────────────────────────────────
  async function saveConfig(patch: Partial<NotionConfig>) {
    if (!user) return
    const next: NotionConfig = { ...(userProfile?.notionConfig ?? { integrationToken: '' }), ...patch }
    await updateDoc(doc(db, col.user(user.uid)), {
      notionConfig: next,
      updatedAt: new Date().toISOString(),
    })
    setProfile({ ...userProfile!, notionConfig: next })
  }

  // ── Verify token ───────────────────────────────────────────────────────────
  async function handleVerify() {
    if (!token.trim()) { toast.error('Saisis ton token Notion'); return }
    setVerifying(true)
    try {
      const res = await fetch(`/api/notion/verify?token=${encodeURIComponent(token.trim())}`)
      const data = await res.json()
      if (data.ok) {
        setVerified(true)
        setWorkspaceName(data.workspaceName ?? 'Notion')
        await saveConfig({ integrationToken: token.trim() })
        toast.success(`Connecté à ${data.workspaceName ?? 'Notion'}`)
      } else {
        toast.error(data.error ?? 'Token invalide')
        setVerified(false)
      }
    } catch {
      toast.error('Impossible de contacter Notion')
    } finally {
      setVerifying(false)
    }
  }

  // ── Create database ────────────────────────────────────────────────────────
  async function handleCreateDatabase() {
    if (!pageId.trim()) { toast.error('Saisis l\'ID de la page parent'); return }
    setCreating(true)
    try {
      const res = await fetch('/api/notion/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), parentPageId: pageId.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDbId(data.databaseId)
      setDbUrl(data.url)
      await saveConfig({
        integrationToken: token.trim(),
        parentPageId: pageId.trim(),
        databaseId: data.databaseId,
      })
      toast.success('Base de données Notion créée !')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur de création'
      toast.error(msg)
    } finally {
      setCreating(false)
    }
  }

  // ── Sync all trades ────────────────────────────────────────────────────────
  async function handleSync() {
    if (!dbId) { toast.error('Crée d\'abord la base de données'); return }
    if (!trades?.length) { toast('Aucun trade à synchroniser', { icon: '📭' }); return }
    setSyncing(true)
    setSyncProgress({ done: 0, total: trades.length })
    try {
      const res = await fetch('/api/notion/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), databaseId: dbId, trades }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await saveConfig({ lastSyncAt: new Date().toISOString() })
      toast.success(`${data.synced} trade(s) synchronisé(s)${data.errors ? ` · ${data.errors} erreur(s)` : ''}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur de synchronisation'
      toast.error(msg)
    } finally {
      setSyncing(false)
      setSyncProgress(null)
    }
  }

  // ── Disconnect ─────────────────────────────────────────────────────────────
  async function handleDisconnect() {
    if (!user) return
    await updateDoc(doc(db, col.user(user.uid)), {
      notionConfig: null,
      updatedAt: new Date().toISOString(),
    })
    setProfile({ ...userProfile!, notionConfig: undefined })
    setToken('')
    setPageId('')
    setDbId('')
    setDbUrl(null)
    setVerified(false)
    setWorkspaceName(null)
    toast('Déconnecté de Notion')
  }

  const lastSync = saved?.lastSyncAt
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(saved.lastSyncAt))
    : null

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Intégration Notion</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Synchronise tes positions vers une base de données Notion
          </p>
        </div>
        {verified && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {workspaceName ?? saved?.integrationToken ? 'Connecté' : ''}
          </span>
        )}
      </div>

      {/* Step 1 — Token */}
      <div className="bg-surface-800 border border-surface-500 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">
          <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold', verified ? 'bg-emerald-500/20 text-emerald-400' : 'bg-surface-600 text-slate-300')}>
            1
          </span>
          Connexion
        </div>

        <div>
          <label className={labelCls}>Token d&apos;intégration Notion</label>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={e => { setToken(e.target.value); setVerified(false) }}
              className={cn(inputCls, 'pr-10')}
              placeholder="secret_xxxxxxxxxxxx"
            />
            <button
              type="button"
              onClick={() => setShowToken(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            Crée une intégration sur{' '}
            <a
              href="https://www.notion.so/my-integrations"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-400 hover:text-brand-300 underline"
            >
              notion.so/my-integrations
            </a>
            {' '}et copie le &quot;Internal Integration Token&quot;.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant={verified ? 'secondary' : 'primary'}
            size="sm"
            icon={verified ? CheckCircle2 : Link2}
            onClick={handleVerify}
            loading={verifying}
            disabled={!token.trim()}
          >
            {verified ? 'Reconnecté' : 'Vérifier la connexion'}
          </Button>
          {verified && (
            <Button variant="ghost" size="sm" icon={Unlink} onClick={handleDisconnect}>
              Déconnecter
            </Button>
          )}
        </div>
      </div>

      {/* Step 2 — Create database */}
      <div className={cn('bg-surface-800 border border-surface-500 rounded-2xl p-5 space-y-4 transition-opacity', !verified && 'opacity-40 pointer-events-none')}>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">
          <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold', dbId ? 'bg-emerald-500/20 text-emerald-400' : 'bg-surface-600 text-slate-300')}>
            2
          </span>
          Base de données
        </div>

        {dbId ? (
          <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-emerald-300">Base de données connectée</p>
              <p className="text-xs text-slate-500 font-mono truncate mt-0.5">{dbId}</p>
            </div>
            {(dbUrl ?? saved?.databaseId) && (
              <a
                href={dbUrl ?? `https://notion.so/${(saved?.databaseId ?? dbId).replace(/-/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0"
              >
                <Button variant="ghost" size="sm" icon={ExternalLink}>Ouvrir</Button>
              </a>
            )}
          </div>
        ) : (
          <>
            <div>
              <label className={labelCls}>ID de la page parent Notion</label>
              <input
                value={pageId}
                onChange={e => setPageId(e.target.value)}
                className={inputCls}
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
              <p className="text-xs text-slate-500 mt-1.5">
                Ouvre une page Notion, partage-la avec ton intégration, puis copie son ID depuis l&apos;URL
                (la suite de caractères après le dernier &quot;/&quot;).
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={Link2Off}
              onClick={handleCreateDatabase}
              loading={creating}
              disabled={!pageId.trim()}
            >
              Créer la base de données
            </Button>
          </>
        )}
      </div>

      {/* Step 3 — Sync */}
      <div className={cn('bg-surface-800 border border-surface-500 rounded-2xl p-5 space-y-4 transition-opacity', !dbId && 'opacity-40 pointer-events-none')}>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">
          <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-surface-600 text-slate-300">
            3
          </span>
          Synchronisation
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-300">
              {trades?.length ?? 0} trade(s) à synchroniser
            </p>
            {lastSync && (
              <p className="text-xs text-slate-500 mt-0.5">Dernière sync : {lastSync}</p>
            )}
          </div>
          <Button
            variant="primary"
            size="sm"
            icon={RefreshCw}
            onClick={handleSync}
            loading={syncing}
            disabled={!trades?.length}
          >
            {syncing ? `${syncProgress?.done ?? 0} / ${syncProgress?.total ?? 0}` : 'Synchroniser'}
          </Button>
        </div>

        {syncing && syncProgress && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Progression</span>
              <span>{Math.round((syncProgress.done / syncProgress.total) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
              <div
                className="h-full gradient-brand rounded-full transition-all duration-300"
                style={{ width: `${(syncProgress.done / syncProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 pt-1">
          {[
            { label: '32 propriétés', desc: 'P&L, risque, psychologie' },
            { label: 'Déduplication', desc: 'Pas de doublons' },
            { label: 'Mise à jour', desc: 'Sync incrémentale' },
          ].map(({ label, desc }) => (
            <div key={label} className="bg-surface-700/50 rounded-xl p-3 text-center">
              <p className="text-xs font-semibold text-white">{label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
