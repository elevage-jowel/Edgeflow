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
// Property names match the user's Notion database exactly.
// Always creates a NEW page — never updates existing ones.

interface NotionRichText {
  type: 'text'
  text: { content: string }
}

function richText(content: string): NotionRichText[] {
  if (!content) return [{ type: 'text', text: { content: '' } }]
  return [{ type: 'text', text: { content: content.slice(0, 2000) } }]
}

export async function exportTradeToNotion(
  trade: Trade,
  apiKey: string,
  databaseId: string,
  _currency: string
): Promise<{ ok: boolean; error?: string }> {
  if (!apiKey || !databaseId) {
    return { ok: false, error: 'Missing Notion API key or database ID' }
  }

  // Validate required fields before sending
  const missing: string[] = []
  if (!trade.symbol)  missing.push('Pair')
  if (!trade.type)    missing.push('Type')
  if (!trade.status)  missing.push('Result')
  if (missing.length > 0) {
    return { ok: false, error: `Missing required fields: ${missing.join(', ')}` }
  }

  // Map Result: win → "Win", loss → "Loss", breakeven → "Loss"
  const resultValue = trade.status === 'win' ? 'Win' : 'Loss'

  // Map Type: buy → "Buy", sell → "Sell"
  const typeValue = trade.type === 'buy' ? 'Buy' : 'Sell'

  // RR: prefer risk_reward (computed from SL/TP), fallback to r_multiple
  const rrValue = trade.risk_reward ?? trade.r_multiple ?? null

  // Properties — exact names from the Notion database
  const properties: Record<string, unknown> = {
    // Title (required by Notion for every page)
    'Pair': {
      title: richText(`${trade.symbol} — ${typeValue} — ${resultValue}`),
    },
    'Type': {
      select: { name: typeValue },
    },
    'Result': {
      select: { name: resultValue },
    },
    'Date': {
      date: { start: trade.exit_date.slice(0, 10) },
    },
    'Gain': {
      number: trade.pnl,
    },
    'Setup': {
      rich_text: richText(
        [trade.strategy, trade.timeframe, trade.setup_quality, trade.notes]
          .filter(Boolean)
          .join(' · ')
          .slice(0, 2000) || '—'
      ),
    },
  }

  // RR only if we have a value
  if (rrValue !== null) {
    properties['RR'] = { number: Math.round(rrValue * 100) / 100 }
  }

  // Screenshot: only public URLs work as Notion external files
  const children: unknown[] = []
  if (trade.screenshot_url && trade.screenshot_url.startsWith('http')) {
    properties['Screenshot'] = {
      files: [
        {
          name: `${trade.symbol}-${trade.exit_date.slice(0, 10)}.png`,
          type: 'external',
          external: { url: trade.screenshot_url },
        },
      ],
    }
    // Also embed as image block in page body
    children.push({
      object: 'block',
      type: 'image',
      image: { type: 'external', external: { url: trade.screenshot_url } },
    })
  } else if (trade.screenshot_url && trade.screenshot_url.startsWith('data:')) {
    // base64 → can't upload to Notion directly, add a note
    children.push({
      object: 'block',
      type: 'callout',
      callout: {
        rich_text: richText('📸 Screenshot saved locally — upload manually to this page.'),
        icon: { emoji: '📸' },
      },
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
    const res = await fetch('https://api.notion.com/v1/pages', {
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
      const msg = (data as { message?: string }).message ?? 'Unknown error'
      return { ok: false, error: `Notion ${res.status}: ${msg}` }
    }
    return { ok: true }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error
        ? e.message
        : 'Network error — enable CORS on your Notion integration or use a proxy',
    }
  }
}
