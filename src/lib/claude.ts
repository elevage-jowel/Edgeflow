import type { TradingSetup, ScanResult, Candle } from '../types/monitor'
import { formatCandlesForPrompt } from './marketData'
import { generateId } from './stats'

// ─── Claude API (Anthropic) ───────────────────────────────────────────────────

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-opus-4-6'

interface ClaudeAnalysisResponse {
  detected: boolean
  confidence: number
  analysis: string
  key_levels?: string
}

function buildPrompt(setup: TradingSetup, symbol: string, candles: Candle[]): string {
  const currentPrice = candles[candles.length - 1]?.close ?? 0
  const candleText = formatCandlesForPrompt(candles)

  return `You are an expert technical analyst specializing in chart pattern recognition and trading setups.

## SETUP TO DETECT
**Name:** ${setup.name}
**Description:** ${setup.description}
${setup.rules ? `**Entry Rules / Conditions:** ${setup.rules}` : ''}

## CURRENT MARKET DATA
**Symbol:** ${symbol}
**Timeframe:** ${setup.timeframe}
**Current Price:** ${currentPrice}

**Recent Candles (oldest → newest, format: datetime | O H L C V [direction body range]):**
${candleText}

## YOUR TASK
1. Analyze the candle data carefully for the setup "${setup.name}"
2. Check if the setup is currently forming OR has just completed on the most recent candles
3. Consider price action, candle structure, and momentum
4. Rate your confidence from 0 to 100 (be strict - only score 70+ if you clearly see the setup)

Respond ONLY with a JSON object (no markdown, no explanation outside the JSON):
{
  "detected": <boolean - true if setup is present with confidence > 50>,
  "confidence": <integer 0-100>,
  "analysis": "<2-3 sentences explaining what you see in the chart and why the setup is or isn't present>",
  "key_levels": "<string with important price levels, e.g. Support: 1.2345 / Resistance: 1.2400, or null>"
}`
}

export async function analyzeSetupWithClaude(
  setup: TradingSetup,
  symbol: string,
  candles: Candle[],
  apiKey: string
): Promise<ScanResult> {
  const prompt = buildPrompt(setup, symbol, candles)
  const currentPrice = candles[candles.length - 1]?.close ?? 0

  const body = {
    model: MODEL,
    max_tokens: 512,
    messages: [
      { role: 'user', content: prompt }
    ],
  }

  const res = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.error?.message ?? `HTTP ${res.status}`
    throw new Error(`Claude API error: ${msg}`)
  }

  const data = await res.json()
  const rawText: string = data.content?.[0]?.text ?? ''

  let parsed: ClaudeAnalysisResponse
  try {
    // Strip any accidental markdown fences
    const cleaned = rawText.replace(/```json\n?|```/g, '').trim()
    parsed = JSON.parse(cleaned)
  } catch {
    // Fallback if JSON parse fails
    parsed = {
      detected: false,
      confidence: 0,
      analysis: rawText.slice(0, 300) || 'Could not parse AI response.',
      key_levels: undefined,
    }
  }

  return {
    id: generateId(),
    setup_id: setup.id,
    setup_name: setup.name,
    symbol,
    timeframe: setup.timeframe,
    detected: parsed.detected ?? false,
    confidence: Math.min(100, Math.max(0, Math.round(parsed.confidence ?? 0))),
    analysis: parsed.analysis ?? 'No analysis provided.',
    key_levels: parsed.key_levels ?? undefined,
    current_price: currentPrice,
    scanned_at: new Date().toISOString(),
  }
}
