import { Server, Socket } from 'socket.io'
import type { IndexName } from '../types'

const activeRooms = new Map<string, Set<string>>()
let pollerStarted = false

export function startPoller(io: Server) {
  if (pollerStarted) return
  pollerStarted = true

  io.on('connection', (socket: Socket) => {
    console.log('Client connected:', socket.id)

    socket.on('subscribe', ({ index, expiry }: { index: string; expiry: string }) => {
      const room = `${index}:${expiry}`
      socket.join(room)
      if (!activeRooms.has(room)) activeRooms.set(room, new Set())
      activeRooms.get(room)!.add(socket.id)
      console.log(`Subscribed ${socket.id} to ${room}`)

      // Send cached data immediately if available
      try {
        const { getCachedChain } = require('../services/OptionChainService')
        const cached = getCachedChain(index as IndexName, expiry)
        if (cached) socket.emit('option-chain-update', { room, data: cached })
      } catch (err) {
        console.error('Cache read error:', err)
      }
    })

    socket.on('unsubscribe', ({ index, expiry }: { index: string; expiry: string }) => {
      const room = `${index}:${expiry}`
      socket.leave(room)
      activeRooms.get(room)?.delete(socket.id)
    })

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id)
      activeRooms.forEach((sockets) => sockets.delete(socket.id))
    })
  })

  // Poll every 3 seconds — wrapped in try/catch so crashes don't kill the server
  setInterval(async () => {
    try {
      const { isMarketHours } = require('../utils/marketHours')
      if (!isMarketHours() && !process.env.FORCE_MARKET_OPEN) return

      const { fetchOptionChain } = require('../services/OptionChainService')

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
    } catch (err) {
      console.error('Poller tick error:', err)
    }
  }, 3000)

  console.log('Poller initialized')
}

