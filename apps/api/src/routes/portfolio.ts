import { Router, Request, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { db } from '../db/db'
import { positions, orders, users } from '../db/schema'
import { eq, desc, and, sql } from 'drizzle-orm'

const router = Router()

// GET /api/portfolio/summary
router.get('/summary', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [user] = await db.select({
      balance: users.balance,
      name: users.name,
      email: users.email,
    }).from(users).where(eq(users.id, req.userId!))

    const openPositions = await db.select().from(positions)
      .where(and(eq(positions.userId, req.userId!), eq(positions.status, 'open')))

    const closedPositions = await db.select().from(positions)
      .where(and(eq(positions.userId, req.userId!), eq(positions.status, 'closed')))

    const realizedPnl = closedPositions.reduce((sum, p) => {
      if (!p.closePrice) return sum
      const multiplier = p.side === 'BUY' ? 1 : -1
      return sum + multiplier * (Number(p.closePrice) - Number(p.avgBuyPrice)) * p.quantity
    }, 0)

    res.json({
      balance: user.balance,
      name: user.name,
      email: user.email,
      openPositionsCount: openPositions.length,
      realizedPnl,
      openPositions,
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/portfolio/positions
router.get('/positions', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await db.select().from(positions)
      .where(eq(positions.userId, req.userId!))
      .orderBy(desc(positions.openedAt))
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/portfolio/positions/:id/close
router.post('/positions/:id/close', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { getCachedChain } = await import('../services/OptionChainService')
    const [position] = await db.select().from(positions)
      .where(and(eq(positions.id, req.params.id), eq(positions.userId, req.userId!)))

    if (!position) {
      res.status(404).json({ error: 'Position not found' })
      return
    }

    // Get current LTP from cache
    const chain = getCachedChain(position.indexName as any, position.expiryDate)
    let closeLtp = 0
    if (chain) {
      const strike = chain.optionContracts.find(s => s.strikePrice === position.strikePrice)
      const contract = position.optionType === 'CE' ? strike?.ce : strike?.pe
      closeLtp = contract?.liveData.ltp ?? 0
    }

    // Calculate P&L
    const multiplier = position.side === 'BUY' ? 1 : -1
    const pnl = multiplier * (closeLtp - Number(position.avgBuyPrice)) * position.quantity
    const credit = position.side === 'BUY'
      ? closeLtp * position.quantity
      : 0

    // Update position
    await db.update(positions).set({
      status: 'closed',
      closedAt: new Date(),
      closePrice: String(closeLtp),
    }).where(eq(positions.id, position.id))

    // Credit balance back
    if (credit > 0) {
      await db.update(users)
        .set({ balance: sql`balance + ${credit}` })
        .where(eq(users.id, req.userId!))
    }

    res.json({ success: true, pnl, closeLtp })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export { router as portfolioRouter }