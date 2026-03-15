import { useState } from 'react'
import axios from 'axios'
import { useAuthStore } from '../../stores/useAuthStore'

interface Props {
  currentBalance: number
  onClose: () => void
  onSuccess: (newBalance: number) => void
}

const QUICK_AMOUNTS = [
  { label: '₹10K', value: 10000 },
  { label: '₹25K', value: 25000 },
  { label: '₹50K', value: 50000 },
  { label: '₹1L', value: 100000 },
  { label: '₹5L', value: 500000 },
  { label: '₹10L', value: 1000000 },
]

export function AddBalanceModal({ currentBalance, onClose, onSuccess }: Props) {
  const { token, user, setAuth } = useAuthStore()
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleAdd = async (addAmount: number) => {
    if (!addAmount || addAmount < 1000) {
      setError('Minimum amount is ₹1,000')
      return
    }
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/balance/add`,
        { amount: addAmount },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setSuccess(data.message)
      // Update auth store with new balance
      if (user) {
        setAuth(token!, { ...user, balance: data.newBalance })
      }
      onSuccess(data.newBalance)
      setTimeout(onClose, 1500)
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to add balance')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async () => {
    setResetting(true)
    setError('')
    setSuccess('')
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/balance/reset`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setSuccess(data.message)
      if (user) {
        setAuth(token!, { ...user, balance: data.newBalance })
      }
      onSuccess(data.newBalance)
      setTimeout(onClose, 1500)
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to reset balance')
    } finally {
      setResetting(false)
    }
  }

  const customAmount = Number(amount.replace(/,/g, ''))

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-surface-3 rounded-xl w-full max-w-md shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-3">
          <div>
            <h2 className="text-white font-semibold text-lg">Add Balance</h2>
            <p className="text-gray-400 text-xs mt-0.5">Paper trading wallet</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Current balance */}
          <div className="bg-surface-2 rounded-lg px-4 py-3 flex justify-between items-center">
            <span className="text-gray-400 text-sm">Current Balance</span>
            <span className="text-white font-mono font-semibold text-lg">
              ₹{currentBalance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Quick amounts */}
          <div>
            <p className="text-gray-400 text-xs mb-2 uppercase tracking-wider">Quick Add</p>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_AMOUNTS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => handleAdd(value)}
                  disabled={loading}
                  className="bg-surface-2 hover:bg-accent/20 hover:border-accent/50 border border-surface-3 text-white rounded-lg py-2.5 text-sm font-mono font-semibold transition-colors disabled:opacity-50"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom amount */}
          <div>
            <p className="text-gray-400 text-xs mb-2 uppercase tracking-wider">Custom Amount</p>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono">₹</span>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  min={1000}
                  max={10000000}
                  className="w-full bg-surface-2 border border-surface-3 focus:border-accent rounded-lg pl-7 pr-3 py-2.5 text-white font-mono text-sm outline-none placeholder-gray-600"
                />
              </div>
              <button
                onClick={() => handleAdd(customAmount)}
                disabled={loading || !amount || customAmount < 1000}
                className="bg-accent hover:bg-accent/90 text-white rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-40 transition-colors"
              >
                {loading ? '...' : 'Add'}
              </button>
            </div>
            {amount && customAmount < 1000 && (
              <p className="text-sell text-xs mt-1">Minimum amount is ₹1,000</p>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-surface-3" />

          {/* Reset */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm font-medium">Reset Balance</p>
              <p className="text-gray-500 text-xs">Resets wallet to ₹1,00,000</p>
            </div>
            <button
              onClick={handleReset}
              disabled={resetting}
              className="bg-surface-2 hover:bg-surface-3 border border-surface-3 text-gray-300 rounded-lg px-4 py-2 text-sm disabled:opacity-50 transition-colors"
            >
              {resetting ? 'Resetting...' : 'Reset'}
            </button>
          </div>

          {/* Messages */}
          {error && (
            <div className="bg-sell/10 border border-sell/30 rounded-lg px-4 py-2.5 text-sell text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-buy/10 border border-buy/30 rounded-lg px-4 py-2.5 text-buy text-sm flex items-center gap-2">
              <span>✓</span>
              <span>{success}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}