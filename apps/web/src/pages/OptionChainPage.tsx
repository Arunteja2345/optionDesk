import { useState, useEffect } from 'react'
import axios from 'axios'
import { useOptionChain } from '../hooks/useOptionChain'
import { OptionChainTable } from '../components/OptionChain/OptionChainTable'
import { OrderModal } from '../components/OrderModal'
import { BasketPanel } from '../components/Basket/BasketPanel'
import type { BasketLeg } from '../components/Basket/BasketPanel'
import { useAuthStore } from '../stores/useAuthStore'

type IndexName = 'nifty' | 'banknifty' | 'sensex'

const INDEX_LABELS: Record<IndexName, string> = {
  nifty: 'NIFTY 50',
  banknifty: 'BANK NIFTY',
  sensex: 'SENSEX',
}

export function OptionChainPage() {
  const { user } = useAuthStore()
  const [selectedIndex, setSelectedIndex] = useState<IndexName>('nifty')
  const [selectedExpiry, setSelectedExpiry] = useState('')
  const [expiries, setExpiries] = useState<string[]>([])
  const [loadingExpiries, setLoadingExpiries] = useState(false)
  const [orderModal, setOrderModal] = useState<{
    contract: any
    side: 'BUY' | 'SELL'
    index: IndexName
    expiry: string
    strikePrice: number
    optionType: 'CE' | 'PE'
  } | null>(null)
  const [basketOpen, setBasketOpen] = useState(false)
  const [basketLegs, setBasketLegs] = useState<BasketLeg[]>([])

  // Step 1 — fetch expiries via HTTP when index changes
  // This runs FIRST, sets expiry, then the WebSocket hook fires
  useEffect(() => {
    setSelectedExpiry('')
    setExpiries([])
    setLoadingExpiries(true)

    axios.get(`${import.meta.env.VITE_API_URL}/api/optionchain/${selectedIndex}`)
      .then(({ data }) => {
        const dates: string[] = data?.aggregatedDetails?.expiryDates ?? []
        const current: string = data?.aggregatedDetails?.currentExpiry ?? dates[0] ?? ''
        setExpiries(dates)
        setSelectedExpiry(current)  // ← this triggers the WebSocket to subscribe
      })
      .catch(err => {
        console.error('Failed to load expiries:', err)
        // Hardcode a fallback expiry so we don't get stuck
        const fallback = '2026-04-28'
        setExpiries([fallback])
        setSelectedExpiry(fallback)
      })
      .finally(() => setLoadingExpiries(false))
  }, [selectedIndex])

  // Step 2 — WebSocket hook only runs when expiry is set
  const { data, connected, lastUpdated } = useOptionChain(
    selectedIndex,
    selectedExpiry   // empty string until Step 1 completes → hook does nothing
  )

  // When new data arrives, sync expiry list
  useEffect(() => {
    if (data?.aggregatedDetails?.expiryDates?.length) {
      setExpiries(data.aggregatedDetails.expiryDates)
    }
  }, [data])

  const handleTrade = (contract: any, side: 'BUY' | 'SELL') => {
    if (!contract) return
    const optionType = contract.growwContractId?.includes('CE') ? 'CE' : 'PE'
    setOrderModal({
      contract,
      side,
      index: selectedIndex,
      expiry: selectedExpiry,
      strikePrice: contract.strikePrice ?? 0,
      optionType,
    })
  }

  const handleAddToBasket = (contract: any, side: 'BUY' | 'SELL') => {
    if (!contract) return
    if (basketLegs.length >= 4) {
      alert('Maximum 4 legs allowed in a basket')
      return
    }
    const optionType = contract.growwContractId?.includes('CE') ? 'CE' : 'PE'
    const newLeg: BasketLeg = {
      id: crypto.randomUUID(),
      contractId: contract.growwContractId ?? '',
      indexName: selectedIndex,
      strikePrice: contract.strikePrice ?? 0,
      displayStrike: (contract.strikePrice ?? 0) / 100,
      expiryDate: selectedExpiry,
      optionType,
      side,
      quantity: 1,
      ltp: contract.liveData?.ltp ?? 0,
    }
    setBasketLegs(prev => [...prev, newLeg])
    setBasketOpen(true)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-41px)]">

      {/* Controls bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-surface-3 bg-surface flex-shrink-0">

        {/* Index selector */}
        <select
          value={selectedIndex}
          onChange={e => {
            setSelectedIndex(e.target.value as IndexName)
          }}
          className="bg-surface-2 border border-surface-3 text-white text-xs rounded-lg px-3 py-1.5 outline-none cursor-pointer"
        >
          {(Object.keys(INDEX_LABELS) as IndexName[]).map(idx => (
            <option key={idx} value={idx}>{INDEX_LABELS[idx]}</option>
          ))}
        </select>

        {/* Expiry selector */}
        <select
          value={selectedExpiry}
          onChange={e => setSelectedExpiry(e.target.value)}
          disabled={loadingExpiries || expiries.length === 0}
          className="bg-surface-2 border border-surface-3 text-white text-xs rounded-lg px-3 py-1.5 outline-none cursor-pointer disabled:opacity-40"
        >
          {expiries.length === 0 && (
            <option value="">Loading...</option>
          )}
          {expiries.map(exp => (
            <option key={exp} value={exp}>{exp}</option>
          ))}
        </select>

        {/* Underlying price */}
        {data && (
          <div className="flex items-center gap-2 pl-2 border-l border-surface-3">
            <span className="text-gray-500 text-xs">{INDEX_LABELS[selectedIndex]}</span>
            <span className="text-white font-mono font-semibold">
              {data.underlyingLtp.toFixed(2)}
            </span>
            <span className={`text-xs font-mono ${
              data.underlyingChangePerc >= 0 ? 'text-buy' : 'text-sell'
            }`}>
              {data.underlyingChangePerc >= 0 ? '+' : ''}
              {data.underlyingChangePerc.toFixed(2)}%
            </span>
          </div>
        )}

        {/* Live indicator */}
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${
            connected ? 'bg-buy animate-pulse' : 'bg-sell'
          }`} />
          <span className="text-gray-500 text-[10px]">
            {connected ? 'Live' : 'Disconnected'}
          </span>
          {lastUpdated && (
            <span className="text-gray-600 text-[10px]">
              · {lastUpdated.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </span>
          )}
        </div>

        {/* Basket button */}
        <button
          onClick={() => setBasketOpen(true)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-surface-2 hover:bg-accent/20 border border-surface-3 hover:border-accent/40 text-gray-300 hover:text-accent rounded-lg text-xs font-semibold transition-colors"
        >
          <span>🧺</span>
          <span>Basket</span>
          {basketLegs.length > 0 && (
            <span className="bg-accent text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">
              {basketLegs.length}
            </span>
          )}
        </button>
      </div>

      {/* Option chain table */}
      <div className="flex-1 overflow-hidden">
        {!selectedExpiry || !data ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
            <div className="w-6 h-6 border-2 border-accent/40 border-t-accent rounded-full animate-spin" />
            <span className="text-sm">
              {!selectedExpiry
                ? 'Loading expiries...'
                : connected
                  ? 'Loading option chain...'
                  : 'Connecting to live feed...'
              }
            </span>
          </div>
        ) : (
          <OptionChainTable
            strikes={data.optionContracts}
            underlyingLtp={data.underlyingLtp}
            maxOI={data.aggregatedDetails.maxOI}
            onTrade={handleTrade}
            onAddToBasket={handleAddToBasket}
          />
        )}
      </div>

      {/* Order Modal */}
      {orderModal && (
        <OrderModal
          contract={orderModal.contract}
          indexName={orderModal.index}
          strikePrice={orderModal.strikePrice}
          expiryDate={orderModal.expiry}
          optionType={orderModal.optionType}
          defaultSide={orderModal.side}
          onClose={() => setOrderModal(null)}
          onSuccess={() => setOrderModal(null)}
        />
      )}

      {/* Basket Panel */}
      {basketOpen && (
        <BasketPanel
          legs={basketLegs}
          onLegsChange={setBasketLegs}
          onClose={() => setBasketOpen(false)}
        />
      )}
    </div>
  )
}