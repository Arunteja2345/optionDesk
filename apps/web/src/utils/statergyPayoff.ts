export interface Leg {
  side: 'BUY' | 'SELL'
  optionType: 'CE' | 'PE'
  strikePrice: number     // actual price (not raw)
  premium: number
  lots: number
  lotSize: number
}

export function calculatePayoff(legs: Leg[], spotRange: [number, number], steps = 200) {
  const [minSpot, maxSpot] = spotRange
  const increment = (maxSpot - minSpot) / steps
  const points: { spot: number; pnl: number }[] = []

  for (let i = 0; i <= steps; i++) {
    const spot = minSpot + i * increment
    let totalPnl = 0

    for (const leg of legs) {
      const qty = leg.lots * leg.lotSize
      const multiplier = leg.side === 'BUY' ? 1 : -1

      let intrinsicValue = 0
      if (leg.optionType === 'CE') {
        intrinsicValue = Math.max(0, spot - leg.strikePrice)
      } else {
        intrinsicValue = Math.max(0, leg.strikePrice - spot)
      }

      const legPnl = multiplier * (intrinsicValue - leg.premium) * qty
      totalPnl += legPnl
    }

    points.push({ spot: Math.round(spot), pnl: Math.round(totalPnl) })
  }

  const maxProfit = Math.max(...points.map(p => p.pnl))
  const maxLoss = Math.min(...points.map(p => p.pnl))
  const breakevens = findBreakevens(points)

  return { points, maxProfit, maxLoss, breakevens }
}

function findBreakevens(points: { spot: number; pnl: number }[]) {
  const breakevens: number[] = []
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    if ((prev.pnl < 0 && curr.pnl >= 0) || (prev.pnl >= 0 && curr.pnl < 0)) {
      // Linear interpolation
      const be = prev.spot + (curr.spot - prev.spot) * Math.abs(prev.pnl) / Math.abs(curr.pnl - prev.pnl)
      breakevens.push(Math.round(be))
    }
  }
  return breakevens
}

// Preset strategies
export const PRESETS = {
  'Bull Call Spread': (atm: number, premium: number, lot: number): Leg[] => [
    { side: 'BUY', optionType: 'CE', strikePrice: atm, premium, lots: lot, lotSize: 65 },
    { side: 'SELL', optionType: 'CE', strikePrice: atm + 100, premium: premium * 0.5, lots: lot, lotSize: 65 },
  ],
  'Long Straddle': (atm: number, cePremium: number, pePremium: number, lot: number): Leg[] => [
    { side: 'BUY', optionType: 'CE', strikePrice: atm, premium: cePremium, lots: lot, lotSize: 65 },
    { side: 'BUY', optionType: 'PE', strikePrice: atm, premium: pePremium, lots: lot, lotSize: 65 },
  ],
  'Iron Condor': (atm: number, premium: number, lot: number): Leg[] => [
    { side: 'BUY', optionType: 'PE', strikePrice: atm - 200, premium: premium * 0.3, lots: lot, lotSize: 65 },
    { side: 'SELL', optionType: 'PE', strikePrice: atm - 100, premium: premium * 0.6, lots: lot, lotSize: 65 },
    { side: 'SELL', optionType: 'CE', strikePrice: atm + 100, premium: premium * 0.6, lots: lot, lotSize: 65 },
    { side: 'BUY', optionType: 'CE', strikePrice: atm + 200, premium: premium * 0.3, lots: lot, lotSize: 65 },
  ],
}