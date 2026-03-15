import { useState, useEffect } from 'react'
import { useOptionChain } from '../hooks/useOptionChain'
import { api } from '../services/api'
import { OptionChainTable } from '../components/OptionChain/OptionChainTable'
import { OrderModal } from '../components/OrderModal'

interface TradeTarget {
  contract: any
  strikePrice: number
  optionType: 'CE' | 'PE'
  side: 'BUY' | 'SELL'
}

export function OptionChainPage() {
  const [index, setIndex] = useState('nifty')
  const [expiry, setExpiry] = useState('')
  const [expiries, setExpiries] = useState<string[]>([])
  const [tradeTarget, setTradeTarget] = useState<TradeTarget | null>(null)
  const { data, connected } = useOptionChain(index, expiry)

  useEffect(() => {
    setExpiry('')
    setExpiries([])
    api.get(`/api/optionchain/${index}/expiries`)
      .then(res => {
        const dates: string[] = res.data.expiries
        setExpiries(dates)
        setExpiry(dates[0] ?? '')
      })
      .catch(console.error)
  }, [index])

  useEffect(() => {
    if (data?.aggregatedDetails?.expiryDates?.length && expiries.length === 0) {
      setExpiries(data.aggregatedDetails.expiryDates)
    }
  }, [data])

  function handleTrade(contract: any, strike: any, optionType: 'CE' | 'PE', side: 'BUY' | 'SELL') {
    setTradeTarget({ contract, strikePrice: strike.strikePrice, optionType, side })
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-3 flex-wrap">
        <h1 className="text-lg font-bold text-accent">OptionDesk</h1>
        <span className={`text-xs px-2 py-1 rounded font-mono ${
          connected ? 'bg-buy/20 text-buy' : 'bg-surface-2 text-gray-400'
        }`}>
          {connected ? '● Live' : '○ Offline'}
        </span>

        <div className="flex gap-1 ml-2">
          {[
            { key: 'nifty', label: 'NIFTY' },
            { key: 'banknifty', label: 'BANK NIFTY' },
            { key: 'sensex', label: 'SENSEX' },
          ].map(i => (
            <button
              key={i.key}
              onClick={() => setIndex(i.key)}
              className={`px-3 py-1 rounded text-xs font-semibold ${
                index === i.key ? 'bg-accent text-white' : 'bg-surface-2 text-gray-400 hover:text-white'
              }`}
            >
              {i.label}
            </button>
          ))}
        </div>

        {expiries.length > 0 && (
          <select
            value={expiry}
            onChange={e => setExpiry(e.target.value)}
            className="bg-surface-2 text-white text-xs px-3 py-1 rounded border border-surface-3 focus:outline-none focus:border-accent ml-1"
          >
            {expiries.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}

        {data && (
          <div className="ml-auto font-mono text-sm">
            <span className="text-gray-400 text-xs">{index.toUpperCase()} </span>
            <span className="text-white font-semibold">{data.underlyingLtp?.toFixed(2)}</span>
            <span className={`ml-2 text-xs ${data.underlyingChangePerc >= 0 ? 'text-buy' : 'text-sell'}`}>
              {data.underlyingChangePerc >= 0 ? '+' : ''}{data.underlyingChangePerc?.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {/* Option chain */}
      <div className="overflow-auto">
        {data && data.optionContracts.length > 0 ? (
          <OptionChainTable
            strikes={data.optionContracts}
            underlyingLtp={data.underlyingLtp}
            maxOI={data.aggregatedDetails.maxOI}
            onTrade={(contract, side) => {
              // figure out CE or PE from the contract
              const strike = data.optionContracts.find(
                s => s.ce?.growwContractId === contract?.growwContractId ||
                     s.pe?.growwContractId === contract?.growwContractId
              )
              if (!strike) return
              const optionType = strike.ce?.growwContractId === contract?.growwContractId ? 'CE' : 'PE'
              handleTrade(contract, strike, optionType, side)
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
            {expiry ? 'Loading option chain...' : 'Select an expiry'}
          </div>
        )}
      </div>

      {/* Order modal */}
      {tradeTarget && (
        <OrderModal
          contract={tradeTarget.contract}
          indexName={index}
          strikePrice={tradeTarget.strikePrice}
          expiryDate={expiry}
          optionType={tradeTarget.optionType}
          defaultSide={tradeTarget.side}
          onClose={() => setTradeTarget(null)}
          onSuccess={() => {
            // refresh balance — you can refetch user here
          }}
        />
      )}
    </div>
  )
}