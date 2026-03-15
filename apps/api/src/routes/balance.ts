import { Router, Request, Response } from 'express'
import { db } from '../db/db'
import { users } from '../db/schema'
import { eq, sql } from 'drizzle-orm'
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth'
import { z } from 'zod'

const router = Router()

const addBalanceSchema = z.object({
  amount: z.number().min(1000).max(10000000),
})

// User adds their own balance (paper trading — no real money)
router.post('/add', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const result = addBalanceSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: 'Amount must be between ₹1,000 and ₹1,00,00,000' })
    return
  }

  const { amount } = result.data
  const userId = req.userId!

  await db.update(users)
    .set({ balance: sql`balance + ${amount}` })
    .where(eq(users.id, userId))

  const [updated] = await db
    .select({ balance: users.balance })
    .from(users)
    .where(eq(users.id, userId))

  res.json({
    message: `₹${amount.toLocaleString('en-IN')} added successfully`,
    newBalance: Number(updated.balance),
  })
})

// User resets balance to default (1 lakh)
router.post('/reset', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!

  await db.update(users)
    .set({ balance: '100000' })
    .where(eq(users.id, userId))

  res.json({
    message: 'Balance reset to ₹1,00,000',
    newBalance: 100000,
  })
})

// Admin sets any user's balance to specific amount
router.patch('/admin/:userId', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { amount } = req.body
  const { userId } = req.params

  if (typeof amount !== 'number' || amount < 0) {
    res.status(400).json({ error: 'Invalid amount' })
    return
  }

  await db.update(users)
    .set({ balance: String(amount) })
    .where(eq(users.id, userId))

  const [updated] = await db
    .select({ id: users.id, name: users.name, balance: users.balance })
    .from(users)
    .where(eq(users.id, userId))

  res.json({ message: 'Balance updated', user: updated })
})

export { router as balanceRouter }