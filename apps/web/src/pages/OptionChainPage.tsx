import { useState } from 'react'
import { useOptionChain } from '../hooks/useOptionChain'

export function OptionChainPage() {
  const [index, setIndex] = useState('nifty')
  const [expiry] = useState('2026-03-27')
  const { data, connected } = useOptionChain(index, expiry)

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-xl font-bold text-accent">OptionDesk</h1>
        <span className={`text-xs px-2 py-1 rounded ${connected ? 'bg-buy/20 text-buy' : 'bg-sell/20 text-sell'}`}>
          {connected ? 'Live' : 'Connecting...'}
        </span>
      </div>
      <div className="flex gap-2 mb-4">
        {['nifty', 'banknifty', 'sensex'].map(i => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`px-4 py-1.5 rounded text-sm font-medium ${index === i ? 'bg-accent text-white' : 'bg-surface-2 text-gray-400'}`}
          >
            {i.toUpperCase()}
          </button>
        ))}
      </div>
      {data ? (
        <div className="text-sm text-gray-400">
          Underlying: <span className="text-white font-mono">{data.underlyingLtp}</span>
          {' | '}Strikes loaded: <span className="text-white">{data.optionContracts.length}</span>
        </div>
      ) : (
        <div className="text-gray-500">Loading option chain...</div>
      )}
    </div>
  )
}