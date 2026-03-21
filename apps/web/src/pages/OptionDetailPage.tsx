import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import { useWatchlistStore } from '../stores/useWatchlistStore'
import { OrderModal } from '../components/OrderModal'
import { BasketPanel } from '../components/Basket/BasketPanel'
import type { BasketLeg } from '../components/Basket/BasketPanel'
import toast from 'react-hot-toast'

interface OptionData {
  growwContractId: string
  displayName: string
  longDisplayName: string
  liveData: {
    ltp: number
    close: number
    dayChange: number
    dayChangePerc: number
    oi: number
    prevOI: number
  }
  greeks: {
    delta: number
    gamma: number
    theta: number
    vega: number
    rho: number
    iv: number
    pop: number
  }
  marketLot: number
  strikePrice: number
}

export function OptionDetailPage() {
  const { indexName, strikePrice, optionType, expiryDate } = useParams<{
    indexName: string
    strikePrice: string
    optionType: string
    expiryDate: string
  }>()
  const navigate = useNavigate()

  const [optionData, setOptionData] = useState<OptionData | null>(null)
  const [underlyingLtp, setUnderlyingLtp] = useState(0)
  const [connected, setConnected] = useState(false)
  const [orderModal, setOrderModal] = useState<'BUY' | 'SELL' | null>(null)
  const [basketOpen, setBasketOpen] = useState(false)
  const [basketLegs, setBasketLegs] = useState<BasketLeg[]>([])

  const { add: addToWatchlist, remove: removeFromWatchlist, isWatched, items } = useWatchlistStore()
  const strikePriceNum = parseInt(strikePrice ?? '0')
  const contractId = `${indexName?.toUpperCase()}${expiryDate?.replace(/-/g, '').slice(2)}${strikePriceNum / 100}${optionType}`
  const watched = items.find(i => i.strikePrice === strikePriceNum && i.optionType === optionType && i.expiryDate === expiryDate)

  useEffect(() => {
    if (!indexName || !expiryDate) return

    const socket: Socket = io(import.meta.env.VITE_WS_URL, {
      transports: ['websocket', 'polling']
    })

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('subscribe', { index: indexName, expiry: expiryDate })
    })
    socket.on('disconnect', () => setConnected(false))

    socket.on('option-chain-update', ({ data }: any) => {
      setUnderlyingLtp(data.underlyingLtp)
      const strike = data.optionContracts?.find(
        (s: any) => s.strikePrice === strikePriceNum
      )
      if (!strike) return
      const contract = optionType === 'CE' ? strike.ce : strike.pe
      if (contract) {
        setOptionData({ ...contract, strikePrice: strikePriceNum })
      }
    })

    return () => {
      socket.emit('unsubscribe', { index: indexName, expiry: expiryDate })
      socket.disconnect()
    }
  }, [indexName, expiryDate, strikePriceNum, optionType])

  const handleWatchlist = async () => {
    if (watched) {
      await removeFromWatchlist(watched.id)
      toast('Removed from watchlist')
    } else {
      const result = await addToWatchlist({
        contractId: optionData?.growwContractId ?? contractId,
        indexName: indexName!,
        strikePrice: strikePriceNum,
        optionType: optionType as 'CE' | 'PE',
        expiryDate: expiryDate!,
      })
      if (result.success) toast.success('Added to watchlist')
      else toast.error(result.error ?? 'Failed')
    }
  }

  const handleAddToBasket = () => {
    if (!optionData) return
    const leg: BasketLeg = {
      id: crypto.randomUUID(),
      contractId: optionData.growwContractId,
      indexName: indexName!,
      strikePrice: strikePriceNum,
      displayStrike: strikePriceNum / 100,
      expiryDate: expiryDate!,
      optionType: optionType as 'CE' | 'PE',
      side: 'BUY',
      quantity: 1,
      ltp: optionData.liveData.ltp,
    }
    setBasketLegs([leg])
    setBasketOpen(true)
  }

  const ltp = optionData?.liveData.ltp ?? 0
  const change = optionData?.liveData.dayChange ?? 0
  const changePerc = optionData?.liveData.dayChangePerc ?? 0
  const isPositive = changePerc >= 0

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-3 bg-surface">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
        >
          ← Back
        </button>

        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-buy animate-pulse' : 'bg-sell'}`} />
          <span className="text-gray-500 text-xs">{connected ? 'Live' : 'Connecting...'}</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-4">

        {/* Contract header */}
        <div className="bg-surface-2 border border-surface-3 rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  optionType === 'CE'
                    ? 'bg-buy/20 text-buy border border-buy/30'
                    : 'bg-sell/20 text-sell border border-sell/30'
                }`}>
                  {optionType === 'CE' ? 'CALL' : 'PUT'}
                </span>
                <span className="text-gray-400 text-xs uppercase">{indexName}</span>
              </div>
              <h1 className="text-white font-bold text-2xl font-mono">
                {strikePriceNum / 100}
              </h1>
              <p className="text-gray-400 text-sm mt-0.5">
                Expiry: {expiryDate}
              </p>
            </div>

            <div className="text-right">
              <p className="text-white font-mono font-bold text-3xl">
                {ltp > 0 ? `₹${ltp.toFixed(2)}` : '—'}
              </p>
              <p className={`text-sm font-mono mt-1 ${isPositive ? 'text-buy' : 'text-sell'}`}>
                {isPositive ? '+' : ''}₹{change.toFixed(2)} ({isPositive ? '+' : ''}{changePerc.toFixed(2)}%)
              </p>
            </div>
          </div>

          {/* Underlying */}
          {underlyingLtp > 0 && (
            <div className="text-xs text-gray-500 mb-4">
              {indexName?.toUpperCase()} Spot: <span className="text-white font-mono">{underlyingLtp.toFixed(2)}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setOrderModal('BUY')}
              className="flex-1 py-2.5 bg-buy hover:bg-buy/90 text-white rounded-xl text-sm font-semibold transition-colors min-w-[80px]"
            >
              Buy
            </button>
            <button
              onClick={() => setOrderModal('SELL')}
              className="flex-1 py-2.5 bg-sell hover:bg-sell/90 text-white rounded-xl text-sm font-semibold transition-colors min-w-[80px]"
            >
              Sell
            </button>
            <button
              onClick={handleAddToBasket}
              className="px-4 py-2.5 bg-accent/20 hover:bg-accent/30 border border-accent/40 text-accent rounded-xl text-sm font-semibold transition-colors"
            >
              🧺 Basket
            </button>
            <button
              onClick={handleWatchlist}
              className={`px-4 py-2.5 border rounded-xl text-sm font-semibold transition-colors ${
                watched
                  ? 'bg-accent/20 border-accent/40 text-accent'
                  : 'bg-surface-3 border-surface-3 text-gray-400 hover:text-white hover:border-accent/40'
              }`}
            >
              {watched ? '★ Watching' : '☆ Watch'}
            </button>
          </div>
        </div>

        {/* Greeks */}
        {optionData?.greeks && (
          <div className="bg-surface-2 border border-surface-3 rounded-2xl p-4">
            <h2 className="text-white font-semibold text-sm mb-3">Option Greeks</h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Delta', value: optionData.greeks.delta?.toFixed(4), color: 'text-accent' },
                { label: 'Gamma', value: optionData.greeks.gamma?.toFixed(4), color: 'text-white' },
                { label: 'Theta', value: optionData.greeks.theta?.toFixed(4), color: 'text-sell' },
                { label: 'Vega', value: optionData.greeks.vega?.toFixed(4), color: 'text-buy' },
                { label: 'IV', value: `${optionData.greeks.iv?.toFixed(2)}%`, color: 'text-white' },
                { label: 'POP', value: `${(optionData.greeks.pop * 100)?.toFixed(1)}%`, color: 'text-gray-300' },
              ].map(greek => (
                <div key={greek.label} className="bg-surface rounded-xl p-3 text-center">
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">{greek.label}</p>
                  <p className={`font-mono text-sm font-semibold ${greek.color}`}>{greek.value ?? '—'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Market data */}
        {optionData?.liveData && (
          <div className="bg-surface-2 border border-surface-3 rounded-2xl p-4">
            <h2 className="text-white font-semibold text-sm mb-3">Market Data</h2>
            <div className="space-y-2.5">
              {[
                { label: 'Last Traded Price', value: `₹${ltp.toFixed(2)}` },
                { label: 'Previous Close', value: `₹${optionData.liveData.close?.toFixed(2)}` },
                { label: 'Day Change', value: `${isPositive ? '+' : ''}₹${change.toFixed(2)} (${changePerc.toFixed(2)}%)`, colored: true, positive: isPositive },
                { label: 'Open Interest', value: optionData.liveData.oi?.toLocaleString('en-IN') },
                { label: 'Prev OI', value: optionData.liveData.prevOI?.toLocaleString('en-IN') },
                { label: 'Lot Size', value: String(optionData.marketLot ?? 65) },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-surface-3 last:border-0">
                  <span className="text-gray-400 text-xs">{row.label}</span>
                  <span className={`font-mono text-xs font-semibold ${
                    row.colored
                      ? row.positive ? 'text-buy' : 'text-sell'
                      : 'text-white'
                  }`}>
                    {row.value ?? '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!optionData && connected && (
          <div className="text-center py-16 text-gray-500">
            <div className="w-6 h-6 border-2 border-accent/40 border-t-accent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Loading option data...</p>
          </div>
        )}

        {!connected && (
          <div className="text-center py-16 text-gray-500">
            <p className="text-sm">Connecting to live feed...</p>
          </div>
        )}
      </div>

      {/* Order Modal */}
      {orderModal && optionData && (
        <OrderModal
          contract={{
            growwContractId: optionData.growwContractId,
            displayName: optionData.longDisplayName || optionData.displayName,
            liveData: { ltp: optionData.liveData.ltp },
            marketLot: optionData.marketLot ?? 65,
          }}
          indexName={indexName!}
          strikePrice={strikePriceNum}
          expiryDate={expiryDate!}
          optionType={optionType as 'CE' | 'PE'}
          defaultSide={orderModal}
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