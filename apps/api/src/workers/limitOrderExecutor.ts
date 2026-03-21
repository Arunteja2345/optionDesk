import cron from 'node-cron'
import { db } from '../db/db'
import { orders, positions, users } from '../db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { getCachedChain } from '../services/OptionChainService'
import type { IndexName } from '../types'

export function startLimitOrderExecutor() {
  // Check pending limit orders every 5 seconds
  cron.schedule('*/5 * * * * *', async () => {
    try {
      await checkAndExecuteLimitOrders()
    } catch (err) {
      console.error('Limit order executor error:', err)
    }
  })

  console.log('Limit order executor started')
}

async function checkAndExecuteLimitOrders() {
  // Fetch all pending limit orders
  const pendingOrders = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.status, 'pending'),
        eq(orders.orderType, 'LIMIT')
      )
    )

  if (pendingOrders.length === 0) return

  for (const order of pendingOrders) {
    try {
      const chain = getCachedChain(
        order.indexName as IndexName,
        order.expiryDate
      )
      if (!chain) continue

      const strike = chain.optionContracts.find(
        (s: any) => s.strikePrice === order.strikePrice
      )
      const contract = order.optionType === 'CE' ? strike?.ce : strike?.pe
      const currentLtp = contract?.liveData?.ltp ?? 0

      if (currentLtp === 0) continue

      const limitPrice = Number(order.price)
      const shouldExecute = shouldFill(order.side as 'BUY' | 'SELL', currentLtp, limitPrice)

      if (shouldExecute) {
        await executeLimitOrder(order, currentLtp, chain)
        console.log(`Limit order executed: ${order.id} at ₹${currentLtp}`)
      }
    } catch (err) {
      console.error(`Failed to check limit order ${order.id}:`, err)
    }
  }
}

// BUY limit: execute when market price <= limit price
// SELL limit: execute when market price >= limit price
export function shouldFill(
  side: 'BUY' | 'SELL',
  currentLtp: number,
  limitPrice: number
): boolean {
  if (side === 'BUY') return currentLtp <= limitPrice
  if (side === 'SELL') return currentLtp >= limitPrice
  return false
}

async function executeLimitOrder(order: any, executionPrice: number, chain: any) {
  const lotSize = chain?.aggregatedDetails?.lotSize ?? 65
  const lots = order.quantity / lotSize
  const underlyingLtp = chain?.underlyingLtp ?? 0

  // Calculate cost/margin at execution price
  let requiredAmount: number
  if (order.side === 'BUY') {
    requiredAmount = lots * lotSize * executionPrice
  } else {
    const spanMargin = 0.05 * lotSize * underlyingLtp * lots
    const exposureMargin = 0.02 * lotSize * underlyingLtp * lots
    const totalMargin = spanMargin + exposureMargin
    const premiumReceived = lots * lotSize * executionPrice
    requiredAmount = Math.max(0, totalMargin - premiumReceived)
  }

  // Check user still has enough balance
  const [user] = await db
    .select({ balance: users.balance })
    .from(users)
    .where(eq(users.id, order.userId))

  if (!user || Number(user.balance) < requiredAmount) {
    // Cancel the order — insufficient funds at time of execution
    await db.update(orders)
      .set({ status: 'cancelled' })
      .where(eq(orders.id, order.id))
    console.log(`Limit order ${order.id} cancelled — insufficient balance`)
    return
  }

  // Mark order executed
  await db.update(orders)
    .set({
      status: 'executed',
      price: String(executionPrice),
      executedAt: new Date(),
    })
    .where(eq(orders.id, order.id))

  // Deduct balance
  await db.update(users)
    .set({ balance: sql`balance - ${requiredAmount}` })
    .where(eq(users.id, order.userId))

  // Create or update position
  const [existing] = await db.select().from(positions).where(
    and(
      eq(positions.userId, order.userId),
      eq(positions.contractId, order.contractId),
      eq(positions.side, order.side),
      eq(positions.status, 'open')
    )
  )

  if (existing) {
    const newQty = existing.quantity + order.quantity
    const newAvg = (
      (Number(existing.avgBuyPrice) * existing.quantity +
        executionPrice * order.quantity) / newQty
    )
    await db.update(positions)
      .set({ quantity: newQty, avgBuyPrice: String(newAvg) })
      .where(eq(positions.id, existing.id))
  } else {
    await db.insert(positions).values({
      userId: order.userId,
      contractId: order.contractId,
      indexName: order.indexName,
      strikePrice: order.strikePrice,
      expiryDate: order.expiryDate,
      optionType: order.optionType,
      quantity: order.quantity,
      avgBuyPrice: String(executionPrice),
      side: order.side,
    })
  }
}