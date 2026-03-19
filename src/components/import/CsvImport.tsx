'use client'

import { useRef, useState, DragEvent } from 'react'
import { parseCSVContent } from '@/lib/mt4parser'
import { Spinner } from '@/components/ui/Spinner'
import type { ParsedTradeRow } from '@/types'

interface Props {
  onParsed: (rows: ParsedTradeRow[], source: 'mt4' | 'mt5') => void
}

export function CsvImport({ onParsed }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const processFile = (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setError('Please upload a CSV or TXT file')
      return
    }
    setLoading(true)
    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const rows = parseCSVContent(text)
      if (rows.length === 0) {
        setError('No valid trades found. Make sure the CSV is an MT4/MT5 export.')
      } else {
        const source = text.toLowerCase().includes('direction') ? 'mt5' : 'mt4'
        onParsed(rows, source)
      }
      setLoading(false)
    }
    reader.readAsText(file)
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-16 cursor-pointer transition-colors ${
        dragging ? 'border-indigo-400 bg-indigo-500/10' : 'border-slate-600 hover:border-slate-500'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.txt"
        className="hidden"
        onChange={onFileChange}
      />
      {loading ? (
        <Spinner className="h-8 w-8" />
      ) : (
        <>
          <div className="text-4xl text-slate-500">⇧</div>
          <div className="text-center">
            <p className="font-medium text-slate-300">Drop your MT4/MT5 CSV here</p>
            <p className="text-sm text-slate-500 mt-1">or click to browse</p>
          </div>
        </>
      )}
      {error && <p className="text-sm text-rose-400">{error}</p>}
    </div>
  )
}
