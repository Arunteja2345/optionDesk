import { useEffect, useState } from 'react'
import { useWatchlistStore } from '../../stores/useWatchlistStore'
import { io, Socket } from 'socket.io-client'
import { useNavigate } from 'react-router-dom'

interface LiveData {
  ltp: number
  dayChangePerc: number
  oi: number
}

export function WatchlistPanel() {
  const { items, loading, remove, fetch } = useWatchlistStore()
  const [liveData, setLiveData] = useState<Record<string, LiveData>>({})
  const navigate = useNavigate()

  useEffect(() => {
    fetch()
  }, [])

  useEffect(() => {
    if (items.length === 0) return

    const socket: Socket = io(import.meta.env.VITE_WS_URL, {
      transports: ['websocket', 'polling']
    })

    const rooms = [...new Set(
      items.map(i => `${i.indexName}:${i.expiryDate}`)
    )]

    socket.on('connect', () => {
      rooms.forEach(room => {
        const [index, expiry] = room.split(':')
        socket.emit('subscribe', { index, expiry })
      })
    })

    socket.on('option-chain-update', ({ room, data }: any) => {
      const [index, expiry] = room.split(':')
      const watchedInRoom = items.filter(
        i => i.indexName === index && i.expiryDate === expiry
      )
      watchedInRoom.forEach(item => {
        const strike = data.optionContracts?.find(
          (s: any) => s.strikePrice === item.strikePrice
        )
        const contract = item.optionType === 'CE' ? strike?.ce : strike?.pe
        if (contract?.liveData) {
          setLiveData(prev => ({
            ...prev,
            [item.contractId]: {
              ltp: contract.liveData.ltp,
              dayChangePerc: contract.liveData.dayChangePerc,
              oi: contract.liveData.oi,
            }
          }))
        }
      })
    })

    return () => {
      rooms.forEach(room => {
        const [index, expiry] = room.split(':')
        socket.emit('unsubscribe', { index, expiry })
      })
      socket.disconnect()
    }
  }, [items])

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-5 h-5 border-2 border-accent/40 border-t-accent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-surface-3 flex items-center justify-between flex-shrink-0">
        <h2 className="text-white font-semibold text-sm">Watchlist</h2>
        <span className="text-gray-500 text-xs bg-surface-3 px-2 py-0.5 rounded-full">
          {items.length}/50
        </span>
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-2 px-4">
          <span className="text-3xl">☆</span>
          <p className="text-sm text-center">No contracts watched</p>
          <p className="text-xs text-gray-600 text-center">
            Click <span className="text-accent font-mono">☆</span> on any option to add it
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {items.map(item => {
            const live = liveData[item.contractId]
            const change = live?.dayChangePerc ?? 0
            const isPositive = change >= 0

            return (
              <div
                key={item.id}
                className="px-3 py-2.5 border-b border-surface-3 hover:bg-surface-2 transition-colors group cursor-pointer"
                onClick={() => navigate(`/option/${item.indexName}/${item.strikePrice}/${item.optionType}/${item.expiryDate}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        item.optionType === 'CE'
                          ? 'bg-buy/20 text-buy'
                          : 'bg-sell/20 text-sell'
                      }`}>
                        {item.optionType}
                      </span>
                      <span className="text-white text-xs font-semibold font-mono">
                        {item.indexName.toUpperCase()} {(item.strikePrice / 100).toFixed(0)}
                      </span>
                    </div>
                    <p className="text-gray-600 text-[10px]">{item.expiryDate}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-white font-mono text-xs font-semibold">
                        {live ? `₹${live.ltp.toFixed(2)}` : '—'}
                      </p>
                      {live && (
                        <p className={`text-[10px] font-mono ${
                          isPositive ? 'text-buy' : 'text-sell'
                        }`}>
                          {isPositive ? '+' : ''}{change.toFixed(2)}%
                        </p>
                      )}
                    </div>

                    <button
                      onClick={e => {
                        e.stopPropagation()
                        remove(item.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-sell transition-all w-5 h-5 flex items-center justify-center text-base rounded hover:bg-sell/10"
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}