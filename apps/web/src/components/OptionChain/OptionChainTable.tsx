import { useMemo } from 'react'
import type { OptionStrike } from '@shared/types'

interface Props {
  strikes: OptionStrike[]
  underlyingLtp: number
  maxOI: number
  onTrade: (contract: any, side: 'BUY' | 'SELL') => void
}

function getATMIndex(strikes: OptionStrike[], ltp: number) {
  let min = Infinity, idx = 0
  strikes.forEach((s, i) => {
    const diff = Math.abs(s.strikePrice / 100 - ltp)
    if (diff < min) { min = diff; idx = i }
  })
  return idx
}

function OIBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="w-16 h-1.5 bg-surface-3 rounded-full overflow-hidden">
      <div className="h-full bg-accent/60 rounded-full" style={{ width: `${pct}%` }} />
    </div>
  )
}



export function OptionChainTable({ strikes, underlyingLtp, maxOI, onTrade }: Props) {
  const atmIdx = useMemo(() => getATMIndex(strikes, underlyingLtp), [strikes, underlyingLtp])

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono border-collapse">
        <thead>
          <tr className="bg-surface-3 text-gray-400 uppercase tracking-wider">
            {/* CE side */}
            <th className="px-2 py-2 text-right">OI</th>
            <th className="px-2 py-2 text-right">IV</th>
            <th className="px-2 py-2 text-right">Delta</th>
            <th className="px-2 py-2 text-right">LTP</th>
            <th className="px-2 py-2 text-right">Chg%</th>
            {/* Strike */}
            <th className="px-4 py-2 text-center bg-surface-2 text-white font-bold">Strike</th>
            {/* PE side */}
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
            const ce = strike.ce
            const pe = strike.pe
            const ceChange = ce?.liveData.dayChangePerc ?? 0
            const peChange = pe?.liveData.dayChangePerc ?? 0

            return (
              <tr
                key={strike.strikePrice}
                className={`border-b border-surface-3 hover:bg-surface-2 transition-colors ${
                  isATM ? 'bg-accent/10 border-accent/30' : ''
                }`}
              >
                {/* CE OI */}
                <td className="px-2 py-1.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <OIBar value={ce?.liveData.oi ?? 0} max={maxOI} />
                    <span>{((ce?.liveData.oi ?? 0) / 1000).toFixed(0)}K</span>
                  </div>
                </td>
                <td className="px-2 py-1.5 text-right text-gray-400">{ce?.greeks.iv?.toFixed(1)}%</td>
                <td className="px-2 py-1.5 text-right text-gray-400">{ce?.greeks.delta?.toFixed(3)}</td>
                {/* CE LTP — clickable */}
                <td
                  className="px-2 py-1.5 text-right cursor-pointer hover:text-buy font-semibold"
                  onClick={() => onTrade(ce, 'BUY')}
                >
                  {ce?.liveData.ltp?.toFixed(2)}
                </td>
                <td className={`px-2 py-1.5 text-right ${ceChange >= 0 ? 'text-buy' : 'text-sell'}`}>
                  {ceChange >= 0 ? '+' : ''}{ceChange.toFixed(2)}%
                </td>

                {/* Strike price */}
                <td className={`px-4 py-1.5 text-center font-bold text-sm bg-surface-2 ${isATM ? 'text-accent' : 'text-white'}`}>
                  {(strike.strikePrice / 100).toFixed(0)}
                  {isATM && <span className="ml-1 text-[10px] text-accent">ATM</span>}
                </td>

                {/* PE side */}
                <td className={`px-2 py-1.5 ${peChange >= 0 ? 'text-buy' : 'text-sell'}`}>
                  {peChange >= 0 ? '+' : ''}{peChange.toFixed(2)}%
                </td>
                <td
                  className="px-2 py-1.5 cursor-pointer hover:text-sell font-semibold"
                  onClick={() => onTrade(pe, 'BUY')}
                >
                  {pe?.liveData.ltp?.toFixed(2)}
                </td>
                <td className="px-2 py-1.5 text-gray-400">{pe?.greeks.delta?.toFixed(3)}</td>
                <td className="px-2 py-1.5 text-gray-400">{pe?.greeks.iv?.toFixed(1)}%</td>
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-1">
                    <span>{((pe?.liveData.oi ?? 0) / 1000).toFixed(0)}K</span>
                    <OIBar value={pe?.liveData.oi ?? 0} max={maxOI} />
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