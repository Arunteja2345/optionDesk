import { Router, Response } from 'express'
import { db } from '../db/db'
import { watchlist } from '../db/schema'
import { eq, and, lt } from 'drizzle-orm'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { z } from 'zod'

const router = Router()

const addSchema = z.object({
  contractId: z.string(),
  indexName: z.enum(['nifty', 'banknifty', 'sensex']),
  strikePrice: z.number(),
  optionType: z.enum(['CE', 'PE']),
  expiryDate: z.string(),
})

// Get all watchlist items (auto-removes expired)
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const today = new Date().toISOString().split('T')[0]

  // Auto-remove expired contracts
  await db.delete(watchlist).where(
    and(
      eq(watchlist.userId, req.userId!),
      lt(watchlist.expiryDate, today)
    )
  )

  const items = await db.select().from(watchlist)
    .where(eq(watchlist.userId, req.userId!))

  res.json(items)
})

// Add to watchlist
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const result = addSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() })
    return
  }

  // Check duplicate
  const existing = await db.select().from(watchlist).where(
    and(
      eq(watchlist.userId, req.userId!),
      eq(watchlist.contractId, result.data.contractId)
    )
  )

  if (existing.length > 0) {
    res.status(409).json({ error: 'Already in watchlist' })
    return
  }

  // Max 50 items per user
  const count = await db.select().from(watchlist)
    .where(eq(watchlist.userId, req.userId!))

  if (count.length >= 50) {
    res.status(400).json({ error: 'Watchlist limit reached (50 items)' })
    return
  }

  const [item] = await db.insert(watchlist).values({
    userId: req.userId!,
    ...result.data,
  }).returning()

  res.status(201).json(item)
})

// Remove from watchlist
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  await db.delete(watchlist).where(
    and(
      eq(watchlist.id, req.params.id),
      eq(watchlist.userId, req.userId!)
    )
  )
  res.json({ message: 'Removed from watchlist' })
})

// Remove all expired (manual trigger)
router.delete('/cleanup/expired', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const today = new Date().toISOString().split('T')[0]
  await db.delete(watchlist).where(
    and(
      eq(watchlist.userId, req.userId!),
      lt(watchlist.expiryDate, today)
    )
  )
  res.json({ message: 'Expired contracts removed' })
})

export { router as watchlistRouter }