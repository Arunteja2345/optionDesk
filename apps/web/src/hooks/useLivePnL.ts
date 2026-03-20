import { useMemo } from 'react'
import type { OptionChainResponse } from '../../../../packages/shared/src/types'

interface Position {
  id: string
  contractId: string
  strikePrice: number
  optionType: 'CE' | 'PE'
  side: 'BUY' | 'SELL'
  quantity: number
  avgBuyPrice: string
  expiryDate: string
  indexName: string
  status: string
}

export function getLiveLtp(
  position: Position,
  chainData: Record<string, OptionChainResponse>
): number {
  const chain = chainData[`${position.indexName}:${position.expiryDate}`]
  if (!chain) return 0

  const strike = chain.optionContracts.find(
    (s: any) => s.strikePrice === position.strikePrice
  )
  const contract = position.optionType === 'CE' ? strike?.ce : strike?.pe
  return contract?.liveData?.ltp ?? 0
}

export function calcUnrealizedPnL(
  position: Position,
  currentLtp: number
): number {
  const avg = Number(position.avgBuyPrice)
  if (position.side === 'BUY') {
    return (currentLtp - avg) * position.quantity
  } else {
    return (avg - currentLtp) * position.quantity
  }
}

export function useLivePnL(
  positions: Position[],
  chainData: Record<string, OptionChainResponse>
) {
  return useMemo(() => {
    return positions
      .filter(p => p.status === 'open')
      .map(position => {
        const ltp = getLiveLtp(position, chainData)
        const unrealizedPnL = ltp > 0 ? calcUnrealizedPnL(position, ltp) : 0
        return {
          ...position,
          currentLtp: ltp,
          unrealizedPnL,
          pnlPercent: ltp > 0
            ? ((unrealizedPnL / (Number(position.avgBuyPrice) * position.quantity)) * 100)
            : 0,
        }
      })
  }, [positions, chainData])
}