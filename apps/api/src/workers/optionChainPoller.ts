import cron from 'node-cron'
import { Server, Socket } from 'socket.io'
import { fetchOptionChain, getCachedChain } from '../services/OptionChainService'
import type { IndexName } from '@shared/types'
import { isMarketHours } from '../utils/marketHours'

const activeRooms = new Map<string, Set<string>>()

export function startPoller(io: Server) {
  io.on('connection', (socket: Socket) => {
    socket.on('subscribe', ({ index, expiry }: { index: string; expiry: string }) => {
      const room = `${index}:${expiry}`
      socket.join(room)
      if (!activeRooms.has(room)) activeRooms.set(room, new Set())
      activeRooms.get(room)!.add(socket.id)

      const cached = getCachedChain(index as IndexName, expiry)
      if (cached) socket.emit('option-chain-update', { room, data: cached })
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

  cron.schedule('*/3 * * * * *', async () => {
    if (!isMarketHours() && !process.env.FORCE_MARKET_OPEN) return

    for (const [room] of activeRooms) {
      if ((activeRooms.get(room)?.size ?? 0) === 0) continue
      const [index, expiry] = room.split(':') as [IndexName, string]

      try {
        const data = await fetchOptionChain(index, expiry)
        io.to(room).emit('option-chain-update', { room, data })
      } catch (err) {
        console.error(`Poll failed for ${room}:`, err)
      }
    }
  })
}