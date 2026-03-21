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
  dayChangePerc: number
}

export function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const debouncedQuery = useDebounce(query, 300)

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
        setSelected(-1)
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected(s => Math.min(s + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected(s => Math.max(s - 1, -1))
    } else if (e.key === 'Enter' && selected >= 0) {
      handleSelect(results[selected])
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

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
          ⌕
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search — e.g. nifty 23300"
          className="w-full bg-surface-2 border border-surface-3 focus:border-accent/50 text-white text-xs rounded-lg pl-7 pr-3 py-1.5 outline-none placeholder-gray-600 transition-colors"
        />
        {loading && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <div className="w-3 h-3 border border-accent/40 border-t-accent rounded-full animate-spin" />
          </span>
        )}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-surface border border-surface-3 rounded-xl shadow-2xl z-50 overflow-hidden max-h-80 overflow-y-auto">
          {/* Group by expiry */}
          {groupByExpiry(results).map(([expiry, items]) => (
            <div key={expiry}>
              <div className="px-3 py-1.5 bg-surface-2 border-b border-surface-3">
                <span className="text-gray-500 text-[10px] font-medium uppercase tracking-wider">
                  {expiry}
                  {items[0] && isClosestExpiry(expiry, results) && (
                    <span className="ml-2 text-accent text-[9px]">nearest</span>
                  )}
                </span>
              </div>
              {items.map((result, idx) => {
                const globalIdx = results.indexOf(result)
                const isSelected = selected === globalIdx
                const changePos = result.dayChangePerc >= 0

                return (
                  <div
                    key={result.contractId}
                    className={`px-3 py-2.5 cursor-pointer transition-colors border-b border-surface-3 last:border-0 ${
                      isSelected ? 'bg-accent/10' : 'hover:bg-surface-2'
                    }`}
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setSelected(globalIdx)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          result.optionType === 'CE'
                            ? 'bg-buy/20 text-buy'
                            : 'bg-sell/20 text-sell'
                        }`}>
                          {result.optionType}
                        </span>
                        <div>
                          <span className="text-white text-xs font-semibold font-mono">
                            {result.indexName.toUpperCase()} {result.displayStrike}
                          </span>
                          <span className="text-gray-500 text-[10px] ml-2">
                            {result.optionType === 'CE' ? 'Call' : 'Put'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-mono text-xs font-semibold">
                          ₹{result.ltp.toFixed(2)}
                        </p>
                        <p className={`text-[10px] font-mono ${
                          changePos ? 'text-buy' : 'text-sell'
                        }`}>
                          {changePos ? '+' : ''}{result.dayChangePerc.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                    {result.iv > 0 && (
                      <div className="flex gap-3 mt-1">
                        <span className="text-gray-600 text-[10px]">IV: {result.iv.toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {open && query.length >= 4 && results.length === 0 && !loading && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-surface border border-surface-3 rounded-xl shadow-2xl z-50 px-4 py-6 text-center">
          <p className="text-gray-500 text-xs">No results for "{query}"</p>
          <p className="text-gray-600 text-[10px] mt-1">Try: nifty 23300 or banknifty 51000</p>
        </div>
      )}
    </div>
  )
}

function groupByExpiry(results: SearchResult[]): [string, SearchResult[]][] {
  const map = new Map<string, SearchResult[]>()
  results.forEach(r => {
    if (!map.has(r.expiryDate)) map.set(r.expiryDate, [])
    map.get(r.expiryDate)!.push(r)
  })
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
}

function isClosestExpiry(expiry: string, results: SearchResult[]): boolean {
  const earliest = [...new Set(results.map(r => r.expiryDate))].sort()[0]
  return expiry === earliest
}