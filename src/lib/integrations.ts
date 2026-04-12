import type { Trade } from '../types'
import { formatCurrency } from './stats'

// ─── Discord ──────────────────────────────────────────────────────────────────

function setupQualityEmoji(q?: string): string {
  if (q === 'A+') return '🏆'
  if (q === 'A') return '⭐'
  if (q === 'B') return '🔵'
  return ''
}

function statusEmoji(status: string): string {
  if (status === 'win') return '✅'
  if (status === 'loss') return '❌'
  return '⚖️'
}

function buildDiscordEmbed(trade: Trade, currency: string) {
  const isWin = trade.pnl > 0
  const color = isWin ? 0x0fb98e : trade.pnl < 0 ? 0xef4444 : 0xf59e0b

  const rr = trade.risk_reward
    ? trade.risk_reward.toFixed(2)
    : trade.r_multiple
    ? trade.r_multiple.toFixed(2)
    : 'N/A'

  const fields: { name: string; value: string; inline?: boolean }[] = [
    { name: 'Direction', value: trade.type.toUpperCase(), inline: true },
    { name: 'Result', value: `${statusEmoji(trade.status)} ${trade.status.toUpperCase()}`, inline: true },
    { name: 'Entry Price', value: String(trade.entry_price), inline: true },
    { name: 'Exit Price', value: String(trade.exit_price), inline: true },
    { name: 'Quantity', value: String(trade.quantity), inline: true },
    { name: 'PnL', value: formatCurrency(trade.pnl, currency), inline: true },
  ]

  if (trade.pnl_percent !== undefined) {
    fields.push({ name: 'PnL %', value: `${trade.pnl_percent >= 0 ? '+' : ''}${trade.pnl_percent.toFixed(2)}%`, inline: true })
  }
  if (trade.stop_loss) {
    fields.push({ name: 'Stop Loss', value: String(trade.stop_loss), inline: true })
  }
  if (trade.take_profit) {
    fields.push({ name: 'Take Profit', value: String(trade.take_profit), inline: true })
  }
  if (rr !== 'N/A') {
    fields.push({ name: 'Risk:Reward', value: `1:${rr}`, inline: true })
  }
  if (trade.r_multiple !== undefined) {
    fields.push({ name: 'R Multiple', value: `${trade.r_multiple.toFixed(2)}R`, inline: true })
  }
  if (trade.setup_quality) {
    fields.push({ name: 'Setup Quality', value: `${setupQualityEmoji(trade.setup_quality)} ${trade.setup_quality}`, inline: true })
  }
  if (trade.strategy) {
    fields.push({ name: 'Strategy', value: trade.strategy, inline: true })
  }
  if (trade.timeframe) {
    fields.push({ name: 'Timeframe', value: trade.timeframe, inline: true })
  }
  if (trade.notes) {
    fields.push({ name: 'Notes', value: trade.notes.slice(0, 1024), inline: false })
  }

  const embed: Record<string, unknown> = {
    title: `${statusEmoji(trade.status)} ${trade.symbol} Trade — ${isWin ? 'WIN' : trade.pnl < 0 ? 'LOSS' : 'BREAKEVEN'}`,
    color,
    fields,
    footer: { text: `Edgeflow • ${trade.exit_date.slice(0, 10)}` },
    timestamp: new Date(trade.exit_date).toISOString(),
  }

  if (trade.screenshot_url && trade.screenshot_url.startsWith('http')) {
    embed.image = { url: trade.screenshot_url }
  }

  return embed
}

export async function exportTradeToDiscord(
  trade: Trade,
  webhookUrl: string,
  currency: string
): Promise<{ ok: boolean; error?: string }> {
  if (!webhookUrl || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
    return { ok: false, error: 'Invalid Discord webhook URL. Must start with https://discord.com/api/webhooks/' }
  }

  try {
    const embed = buildDiscordEmbed(trade, currency)
    const payload: Record<string, unknown> = { embeds: [embed] }

    // If screenshot is base64 (data URL), skip image embed and note it
    if (trade.screenshot_url && trade.screenshot_url.startsWith('data:')) {
      const textEmbed = buildDiscordEmbed({ ...trade, screenshot_url: undefined }, currency)
      ;(textEmbed as Record<string, unknown>).description = '_Screenshot attached locally — upload manually_'
      payload.embeds = [textEmbed]
    }

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, error: `Discord error ${res.status}: ${text}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

// ─── Notion ───────────────────────────────────────────────────────────────────

interface NotionRichText {
  type: 'text'
  text: { content: string }
}

function richText(content: string): NotionRichText[] {
  return [{ type: 'text', text: { content: content.slice(0, 2000) } }]
}

function notionNumber(n?: number) {
  return n !== undefined ? { number: n } : { number: null }
}

function notionSelect(value?: string) {
  return value ? { select: { name: value } } : { select: null }
}

export async function exportTradeToNotion(
  trade: Trade,
  apiKey: string,
  databaseId: string,
  currency: string
): Promise<{ ok: boolean; error?: string }> {
  if (!apiKey || !databaseId) {
    return { ok: false, error: 'Missing Notion API key or database ID' }
  }

  // Notion requires a CORS proxy or server-side call in production.
  // We use the Notion API directly — works in Electron/desktop or if CORS is allowed.
  const url = 'https://api.notion.com/v1/pages'

  const properties: Record<string, unknown> = {
    Name: {
      title: richText(`${trade.symbol} ${trade.type.toUpperCase()} — ${trade.status.toUpperCase()}`),
    },
    Symbol: { rich_text: richText(trade.symbol) },
    Type: notionSelect(trade.type.toUpperCase()),
    Status: notionSelect(trade.status.toUpperCase()),
    'Entry Price': notionNumber(trade.entry_price),
    'Exit Price': notionNumber(trade.exit_price),
    Quantity: notionNumber(trade.quantity),
    PnL: notionNumber(trade.pnl),
    'PnL %': notionNumber(trade.pnl_percent),
    'Stop Loss': notionNumber(trade.stop_loss),
    'Take Profit': notionNumber(trade.take_profit),
    'R Multiple': notionNumber(trade.r_multiple),
    'Risk:Reward': notionNumber(trade.risk_reward),
    'Setup Quality': notionSelect(trade.setup_quality),
    Strategy: { rich_text: richText(trade.strategy ?? '') },
    Timeframe: notionSelect(trade.timeframe),
    'Entry Date': { date: { start: trade.entry_date.slice(0, 10) } },
    'Exit Date': { date: { start: trade.exit_date.slice(0, 10) } },
    Notes: { rich_text: richText(trade.notes ?? '') },
    Currency: { rich_text: richText(currency) },
    'PnL Formatted': { rich_text: richText(formatCurrency(trade.pnl, currency)) },
  }

  // Screenshot URL (only works with public URLs, not base64)
  const children: unknown[] = []
  if (trade.screenshot_url && trade.screenshot_url.startsWith('http')) {
    children.push({
      object: 'block',
      type: 'image',
      image: { type: 'external', external: { url: trade.screenshot_url } },
    })
  }
  if (trade.notes) {
    children.push({
      object: 'block',
      type: 'paragraph',
      paragraph: { rich_text: richText(`📝 ${trade.notes}`) },
    })
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties,
        children: children.length > 0 ? children : undefined,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { ok: false, error: `Notion error ${res.status}: ${(data as { message?: string }).message ?? 'Unknown error'}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error — check CORS or use a proxy' }
  }
}
