import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { db } from '../db/db'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'

const router = Router()

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
})

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const result = registerSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() })
    return
  }

  const { name, email, password } = result.data
  const passwordHash = await bcrypt.hash(password, 12)

  try {
    const [user] = await db.insert(users).values({ name, email, passwordHash }).returning({
      id: users.id, name: users.name, email: users.email, role: users.role
    })
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    )
    res.status(201).json({ token, user })
  } catch {
    res.status(409).json({ error: 'Email already exists' })
  }
})

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body
  const [user] = await db.select().from(users).where(eq(users.email, email))

  if (!user || !await bcrypt.compare(password, user.passwordHash)) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' }
  )

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      balance: user.balance,
    }
  })
})

export { router as authRouter }