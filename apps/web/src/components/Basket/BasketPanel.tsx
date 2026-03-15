import { useState } from 'react'
import axios from 'axios'
import { useAuthStore } from '../../stores/useAuthStore'

interface BasketLeg {
  id: string
  contractId: string
  indexName: string
  strikePrice: number
  displayStrike: number
  expiryDate: string
  optionType: 'CE' | 'PE'
  side: 'BUY' | 'SELL'
  quantity: number
  ltp: number
  marginInfo?: {
    requiredAmount: number
    spanMargin?: number
    exposureMargin?: number
    premiumReceived?: number
  }
}

interface Props {
  onClose: () => void
}

export function BasketPanel({ onClose }: Props) {
  const { token } = useAuthStore()
  const [legs, setLegs] = useState<BasketLeg[]>([])
  const [preview, setPreview] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const removeLeg = (id: string) => {
    setLegs(prev => prev.filter(l => l.id !== id))
    setPreview(null)
  }

  const updateQty = (id: string, qty: number) => {
    setLegs(prev => prev.map(l => l.id === id ? { ...l, quantity: Math.max(1, qty) } : l))
    setPreview(null)
  }

  const toggleSide = (id: string) => {
    setLegs(prev => prev.map(l =>
      l.id === id ? { ...l, side: l.side === 'BUY' ? 'SELL' : 'BUY' } : l
    ))
    setPreview(null)
  }

  const handlePreview = async () => {
    if (legs.length === 0) return
    setLoading(true)
    setError('')
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/basket/preview`,
        { legs: legs.map(({ id, displayStrike, ltp, marginInfo, ...rest }) => rest) },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setPreview(data)
    } catch (e: any) {
      setError(e.response?.data?.error || 'Preview failed')
    } finally {
      setLoading(false)
    }
  }

  const handleExecute = async () => {
    if (!preview) return
    setLoading(true)
    setError('')
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/basket/execute`,
        { legs: legs.map(({ id, displayStrike, ltp, marginInfo, ...rest }) => rest) },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setResult(data)
    } catch (e: any) {
      setError(e.response?.data?.message || 'Execution failed')
    } finally {
      setLoading(false)
    }
  }

  const totalCost = preview?.totalRequired ?? 0

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-surface border-l border-surface-3 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-3">
        <div>
          <h2 className="text-white font-semibold">Basket Order</h2>
          <p className="text-gray-400 text-xs">{legs.length}/4 legs</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">×</button>
      </div>

      {/* Legs */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {legs.length === 0 && (
          <div className="text-center text-gray-500 mt-16">
            <p className="text-4xl mb-3">🧺</p>
            <p className="text-sm">Add legs from the option chain</p>
            <p className="text-xs text-gray-600 mt-1">Click any LTP cell to add</p>
          </div>
        )}

        {legs.map((leg) => {
          const previewLeg = preview?.legs?.find((p: any) => p.contractId === leg.contractId && p.side === leg.side)
          return (
            <div key={leg.id} className="bg-surface-2 rounded-lg p-3 border border-surface-3">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded mr-2 ${
                    leg.side === 'BUY' ? 'bg-buy/20 text-buy' : 'bg-sell/20 text-sell'
                  }`}>
                    {leg.side}
                  </span>
                  <span className="text-xs text-gray-400 uppercase">{leg.indexName}</span>
                  <span className="text-xs text-gray-400 ml-1">{leg.optionType}</span>
                </div>
                <button onClick={() => removeLeg(leg.id)} className="text-gray-600 hover:text-sell text-sm">✕</button>
              </div>

              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-mono font-semibold">{leg.displayStrike}</span>
                <span className="text-gray-400 text-xs">{leg.expiryDate}</span>
                <span className="text-white font-mono">₹{leg.ltp.toFixed(2)}</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleSide(leg.id)}
                  className={`text-xs px-2 py-1 rounded border ${
                    leg.side === 'BUY'
                      ? 'border-buy/40 text-buy hover:bg-buy/10'
                      : 'border-sell/40 text-sell hover:bg-sell/10'
                  }`}
                >
                  Flip to {leg.side === 'BUY' ? 'SELL' : 'BUY'}
                </button>
                <div className="flex items-center gap-1 ml-auto">
                  <button
                    onClick={() => updateQty(leg.id, leg.quantity - 1)}
                    className="w-6 h-6 bg-surface-3 text-white rounded text-sm hover:bg-surface-2"
                  >−</button>
                  <span className="text-white text-sm w-6 text-center">{leg.quantity}</span>
                  <button
                    onClick={() => updateQty(leg.id, leg.quantity + 1)}
                    className="w-6 h-6 bg-surface-3 text-white rounded text-sm hover:bg-surface-2"
                  >+</button>
                  <span className="text-gray-500 text-xs ml-1">lots</span>
                </div>
              </div>

              {/* Preview margin info */}
              {previewLeg && (
                <div className="mt-2 pt-2 border-t border-surface-3 text-xs text-gray-400 space-y-0.5">
                  {leg.side === 'BUY' ? (
                    <div className="flex justify-between">
                      <span>Total cost</span>
                      <span className="text-white">₹{previewLeg.marginInfo.requiredAmount.toFixed(2)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span>SPAN margin</span>
                        <span>₹{previewLeg.marginInfo.spanMargin?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Exposure margin</span>
                        <span>₹{previewLeg.marginInfo.exposureMargin?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-buy">
                        <span>Premium received</span>
                        <span>₹{previewLeg.marginInfo.premiumReceived?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-white font-semibold">
                        <span>Net blocked</span>
                        <span>₹{previewLeg.marginInfo.requiredAmount.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      {legs.length > 0 && (
        <div className="p-4 border-t border-surface-3 space-y-3">
          {error && (
            <div className="bg-sell/10 border border-sell/30 rounded p-2 text-sell text-xs">{error}</div>
          )}

          {result && (
            <div className="bg-buy/10 border border-buy/30 rounded p-2 text-buy text-xs">
              ✓ {result.message}
            </div>
          )}

          {preview && (
            <div className="bg-surface-2 rounded p-3 text-sm">
              <div className="flex justify-between text-gray-400 mb-1">
                <span>Total required</span>
                <span className="text-white font-semibold font-mono">₹{totalCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-500 text-xs">
                <span>{preview.summary.buyLegs} buy · {preview.summary.sellLegs} sell</span>
                <span>{legs.length} legs</span>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {!preview ? (
              <button
                onClick={handlePreview}
                disabled={loading}
                className="flex-1 bg-accent/20 hover:bg-accent/30 text-accent border border-accent/40 rounded py-2 text-sm font-semibold disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Preview Margin'}
              </button>
            ) : (
              <>
                <button
                  onClick={() => setPreview(null)}
                  className="flex-1 bg-surface-3 hover:bg-surface-2 text-gray-400 rounded py-2 text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={handleExecute}
                  disabled={loading || !!result}
                  className="flex-2 bg-accent hover:bg-accent/90 text-white rounded py-2 px-6 text-sm font-semibold disabled:opacity-50"
                >
                  {loading ? 'Executing...' : `Execute ${legs.length} Legs`}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Hook to add a leg from anywhere (option chain clicks)
export function useBasket() {
  // Store basket legs in sessionStorage so they persist across navigation
  const addLeg = (leg: Omit<BasketLeg, 'id'>) => {
    const existing = JSON.parse(sessionStorage.getItem('basket-legs') || '[]')
    const newLeg = { ...leg, id: crypto.randomUUID() }
    sessionStorage.setItem('basket-legs', JSON.stringify([...existing, newLeg]))
    window.dispatchEvent(new Event('basket-updated'))
  }

  return { addLeg }
}