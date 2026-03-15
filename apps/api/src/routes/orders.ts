import { Router, Request, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { placeOrder } from '../services/OrderService'
import type { IndexName } from '../types'

const router = Router()

router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const order = await placeOrder({
      userId: req.userId!,
      contractId: req.body.contractId,
      indexName: req.body.indexName as IndexName,
      strikePrice: req.body.strikePrice,
      expiryDate: req.body.expiryDate,
      optionType: req.body.optionType,
      orderType: req.body.orderType,
      side: req.body.side,
      quantity: req.body.quantity,
      limitPrice: req.body.limitPrice,
    })
    res.status(201).json(order)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { db } = await import('../db/db')
  const { orders } = await import('../db/schema')
  const { eq, desc } = await import('drizzle-orm')
  
  const result = await db.select().from(orders)
    .where(eq(orders.userId, req.userId!))
    .orderBy(desc(orders.createdAt))
    .limit(100)
  
  res.json(result)
})

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { db } = await import('../db/db')
  const { orders } = await import('../db/schema')
  const { and, eq } = await import('drizzle-orm')
  
  await db.update(orders)
    .set({ status: 'cancelled' })
    .where(and(eq(orders.id, req.params.id), eq(orders.userId, req.userId!)))
  
  res.json({ success: true })
})

export { router as ordersRouter }