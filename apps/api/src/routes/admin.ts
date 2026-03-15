import { Router, Response } from 'express'
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth'
import { db } from '../db/db'
import { users, orders, positions } from '../db/schema'
import { eq, desc, sql } from 'drizzle-orm'

const router = Router()

router.use(authMiddleware)
router.use(adminMiddleware)

router.get('/users', async (_req: AuthRequest, res: Response): Promise<void> => {
  const result = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    balance: users.balance,
    isActive: users.isActive,
    createdAt: users.createdAt,
  }).from(users).orderBy(desc(users.createdAt))
  res.json(result)
})

router.patch('/users/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  await db.update(users).set({
    ...(req.body.balance !== undefined && { balance: String(req.body.balance) }),
    ...(req.body.role !== undefined && { role: req.body.role }),
    ...(req.body.isActive !== undefined && { isActive: req.body.isActive }),
  }).where(eq(users.id, req.params.id))
  res.json({ success: true })
})

router.get('/orders', async (_req: AuthRequest, res: Response): Promise<void> => {
  const result = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(200)
  res.json(result)
})

router.get('/system/health', async (_req: AuthRequest, res: Response): Promise<void> => {
  res.json({ status: 'ok', time: new Date(), uptime: process.uptime() })
})

export { router as adminRouter }