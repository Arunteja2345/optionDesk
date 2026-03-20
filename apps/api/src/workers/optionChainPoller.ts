import cron from 'node-cron'
import { Server, Socket } from 'socket.io'
import { fetchOptionChain, getCachedChain } from '../services/OptionChainService'
import type { IndexName } from '../types'
import { isMarketHours } from '../utils/marketHours'

const activeRooms = new Map<string, Set<string>>()

export function startPoller(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log('Client connected:', socket.id)

    socket.on('subscribe', ({ index, expiry }: { index: string; expiry: string }) => {
      const room = `${index}:${expiry}`
      socket.join(room)

      if (!activeRooms.has(room)) activeRooms.set(room, new Set())
      activeRooms.get(room)!.add(socket.id)

      console.log(`Subscribed: ${socket.id} → ${room}`)

      // Send cached data immediately on subscribe
      const cached = getCachedChain(index as IndexName, expiry)
      if (cached) {
        socket.emit('option-chain-update', { room, data: cached })
      }
    })

    socket.on('unsubscribe', ({ index, expiry }: { index: string; expiry: string }) => {
      const room = `${index}:${expiry}`
      socket.leave(room)
      activeRooms.get(room)?.delete(socket.id)
    })

    socket.on('disconnect', () => {
      activeRooms.forEach((sockets) => sockets.delete(socket.id))
    })
  })

  // Poll every 3 seconds
  cron.schedule('*/3 * * * * *', async () => {
    // Allow override via env for testing outside market hours
    const forceOpen = process.env.FORCE_MARKET_OPEN === 'true'
    if (!forceOpen && !isMarketHours()) return

    for (const [room, subscribers] of activeRooms.entries()) {
      if (subscribers.size === 0) continue

      const parts = room.split(':')
      const index = parts[0] as IndexName
      const expiry = parts.slice(1).join(':') // handles dates with colons

      try {
        const data = await fetchOptionChain(index, expiry)
        io.to(room).emit('option-chain-update', { room, data })
        console.log(`Pushed update: ${room} → ${subscribers.size} clients`)
      } catch (err: any) {
        console.error(`Poll failed for ${room}:`, err.message)
      }
    }
  })

  console.log('Option chain poller started')
}