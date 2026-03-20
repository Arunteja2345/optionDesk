import { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '../stores/useAuthStore'
import { getLiveLtp, calcUnrealizedPnL } from '../hooks/useLivePnL'
import type { OptionChainResponse } from '../../../../packages/shared/src/types'

interface Position {
  id: string
  contractId: string
  indexName: string
  strikePrice: number
  expiryDate: string
  optionType: 'CE' | 'PE'
  side: 'BUY' | 'SELL'
  quantity: number
  avgBuyPrice: string
  status: string
}

export function PortfolioPage() {
  const { token, user, updateBalance } = useAuthStore()
  const [positions, setPositions] = useState<Position[]>([])
  const [chainData, setChainData] = useState<Record<string, OptionChainResponse>>({})
  const [loading, setLoading] = useState(true)
  const socketRef = useRef<Socket | null>(null)

  // Fetch open positions
  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/api/positions`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(({ data }) => {
      setPositions(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [token])

  // Subscribe to live data for each unique index+expiry combination
  useEffect(() => {
    if (positions.length === 0) return

    const socket = io(import.meta.env.VITE_WS_URL, {
      transports: ['websocket']
    })
    socketRef.current = socket

    // Get unique rooms from open positions
    const rooms = [...new Set(
      positions
        .filter(p => p.status === 'open')
        .map(p => `${p.indexName}:${p.expiryDate}`)
    )]

    socket.on('connect', () => {
      rooms.forEach(room => {
        const [index, expiry] = room.split(':')
        socket.emit('subscribe', { index, expiry })
      })
    })

    socket.on('option-chain-update', ({ room, data }: {
      room: string
      data: OptionChainResponse
    }) => {
      setChainData(prev => ({ ...prev, [room]: data }))
    })

    return () => {
      rooms.forEach(room => {
        const [index, expiry] = room.split(':')
        socket.emit('unsubscribe', { index, expiry })
      })
      socket.disconnect()
    }
  }, [positions])

  const handleClose = async (positionId: string) => {
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/positions/${positionId}/close`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      // Remove closed position from list
      setPositions(prev => prev.filter(p => p.id !== positionId))
      // Update balance in navbar
      if (data.newBalance) updateBalance(data.newBalance)
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to close position')
    }
  }

  const totalUnrealizedPnL = positions
    .filter(p => p.status === 'open')
    .reduce((sum, position) => {
      const ltp = getLiveLtp(position, chainData)
      return sum + (ltp > 0 ? calcUnrealizedPnL(position, ltp) : 0)
    }, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading positions...
      </div>
    )
  }

  const openPositions = positions.filter(p => p.status === 'open')

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface-2 border border-surface-3 rounded-lg p-4">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Available Balance</p>
          <p className="text-white font-mono text-xl font-semibold">
            ₹{Number(user?.balance ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>

        <div className="bg-surface-2 border border-surface-3 rounded-lg p-4">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Live P&L</p>
          <p className={`font-mono text-xl font-semibold ${
            totalUnrealizedPnL >= 0 ? 'text-buy' : 'text-sell'
          }`}>
            {totalUnrealizedPnL >= 0 ? '+' : ''}
            ₹{totalUnrealizedPnL.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>

        <div className="bg-surface-2 border border-surface-3 rounded-lg p-4">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Open Positions</p>
          <p className="text-white font-mono text-xl font-semibold">{openPositions.length}</p>
        </div>
      </div>

      {/* Positions table */}
      <div className="bg-surface-2 border border-surface-3 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-3">
          <h2 className="text-white font-semibold text-sm">Open Positions</h2>
        </div>

        {openPositions.length === 0 ? (
          <div className="text-center text-gray-500 py-16 text-sm">
            No open positions
          </div>
        ) : (
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-gray-400 uppercase tracking-wider border-b border-surface-3">
                <th className="px-4 py-2 text-left">Contract</th>
                <th className="px-4 py-2 text-right">Qty</th>
                <th className="px-4 py-2 text-right">Avg Price</th>
                <th className="px-4 py-2 text-right">LTP</th>
                <th className="px-4 py-2 text-right">P&L</th>
                <th className="px-4 py-2 text-right">P&L %</th>
                <th className="px-4 py-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {openPositions.map(position => {
                const ltp = getLiveLtp(position, chainData)
                const pnl = ltp > 0 ? calcUnrealizedPnL(position, ltp) : 0
                const avg = Number(position.avgBuyPrice)
                const pnlPct = avg > 0 ? ((pnl / (avg * position.quantity)) * 100) : 0
                const isProfit = pnl >= 0

                return (
                  <tr
                    key={position.id}
                    className="border-b border-surface-3 hover:bg-surface transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      <div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded mr-1.5 ${
                          position.side === 'BUY'
                            ? 'bg-buy/20 text-buy'
                            : 'bg-sell/20 text-sell'
                        }`}>
                          {position.side}
                        </span>
                        <span className="text-white">
                          {position.indexName.toUpperCase()} {(position.strikePrice / 100).toFixed(0)} {position.optionType}
                        </span>
                        <span className="text-gray-500 ml-2 text-[10px]">
                          {position.expiryDate}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-2.5 text-right text-gray-300">
                      {position.quantity}
                    </td>

                    <td className="px-4 py-2.5 text-right text-gray-300">
                      ₹{avg.toFixed(2)}
                    </td>

                    <td className="px-4 py-2.5 text-right">
                      <span className={ltp > 0 ? 'text-white' : 'text-gray-500'}>
                        {ltp > 0 ? `₹${ltp.toFixed(2)}` : '—'}
                      </span>
                    </td>

                    <td className={`px-4 py-2.5 text-right font-semibold ${
                      isProfit ? 'text-buy' : 'text-sell'
                    }`}>
                      {ltp > 0 ? (
                        <>{isProfit ? '+' : ''}₹{Math.abs(pnl).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</>
                      ) : '—'}
                    </td>

                    <td className={`px-4 py-2.5 text-right ${
                      isProfit ? 'text-buy' : 'text-sell'
                    }`}>
                      {ltp > 0 ? (
                        <>{isProfit ? '+' : ''}{pnlPct.toFixed(2)}%</>
                      ) : '—'}
                    </td>

                    <td className="px-4 py-2.5 text-center">
                      <button
                        onClick={() => handleClose(position.id)}
                        className="px-3 py-1 bg-surface-3 hover:bg-sell/20 hover:border-sell/40 hover:text-sell border border-surface-3 text-gray-400 rounded text-[11px] transition-colors"
                      >
                        Close
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}