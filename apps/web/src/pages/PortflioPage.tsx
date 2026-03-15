import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { useAuthStore } from '../stores/useAuthStore'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { Navbar } from '../components/Navbar'

interface Position {
  id: string
  contractId: string
  indexName: string
  strikePrice: number
  expiryDate: string
  optionType: string
  quantity: number
  avgBuyPrice: string
  side: string
  status: string
  openedAt: string
}

interface Summary {
  balance: string
  name: string
  openPositionsCount: number
  realizedPnl: number
  openPositions: Position[]
}

export function PortfolioPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const user = useAuthStore(s => s.user)

  async function fetchSummary() {
    try {
      const { data } = await api.get('/api/portfolio/summary')
      setSummary(data)
    } catch {
      toast.error('Failed to load portfolio')
    } finally {
      setLoading(false)
    }
  }

  async function closePosition(id: string) {
    try {
      const { data } = await api.post(`/api/portfolio/positions/${id}/close`)
      toast.success(`Position closed. P&L: ₹${data.pnl?.toFixed(2)}`)
      fetchSummary()
    } catch {
      toast.error('Failed to close position')
    }
  }

  useEffect(() => { fetchSummary() }, [])

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center text-gray-400">
      Loading portfolio...
    </div>
  )

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="max-w-6xl mx-auto p-4 space-y-6">

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Available Balance" value={`₹${Number(summary?.balance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} color="text-buy" />
          <StatCard label="Open Positions" value={String(summary?.openPositionsCount ?? 0)} color="text-white" />
          <StatCard label="Realized P&L" value={`₹${(summary?.realizedPnl ?? 0).toFixed(2)}`} color={(summary?.realizedPnl ?? 0) >= 0 ? 'text-buy' : 'text-sell'} />
          <StatCard label="Account" value={user?.name ?? ''} color="text-accent" />
        </div>

        {/* Open positions */}
        <div className="bg-surface rounded-lg border border-surface-3">
          <div className="px-4 py-3 border-b border-surface-3 flex items-center justify-between">
            <h2 className="font-semibold text-white">Open Positions</h2>
            <button onClick={fetchSummary} className="text-xs text-accent hover:underline">Refresh</button>
          </div>

          {summary?.openPositions.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              No open positions. <Link to="/" className="text-accent">Trade now →</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="bg-surface-3 text-gray-400 uppercase">
                    <th className="px-3 py-2 text-left">Contract</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Avg Price</th>
                    <th className="px-3 py-2 text-right">Side</th>
                    <th className="px-3 py-2 text-right">Expiry</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {summary?.openPositions.map(pos => (
                    <tr key={pos.id} className="border-t border-surface-3 hover:bg-surface-2">
                      <td className="px-3 py-2">
                        <div className="text-white">{pos.indexName.toUpperCase()} {(pos.strikePrice / 100).toFixed(0)} {pos.optionType}</div>
                        <div className="text-gray-500 text-[10px]">{pos.contractId}</div>
                      </td>
                      <td className="px-3 py-2 text-right text-white">{pos.quantity}</td>
                      <td className="px-3 py-2 text-right text-white">₹{Number(pos.avgBuyPrice).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${pos.side === 'BUY' ? 'bg-buy/20 text-buy' : 'bg-sell/20 text-sell'}`}>
                          {pos.side}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-400">{pos.expiryDate}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => closePosition(pos.id)}
                          className="px-2 py-1 rounded bg-sell/20 text-sell hover:bg-sell/40 text-[10px] font-semibold"
                        >
                          Close
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-surface rounded-lg border border-surface-3 p-4">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className={`text-lg font-bold font-mono ${color}`}>{value}</div>
    </div>
  )
}