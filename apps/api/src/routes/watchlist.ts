import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { db } from '../db/db'
import { watchlist } from '../db/schema'
import { and, eq } from 'drizzle-orm'

const router = Router()

router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const items = await db.select().from(watchlist).where(eq(watchlist.userId, req.userId!))
  res.json(items)
})

router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [item] = await db.insert(watchlist).values({
      userId: req.userId!,
      contractId: req.body.contractId,
      indexName: req.body.indexName,
      strikePrice: req.body.strikePrice,
      optionType: req.body.optionType,
      expiryDate: req.body.expiryDate,
    }).returning()
    res.status(201).json(item)
  } catch {
    res.status(409).json({ error: 'Already in watchlist' })
  }
})

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  await db.delete(watchlist)
    .where(and(eq(watchlist.id, req.params.id), eq(watchlist.userId, req.userId!)))
  res.json({ success: true })
})

export { router as watchlistRouter }