import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import type { OptionChainResponse } from '@shared/types'

let socket: Socket | null = null

function getSocket() {
  if (!socket) {
    socket = io(import.meta.env.VITE_WS_URL, { transports: ['websocket'] })
  }
  return socket
}

export function useOptionChain(index: string, expiry: string) {
  const [data, setData] = useState<OptionChainResponse | null>(null)
  const [connected, setConnected] = useState(false)
  const prevData = useRef<OptionChainResponse | null>(null)

  useEffect(() => {
    if (!index || !expiry) return
    const ws = getSocket()

    ws.on('connect', () => setConnected(true))
    ws.on('disconnect', () => setConnected(false))

    ws.emit('subscribe', { index, expiry })

    ws.on('option-chain-update', ({ room, data: newData }) => {
      if (room === `${index}:${expiry}`) {
        prevData.current = data
        setData(newData)
      }
    })

    return () => {
      ws.emit('unsubscribe', { index, expiry })
      ws.off('option-chain-update')
    }
  }, [index, expiry])

  return { data, connected }
}