import { Router, Request, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { closePosition } from '../services/OrderService'

const router = Router()

router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { db } = await import('../db/db')
  const { positions } = await import('../db/schema')
  const { eq } = await import('drizzle-orm')

  const rows = await db.select().from(positions)
    .where(eq(positions.userId, req.userId!))

  res.json(rows)
})

router.post('/:id/close', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await closePosition(req.params.id, req.userId!)
    res.json({
      message: 'Position closed',
      pnl: result.pnl,
      closePrice: result.closePrice,
      refund: result.refund,
      newBalance: result.newBalance,
    })
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
})

export { router as positionsRouter }