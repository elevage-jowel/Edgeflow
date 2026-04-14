import { Trade } from '@/lib/types'

const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'

function headers(token: string) {
  return {
    'Authorization': `Bearer ${token}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  }
}

// Extracts a clean 32-char Notion ID from a URL, UUID, or raw hex string
export function extractNotionId(input: string): string | null {
  const clean = input.trim()
  // UUID format already: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  const uuidMatch = clean.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i)
  if (uuidMatch) return uuidMatch[1].replace(/-/g, '')
  // Raw 32-char hex (possibly at end of URL path, before ? or #)
  const rawMatch = clean.match(/([a-f0-9]{32})(?:[?#&]|$)/i)
  if (rawMatch) return rawMatch[1]
  return null
}

function toUUID(id: string): string {
  const c = id.replace(/-/g, '')
  if (c.length !== 32) return id
  return `${c.slice(0,8)}-${c.slice(8,12)}-${c.slice(12,16)}-${c.slice(16,20)}-${c.slice(20)}`
}

// ─── Verify connection ────────────────────────────────────────────────────────

export async function verifyNotionConnection(token: string): Promise<{ ok: boolean; workspaceName?: string; error?: string }> {
  const res = await fetch(`${NOTION_API}/users/me`, { headers: headers(token) })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    return { ok: false, error: body.message ?? `HTTP ${res.status}` }
  }
  const data = await res.json()
  return { ok: true, workspaceName: data.bot?.workspace_name ?? 'Notion' }
}

// ─── Create database ──────────────────────────────────────────────────────────

export async function createTradesDatabase(token: string, parentPageId: string): Promise<{ databaseId: string; url: string }> {
  const rawId = extractNotionId(parentPageId)
  if (!rawId) throw new Error('ID de page Notion invalide. Colle l\'URL complète ou l\'ID de 32 caractères.')
  const body = {
    parent: { type: 'page_id', page_id: toUUID(rawId) },
    icon: { type: 'emoji', emoji: '📊' },
    title: [{ type: 'text', text: { content: 'Edgeflow — Positions' } }],
    properties: buildDatabaseProperties(),
  }

  const res = await fetch(`${NOTION_API}/databases`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? `HTTP ${res.status}`)
  }

  const data = await res.json()
  return { databaseId: data.id, url: data.url }
}

// ─── Upsert a single trade ────────────────────────────────────────────────────

export async function upsertTrade(token: string, databaseId: string, trade: Trade): Promise<void> {
  // Check if page already exists for this trade
  const existingPageId = await findPageByEdgeflowId(token, databaseId, trade.id)
  const properties = buildPageProperties(trade)

  if (existingPageId) {
    await fetch(`${NOTION_API}/pages/${existingPageId}`, {
      method: 'PATCH',
      headers: headers(token),
      body: JSON.stringify({ properties }),
    })
  } else {
    await fetch(`${NOTION_API}/pages`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ parent: { database_id: databaseId }, properties }),
    })
  }
}

// ─── Sync all trades with rate limiting ──────────────────────────────────────

export async function syncAllTrades(
  token: string,
  databaseId: string,
  trades: Trade[],
  onProgress?: (done: number, total: number) => void
): Promise<{ synced: number; errors: number }> {
  let synced = 0
  let errors = 0

  for (let i = 0; i < trades.length; i++) {
    try {
      await upsertTrade(token, databaseId, trades[i])
      synced++
    } catch {
      errors++
    }
    onProgress?.(i + 1, trades.length)
    // Rate limit: ~3 req/s (Notion allows up to 3 req/s per integration)
    if (i < trades.length - 1) await sleep(340)
  }

  return { synced, errors }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function findPageByEdgeflowId(token: string, databaseId: string, tradeId: string): Promise<string | null> {
  const rawId = extractNotionId(databaseId)
  const res = await fetch(`${NOTION_API}/databases/${rawId ? toUUID(rawId) : databaseId}/query`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({
      filter: { property: 'Edgeflow ID', rich_text: { equals: tradeId } },
      page_size: 1,
    }),
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.results?.[0]?.id ?? null
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ─── Database schema ──────────────────────────────────────────────────────────

function buildDatabaseProperties() {
  return {
    // Title
    'Symbole': { title: {} },

    // Status & Classification
    'Statut': {
      select: {
        options: [
          { name: 'open', color: 'blue' },
          { name: 'closed', color: 'gray' },
          { name: 'partial', color: 'yellow' },
        ],
      },
    },
    'Direction': {
      select: {
        options: [
          { name: 'long', color: 'green' },
          { name: 'short', color: 'red' },
        ],
      },
    },
    'Asset Class': {
      select: {
        options: [
          { name: 'stocks', color: 'blue' },
          { name: 'options', color: 'purple' },
          { name: 'futures', color: 'orange' },
          { name: 'forex', color: 'green' },
          { name: 'crypto', color: 'yellow' },
          { name: 'indices', color: 'pink' },
          { name: 'commodities', color: 'brown' },
        ],
      },
    },
    'Résultat': {
      select: {
        options: [
          { name: 'win', color: 'green' },
          { name: 'loss', color: 'red' },
          { name: 'breakeven', color: 'yellow' },
        ],
      },
    },

    // Dates & Duration
    'Date Entrée': { date: {} },
    'Date Sortie': { date: {} },
    'Durée (min)': { number: { format: 'number' } },

    // Prices & Quantity
    'Prix Entrée': { number: { format: 'number' } },
    'Prix Sortie': { number: { format: 'number' } },
    'Quantité': { number: { format: 'number' } },
    'Commission': { number: { format: 'dollar' } },

    // P&L
    'Net P&L': { number: { format: 'dollar' } },
    'Gross P&L': { number: { format: 'dollar' } },
    'R Multiple': { number: { format: 'number' } },
    'Retour %': { number: { format: 'percent' } },

    // Risk Management
    'Stop Loss': { number: { format: 'number' } },
    'Take Profit': { number: { format: 'number' } },
    'R:R attendu': { number: { format: 'number' } },
    'Risque ($)': { number: { format: 'dollar' } },
    'Risque (%)': { number: { format: 'percent' } },

    // Setup & Strategy
    'Stratégie': { rich_text: {} },
    'Grade Setup': {
      select: {
        options: [
          { name: 'A+', color: 'green' },
          { name: 'A', color: 'blue' },
          { name: 'B', color: 'yellow' },
          { name: 'C', color: 'orange' },
          { name: 'D', color: 'red' },
        ],
      },
    },
    'Note Setup': { number: { format: 'number' } },
    'Note Exécution': { number: { format: 'number' } },

    // Psychology
    'Émotion Avant': {
      select: {
        options: [
          { name: 'calm', color: 'green' },
          { name: 'confident', color: 'blue' },
          { name: 'anxious', color: 'yellow' },
          { name: 'stressed', color: 'orange' },
          { name: 'fearful', color: 'red' },
          { name: 'greedy', color: 'purple' },
          { name: 'neutral', color: 'gray' },
        ],
      },
    },
    'Émotion Après': {
      select: {
        options: [
          { name: 'satisfied', color: 'green' },
          { name: 'confident', color: 'blue' },
          { name: 'frustrated', color: 'orange' },
          { name: 'regret', color: 'red' },
          { name: 'relieved', color: 'yellow' },
          { name: 'neutral', color: 'gray' },
        ],
      },
    },
    'Confiance': { number: { format: 'number' } },
    'Règle Violée': { checkbox: {} },
    'Tags Erreurs': { multi_select: {} },

    // Context
    'Session': {
      select: {
        options: [
          { name: 'pre-market', color: 'purple' },
          { name: 'NY open', color: 'blue' },
          { name: 'midday', color: 'yellow' },
          { name: 'closing', color: 'orange' },
          { name: 'overnight', color: 'gray' },
          { name: 'london', color: 'green' },
          { name: 'asian', color: 'pink' },
        ],
      },
    },

    // Trade Management
    'BE Déplacé': { checkbox: {} },
    'Partiels Pris': { checkbox: {} },

    // Account
    'Type Compte': {
      select: {
        options: [
          { name: 'personal', color: 'blue' },
          { name: 'challenge', color: 'orange' },
          { name: 'funded', color: 'green' },
        ],
      },
    },
    'Prop Firm': { rich_text: {} },
    'Nom Compte': { rich_text: {} },

    // Meta
    'Tags': { multi_select: {} },
    'Notes': { rich_text: {} },
    'Edgeflow ID': { rich_text: {} },
  }
}

// ─── Page properties from a Trade ────────────────────────────────────────────

function buildPageProperties(t: Trade): Record<string, unknown> {
  const props: Record<string, unknown> = {}

  // Title
  props['Symbole'] = { title: [{ text: { content: `${t.symbol} ${t.direction.toUpperCase()}` } }] }

  // Select helpers
  if (t.status) props['Statut'] = { select: { name: t.status } }
  props['Direction'] = { select: { name: t.direction } }
  if (t.assetClass) props['Asset Class'] = { select: { name: t.assetClass } }
  if (t.outcome) props['Résultat'] = { select: { name: t.outcome } }

  // Dates
  props['Date Entrée'] = { date: { start: t.entryDate } }
  if (t.exitDate) props['Date Sortie'] = { date: { start: t.exitDate } }

  // Numbers
  setNum(props, 'Durée (min)', t.tradeDuration)
  setNum(props, 'Prix Entrée', t.entryPrice)
  setNum(props, 'Prix Sortie', t.exitPrice)
  setNum(props, 'Quantité', t.quantity)
  setNum(props, 'Commission', t.commission)
  setNum(props, 'Net P&L', t.netPnl)
  setNum(props, 'Gross P&L', t.grossPnl)
  setNum(props, 'R Multiple', t.rMultiple)
  // Notion percent format expects 0-1 range
  if (t.returnPct != null) props['Retour %'] = { number: t.returnPct / 100 }
  setNum(props, 'Stop Loss', t.stopLoss)
  setNum(props, 'Take Profit', t.takeProfit)
  setNum(props, 'R:R attendu', t.riskRewardRatio)
  setNum(props, 'Risque ($)', t.riskAmount)
  if (t.riskPercent != null) props['Risque (%)'] = { number: t.riskPercent / 100 }
  setNum(props, 'Note Setup', t.setupRating)
  setNum(props, 'Note Exécution', t.executionRating)
  setNum(props, 'Confiance', t.confidenceScore)

  // Rich text
  setText(props, 'Stratégie', t.strategy)
  setText(props, 'Prop Firm', t.propFirm)
  setText(props, 'Nom Compte', t.accountName)
  setText(props, 'Notes', t.notes)
  props['Edgeflow ID'] = { rich_text: [{ text: { content: t.id } }] }

  // Selects (optional)
  if (t.setupGrade) props['Grade Setup'] = { select: { name: t.setupGrade } }
  if (t.emotionBefore) props['Émotion Avant'] = { select: { name: t.emotionBefore } }
  if (t.emotionAfter) props['Émotion Après'] = { select: { name: t.emotionAfter } }
  if (t.session) props['Session'] = { select: { name: t.session } }
  if (t.accountType) props['Type Compte'] = { select: { name: t.accountType } }

  // Checkboxes
  props['Règle Violée'] = { checkbox: t.ruleViolated ?? false }
  props['BE Déplacé'] = { checkbox: t.breakEvenMoved ?? false }
  props['Partiels Pris'] = { checkbox: t.partialsTaken ?? false }

  // Multi-select
  if (t.mistakeTags?.length) {
    props['Tags Erreurs'] = { multi_select: t.mistakeTags.map(tag => ({ name: tag })) }
  }
  if (t.tags?.length) {
    props['Tags'] = { multi_select: t.tags.map(tag => ({ name: tag })) }
  }

  return props
}

function setNum(props: Record<string, unknown>, key: string, val: number | undefined) {
  if (val != null) props[key] = { number: val }
}

function setText(props: Record<string, unknown>, key: string, val: string | undefined) {
  if (val) props[key] = { rich_text: [{ text: { content: val } }] }
}
