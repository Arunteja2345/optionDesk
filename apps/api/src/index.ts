import express, { Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import http from 'http'
import { Server } from 'socket.io'
import { authRouter } from './routes/auth'
import { optionChainRouter } from './routes/optionchain'
import { ordersRouter } from './routes/orders'
import { portfolioRouter } from './routes/portfolio'
import { watchlistRouter } from './routes/watchlist'
import { adminRouter } from './routes/admin'
import { startPoller } from './workers/optionChainPoller'
import { startLimitOrderExecutor } from './workers/limitOrderExecutor'

const app = express()
const server = http.createServer(app)

export const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
})

app.use(helmet())
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }))
app.use(express.json())

app.use('/api/auth', authRouter)
app.use('/api/optionchain', optionChainRouter)
app.use('/api/orders', ordersRouter)
app.use('/api/portfolio', portfolioRouter)
app.use('/api/watchlist', watchlistRouter)
app.use('/api/admin', adminRouter)

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date() })
})

startPoller(io)
startLimitOrderExecutor()

server.listen(process.env.PORT || 3001, () =>
  console.log(`API running on port ${process.env.PORT || 3001}`)
)