console.log('1. Starting...')

import express, { Request, Response } from 'express'
console.log('2. express loaded')

import cors from 'cors'
console.log('3. cors loaded')

import helmet from 'helmet'
console.log('4. helmet loaded')

import http from 'http'
console.log('5. http loaded')

import { Server } from 'socket.io'
console.log('6. socket.io loaded')

// Test DB connection separately - this is often what hangs
import { db } from './db/db'
console.log('7. db loaded')

import { authRouter } from './routes/auth'
console.log('8. auth router loaded')

import { optionChainRouter } from './routes/optionchain'
console.log('9. optionchain router loaded')

import { ordersRouter } from './routes/orders'
console.log('10. orders router loaded')

import { portfolioRouter } from './routes/portfolio'
console.log('11. portfolio router loaded')

import { watchlistRouter } from './routes/watchlist'
console.log('12. watchlist router loaded')
import { balanceRouter } from './routes/balance'

import { adminRouter } from './routes/admin'
console.log('13. admin router loaded')

import { startPoller } from './workers/optionChainPoller'
console.log('14. poller loaded')

import { startLimitOrderExecutor } from './workers/limitOrderExecutor'
console.log('15. executor loaded')
import { basketRouter } from './routes/basket'

console.log('16. All imports done, setting up express...')

const app = express()
const server = http.createServer(app)

export const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  },
})

app.use(helmet())
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }))
app.use(express.json())

app.use('/api/auth', authRouter)
app.use('/api/optionchain', optionChainRouter)
app.use('/api/orders', ordersRouter)
app.use('/api/portfolio', portfolioRouter)
app.use('/api/watchlist', watchlistRouter)
app.use('/api/admin', adminRouter)
app.use('/api/basket', basketRouter)
app.use('/api/balance', balanceRouter)

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date() })
})

console.log('17. Routes registered, starting listener...')

const PORT = process.env.PORT || 3001

server.listen(PORT, () => {
  console.log(`18. API running on port ${PORT}`)

  try {
    startPoller(io)
    console.log('19. Poller started')
  } catch (err) {
    console.error('Poller error:', err)
  }

  try {
    startLimitOrderExecutor()
    console.log('20. Executor started')
  } catch (err) {
    console.error('Executor error:', err)
  }
})

server.on('error', (err) => {
  console.error('Server error:', err)
  process.exit(1)
})

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason)
})