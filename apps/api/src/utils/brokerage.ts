export interface BrokerageBreakdown {
  brokerage: number
  stt: number
  exchangeCharge: number
  gst: number
  sebiCharge: number
  stampDuty: number
  total: number
}

export function calculateBrokerage(
  side: 'BUY' | 'SELL',
  lots: number,
  lotSize: number,
  price: number
): BrokerageBreakdown {
  const turnover = lots * lotSize * price  // total premium value

  // Brokerage: flat ₹20 per order or 0.03% of turnover, whichever is lower
  const brokerageRaw = Math.min(20, turnover * 0.0003)
  const brokerage = roundTo(brokerageRaw, 2)

  // STT: 0.0625% on sell side premium only
  const stt = side === 'SELL'
    ? roundTo(turnover * 0.000625, 2)
    : 0

  // NSE exchange transaction charge: 0.053% both sides
  const exchangeCharge = roundTo(turnover * 0.00053, 2)

  // GST: 18% on (brokerage + exchange charge)
  const gst = roundTo((brokerage + exchangeCharge) * 0.18, 2)

  // SEBI charge: ₹10 per crore = 0.000001 of turnover
  const sebiCharge = roundTo(turnover * 0.000001, 2)

  // Stamp duty: 0.003% on buy side only
  const stampDuty = side === 'BUY'
    ? roundTo(turnover * 0.00003, 2)
    : 0

  const total = roundTo(
    brokerage + stt + exchangeCharge + gst + sebiCharge + stampDuty,
    2
  )

  return {
    brokerage,
    stt,
    exchangeCharge,
    gst,
    sebiCharge,
    stampDuty,
    total,
  }
}

function roundTo(value: number, decimals: number): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)
}