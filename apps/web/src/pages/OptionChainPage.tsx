import { useState, useEffect } from 'react'
import { useOptionChain } from '../hooks/useOptionChain'
import { api } from '../services/api'
import { OptionChainTable } from '../components/OptionChain/OptionChainTable'

export function OptionChainPage() {
  const [index, setIndex] = useState('nifty')
  const [expiry, setExpiry] = useState('')
  const [expiries, setExpiries] = useState<string[]>([])
  const { data, connected } = useOptionChain(index, expiry)

  // Fetch available expiries when index changes
  useEffect(() => {
    if (!expiry && expiries.length === 0) {
      api.get(`/api/optionchain/${index}/expiries`)
        .then(res => {
          const dates: string[] = res.data.expiries
          setExpiries(dates)
          setExpiry(dates[1] ?? dates[0]) // pick nearest expiry
        })
        .catch(() => {
          // fallback: derive from API data when it arrives
        })
    }
  }, [index])

  // Also derive expiries from the option chain data itself
  useEffect(() => {
    if (data?.aggregatedDetails?.expiryDates?.length && !expiry) {
      const dates = data.aggregatedDetails.expiryDates
      setExpiries(dates)
      setExpiry(dates[1] ?? dates[0])
    }
  }, [data])

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-surface-3">
        <h1 className="text-lg font-bold text-accent">OptionDesk</h1>
        <span className={`text-xs px-2 py-1 rounded font-mono ${
          connected ? 'bg-buy/20 text-buy' : 'bg-sell/20 text-sell'
        }`}>
          {connected ? '● Live' : '○ Connecting...'}
        </span>
        {data && (
          <div className="ml-auto text-sm font-mono">
            <span className="text-gray-400">{index.toUpperCase()} </span>
            <span className="text-white font-semibold">{data.underlyingLtp?.toFixed(2)}</span>
            <span className={`ml-2 ${data.underlyingChangePerc >= 0 ? 'text-buy' : 'text-sell'}`}>
              {data.underlyingChangePerc >= 0 ? '+' : ''}{data.underlyingChangePerc?.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-surface-3">
        {/* Index selector */}
        <div className="flex gap-1">
          {['nifty', 'banknifty', 'sensex'].map(i => (
            <button
              key={i}
              onClick={() => { setIndex(i); setExpiry(''); setExpiries([]) }}
              className={`px-3 py-1 rounded text-xs font-semibold uppercase ${
                index === i ? 'bg-accent text-white' : 'bg-surface-2 text-gray-400 hover:text-white'
              }`}
            >
              {i === 'banknifty' ? 'Bank Nifty' : i}
            </button>
          ))}
        </div>

        {/* Expiry selector */}
        {expiries.length > 0 && (
          <select
            value={expiry}
            onChange={e => setExpiry(e.target.value)}
            className="bg-surface-2 text-white text-xs px-3 py-1 rounded border border-surface-3 focus:outline-none focus:border-accent"
          >
            {expiries.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        )}

        <span className="text-xs text-gray-500 ml-auto">
          {data ? `${data.optionContracts.length} strikes` : 'Loading...'}
        </span>
      </div>

      {/* Option chain table */}
      <div className="overflow-auto">
        {data && data.optionContracts.length > 0 ? (
          <OptionChainTable
            strikes={data.optionContracts}
            underlyingLtp={data.underlyingLtp}
            maxOI={data.aggregatedDetails.maxOI}
            onTrade={(contract, side) => {
              console.log('Trade:', contract, side)
              // order modal goes here
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            {expiry ? 'Loading option chain...' : 'Select an expiry date'}
          </div>
        )}
      </div>
    </div>
  )
}