import { useState } from 'react'
import axios from 'axios'
import { useAuthStore } from '../../stores/useAuthStore'

export interface BasketLeg {
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
}

interface PreviewLeg extends BasketLeg {
  marginInfo: {
    requiredAmount: number
    spanMargin?: number
    exposureMargin?: number
    premiumReceived?: number
    isHedged?: boolean
  }
}

interface Props {
  legs: BasketLeg[]
  onLegsChange: (legs: BasketLeg[]) => void
  onClose: () => void
}

export function BasketPanel({ legs, onLegsChange, onClose }: Props) {
  const { token, user, updateBalance } = useAuthStore()
  const [preview, setPreview] = useState<{
    legs: PreviewLeg[]
    totalRequired: number
    summary: {
      buyLegs: number
      sellLegs: number
      totalLegs: number
      isSpread: boolean
    }
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const removeLeg = (id: string) => {
    onLegsChange(legs.filter(l => l.id !== id))
    setPreview(null)
    setError('')
    setSuccess('')
  }

  const updateQty = (id: string, qty: number) => {
    onLegsChange(legs.map(l => l.id === id ? { ...l, quantity: Math.max(1, qty) } : l))
    setPreview(null)
  }

  const toggleSide = (id: string) => {
    onLegsChange(legs.map(l =>
      l.id === id ? { ...l, side: l.side === 'BUY' ? 'SELL' : 'BUY' } : l
    ))
    setPreview(null)
  }

  const handlePreview = async () => {
    if (legs.length === 0) return
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const payload = {
        legs: legs.map(({ id, displayStrike, ltp, ...rest }) => rest)
      }
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/basket/preview`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }  // ← check this line
      )
      setPreview(data)
    } catch (e: any) {
      setError(e.response?.data?.error || 'Preview failed')
    } finally {
      setLoading(false)
    }
  }

  const handleExecute = async () => {
    if (!preview || legs.length === 0) return
    setExecuting(true)
    setError('')
    setSuccess('')
    try {
      const payload = {
        legs: legs.map(({ id, displayStrike, ltp, ...rest }) => rest)
      }
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/basket/execute`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setSuccess(`✓ ${data.message}`)
      // Update balance if returned
      if (data.newBalance) updateBalance(data.newBalance)
      // Clear basket after success
      setTimeout(() => {
        onLegsChange([])
        setPreview(null)
        setSuccess('')
        onClose()
      }, 2000)
    } catch (e: any) {
      setError(e.response?.data?.message || e.response?.data?.error || 'Execution failed')
    } finally {
      setExecuting(false)
    }
  }

  const totalRequired = preview?.totalRequired ?? 0
  const availableBalance = Number(user?.balance ?? 0)
  const canAfford = availableBalance >= totalRequired

  return (
    <div className="fixed right-0 top-0 h-full w-[400px] bg-[#141414] border-l border-surface-3 shadow-2xl z-50 flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-3 bg-surface">
        <div>
          <h2 className="text-white font-semibold">Basket Order</h2>
          <p className="text-gray-500 text-xs mt-0.5">{legs.length}/4 legs added</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center rounded hover:bg-surface-2"
        >
          ×
        </button>
      </div>

      {/* Legs list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {legs.length === 0 && (
          <div className="text-center mt-20">
            <div className="text-5xl mb-4">🧺</div>
            <p className="text-gray-400 text-sm">No legs added yet</p>
            <p className="text-gray-600 text-xs mt-1">
              Click <span className="text-accent font-mono">+B</span> on any option in the chain
            </p>
          </div>
        )}

        {legs.map((leg) => {
          const previewLeg = preview?.legs?.find(
            p => p.contractId === leg.contractId &&
                 p.side === leg.side &&
                 p.strikePrice === leg.strikePrice
          )

          return (
            <div
              key={leg.id}
              className="bg-surface border border-surface-3 rounded-xl p-3 space-y-2"
            >
              {/* Top row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    leg.side === 'BUY'
                      ? 'bg-buy/20 text-buy border border-buy/30'
                      : 'bg-sell/20 text-sell border border-sell/30'
                  }`}>
                    {leg.side}
                  </span>
                  <span className="text-white text-sm font-semibold font-mono">
                    {leg.indexName.toUpperCase()}
                  </span>
                  <span className="text-gray-400 text-xs">
                    {leg.displayStrike} {leg.optionType}
                  </span>
                </div>
                <button
                  onClick={() => removeLeg(leg.id)}
                  className="text-gray-600 hover:text-sell text-lg leading-none w-6 h-6 flex items-center justify-center rounded hover:bg-sell/10"
                >
                  ×
                </button>
              </div>

              {/* Expiry and LTP */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">{leg.expiryDate}</span>
                <span className="text-white font-mono">
                  LTP: ₹{leg.ltp.toFixed(2)}
                </span>
              </div>

              {/* Quantity + flip side */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleSide(leg.id)}
                  className={`text-[11px] px-2 py-1 rounded border transition-colors ${
                    leg.side === 'BUY'
                      ? 'border-sell/40 text-sell hover:bg-sell/10'
                      : 'border-buy/40 text-buy hover:bg-buy/10'
                  }`}
                >
                  Flip to {leg.side === 'BUY' ? 'SELL' : 'BUY'}
                </button>

                <div className="flex items-center gap-1 ml-auto">
                  <button
                    onClick={() => updateQty(leg.id, leg.quantity - 1)}
                    className="w-7 h-7 bg-surface-2 hover:bg-surface-3 text-white rounded-lg text-sm flex items-center justify-center"
                  >
                    −
                  </button>
                  <span className="text-white text-sm w-8 text-center font-mono">
                    {leg.quantity}
                  </span>
                  <button
                    onClick={() => updateQty(leg.id, leg.quantity + 1)}
                    className="w-7 h-7 bg-surface-2 hover:bg-surface-3 text-white rounded-lg text-sm flex items-center justify-center"
                  >
                    +
                  </button>
                  <span className="text-gray-500 text-xs ml-1">lots</span>
                </div>
              </div>

              {/* Preview margin breakdown */}
              {previewLeg && (
                <div className="mt-1 pt-2 border-t border-surface-3 text-xs space-y-1">
                  {previewLeg.marginInfo.isHedged && (
                    <div className="text-accent text-[10px] flex items-center gap-1">
                      <span>✓</span>
                      <span>Hedge benefit applied (spread margin)</span>
                    </div>
                  )}
                  {leg.side === 'BUY' ? (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Premium cost</span>
                      <span className="text-white font-mono">
                        ₹{previewLeg.marginInfo.requiredAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  ) : (
                    <>
                      {!previewLeg.marginInfo.isHedged && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-500">SPAN (5%)</span>
                            <span className="text-gray-300 font-mono">
                              ₹{(previewLeg.marginInfo.spanMargin ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Exposure (2%)</span>
                            <span className="text-gray-300 font-mono">
                              ₹{(previewLeg.marginInfo.exposureMargin ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </span>
                          </div>
                          <div className="flex justify-between text-buy">
                            <span>Premium received</span>
                            <span className="font-mono">
                              − ₹{(previewLeg.marginInfo.premiumReceived ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between font-semibold pt-0.5 border-t border-surface-3">
                        <span className="text-white">Net blocked</span>
                        <span className="text-white font-mono">
                          ₹{previewLeg.marginInfo.requiredAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
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
        <div className="border-t border-surface-3 p-4 space-y-3 bg-surface">

          {/* Error / success */}
          {error && (
            <div className="bg-sell/10 border border-sell/30 rounded-lg px-3 py-2 text-sell text-xs">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-buy/10 border border-buy/30 rounded-lg px-3 py-2 text-buy text-xs">
              {success}
            </div>
          )}

          {/* Total summary */}
          {preview && (
            <div className="bg-surface-2 rounded-lg p-3 space-y-1.5">
              <div className="flex justify-between text-xs text-gray-400">
                <span>{preview.summary.buyLegs} buy · {preview.summary.sellLegs} sell</span>
                {preview.summary.isSpread && (
                  <span className="text-accent">Spread — reduced margin</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300 text-sm">Total required</span>
                <span className={`font-mono font-semibold text-sm ${
                  canAfford ? 'text-white' : 'text-sell'
                }`}>
                  ₹{totalRequired.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Available balance</span>
                <span className={`font-mono ${canAfford ? 'text-gray-400' : 'text-sell'}`}>
                  ₹{availableBalance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </div>
              {!canAfford && (
                <p className="text-sell text-[11px] pt-1">
                  Insufficient balance. Add ₹{(totalRequired - availableBalance).toLocaleString('en-IN', { maximumFractionDigits: 0 })} more.
                </p>
              )}
            </div>
          )}

          {/* Action buttons */}
          {!preview ? (
            <button
              onClick={handlePreview}
              disabled={loading}
              className="w-full py-2.5 bg-accent/20 hover:bg-accent/30 border border-accent/40 text-accent rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? 'Calculating margin...' : 'Preview Margin'}
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => { setPreview(null); setError('') }}
                className="flex-1 py-2.5 bg-surface-2 hover:bg-surface-3 text-gray-300 rounded-lg text-sm transition-colors"
              >
                Edit
              </button>
              <button
                onClick={handleExecute}
                disabled={executing || !canAfford || !!success}
                className="flex-[2] py-2.5 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-40"
              >
                {executing
                  ? 'Executing...'
                  : `Execute ${legs.length} Leg${legs.length > 1 ? 's' : ''}`
                }
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}