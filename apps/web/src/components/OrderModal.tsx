import { useState } from 'react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../stores/useAuthStore'
import { api } from '../services/api'

interface Props {
  contract: {
    growwContractId: string
    displayName: string
    liveData: { ltp: number }
    marketLot: number
  }
  indexName: string
  strikePrice: number
  expiryDate: string
  optionType: 'CE' | 'PE'
  defaultSide: 'BUY' | 'SELL'
  onClose: () => void
  onSuccess: () => void
}

export function OrderModal({
  contract, indexName, strikePrice, expiryDate,
  optionType, defaultSide, onClose, onSuccess
}: Props) {
  const [side, setSide] = useState<'BUY' | 'SELL'>(defaultSide)
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET')
  const [lots, setLots] = useState(1)
  const [limitPrice, setLimitPrice] = useState(contract.liveData.ltp)
  const [loading, setLoading] = useState(false)
  const user = useAuthStore(s => s.user)

  const lotSize = contract.marketLot ?? 65
  const price = orderType === 'MARKET' ? contract.liveData.ltp : limitPrice
  const totalCost = lots * lotSize * price

  async function placeOrder() {
    setLoading(true)
    try {
      await api.post('/api/orders', {
        contractId: contract.growwContractId,
        indexName,
        strikePrice,
        expiryDate,
        optionType,
        orderType,
        side,
        quantity: lots,
        limitPrice: orderType === 'LIMIT' ? limitPrice : undefined,
      })
      toast.success(`${side} order placed successfully!`)
      const { data: summary } = await api.get('/api/portfolio/summary')
      useAuthStore.getState().updateBalance(Number(summary.balance))
      onSuccess()
      onClose()
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Order failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-surface w-full max-w-sm rounded-lg border border-surface-3 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-3">
          <div>
            <div className="text-white font-semibold text-sm">{contract.displayName}</div>
            <div className="text-gray-400 text-xs">LTP: ₹{contract.liveData.ltp?.toFixed(2)}</div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="p-4 space-y-4">
          {/* Buy / Sell tabs */}
          <div className="flex rounded overflow-hidden border border-surface-3">
            <button
              onClick={() => setSide('BUY')}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                side === 'BUY' ? 'bg-buy text-white' : 'bg-surface-2 text-gray-400 hover:text-white'
              }`}
            >
              BUY
            </button>
            <button
              onClick={() => setSide('SELL')}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                side === 'SELL' ? 'bg-sell text-white' : 'bg-surface-2 text-gray-400 hover:text-white'
              }`}
            >
              SELL
            </button>
          </div>

          {/* Order type */}
          <div className="flex gap-2">
            {(['MARKET', 'LIMIT'] as const).map(t => (
              <button
                key={t}
                onClick={() => setOrderType(t)}
                className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                  orderType === t
                    ? 'border-accent text-accent bg-accent/10'
                    : 'border-surface-3 text-gray-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Lots */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Lots (1 lot = {lotSize} qty)</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLots(l => Math.max(1, l - 1))}
                className="w-8 h-8 rounded bg-surface-2 text-white hover:bg-surface-3 font-bold"
              >−</button>
              <input
                type="number"
                min={1}
                value={lots}
                onChange={e => setLots(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 bg-surface-2 text-white text-center py-1.5 rounded border border-surface-3 focus:outline-none focus:border-accent font-mono"
              />
              <button
                onClick={() => setLots(l => l + 1)}
                className="w-8 h-8 rounded bg-surface-2 text-white hover:bg-surface-3 font-bold"
              >+</button>
            </div>
          </div>

          {/* Limit price */}
          {orderType === 'LIMIT' && (
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Limit Price (₹)</label>
              <input
                type="number"
                step="0.05"
                value={limitPrice}
                onChange={e => setLimitPrice(parseFloat(e.target.value))}
                className="w-full bg-surface-2 text-white px-3 py-1.5 rounded border border-surface-3 focus:outline-none focus:border-accent font-mono"
              />
            </div>
          )}

          {/* Summary */}
          <div className="bg-surface-2 rounded p-3 space-y-1 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-gray-400">Qty</span>
              <span className="text-white">{lots} × {lotSize} = {lots * lotSize}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Price</span>
              <span className="text-white">₹{price?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-surface-3 pt-1">
              <span className="text-gray-400">{side === 'BUY' ? 'Total Cost' : 'Premium Received'}</span>
              <span className={`font-semibold ${side === 'BUY' ? 'text-sell' : 'text-buy'}`}>
                ₹{totalCost?.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Balance</span>
              <span className="text-white">₹{Number(user?.balance ?? 0).toFixed(2)}</span>
            </div>
          </div>

          {/* Place order button */}
          <button
            onClick={placeOrder}
            disabled={loading}
            className={`w-full py-2.5 rounded font-semibold text-white transition-colors disabled:opacity-50 ${
              side === 'BUY' ? 'bg-buy hover:bg-buy/90' : 'bg-sell hover:bg-sell/90'
            }`}
          >
            {loading ? 'Placing...' : `${side} ${optionType}`}
          </button>
        </div>
      </div>
    </div>
  )
}