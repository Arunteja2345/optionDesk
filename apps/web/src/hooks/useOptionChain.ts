import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import type { OptionChainResponse } from '../types'

let socket: Socket | null = null

function getSocket() {
  if (!socket) {
    socket = io(import.meta.env.VITE_WS_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
    })
  }
  return socket
}

export function useOptionChain(index: string, expiry: string) {
  const [data, setData] = useState<OptionChainResponse | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const ws = getSocket()

    ws.on('connect', () => setConnected(true))
    ws.on('disconnect', () => setConnected(false))
    if (ws.connected) setConnected(true)

    // Don't subscribe until we have a valid expiry
    if (!index || !expiry) return

    const room = `${index}:${expiry}`

    ws.emit('subscribe', { index, expiry })

    ws.on('option-chain-update', ({ room: r, data: newData }: { room: string; data: OptionChainResponse }) => {
      if (r === room) setData(newData)
    })

    return () => {
      ws.emit('unsubscribe', { index, expiry })
      ws.off('option-chain-update')
    }
  }, [index, expiry])

  return { data, connected }
}