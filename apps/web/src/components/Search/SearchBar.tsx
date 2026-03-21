import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { useDebounce } from '../../hooks/useDebounce'

interface SearchResult {
  contractId: string
  displayName: string
  indexName: string
  strikePrice: number
  displayStrike: number
  optionType: 'CE' | 'PE'
  expiryDate: string
  ltp: number
  iv: number
  delta: number
  dayChangePerc: number
  isIlliquid: boolean
}

function groupByExpiry(results: SearchResult[]): [string, SearchResult[]][] {
  const map = new Map<string, SearchResult[]>()
  results.forEach(r => {
    if (!map.has(r.expiryDate)) map.set(r.expiryDate, [])
    map.get(r.expiryDate)!.push(r)
  })
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
}

export function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const debouncedQuery = useDebounce(query, 400)

  useEffect(() => {
    if (debouncedQuery.length < 4) {
      setResults([])
      setOpen(false)
      return
    }
    setLoading(true)
    api.get(`/api/optionchain/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then(({ data }) => {
        setResults(data)
        setOpen(data.length > 0)
        setSelectedId('')
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }, [debouncedQuery])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const flatResults = groupByExpiry(results).flatMap(([_, items]) => items)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return
    const currentIdx = flatResults.findIndex(r => r.contractId === selectedId)

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = flatResults[Math.min(currentIdx + 1, flatResults.length - 1)]
      if (next) setSelectedId(next.contractId)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = flatResults[Math.max(currentIdx - 1, 0)]
      if (prev) setSelectedId(prev.contractId)
    } else if (e.key === 'Enter') {
      const match = flatResults.find(r => r.contractId === selectedId)
      if (match) handleSelect(match)
    } else if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  const handleSelect = (result: SearchResult) => {
    setQuery('')
    setOpen(false)
    navigate(
      `/option/${result.indexName}/${result.strikePrice}/${result.optionType}/${result.expiryDate}`
    )
  }

  const grouped = groupByExpiry(results)
  const expiries = grouped.map(([e]) => e)
  const closestExpiry = expiries[0]

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <span
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs select-none pointer-events-none"
          style={{ color: 'var(--text-muted)' }}
        >
          ⌕
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="nifty 23300  ·  banknifty 51000"
          className="w-full text-xs rounded-lg pl-7 pr-8 py-1.5 outline-none transition-colors"
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
          }}
          onFocusCapture={e => {
            (e.target as HTMLInputElement).style.borderColor = '#387ED1'
          }}
          onBlurCapture={e => {
            (e.target as HTMLInputElement).style.borderColor = 'var(--border)'
          }}
        />
        {loading && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <div className="w-3 h-3 border border-accent/40 border-t-accent rounded-full animate-spin" />
          </span>
        )}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div
          className="absolute top-full mt-1 left-0 right-0 rounded-xl shadow-2xl z-50 overflow-hidden"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            maxHeight: '420px',
            overflowY: 'auto',
          }}
        >
          {/* Summary header */}
          <div
            className="px-3 py-2 text-[10px] flex items-center justify-between flex-shrink-0"
            style={{
              background: 'var(--surface-2)',
              borderBottom: '1px solid var(--border)',
              color: 'var(--text-muted)',
            }}
          >
            <span>
              {results.length} result{results.length !== 1 ? 's' : ''} across{' '}
              {expiries.length} expir{expiries.length === 1 ? 'y' : 'ies'}
            </span>
            <span className="text-accent hidden sm:block">↑↓ navigate · Enter open</span>
          </div>

          {grouped.map(([expiry, items]) => (
            <div key={expiry}>
              {/* Expiry group header */}
              <div
                className="px-3 py-1.5 flex items-center gap-2 sticky top-0 z-10"
                style={{
                  background: 'var(--surface-2)',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {expiry}
                </span>
                {expiry === closestExpiry && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent/20 text-accent font-medium">
                    nearest
                  </span>
                )}
                <span
                  className="text-[9px] ml-auto"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {items.length} contract{items.length !== 1 ? 's' : ''}
                </span>
              </div>

              {items.map(result => {
                const isSelected = selectedId === result.contractId
                const changePos = result.dayChangePerc >= 0

                return (
                  <div
                    key={result.contractId}
                    className="px-3 py-2.5 cursor-pointer transition-colors"
                    style={{
                      background: isSelected
                        ? 'rgba(56,126,209,0.12)'
                        : 'transparent',
                      borderBottom: '1px solid var(--border)',
                    }}
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setSelectedId(result.contractId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                          result.optionType === 'CE'
                            ? 'bg-buy/20 text-buy'
                            : 'bg-sell/20 text-sell'
                        }`}>
                          {result.optionType}
                        </span>
                        <div className="min-w-0">
                          <span
                            className="text-xs font-semibold font-mono"
                            style={{ color: 'var(--text)' }}
                          >
                            {result.indexName.toUpperCase()} {result.displayStrike}
                          </span>
                          {result.isIlliquid && (
                            <span
                              className="ml-2 text-[9px] px-1 py-0.5 rounded"
                              style={{
                                background: 'var(--surface-3)',
                                color: 'var(--text-muted)',
                              }}
                            >
                              ILLIQUID
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 ml-2">
                        <p
                          className="font-mono text-xs font-semibold"
                          style={{ color: 'var(--text)' }}
                        >
                          {result.ltp > 0 ? `₹${result.ltp.toFixed(2)}` : '—'}
                        </p>
                        <p className={`text-[10px] font-mono ${
                          changePos ? 'text-buy' : 'text-sell'
                        }`}>
                          {changePos ? '+' : ''}{result.dayChangePerc.toFixed(2)}%
                        </p>
                      </div>
                    </div>

                    {(result.iv > 0 || result.delta !== 0) && (
                      <div className="flex gap-3 mt-1">
                        {result.iv > 0 && (
                          <span
                            className="text-[10px] font-mono"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            IV: {result.iv.toFixed(1)}%
                          </span>
                        )}
                        {result.delta !== 0 && (
                          <span
                            className="text-[10px] font-mono"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            Δ: {result.delta.toFixed(3)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* No results */}
      {open && query.length >= 4 && results.length === 0 && !loading && (
        <div
          className="absolute top-full mt-1 left-0 right-0 rounded-xl shadow-2xl z-50 px-4 py-6 text-center"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
          }}
        >
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            No results for "{query}"
          </p>
          <p
            className="text-[10px] mt-1"
            style={{ color: 'var(--text-muted)', opacity: 0.6 }}
          >
            Try: nifty 23300 · banknifty 51000 · sensex 75000
          </p>
        </div>
      )}
    </div>
  )
}