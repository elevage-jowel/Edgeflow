'use client'

import { useState } from 'react'
import { CsvImport } from '@/components/import/CsvImport'
import { ImportPreview } from '@/components/import/ImportPreview'
import type { ParsedTradeRow } from '@/types'

type State =
  | { phase: 'upload' }
  | { phase: 'preview'; rows: ParsedTradeRow[]; source: 'mt4' | 'mt5' }
  | { phase: 'done'; imported: number; skipped: number }

export default function ImportPage() {
  const [state, setState] = useState<State>({ phase: 'upload' })

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Import CSV</h1>
        <p className="text-sm text-slate-400">Import trades from MT4 or MT5 export files</p>
      </div>

      {state.phase === 'upload' && (
        <CsvImport
          onParsed={(rows, source) => setState({ phase: 'preview', rows, source })}
        />
      )}

      {state.phase === 'preview' && (
        <ImportPreview
          rows={state.rows}
          source={state.source}
          onSuccess={(imported, skipped) => setState({ phase: 'done', imported, skipped })}
          onReset={() => setState({ phase: 'upload' })}
        />
      )}

      {state.phase === 'done' && (
        <div className="rounded-xl border border-emerald-700 bg-emerald-900/20 p-8 text-center space-y-2">
          <div className="text-4xl">✓</div>
          <h2 className="text-xl font-semibold text-emerald-400">Import Complete</h2>
          <p className="text-slate-300">
            {state.imported} trades imported, {state.skipped} skipped (duplicates)
          </p>
          <button
            onClick={() => setState({ phase: 'upload' })}
            className="mt-4 text-sm text-indigo-400 hover:text-indigo-300"
          >
            Import another file
          </button>
        </div>
      )}
    </div>
  )
}
