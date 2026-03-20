import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import type { OptionChainResponse } from '../../../../packages/shared/src/types'

// Single shared socket instance
let socket: Socket | null = null

function getSocket(): Socket {
  if (!socket || socket.disconnected) {
    socket = io(import.meta.env.VITE_WS_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    })
  }
  return socket
}

export function useOptionChain(index: string, expiry: string) {
  const [data, setData] = useState<OptionChainResponse | null>(null)
  const [connected, setConnected] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const roomRef = useRef('')

  useEffect(() => {
    if (!index || !expiry) return

    const ws = getSocket()
    const room = `${index}:${expiry}`
    roomRef.current = room

    const handleConnect = () => setConnected(true)
    const handleDisconnect = () => setConnected(false)

    const handleUpdate = ({ room: updatedRoom, data: newData }: {
      room: string
      data: OptionChainResponse
    }) => {
      // Only update if this is for our current room
      if (updatedRoom === roomRef.current) {
        setData(newData)
        setLastUpdated(new Date())
      }
    }

    ws.on('connect', handleConnect)
    ws.on('disconnect', handleDisconnect)
    ws.on('option-chain-update', handleUpdate)

    if (ws.connected) setConnected(true)

    // Subscribe to this room
    ws.emit('subscribe', { index, expiry })

    return () => {
      ws.emit('unsubscribe', { index, expiry })
      ws.off('connect', handleConnect)
      ws.off('disconnect', handleDisconnect)
      ws.off('option-chain-update', handleUpdate)
    }
  }, [index, expiry])

  return { data, connected, lastUpdated }
}