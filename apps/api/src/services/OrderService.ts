import { db } from '../db/db'
import { orders, positions, users } from '../db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { getCachedChain, fetchOptionChain } from './OptionChainService'
import { calculateBrokerage, BrokerageBreakdown } from '../utils/brokerage'
import type { IndexName } from '../types'

export interface PlaceOrderInput {
  userId: string
  contractId: string
  indexName: IndexName
  strikePrice: number
  expiryDate: string
  optionType: 'CE' | 'PE'
  orderType: 'MARKET' | 'LIMIT'
  side: 'BUY' | 'SELL'
  quantity: number
  limitPrice?: number
}

export interface MarginInfo {
  requiredAmount: number
  premiumReceived?: number
  spanMargin?: number
  exposureMargin?: number
  totalMargin?: number
}

export function calculateMargin(
  side: 'BUY' | 'SELL',
  lots: number,
  lotSize: number,
  ltp: number,
  underlyingLtp: number
): MarginInfo {
  if (side === 'BUY') {
    return { requiredAmount: lots * lotSize * ltp }
  }

  const spanMargin = 0.05 * lotSize * underlyingLtp * lots
  const exposureMargin = 0.02 * lotSize * underlyingLtp * lots
  const totalMargin = spanMargin + exposureMargin
  const premiumReceived = lots * lotSize * ltp
  const netBlock = Math.max(0, totalMargin - premiumReceived)

  return {
    requiredAmount: netBlock,
    premiumReceived,
    spanMargin,
    exposureMargin,
    totalMargin,
  }
}

export async function placeOrder(input: PlaceOrderInput) {
  let chain = getCachedChain(input.indexName, input.expiryDate)

  if (!chain) {
    try {
      chain = await fetchOptionChain(input.indexName, input.expiryDate)
    } catch (err) {
      console.error('Failed to fetch chain for order:', err)
    }
  }

  let currentLtp = 0
  let underlyingLtp = 0

  if (chain) {
    underlyingLtp = chain.underlyingLtp
    const strike = chain.optionContracts.find(
      (s: any) => s.strikePrice === input.strikePrice
    )
    const contract = input.optionType === 'CE' ? strike?.ce : strike?.pe
    currentLtp = contract?.liveData?.ltp ?? 0
  }

  if (currentLtp === 0 && input.limitPrice && input.limitPrice > 0) {
    currentLtp = input.limitPrice
  }

  if (currentLtp === 0 && input.orderType === 'MARKET') {
    throw new Error(
      `Cannot place market order — live price unavailable for ${input.strikePrice / 100} ${input.optionType}`
    )
  }

  const executionPrice = input.orderType === 'MARKET'
    ? currentLtp
    : (input.limitPrice ?? currentLtp)

  const lotSize = chain?.aggregatedDetails?.lotSize ?? 65

  const marginInfo = calculateMargin(
    input.side,
    input.quantity,
    lotSize,
    executionPrice,
    underlyingLtp
  )

  const brokerageInfo = calculateBrokerage(
    input.side,
    input.quantity,
    lotSize,
    executionPrice
  )

  const totalDeduction = marginInfo.requiredAmount + brokerageInfo.total

  const [user] = await db
    .select({ balance: users.balance, id: users.id })
    .from(users)
    .where(eq(users.id, input.userId))

  if (!user) throw new Error('User not found')

  if (Number(user.balance) < totalDeduction) {
    throw new Error(
      `Insufficient balance. Required: ₹${totalDeduction.toFixed(2)} ` +
      `(₹${marginInfo.requiredAmount.toFixed(2)} + ₹${brokerageInfo.total.toFixed(2)} charges), ` +
      `Available: ₹${Number(user.balance).toFixed(2)}`
    )
  }

  const [order] = await db.insert(orders).values({
    userId: input.userId,
    contractId: input.contractId,
    indexName: input.indexName,
    strikePrice: input.strikePrice,
    expiryDate: input.expiryDate,
    optionType: input.optionType,
    orderType: input.orderType,
    side: input.side,
    quantity: input.quantity * lotSize,
    price: String(executionPrice),
    status: input.orderType === 'MARKET' ? 'executed' : 'pending',
  }).returning()

  if (input.orderType === 'MARKET') {
    await executeOrder(
      order.id, executionPrice, input.userId,
      input.side, marginInfo, brokerageInfo, input, lotSize
    )
  }

  return { order, marginInfo, brokerageInfo }
}

async function executeOrder(
  orderId: string,
  price: number,
  userId: string,
  side: 'BUY' | 'SELL',
  marginInfo: MarginInfo,
  brokerageInfo: BrokerageBreakdown,
  input: PlaceOrderInput,
  lotSize: number
) {
  await db.update(orders)
    .set({ status: 'executed', executedAt: new Date() })
    .where(eq(orders.id, orderId))

  // Deduct margin + brokerage
  const totalDeduction = marginInfo.requiredAmount + brokerageInfo.total

  await db.update(users)
    .set({ balance: sql`balance - ${totalDeduction}` })
    .where(eq(users.id, userId))

  const totalQtyUnits = input.quantity * lotSize

  const [existing] = await db.select().from(positions).where(
    and(
      eq(positions.userId, userId),
      eq(positions.contractId, input.contractId),
      eq(positions.side, side),
      eq(positions.status, 'open')
    )
  )

  if (existing) {
    const newTotalQty = existing.quantity + totalQtyUnits
    const newAvgPrice = (
      (Number(existing.avgBuyPrice) * existing.quantity + price * totalQtyUnits)
      / newTotalQty
    )
    const newMarginBlocked = Number(existing.marginBlocked) + marginInfo.requiredAmount

    await db.update(positions)
      .set({
        quantity: newTotalQty,
        avgBuyPrice: String(newAvgPrice),
        marginBlocked: String(newMarginBlocked),
      })
      .where(eq(positions.id, existing.id))
  } else {
    await db.insert(positions).values({
      userId,
      contractId: input.contractId,
      indexName: input.indexName,
      strikePrice: input.strikePrice,
      expiryDate: input.expiryDate,
      optionType: input.optionType,
      quantity: totalQtyUnits,
      avgBuyPrice: String(price),
      side,
      marginBlocked: String(marginInfo.requiredAmount),
    })
  }
}

export async function closePosition(positionId: string, userId: string) {
  const [position] = await db.select().from(positions)
    .where(and(eq(positions.id, positionId), eq(positions.userId, userId)))

  if (!position || position.status === 'closed') {
    throw new Error('Position not found or already closed')
  }

  let chain = getCachedChain(position.indexName as IndexName, position.expiryDate)
  if (!chain) {
    try {
      chain = await fetchOptionChain(position.indexName as IndexName, position.expiryDate)
    } catch (err) {
      console.error('Failed to fetch chain for close:', err)
    }
  }

  const strike = chain?.optionContracts?.find(
    (s: any) => s.strikePrice === position.strikePrice
  )
  const contract = position.optionType === 'CE' ? strike?.ce : strike?.pe
  const currentLtp = contract?.liveData?.ltp ?? Number(position.avgBuyPrice)
  const avgPrice = Number(position.avgBuyPrice)
  const originallyBlocked = Number(position.marginBlocked)
  const lotSize = chain?.aggregatedDetails?.lotSize ?? 65
  const lots = position.quantity / lotSize

  // Brokerage on closing trade (opposite side)
  const closingSide = position.side === 'BUY' ? 'SELL' : 'BUY'
  const closingBrokerage = calculateBrokerage(closingSide, lots, lotSize, currentLtp)

  let pnl: number
  let refund: number

  if (position.side === 'BUY') {
    // Originally bought: get back current value
    pnl = (currentLtp - avgPrice) * position.quantity
    refund = currentLtp * position.quantity
  } else {
    // Originally sold: get back blocked margin ± P&L
    pnl = (avgPrice - currentLtp) * position.quantity
    refund = Math.max(0, originallyBlocked + pnl)
  }

  // Deduct closing brokerage from refund
  const finalRefund = Math.max(0, refund - closingBrokerage.total)

  console.log(`Close ${positionId}:`, {
    side: position.side,
    qty: position.quantity,
    avgPrice,
    currentLtp,
    pnl,
    originallyBlocked,
    refund,
    closingBrokerage: closingBrokerage.total,
    finalRefund,
  })

  await db.update(users)
    .set({ balance: sql`balance + ${finalRefund}` })
    .where(eq(users.id, userId))

  await db.update(positions)
    .set({
      status: 'closed',
      closedAt: new Date(),
      closePrice: String(currentLtp),
    })
    .where(eq(positions.id, positionId))

  const [updated] = await db
    .select({ balance: users.balance })
    .from(users)
    .where(eq(users.id, userId))

  return {
    pnl,
    closePrice: currentLtp,
    refund: finalRefund,
    brokerageOnClose: closingBrokerage.total,
    newBalance: Number(updated.balance),
  }
}