import { useEffect, useState } from 'react'
import { api } from '../services/api'
import toast from 'react-hot-toast'
import { Navbar } from '../components/NavBar'

interface Order {
  id: string
  contractId: string
  indexName: string
  strikePrice: number
  optionType: string
  orderType: string
  side: string
  quantity: number
  price: string
  status: string
  createdAt: string
  executedAt: string | null
}

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'executed' | 'pending' | 'cancelled'>('all')

  async function fetchOrders() {
    try {
      const { data } = await api.get('/api/orders')
      setOrders(data)
    } catch {
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  async function cancelOrder(id: string) {
    try {
      await api.delete(`/api/orders/${id}`)
      toast.success('Order cancelled')
      fetchOrders()
    } catch {
      toast.error('Failed to cancel order')
    }
  }

  function exportCSV() {
    const rows = [
      ['Date', 'Contract', 'Type', 'Side', 'Qty', 'Price', 'Status'],
      ...filtered.map(o => [
        new Date(o.createdAt).toLocaleString(),
        `${o.indexName.toUpperCase()} ${(o.strikePrice / 100).toFixed(0)} ${o.optionType}`,
        o.orderType,
        o.side,
        String(o.quantity),
        o.price,
        o.status,
      ])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'orders.csv'
    a.click()
  }

  useEffect(() => { fetchOrders() }, [])

  const filtered = orders.filter(o => filter === 'all' || o.status === filter)

  const statusColor: Record<string, string> = {
    executed: 'text-buy bg-buy/10',
    pending: 'text-yellow-400 bg-yellow-400/10',
    cancelled: 'text-gray-400 bg-surface-3',
    rejected: 'text-sell bg-sell/10',
  }

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center text-gray-400">
      Loading orders...
    </div>
  )

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-surface rounded-lg border border-surface-3">
          <div className="px-4 py-3 border-b border-surface-3 flex items-center gap-3 flex-wrap">
            <h2 className="font-semibold text-white">Order History</h2>
            <div className="flex gap-1 ml-2">
              {(['all', 'executed', 'pending', 'cancelled'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2 py-1 rounded text-xs capitalize ${
                    filter === f ? 'bg-accent text-white' : 'bg-surface-2 text-gray-400 hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <button
              onClick={exportCSV}
              className="ml-auto px-3 py-1 rounded bg-surface-2 text-gray-400 hover:text-white text-xs border border-surface-3"
            >
              Export CSV
            </button>
          </div>

          {filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">No orders found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="bg-surface-3 text-gray-400 uppercase">
                    <th className="px-3 py-2 text-left">Time</th>
                    <th className="px-3 py-2 text-left">Contract</th>
                    <th className="px-3 py-2 text-center">Type</th>
                    <th className="px-3 py-2 text-center">Side</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Price</th>
                    <th className="px-3 py-2 text-center">Status</th>
                    <th className="px-3 py-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(order => (
                    <tr key={order.id} className="border-t border-surface-3 hover:bg-surface-2">
                      <td className="px-3 py-2 text-gray-400">
                        {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        <div className="text-[10px] text-gray-600">
                          {new Date(order.createdAt).toLocaleDateString('en-IN')}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-white">
                          {order.indexName.toUpperCase()} {(order.strikePrice / 100).toFixed(0)} {order.optionType}
                        </div>
                        <div className="text-gray-500 text-[10px]">{order.orderType}</div>
                      </td>
                      <td className="px-3 py-2 text-center text-gray-400">{order.orderType}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          order.side === 'BUY' ? 'bg-buy/20 text-buy' : 'bg-sell/20 text-sell'
                        }`}>
                          {order.side}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-white">{order.quantity}</td>
                      <td className="px-3 py-2 text-right text-white">₹{Number(order.price).toFixed(2)}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${statusColor[order.status] ?? ''}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {order.status === 'pending' && (
                          <button
                            onClick={() => cancelOrder(order.id)}
                            className="px-2 py-0.5 rounded bg-sell/20 text-sell text-[10px] hover:bg-sell/40"
                          >
                            Cancel
                          </button>
                        )}
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