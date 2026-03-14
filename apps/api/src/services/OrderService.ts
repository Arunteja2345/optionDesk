import { db } from '../db/db'
import { orders, positions, users } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import { getCachedChain } from './OptionChainService'
import { IndexName } from '@shared/types'

export interface PlaceOrderInput {
  userId: string
  contractId: string
  indexName: IndexName
  strikePrice: number
  expiryDate: string
  optionType: 'CE' | 'PE'
  orderType: 'MARKET' | 'LIMIT'
  side: 'BUY' | 'SELL'
  quantity: number          // number of lots
  limitPrice?: number
}

const LOT_SIZE = 65   // NIFTY lot size; ideally fetch from API

export async function placeOrder(input: PlaceOrderInput) {
  const chain = getCachedChain(input.indexName, input.expiryDate)
  if (!chain && input.orderType === 'MARKET') {
    throw new Error('Option chain data unavailable')
  }

  // Find current LTP for the contract
  let currentLtp = 0
  if (chain) {
    const strike = chain.optionContracts.find(s => s.strikePrice === input.strikePrice)
    const contract = input.optionType === 'CE' ? strike?.ce : strike?.pe
    currentLtp = contract?.liveData.ltp ?? 0
  }

  const executionPrice = input.orderType === 'MARKET' ? currentLtp : (input.limitPrice ?? currentLtp)
  const totalCost = input.quantity * LOT_SIZE * executionPrice

  // Fetch user balance
  const [user] = await db.select({ balance: users.balance, id: users.id })
    .from(users).where(eq(users.id, input.userId))

  if (input.side === 'BUY') {
    if (Number(user.balance) < totalCost) {
      throw new Error(`Insufficient balance. Required: ₹${totalCost.toFixed(2)}, Available: ₹${user.balance}`)
    }
  }

  // Insert order
  const [order] = await db.insert(orders).values({
    userId: input.userId,
    contractId: input.contractId,
    indexName: input.indexName,
    strikePrice: input.strikePrice,
    expiryDate: input.expiryDate,
    optionType: input.optionType,
    orderType: input.orderType,
    side: input.side,
    quantity: input.quantity * LOT_SIZE,
    price: String(executionPrice),
    status: input.orderType === 'MARKET' ? 'executed' : 'pending',
  }).returning()

  if (input.orderType === 'MARKET') {
    await executeOrder(order.id, executionPrice, input.userId, input.side, totalCost, input)
  }

  return order
}

async function executeOrder(
  orderId: string,
  price: number,
  userId: string,
  side: 'BUY' | 'SELL',
  totalCost: number,
  input: PlaceOrderInput
) {
  // Mark order executed
  await db.update(orders).set({ status: 'executed', executedAt: new Date() })
    .where(eq(orders.id, orderId))

  // Deduct / credit balance
  await db.execute(
    side === 'BUY'
      ? `UPDATE users SET balance = balance - ${totalCost} WHERE id = '${userId}'`
      : `UPDATE users SET balance = balance + ${totalCost} WHERE id = '${userId}'`
  )

  // Upsert position
  const [existing] = await db.select().from(positions).where(
    and(
      eq(positions.userId, userId),
      eq(positions.contractId, input.contractId),
      eq(positions.side, side),
      eq(positions.status, 'open')
    )
  )

  if (existing) {
    const totalQty = existing.quantity + input.quantity * LOT_SIZE
    const newAvg = (Number(existing.avgBuyPrice) * existing.quantity + price * input.quantity * LOT_SIZE) / totalQty
    await db.update(positions)
      .set({ quantity: totalQty, avgBuyPrice: String(newAvg) })
      .where(eq(positions.id, existing.id))
  } else {
    await db.insert(positions).values({
      userId,
      contractId: input.contractId,
      indexName: input.indexName,
      strikePrice: input.strikePrice,
      expiryDate: input.expiryDate,
      optionType: input.optionType,
      quantity: input.quantity * LOT_SIZE,
      avgBuyPrice: String(price),
      side,
    })
  }
}