import { db } from '../db/db'
import { orders, positions, users } from '../db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { getCachedChain } from './OptionChainService'
import type { IndexName } from '../types'

export interface PlaceOrderInput {
  userId: string
  contractId: string
  indexName: IndexName
  strikePrice: number       // raw (divide by 100 to display)
  expiryDate: string
  optionType: 'CE' | 'PE'
  orderType: 'MARKET' | 'LIMIT'
  side: 'BUY' | 'SELL'
  quantity: number          // number of LOTS
  limitPrice?: number
}

export interface MarginInfo {
  requiredAmount: number    // what gets blocked
  premiumReceived?: number  // only for SELL
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
    return {
      requiredAmount: lots * lotSize * ltp
    }
  }

  // SELL — SPAN + Exposure (NSE index option margin approximation)
  const spanMargin = 0.05 * lotSize * underlyingLtp * lots
  const exposureMargin = 0.02 * lotSize * underlyingLtp * lots
  const totalMargin = spanMargin + exposureMargin
  const premiumReceived = lots * lotSize * ltp

  // Net amount blocked = margin required minus premium received
  // (because you receive the premium which offsets part of margin)
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
  const chain = getCachedChain(input.indexName, input.expiryDate)

  // Get current LTP from cache
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

  if (currentLtp === 0 && input.orderType === 'MARKET') {
    throw new Error('Cannot place market order — live price unavailable')
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

  // Check user balance
  const [user] = await db
    .select({ balance: users.balance, id: users.id })
    .from(users)
    .where(eq(users.id, input.userId))

  if (!user) throw new Error('User not found')

  if (Number(user.balance) < marginInfo.requiredAmount) {
    throw new Error(
      `Insufficient balance. ` +
      `Required: ₹${marginInfo.requiredAmount.toFixed(2)}, ` +
      `Available: ₹${Number(user.balance).toFixed(2)}`
    )
  }

  // Insert order record
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

  // Execute immediately for market orders
  if (input.orderType === 'MARKET') {
    await executeOrder(order.id, executionPrice, input.userId, input.side, marginInfo, input, lotSize)
  }

  return { order, marginInfo }
}

async function executeOrder(
  orderId: string,
  price: number,
  userId: string,
  side: 'BUY' | 'SELL',
  marginInfo: MarginInfo,
  input: PlaceOrderInput,
  lotSize: number
) {
  // Mark order as executed
  await db.update(orders)
    .set({ status: 'executed', executedAt: new Date() })
    .where(eq(orders.id, orderId))

  // Deduct the correct amount from wallet
  await db.update(users)
    .set({ balance: sql`balance - ${marginInfo.requiredAmount}` })
    .where(eq(users.id, userId))

  const totalQtyUnits = input.quantity * lotSize

  // Check for existing open position in same direction
  const [existing] = await db.select().from(positions).where(
    and(
      eq(positions.userId, userId),
      eq(positions.contractId, input.contractId),
      eq(positions.side, side),
      eq(positions.status, 'open')
    )
  )

  if (existing) {
    // Average into existing position
    const newTotalQty = existing.quantity + totalQtyUnits
    const newAvgPrice = (
      (Number(existing.avgBuyPrice) * existing.quantity + price * totalQtyUnits)
      / newTotalQty
    )
    await db.update(positions)
      .set({ quantity: newTotalQty, avgBuyPrice: String(newAvgPrice) })
      .where(eq(positions.id, existing.id))
  } else {
    // New position
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
    })
  }
}

// Close a position — reverse the balance effect
export async function closePosition(positionId: string, userId: string) {
  const [position] = await db.select().from(positions)
    .where(and(eq(positions.id, positionId), eq(positions.userId, userId)))

  if (!position || position.status === 'closed') {
    throw new Error('Position not found or already closed')
  }

  const chain = getCachedChain(
    position.indexName as IndexName,
    position.expiryDate
  )

  const strike = chain?.optionContracts?.find(
    (s: any) => s.strikePrice === position.strikePrice
  )
  const contract = position.optionType === 'CE' ? strike?.ce : strike?.pe
  const currentLtp = contract?.liveData?.ltp ?? Number(position.avgBuyPrice)
  const avgPrice = Number(position.avgBuyPrice)
  const lotSize = chain?.aggregatedDetails?.lotSize ?? 65
  const lots = position.quantity / lotSize
  const underlyingLtp = chain?.underlyingLtp ?? 0

  let refund: number
  let pnl: number

  if (position.side === 'BUY') {
    // Originally bought: paid qty * avgPrice
    // Now selling at currentLtp
    // Refund = what you get back = qty * currentLtp
    pnl = (currentLtp - avgPrice) * position.quantity
    refund = currentLtp * position.quantity  // sell proceeds
  } else {
    // Originally sold (short): blocked margin = SPAN + Exposure - premium received
    // Now buying back at currentLtp
    // P&L for short = avgPrice - currentLtp (per unit)
    pnl = (avgPrice - currentLtp) * position.quantity

    // Recalculate exactly what was originally blocked
    const spanMargin = 0.05 * lotSize * underlyingLtp * lots
    const exposureMargin = 0.02 * lotSize * underlyingLtp * lots
    const totalMargin = spanMargin + exposureMargin
    const premiumReceived = lots * lotSize * avgPrice
    const originallyBlocked = Math.max(0, totalMargin - premiumReceived)

    // Refund = original blocked margin + profit (or - loss)
    refund = originallyBlocked + pnl
  }

  // Never refund negative (loss larger than margin)
  const actualRefund = Math.max(0, refund)

  // Credit back to wallet
  await db.update(users)
    .set({ balance: sql`balance + ${actualRefund}` })
    .where(eq(users.id, userId))

  // Mark position closed
  await db.update(positions)
    .set({
      status: 'closed',
      closedAt: new Date(),
      closePrice: String(currentLtp),
    })
    .where(eq(positions.id, positionId))

  // Fetch new balance to send back to frontend
  const [updated] = await db
    .select({ balance: users.balance })
    .from(users)
    .where(eq(users.id, userId))

  return {
    pnl,
    closePrice: currentLtp,
    refund: actualRefund,
    newBalance: Number(updated.balance),
  }
}