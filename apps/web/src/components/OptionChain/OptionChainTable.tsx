import { useMemo, useEffect, useRef } from 'react'
import type { OptionStrike } from '../../../../../packages/shared/src/types'

interface Props {
  strikes: OptionStrike[]
  underlyingLtp: number
  maxOI: number
  onTrade: (contract: any, side: 'BUY' | 'SELL') => void
  onAddToBasket?: (contract: any, side: 'BUY' | 'SELL') => void
}

function getATMIndex(strikes: OptionStrike[], ltp: number) {
  let min = Infinity
  let idx = 0
  strikes.forEach((s, i) => {
    const diff = Math.abs(s.strikePrice / 100 - ltp)
    if (diff < min) { min = diff; idx = i }
  })
  return idx
}

function OIBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0)
  return (
    <div className="w-16 h-1.5 bg-surface-3 rounded-full overflow-hidden">
      <div className="h-full bg-accent/60 rounded-full" style={{ width: `${pct}%` }} />
    </div>
  )
}

// ITM = in the money, OTM = out of the money
function getMoneyness(strike: OptionStrike, underlyingLtp: number) {
  const strikePrice = strike.strikePrice / 100
  return {
    ceITM: strikePrice < underlyingLtp,  // CE is ITM when strike < spot
    peITM: strikePrice > underlyingLtp,  // PE is ITM when strike > spot
  }
}

export function OptionChainTable({
  strikes,
  underlyingLtp,
  maxOI,
  onTrade,
  onAddToBasket,
}: Props) {
  const atmIdx = useMemo(
    () => getATMIndex(strikes, underlyingLtp),
    [strikes, underlyingLtp]
  )

  // Auto-scroll to ATM row on load
  const atmRowRef = useRef<HTMLTableRowElement>(null)
  const hasScrolled = useRef(false)

  useEffect(() => {
    if (atmRowRef.current && !hasScrolled.current && strikes.length > 0) {
      atmRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      hasScrolled.current = true
    }
  }, [strikes])

  // Reset scroll flag when index/expiry changes
  useEffect(() => {
    hasScrolled.current = false
  }, [strikes.length])

  return (
    <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-120px)]">
      <table className="w-full text-xs font-mono border-collapse">
        <thead className="sticky top-0 z-10">
          <tr className="bg-surface-3 text-gray-400 uppercase tracking-wider">
            <th className="px-2 py-2 text-right">OI</th>
            <th className="px-2 py-2 text-right">IV</th>
            <th className="px-2 py-2 text-right">Delta</th>
            <th className="px-2 py-2 text-right">LTP</th>
            <th className="px-2 py-2 text-right">Chg%</th>
            <th className="px-4 py-2 text-center bg-surface-2 text-white font-bold">Strike</th>
            <th className="px-2 py-2 text-left">Chg%</th>
            <th className="px-2 py-2 text-left">LTP</th>
            <th className="px-2 py-2 text-left">Delta</th>
            <th className="px-2 py-2 text-left">IV</th>
            <th className="px-2 py-2 text-left">OI</th>
          </tr>
        </thead>

        <tbody>
          {strikes.map((strike, i) => {
            const isATM = i === atmIdx
            const { ceITM, peITM } = getMoneyness(strike, underlyingLtp)
            const ce = strike.ce
            const pe = strike.pe
            const ceChange = ce?.liveData?.dayChangePerc ?? 0
            const peChange = pe?.liveData?.dayChangePerc ?? 0

            // Row background:
            // ATM = blue tint
            // ITM CE side = slightly lighter (more active)
            // OTM = darker/muted
            const rowBg = isATM
              ? 'bg-accent/10 border-accent/30'
              : 'border-surface-3'

            // Cell backgrounds for ITM vs OTM
            const ceITMClass = ceITM
              ? 'bg-[#1a1f1a]'   // slightly warm dark — CE ITM
              : 'bg-[#111111]'   // darker — CE OTM

            const peITMClass = peITM
              ? 'bg-[#1a1a1f]'   // slightly cool dark — PE ITM
              : 'bg-[#111111]'   // darker — PE OTM

            // Text opacity: ITM = full, OTM = muted
            const ceTextClass = ceITM ? 'text-gray-200' : 'text-gray-500'
            const peTextClass = peITM ? 'text-gray-200' : 'text-gray-500'

            return (
              <tr
                key={strike.strikePrice}
                ref={isATM ? atmRowRef : undefined}
                className={`border-b hover:bg-surface-2 transition-colors ${rowBg}`}
              >
                {/* CE OI */}
                <td className={`px-2 py-1.5 text-right ${ceITMClass}`}>
                  <div className="flex items-center justify-end gap-1">
                    <OIBar value={ce?.liveData?.oi ?? 0} max={maxOI} />
                    <span className={ceTextClass}>
                      {((ce?.liveData?.oi ?? 0) / 1000).toFixed(0)}K
                    </span>
                  </div>
                </td>

                {/* CE IV */}
                <td className={`px-2 py-1.5 text-right ${ceITMClass}`}>
                  <span className={ceTextClass}>
                    {ce?.greeks?.iv?.toFixed(1) ?? '—'}%
                  </span>
                </td>

                {/* CE Delta */}
                <td className={`px-2 py-1.5 text-right ${ceITMClass}`}>
                  <span className={ceTextClass}>
                    {ce?.greeks?.delta?.toFixed(3) ?? '—'}
                  </span>
                </td>

                {/* CE LTP */}
                <td className={`px-2 py-1.5 text-right ${ceITMClass}`}>
                  <div className="flex items-center justify-end gap-1">
                    {onAddToBasket && (
                      <button
                        onClick={() => onAddToBasket(ce, 'BUY')}
                        className="text-gray-600 hover:text-accent text-[10px] px-1"
                        title="Add to basket"
                      >
                        +B
                      </button>
                    )}
                    <span
                      className={`cursor-pointer hover:text-buy font-semibold ${
                        ceITM ? 'text-white' : 'text-gray-500'
                      }`}
                      onClick={() => onTrade(ce, 'BUY')}
                    >
                      {ce?.liveData?.ltp?.toFixed(2) ?? '—'}
                    </span>
                  </div>
                </td>

                {/* CE Change */}
                <td className={`px-2 py-1.5 text-right ${ceITMClass} ${
                  ceChange >= 0 ? 'text-buy' : 'text-sell'
                }`}>
                  {ceChange >= 0 ? '+' : ''}{ceChange.toFixed(2)}%
                </td>

                {/* Strike — always bright */}
                <td className={`px-4 py-1.5 text-center font-bold text-sm bg-surface-2 ${
                  isATM ? 'text-accent' : 'text-white'
                }`}>
                  {(strike.strikePrice / 100).toFixed(0)}
                  {isATM && (
                    <span className="ml-1 text-[10px] text-accent">ATM</span>
                  )}
                </td>

                {/* PE Change */}
                <td className={`px-2 py-1.5 ${peITMClass} ${
                  peChange >= 0 ? 'text-buy' : 'text-sell'
                }`}>
                  {peChange >= 0 ? '+' : ''}{peChange.toFixed(2)}%
                </td>

                {/* PE LTP */}
                <td className={`px-2 py-1.5 ${peITMClass}`}>
                  <div className="flex items-center gap-1">
                    {onAddToBasket && (
                      <button
                        onClick={() => onAddToBasket(pe, 'BUY')}
                        className="text-gray-600 hover:text-accent text-[10px] px-1"
                        title="Add to basket"
                      >
                        +B
                      </button>
                    )}
                    <span
                      className={`cursor-pointer hover:text-sell font-semibold ${
                        peITM ? 'text-white' : 'text-gray-500'
                      }`}
                      onClick={() => onTrade(pe, 'BUY')}
                    >
                      {pe?.liveData?.ltp?.toFixed(2) ?? '—'}
                    </span>
                  </div>
                </td>

                {/* PE Delta */}
                <td className={`px-2 py-1.5 ${peITMClass}`}>
                  <span className={peTextClass}>
                    {pe?.greeks?.delta?.toFixed(3) ?? '—'}
                  </span>
                </td>

                {/* PE IV */}
                <td className={`px-2 py-1.5 ${peITMClass}`}>
                  <span className={peTextClass}>
                    {pe?.greeks?.iv?.toFixed(1) ?? '—'}%
                  </span>
                </td>

                {/* PE OI */}
                <td className={`px-2 py-1.5 ${peITMClass}`}>
                  <div className="flex items-center gap-1">
                    <span className={peTextClass}>
                      {((pe?.liveData?.oi ?? 0) / 1000).toFixed(0)}K
                    </span>
                    <OIBar value={pe?.liveData?.oi ?? 0} max={maxOI} />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}